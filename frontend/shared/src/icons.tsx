/**
 * A.C.E OS icon library.
 *
 * One inline-SVG component per glyph. No font, no third-party library -
 * keeps the bundle small for the Pi and avoids the emoji-font dependency
 * we used to need.
 *
 * - For utility glyphs (close, bell, search, etc.) `<Icon name="…"/>` renders
 *   the line-art at the requested size with `currentColor`.
 * - For full app "tiles" (rounded gradient + white symbol) use
 *   `<AppTile appId="…" size={56} accent="#60a5fa"/>`.
 */

import React from 'react';

const baseProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

interface GlyphProps extends Omit<React.SVGProps<SVGSVGElement>, 'size' | 'stroke'> {
  size?: number;
  strokeWidth?: number;
}

const make = (children: React.ReactNode): React.FC<GlyphProps> => ({
  size = 24, strokeWidth, ...rest
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden
    focusable={false}
    {...baseProps}
    strokeWidth={strokeWidth ?? baseProps.strokeWidth}
    {...rest}
  >
    {children}
  </svg>
);

/* ----------------- App glyphs ----------------- */

export const HomeGlyph = make(
  <>
    <path d="M3 12 12 3l9 9" />
    <path d="M5 10v10h14V10" />
    <path d="M10 21v-7h4v7" />
  </>,
);

export const PlannerGlyph = make(
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <path d="M8 14h3M8 18h3" />
  </>,
);

export const TasksGlyph = make(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12l3 3 5-6" />
  </>,
);

export const FocusGlyph = make(
  <>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5" />
    <path d="M9 2h6" />
    <path d="M12 5V2" />
  </>,
);

export const SubjectsGlyph = make(
  <>
    <path d="M3 6a2 2 0 0 1 2-2h6v18H5a2 2 0 0 1-2-2V6Z" />
    <path d="M21 6a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 0 2-2V6Z" />
    <path d="M7 8h2M7 12h2M15 8h2M15 12h2" />
  </>,
);

export const AIGlyph = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    <circle cx="6" cy="6" r="1.4" />
    <circle cx="18" cy="6" r="1.4" />
    <circle cx="6" cy="18" r="1.4" />
    <circle cx="18" cy="18" r="1.4" />
  </>,
);

export const StatsGlyph = make(
  <>
    <path d="M3 21h18" />
    <rect x="6" y="13" width="3" height="6" rx="1" />
    <rect x="11" y="9" width="3" height="10" rx="1" />
    <rect x="16" y="5" width="3" height="14" rx="1" />
  </>,
);

export const SettingsGlyph = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </>,
);

/* ----------------- Utility glyphs ----------------- */

export const SearchGlyph = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </>,
);

export const BellGlyph = make(
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </>,
);

export const WifiGlyph = make(
  <>
    <path d="M2 9c6-6 14-6 20 0" />
    <path d="M5 12.5c4-4 10-4 14 0" />
    <path d="M8.5 16c2-2 5-2 7 0" />
    <circle cx="12" cy="20" r="1" fill="currentColor" />
  </>,
);

export const BluetoothGlyph = make(
  <>
    <path d="m7 7 10 10-5 5V2l5 5L7 17" />
    <path d="M2 2 22 22" />
  </>,
);

export const BatteryGlyph = make(
  <>
    <rect x="2" y="7" width="18" height="10" rx="2" />
    <path d="M22 11v2" />
    <rect x="4" y="9" width="6" height="6" rx="1" />
  </>,
);

export const UserGlyph = make(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>,
);

export const PlusGlyph = make(<>
  <path d="M12 5v14M5 12h14" />
</>);

export const CloseGlyph = make(
  <>
    <path d="M5 5l14 14M19 5L5 19" />
  </>,
);

export const MinimizeGlyph = make(<>
  <path d="M5 12h14" />
</>);

export const MaximizeGlyph = make(
  <>
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </>,
);

/** "Restore" — two overlapping squares. Shown when a window is already maximized. */
export const RestoreGlyph = make(
  <>
    <rect x="7" y="7" width="11" height="11" rx="1.5" />
    <path d="M4 16V6a2 2 0 0 1 2-2h10" />
  </>,
);

export const CheckGlyph = make(
  <>
    <path d="M5 12l5 5L20 6" />
  </>,
);

export const RefreshGlyph = make(
  <>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </>,
);

export const UploadGlyph = make(
  <>
    <path d="M12 3v14" />
    <path d="m7 8 5-5 5 5" />
    <path d="M3 21h18" />
  </>,
);

export const PowerGlyph = make(
  <>
    <path d="M12 3v9" />
    <path d="M18.4 7a8 8 0 1 1-12.8 0" />
  </>,
);

export const TrashGlyph = make(
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="m19 6-1 15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </>,
);

export const PenGlyph = make(
  <>
    <path d="M3 21h4L21 7l-4-4L3 17v4Z" />
    <path d="m14 5 4 4" />
  </>,
);

export const PaletteGlyph = make(
  <>
    <path d="M12 22a10 10 0 1 1 10-10c0 2.4-1.5 4-3 4h-2a2 2 0 0 0-2 2 2 2 0 0 1-2 2Z" />
    <circle cx="7" cy="11" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="11" cy="7" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="16" cy="7" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </>,
);

export const SunGlyph = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
);

export const MoonGlyph = make(
  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
);

export const ImageGlyph = make(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="m3 16 5-5 4 4 3-3 6 6" />
    <circle cx="9" cy="9" r="2" />
  </>,
);

export const ChevronLeftGlyph = make(<path d="m15 6-6 6 6 6" />);
export const ChevronRightGlyph = make(<path d="m9 6 6 6-6 6" />);

export const ResetGlyph = make(
  <>
    <path d="M3 12a9 9 0 1 0 9-9" />
    <path d="M3 3v6h6" />
  </>,
);

/* ----------------- Dispatcher ----------------- */

export type IconName =
  | 'home' | 'planner' | 'tasks' | 'focus' | 'subjects' | 'ai' | 'statistics' | 'settings'
  | 'search' | 'bell' | 'wifi' | 'bluetooth' | 'battery' | 'user'
  | 'plus' | 'close' | 'minimize' | 'maximize' | 'restore' | 'check' | 'refresh' | 'reset'
  | 'upload' | 'power' | 'trash' | 'pen' | 'palette' | 'sun' | 'moon' | 'image'
  | 'chevron-left' | 'chevron-right';

const REGISTRY: Record<IconName, React.FC<GlyphProps>> = {
  home: HomeGlyph, planner: PlannerGlyph, tasks: TasksGlyph, focus: FocusGlyph,
  subjects: SubjectsGlyph, ai: AIGlyph, statistics: StatsGlyph, settings: SettingsGlyph,
  search: SearchGlyph, bell: BellGlyph, wifi: WifiGlyph, bluetooth: BluetoothGlyph,
  battery: BatteryGlyph, user: UserGlyph,
  plus: PlusGlyph, close: CloseGlyph, minimize: MinimizeGlyph, maximize: MaximizeGlyph, restore: RestoreGlyph,
  check: CheckGlyph, refresh: RefreshGlyph, reset: ResetGlyph,
  upload: UploadGlyph, power: PowerGlyph, trash: TrashGlyph, pen: PenGlyph,
  palette: PaletteGlyph, sun: SunGlyph, moon: MoonGlyph, image: ImageGlyph,
  'chevron-left': ChevronLeftGlyph, 'chevron-right': ChevronRightGlyph,
};

/** Renders the glyph for `name` at the requested pixel size. */
export const Icon: React.FC<{ name: IconName } & GlyphProps> = ({ name, ...rest }) => {
  const C = REGISTRY[name];
  if (!C) return null;
  return <C {...rest} />;
};

/* ----------------- App Tile ----------------- */

// AppTile accepts any app identifier (registered or parked). Parked ids
// still render their glyph because the icon REGISTRY contains HomeGlyph,
// FocusGlyph, etc. even when those apps are not in APP_REGISTRY.
export type TileAppId =
  | 'home' | 'planner' | 'tasks' | 'focus' | 'subjects' | 'ai' | 'statistics' | 'settings'
  | (string & {}); // widen to any string while keeping autocomplete for known ids

interface AppTileProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
  appId: TileAppId;
  accent: string;
  size?: number;
}

/**
 * Darken a CSS colour for the gradient endpoint. Accepts:
 *   - 6-digit hex `#rrggbb` or `rrggbb`
 *   - 3-digit hex `#rgb` or `rgb`
 *   - any other string (`var(--x)`, `rgb(...)`, named colour) — returned
 *     as-is so the gradient still falls back to a flat fill instead of
 *     crashing on the CSS variable we use as a runtime default.
 */
function darkenHex(color: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(color);
  if (m) {
    const r = parseInt(m[1].slice(0, 2), 16);
    const g = parseInt(m[1].slice(2, 4), 16);
    const b = parseInt(m[1].slice(4, 6), 16);
    const f = 1 - amount / 100;
    return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`;
  }
  const short = /^#?([0-9a-f]{3})$/i.exec(color);
  if (short) {
    const r = parseInt(short[1][0] + short[1][0], 16);
    const g = parseInt(short[1][1] + short[1][1], 16);
    const b = parseInt(short[1][2] + short[1][2], 16);
    const f = 1 - amount / 100;
    return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`;
  }
  return color;
}

/**
 * Rounded-square gradient tile with the app glyph centered.
 *
 * Designed to look like iOS / Material launcher tiles. The element is
 * decorative (`aria-hidden`); labels belong on the surrounding button
 * so screen readers don't announce the app name twice.
 */
export const AppTile: React.FC<AppTileProps> = ({
  appId, accent, size = 56, style, ...rest
}) => {
  const Glyph = (REGISTRY as Record<string, React.FC<GlyphProps> | undefined>)[appId];
  return (
    <span
      aria-hidden
      data-app-tile={appId}
      data-accent={accent}
      style={{
        width: size,
        height: size,
        borderRadius: '22%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${accent} 0%, ${darkenHex(accent, 30)} 100%)`,
        boxShadow: `inset 0 -2px 0 ${darkenHex(accent, 16)}80, 0 6px 14px ${accent}44`,
        color: 'white',
        ...style,
      }}
      {...rest}
    >
      {Glyph && (
        <Glyph
          size={Math.round(size * 0.5)}
          strokeWidth={2}
          style={{ color: 'white', stroke: 'white' }}
        />
      )}
    </span>
  );
};

/* ----------------- Wallpaper presets ----------------- */
// Wallpaper presets and the default gradient live in `./wallpapers.ts` so
// non-React imports (e.g. the Zustand store) don't pull this JSX module
// into the boot graph. Re-exported here for ergonomic imports.
export { WALLPAPER_PRESETS, DEFAULT_WALLPAPER_CSS } from './wallpapers.js';
export type { WallpaperPreset } from './wallpapers.js';
