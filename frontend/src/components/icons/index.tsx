/**
 * LuduChips icon set — every glyph in the product is drawn here by hand on a
 * 24px grid: 1.8px strokes, round caps, filled details in `currentColor`.
 * No emoji, no third-party icon fonts.
 */
import type { ReactNode, SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function Icon({
  size = 20,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

// ── Dice ───────────────────────────────────────────────────────────

const PIPS: Record<number, [number, number][]> = {
  1: [[12, 12]],
  2: [
    [8.6, 15.4],
    [15.4, 8.6],
  ],
  3: [
    [8.2, 15.8],
    [12, 12],
    [15.8, 8.2],
  ],
  4: [
    [8.6, 8.6],
    [15.4, 8.6],
    [8.6, 15.4],
    [15.4, 15.4],
  ],
  5: [
    [8.6, 8.6],
    [15.4, 8.6],
    [12, 12],
    [8.6, 15.4],
    [15.4, 15.4],
  ],
  6: [
    [8.6, 7.6],
    [15.4, 7.6],
    [8.6, 12],
    [15.4, 12],
    [8.6, 16.4],
    [15.4, 16.4],
  ],
};

export function IconDieFace({ value, ...rest }: IconProps & { value: number }) {
  const pips = PIPS[Math.min(6, Math.max(1, value))];
  return (
    <Icon {...rest}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.2" />
      {pips.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="1.55"
          fill="currentColor"
          stroke="none"
        />
      ))}
    </Icon>
  );
}

/** Two tumbling dice — the game's mark. */
export function IconDice(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 8.6V5.2A2.2 2.2 0 0 1 11.2 3h7.6A2.2 2.2 0 0 1 21 5.2v7.6a2.2 2.2 0 0 1-2.2 2.2h-3.4" />
      <rect x="3" y="9" width="12" height="12" rx="2.4" />
      <circle cx="7" cy="13" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="11" cy="17" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="8.4" r="1.15" fill="currentColor" stroke="none" />
    </Icon>
  );
}

// ── HUD & lobby ────────────────────────────────────────────────────

export function IconCrown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 16.5 3.4 8.2 8.6 11.6 12 5.6l3.4 6 5.2-3.4L20 16.5Z" />
      <path d="M5.4 20h13.2" />
    </Icon>
  );
}

export function IconTrophy(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 4h9v5.2a4.5 4.5 0 0 1-9 0Z" />
      <path d="M7.5 6H4.4v1.2a3.6 3.6 0 0 0 3.3 3.6" />
      <path d="M16.5 6h3.1v1.2a3.6 3.6 0 0 1-3.3 3.6" />
      <path d="M12 13.7v3" />
      <path d="M9 20.3c.3-2.2 1.4-3.6 3-3.6s2.7 1.4 3 3.6Z" />
    </Icon>
  );
}

export function IconTimer(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="13.4" r="7.1" />
      <path d="M12 13.4V9.8" />
      <path d="M9.6 3.4h4.8" />
      <path d="M12 3.4v2.9" />
    </Icon>
  );
}

export function IconGear(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.3" />
      <path d="M12 3.2v2.5M12 18.3v2.5M3.2 12h2.5M18.3 12h2.5M5.9 5.9l1.7 1.7M16.4 16.4l1.7 1.7M18.1 5.9l-1.7 1.7M7.6 16.4l-1.7 1.7" />
    </Icon>
  );
}

export function IconMic(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="9.2" y="3.2" width="5.6" height="10.4" rx="2.8" />
      <path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0" />
      <path d="M12 17.8v2.6" />
      <path d="M9 20.4h6" />
    </Icon>
  );
}

export function IconMicOff(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.2 6a2.8 2.8 0 0 1 5.6 0v4.8a2.8 2.8 0 0 1-.5 1.6M9.2 9.4v1.4a2.8 2.8 0 0 0 3.9 2.6" />
      <path d="M5.6 11.4a6.4 6.4 0 0 0 10.4 5M18.4 11.4a6.3 6.3 0 0 1-.7 2.9" />
      <path d="M12 17.8v2.6M9 20.4h6" />
      <path d="M4.2 4.2 19.8 19.8" />
    </Icon>
  );
}

export function IconChat(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7a2.6 2.6 0 0 1 2.6-2.6h10.8A2.6 2.6 0 0 1 20 7v6.6a2.6 2.6 0 0 1-2.6 2.6H10l-4.4 3.9v-3.9h-1A2.6 2.6 0 0 1 4 13.6Z" />
    </Icon>
  );
}

export function IconSend(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.4 3.9 14.7 20a.5.5 0 0 1-.94.03L11.4 13.5 4.9 11.1a.5.5 0 0 1 .03-.94L20 4.5" />
      <path d="M20.4 3.9 11.4 13.5" />
    </Icon>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="8.8" y="8.8" width="11.4" height="11.4" rx="2.2" />
      <path d="M5.6 15.2h-.9A1.9 1.9 0 0 1 2.8 13.3V4.7a1.9 1.9 0 0 1 1.9-1.9h8.6a1.9 1.9 0 0 1 1.9 1.9v.9" />
    </Icon>
  );
}

export function IconLink(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 14.5a3.6 3.6 0 0 0 5.1 0l3.2-3.2a3.6 3.6 0 0 0-5.1-5.1l-1.6 1.6" />
      <path d="M14.5 9.5a3.6 3.6 0 0 0-5.1 0l-3.2 3.2a3.6 3.6 0 0 0 5.1 5.1l1.6-1.6" />
    </Icon>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4.8 12.6 4.7 4.7L19.2 6.9" />
    </Icon>
  );
}

export function IconX(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8.4" r="3.3" />
      <path d="M3.4 20c0-3.1 2.5-5.6 5.6-5.6s5.6 2.5 5.6 5.6" />
      <path d="M15.4 5.3a3.3 3.3 0 0 1 0 6.2" />
      <path d="M17.4 14.7c1.9.8 3.2 2.9 3.2 5.3" />
    </Icon>
  );
}

export function IconBot(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.6" y="8" width="14.8" height="11" rx="3" />
      <path d="M12 8V5" />
      <circle cx="12" cy="3.8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9.2" cy="13" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="13" r="1.3" fill="currentColor" stroke="none" />
      <path d="M9.5 16.6h5" />
    </Icon>
  );
}

export function IconWifi(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.8 10.2a12 12 0 0 1 16.4 0" />
      <path d="M6.8 13.6a7.5 7.5 0 0 1 10.4 0" />
      <path d="M9.8 16.9a3.6 3.6 0 0 1 4.4 0" />
      <circle cx="12" cy="19.6" r="1.15" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconWifiOff(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.8 13.6a7.5 7.5 0 0 1 4-2M14.9 12.3c.8.3 1.6.7 2.3 1.3" />
      <path d="M3.8 10.2a12 12 0 0 1 5.2-3M14.9 6.6a12 12 0 0 1 5.3 3.6" />
      <path d="M9.8 16.9a3.6 3.6 0 0 1 4.4 0" />
      <circle cx="12" cy="19.6" r="1.15" fill="currentColor" stroke="none" />
      <path d="M4.2 4.2 19.8 19.8" />
    </Icon>
  );
}

/** Pair with the `animate-spin` utility. */
export function IconSpinner(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
    </Icon>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.2 5.4v13.2L19 12Z" fill="currentColor" />
    </Icon>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 12H5.4" />
      <path d="M11 5.6 4.6 12l6.4 6.4" />
    </Icon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5.5 9 6.5 6.5L18.5 9" />
    </Icon>
  );
}

export function IconLeave(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.5 8V5.6a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v12.8a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2V16" />
      <path d="M17.2 8.6 20.6 12l-3.4 3.4" />
      <path d="M20.6 12H9.6" />
    </Icon>
  );
}

export function IconSwords(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4.6 4.6 11 11M19.4 19.4 15.6 15.6M14 18.2l4.2-4.2" />
      <path d="m19.4 4.6-11 11M4.6 19.4 8.4 15.6M5.8 14l4.2 4.2" />
    </Icon>
  );
}

export function IconHome(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.6 10.8 12 4.2l7.4 6.6v8a1.6 1.6 0 0 1-1.6 1.6H6.2a1.6 1.6 0 0 1-1.6-1.6Z" />
      <path d="M9.8 20.4v-5.6h4.4v5.6" />
    </Icon>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 3.4 13.7 10.3 20.6 12 13.7 13.7 12 20.6 10.3 13.7 3.4 12 10.3 10.3Z"
        fill="currentColor"
        stroke="none"
      />
    </Icon>
  );
}

// ── Reactions (emote bar / floating overlay) ───────────────────────

export function IconFlame(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.4c.7 2.5.2 4.4-1.5 6.3C9 11.4 8 13 8 14.8a4 4 0 0 0 8 0c0-1.5-.6-2.9-1.6-4.1-.5.9-1.1 1.5-1.9 1.9.8-3 .4-6.1-.5-9.2Z" />
      <path d="M10.6 16.4a1.6 1.6 0 0 0 2.8 0" />
    </Icon>
  );
}

export function IconStar(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8Z" />
    </Icon>
  );
}

export function IconSkull(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.4a7.2 7.2 0 0 0-7.2 7.2c0 2.5 1.3 4.3 3 5.5v2.4A1.5 1.5 0 0 0 9.3 20h5.4a1.5 1.5 0 0 0 1.5-1.5v-2.4c1.7-1.2 3-3 3-5.5A7.2 7.2 0 0 0 12 3.4Z" />
      <circle cx="9.3" cy="10.9" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="10.9" r="1.5" fill="currentColor" stroke="none" />
      <path d="m12 13.4-.9 1.8h1.8Z" fill="currentColor" stroke="none" />
      <path d="M10.6 20v-1.7M13.4 20v-1.7" />
    </Icon>
  );
}

export function IconClap(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.2 11.4V6a1.2 1.2 0 0 1 2.4 0v4.6" />
      <path d="M10.6 10.6V4.8a1.2 1.2 0 0 1 2.4 0v5.8" />
      <path d="M13 10.6V5.6a1.2 1.2 0 0 1 2.4 0v5.6" />
      <path d="M15.4 11.2V7.6a1.2 1.2 0 0 1 2.4 0v5.9a6 6 0 0 1-6 6h-.4a5.6 5.6 0 0 1-4.6-2.4l-2.5-3.7a1.3 1.3 0 0 1 2.1-1.5l1.8 2.2" />
      <path d="M4 6.2 5.4 7.4M3.2 9.8h1.9" />
    </Icon>
  );
}

export function IconEyes(props: IconProps) {
  return (
    <Icon {...props}>
      <ellipse cx="7.8" cy="12" rx="3.4" ry="5" />
      <ellipse cx="16.2" cy="12" rx="3.4" ry="5" />
      <circle cx="8.7" cy="13.4" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17.1" cy="13.4" r="1.3" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconConfetti(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.4 19.6 8.8 8.8l6.4 6.4Z" />
      <path d="M9.9 11.6 12.9 14.6" strokeOpacity="0.55" />
      <path d="M15.6 6.8c1.6-.4 2.4-1.4 2.4-3.2" />
      <circle cx="14.5" cy="4.6" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="19.6" cy="8.8" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="17.6" cy="13" r="1.05" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconLaugh(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M7.7 9.7c.5-1 2-1 2.5 0M13.8 9.7c.5-1 2-1 2.5 0" />
      <path d="M7.6 13.2h8.8a4.4 4.4 0 0 1-8.8 0Z" />
    </Icon>
  );
}

export function IconShock(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="8.9" cy="9.6" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="15.1" cy="9.6" r="1.35" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="15.3" rx="2" ry="2.5" />
    </Icon>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.2 3.2 5.6 13.6h4.6L10.8 20.8 18.4 10.4h-4.6Z" />
    </Icon>
  );
}

/** Casino chip: outer ring with edge ticks around an inner disc. */
export function IconChip(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx={12} cy={12} r={9} />
      <circle cx={12} cy={12} r={4.1} />
      <path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21" />
      <path d="M5.65 5.65l2.3 2.3M18.35 18.35l-2.3-2.3M18.35 5.65l-2.3 2.3M5.65 18.35l2.3-2.3" />
    </Icon>
  );
}

// ── Avatars ────────────────────────────────────────────────────────

/** Filled pawn silhouette used for avatars and the brand. */
function PawnGlyph() {
  return (
    <g fill="currentColor" stroke="none">
      <circle cx="12" cy="7" r="3.1" />
      <path d="M9.9 9.9c-1.6 1.3-2.6 3.3-2.8 5.9h9.8c-.2-2.6-1.2-4.6-2.8-5.9a3.9 3.9 0 0 1-4.2 0Z" />
      <rect x="6.6" y="16.8" width="10.8" height="3.2" rx="1.5" />
    </g>
  );
}

function CrownGlyph() {
  return (
    <g fill="currentColor" stroke="none">
      <path d="M4.4 16 3.8 8.4l4.7 3L12 6l3.5 5.4 4.7-3L19.6 16Z" />
      <rect x="5" y="17.4" width="14" height="2.4" rx="1.1" />
    </g>
  );
}

function StarGlyph() {
  return (
    <g fill="currentColor" stroke="none">
      <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8Z" />
    </g>
  );
}

function BoltGlyph() {
  return (
    <g fill="currentColor" stroke="none">
      <path d="M13.4 3 5.4 13.8h4.8L10.6 21l8-10.8h-4.8Z" />
    </g>
  );
}

function FlameGlyph() {
  return (
    <g fill="currentColor" stroke="none">
      <path d="M12 3c.8 2.7.2 4.7-1.6 6.7C8.9 11.4 8 13 8 14.9a4 4 0 0 0 8 0c0-1.6-.7-3-1.7-4.3-.5 1-1.1 1.6-2 2 .9-3.1.5-6.3-.3-9.6Z" />
    </g>
  );
}

function TargetGlyph() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="7.4" />
      <circle cx="12" cy="12" r="3.9" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </g>
  );
}

function GemGlyph() {
  return (
    <g fill="currentColor" stroke="none">
      <path d="M7.2 4h9.6l3.6 5.2L12 20.4 3.6 9.2Z" />
      <path
        d="M7.2 4 12 9.2 16.8 4M3.6 9.2h16.8M12 9.2v11.2"
        stroke="rgba(0,0,0,0.28)"
        strokeWidth="1.1"
        fill="none"
      />
    </g>
  );
}

function MoonGlyph() {
  return (
    <g fill="currentColor" stroke="none">
      <path d="M14.8 3.6a8.6 8.6 0 1 0 5.9 12.2A7.1 7.1 0 0 1 14.8 3.6Z" />
    </g>
  );
}

export interface AvatarDef {
  id: string;
  label: string;
  hue: string;
  Glyph: () => ReactNode;
}

export const AVATARS: AvatarDef[] = [
  { id: "pawn", label: "Pawn", hue: "#F6B73C", Glyph: PawnGlyph },
  { id: "crown", label: "Crown", hue: "#E9A13B", Glyph: CrownGlyph },
  { id: "star", label: "Star", hue: "#8B5CF6", Glyph: StarGlyph },
  { id: "bolt", label: "Bolt", hue: "#3B82F6", Glyph: BoltGlyph },
  { id: "flame", label: "Flame", hue: "#EF6C3B", Glyph: FlameGlyph },
  { id: "target", label: "Target", hue: "#22C55E", Glyph: TargetGlyph },
  { id: "gem", label: "Gem", hue: "#06B6D4", Glyph: GemGlyph },
  { id: "moon", label: "Moon", hue: "#A78BFA", Glyph: MoonGlyph },
];

const AVATAR_MAP = new Map(AVATARS.map((a) => [a.id, a]));

export function AvatarBadge({
  avatarId,
  size = 36,
  color,
  className,
}: {
  avatarId: string;
  size?: number;
  /** Override the roundel color (e.g. the player's board color). */
  color?: string;
  className?: string;
}) {
  const def = AVATAR_MAP.get(avatarId) ?? AVATARS[0];
  const bg = color ?? def.hue;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="11" fill={bg} opacity="0.22" />
      <circle
        cx="12"
        cy="12"
        r="11"
        fill="none"
        stroke={bg}
        strokeWidth="1.4"
      />
      <g style={{ color: bg }} transform="translate(2.9,2.9) scale(0.76)">
        <def.Glyph />
      </g>
    </svg>
  );
}

// ── Reaction registry (replaces the emoji emote list) ──────────────

export interface EmoteDef {
  id: string;
  label: string;
  Icon: (props: IconProps) => ReactNode;
  color: string;
}

export const EMOTES: EmoteDef[] = [
  { id: "flame", label: "On fire", Icon: IconFlame, color: "#EF6C3B" },
  { id: "laugh", label: "Laugh", Icon: IconLaugh, color: "#F6B73C" },
  { id: "shock", label: "Shocked", Icon: IconShock, color: "#A78BFA" },
  { id: "confetti", label: "Party", Icon: IconConfetti, color: "#22C55E" },
  { id: "skull", label: "Wrecked", Icon: IconSkull, color: "#9898A8" },
  { id: "clap", label: "Applause", Icon: IconClap, color: "#3B82F6" },
  { id: "eyes", label: "Watching", Icon: IconEyes, color: "#06B6D4" },
  { id: "crown", label: "Royalty", Icon: IconCrown, color: "#E9A13B" },
];

export const EMOTE_MAP = new Map(EMOTES.map((e) => [e.id, e]));
