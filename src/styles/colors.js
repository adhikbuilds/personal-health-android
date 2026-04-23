// ActiveBharat — Active Theme Tokens
// -----------------------------------------------------------------------------
// Re-exports the currently-active theme as `C`, `T`, `ZONES`, `LEVEL_COLORS`,
// `LEVEL_LABELS`, `GRADIENTS`, `P`. Screens import from here exactly as before.
//
// IMPORTANT: the active theme MUST be set (via applyTheme) BEFORE any screen
// module is imported. App.js does this at boot — it reads AsyncStorage and
// applies the theme synchronously, then dynamically requires the rest of
// the app. This works because every screen captures these values at module
// load time inside StyleSheet.create({...}).
//
// To change theme at runtime, call applyTheme(name) and then DevSettings.reload()
// (or a full app restart) so module-level styles re-evaluate.

import { THEMES, DEFAULT_THEME } from './themes';

let _active = DEFAULT_THEME;

// Mutable token objects — same reference for the lifetime of the JS bundle.
// applyTheme() rewrites their keys in place so any module that has imported
// them sees the latest values when it next reads them.
export const C            = { ...THEMES[DEFAULT_THEME].C };
export const T            = { ...THEMES[DEFAULT_THEME].T };
export const ZONES        = { ...THEMES[DEFAULT_THEME].ZONES };
export const LEVEL_COLORS = { ...THEMES[DEFAULT_THEME].LEVEL_COLORS };
export const LEVEL_LABELS = { ...THEMES[DEFAULT_THEME].LEVEL_LABELS };
export const GRADIENTS    = { ...THEMES[DEFAULT_THEME].GRADIENTS };
export const P            = { ...THEMES[DEFAULT_THEME].P };

function rewrite(target, source) {
    Object.keys(target).forEach((k) => { delete target[k]; });
    Object.assign(target, source);
}

export function applyTheme(name) {
    const t = THEMES[name] || THEMES[DEFAULT_THEME];
    _active = t.id;
    rewrite(C, t.C);
    rewrite(T, t.T);
    rewrite(ZONES, t.ZONES);
    rewrite(LEVEL_COLORS, t.LEVEL_COLORS);
    rewrite(LEVEL_LABELS, t.LEVEL_LABELS);
    rewrite(GRADIENTS, t.GRADIENTS);
    rewrite(P, t.P);
}

export function getActiveTheme() {
    return _active;
}

export default C;
