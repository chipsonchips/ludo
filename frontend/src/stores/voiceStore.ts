/**
 * In-match voice chat (online mode only).
 *
 * Both players opt in independently ("join voice"). Presence is exchanged
 * over the room server's voice_signal relay; once both sides are active a
 * direct WebRTC audio call is negotiated using the perfect-negotiation
 * pattern (seat 1 is the polite peer). The room server never sees audio —
 * it only relays SDP/ICE envelopes.
 *
 * roomStore feeds this store (seat, incoming signals, peer connectivity);
 * this store only talks outward through the shared WebSocket connection.
 */
import { create } from 'zustand';
import type { Seat, VoiceSignal } from '@shared/protocol';
import { connection } from '@/net/client';

export type VoiceStatus =
  | 'idle' // not in voice
  | 'requesting-mic' // waiting on getUserMedia permission
  | 'waiting' // mic live, opponent hasn't joined voice yet
  | 'connecting' // both active, WebRTC negotiating
  | 'connected' // audio flowing
  | 'error';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

interface VoiceStore {
  status: VoiceStatus;
  muted: boolean;
  /** Opponent has their voice channel open. */
  peerActive: boolean;
  peerMuted: boolean;
  error: string | null;

  joinVoice: () => Promise<void>;
  leaveVoice: () => void;
  toggleMute: () => void;

  // Wired up by roomStore — not for UI use.
  _setSeat: (seat: Seat | null) => void;
  _handleSignal: (signal: VoiceSignal) => void;
  _onPeerConnectivity: (connected: boolean) => void;
  _reset: () => void;
}

export const useVoiceStore = create<VoiceStore>((set, get) => {
  let mySeat: Seat | null = null;
  let pc: RTCPeerConnection | null = null;
  let localStream: MediaStream | null = null;
  let remoteAudio: HTMLAudioElement | null = null;
  // Perfect negotiation bookkeeping
  let makingOffer = false;
  let ignoreOffer = false;
  let isSettingRemoteAnswerPending = false;

  const polite = () => mySeat === 1;
  const active = () => localStream !== null;

  const sendSignal = (signal: VoiceSignal) => {
    connection.send({ t: 'voice_signal', signal });
  };

  const sendPresence = () => {
    sendSignal({ kind: 'presence', active: active(), muted: get().muted });
  };

  const teardownPeer = () => {
    if (pc) {
      pc.onnegotiationneeded = null;
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      pc = null;
    }
    if (remoteAudio) {
      remoteAudio.srcObject = null;
      remoteAudio.remove();
      remoteAudio = null;
    }
    makingOffer = false;
    ignoreOffer = false;
    isSettingRemoteAnswerPending = false;
  };

  const stopMic = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    localStream = null;
  };

  const ensurePeer = () => {
    if (pc || !localStream) return;
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

    pc.onnegotiationneeded = async () => {
      if (!pc) return;
      try {
        makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) sendSignal({ kind: 'offer', sdp: pc.localDescription.sdp });
      } catch {
        // A torn-down peer mid-negotiation is fine to ignore
      } finally {
        makingOffer = false;
      }
    };

    pc.onicecandidate = (e) => {
      sendSignal({ kind: 'ice', candidate: e.candidate ? e.candidate.toJSON() : null });
    };

    pc.ontrack = (e) => {
      if (!remoteAudio) {
        remoteAudio = document.createElement('audio');
        remoteAudio.autoplay = true;
        remoteAudio.style.display = 'none';
        document.body.appendChild(remoteAudio);
      }
      remoteAudio.srcObject = e.streams[0] ?? new MediaStream([e.track]);
      void remoteAudio.play().catch(() => {
        // Autoplay policies: joining voice required a tap, so this rarely fires
      });
    };

    pc.onconnectionstatechange = () => {
      if (!pc) return;
      if (pc.connectionState === 'connected') {
        set({ status: 'connected' });
      } else if (pc.connectionState === 'failed') {
        // One recovery attempt, then fall back to waiting for a fresh offer
        pc.restartIce?.();
        set({ status: 'connecting' });
      } else if (pc.connectionState === 'disconnected') {
        set({ status: 'connecting' });
      }
    };

    set({ status: 'connecting' });
  };

  /** Both channels open and we can reach the peer — (re)build the call. */
  const maybeConnect = () => {
    if (active() && get().peerActive) ensurePeer();
  };

  return {
    status: 'idle',
    muted: false,
    peerActive: false,
    peerMuted: false,
    error: null,

    joinVoice: async () => {
      if (active() || get().status === 'requesting-mic') return;
      set({ status: 'requesting-mic', error: null });
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        set({
          status: 'error',
          error: 'Microphone unavailable. Check the browser permission and try again.',
        });
        return;
      }
      // Respect a mute chosen before joining
      localStream.getAudioTracks().forEach((t) => (t.enabled = !get().muted));
      set({ status: get().peerActive ? 'connecting' : 'waiting' });
      sendPresence();
      maybeConnect();
    },

    leaveVoice: () => {
      const wasActive = active();
      teardownPeer();
      stopMic();
      if (wasActive) {
        sendSignal({ kind: 'bye' });
        sendPresence();
      }
      set({ status: 'idle' });
    },

    toggleMute: () => {
      const muted = !get().muted;
      localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
      set({ muted });
      if (active()) sendPresence();
    },

    _setSeat: (seat) => {
      mySeat = seat;
    },

    _handleSignal: (signal) => {
      switch (signal.kind) {
        case 'presence': {
          const wasPeerActive = get().peerActive;
          set({ peerActive: signal.active, peerMuted: signal.muted });
          if (signal.active && !wasPeerActive) {
            // Late joiner may not know about us — answer with our presence.
            if (active()) sendPresence();
            maybeConnect();
          }
          if (!signal.active) {
            teardownPeer();
            if (active()) set({ status: 'waiting' });
          }
          break;
        }

        case 'offer': {
          if (!active()) {
            // Not in voice — the peerActive flag (via presence) drives the
            // "opponent wants to talk" UI; ignore the SDP itself.
            return;
          }
          void (async () => {
            ensurePeer();
            if (!pc) return;
            const readyForOffer =
              !makingOffer && (pc.signalingState === 'stable' || isSettingRemoteAnswerPending);
            ignoreOffer = !polite() && !readyForOffer;
            if (ignoreOffer) return;
            try {
              await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
              await pc.setLocalDescription();
              if (pc.localDescription) sendSignal({ kind: 'answer', sdp: pc.localDescription.sdp });
            } catch {
              // Stale negotiation — the next offer/answer round recovers
            }
          })();
          break;
        }

        case 'answer': {
          if (!pc) return;
          void (async () => {
            try {
              isSettingRemoteAnswerPending = true;
              await pc!.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
            } catch {
              // Stale answer after a teardown — ignore
            } finally {
              isSettingRemoteAnswerPending = false;
            }
          })();
          break;
        }

        case 'ice': {
          if (!pc || !signal.candidate) return;
          void pc.addIceCandidate(signal.candidate).catch(() => {
            if (!ignoreOffer) {
              // Candidates for a rolled-back offer are expected noise
            }
          });
          break;
        }

        case 'bye': {
          teardownPeer();
          set({ peerActive: false, peerMuted: false, status: active() ? 'waiting' : 'idle' });
          break;
        }
      }
    },

    _onPeerConnectivity: (connected) => {
      if (!connected) {
        // Their socket (and any call) is gone; keep our mic open so the call
        // resumes when they come back.
        teardownPeer();
        set({ peerActive: false, peerMuted: false, ...(active() ? { status: 'waiting' as const } : {}) });
        return;
      }
      // Opponent (re)connected — advertise our channel so they can rejoin.
      if (active()) sendPresence();
    },

    _reset: () => {
      teardownPeer();
      stopMic();
      set({ status: 'idle', muted: false, peerActive: false, peerMuted: false, error: null });
    },
  };
});
