// In-memory token registry shared by api.js and AuthContext.
// Lives at module scope so api.js can read tokens without importing React.
// AuthContext is the only writer — it pushes tokens here at login and clears
// them at logout. The refresh handler is also installed by AuthContext so
// that api.js can request a refresh on 401 without circular imports.

let _accessToken = null;
let _refreshHandler = null;   // async () => boolean — returns true if refresh succeeded
let _logoutHandler  = null;   // async () => void   — clears tokens + bumps state

export function getAccessToken() {
    return _accessToken;
}

export function setAccessToken(token) {
    _accessToken = token || null;
}

export function clearAccessToken() {
    _accessToken = null;
}

export function setRefreshHandler(fn) {
    _refreshHandler = typeof fn === 'function' ? fn : null;
}

export async function triggerRefresh() {
    if (!_refreshHandler) return false;
    try {
        return await _refreshHandler();
    } catch (_) {
        return false;
    }
}

export function setLogoutHandler(fn) {
    _logoutHandler = typeof fn === 'function' ? fn : null;
}

export async function triggerLogout() {
    if (_logoutHandler) {
        try { await _logoutHandler(); } catch (_) { /* ignore */ }
    }
    clearAccessToken();
}
