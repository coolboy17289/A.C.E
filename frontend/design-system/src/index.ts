/**
 * @ace/design-system — A.C.E OS touch-first design system.
 *
 * Re-exports every primitive in one place so apps can:
 *
 *   import {
 *     TouchButton, TouchCard, TouchIconButton,
 *     VirtualKeyboard, ThemeProvider, useResolvedTheme,
 *     palette, spacing,
 *   } from '@ace/design-system';
 */

// Side-effect: keyboard focus rings and prefers-reduced-motion. Picked
// up by Vite at build time and bundled into every design-system
// consumer so no app has to wire it up explicitly.
import './a11y.css';

export { palette, minTapGapMs, type, type ThemeMode, type ThemePalette } from './theme.js';
export {
  spacing, minTouchTarget, primaryTouchTarget, largeTouchTarget,
  radius, buttonPadding,
} from './spacing.js';
export { useDebouncedTap, type TapHandler } from './debounce.js';
export { TouchProvider, useTouchContext } from './touch-context.js';
export {
  ThemeProvider, useResolvedTheme, useThemeControl,
} from './theme-provider.js';

export {
  TouchButton, type TouchButtonProps,
  type ButtonSize, type ButtonVariant,
} from './touch-button.js';
export { TouchIconButton, type TouchIconButtonProps } from './touch-icon-button.js';
export { TouchCard, type TouchCardProps, type CardVariant } from './touch-card.js';
export { TouchRow, type TouchRowProps } from './row.js';
export { VirtualKeyboard, type VirtualKeyboardProps } from './virtual-keyboard.js';
