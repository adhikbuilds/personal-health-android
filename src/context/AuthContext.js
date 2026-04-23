// AuthContext — owns access/refresh tokens, persists them via SecureStore,
// installs the refresh + logout handlers that the api.js layer uses on 401.
//
// Bootstrapping:
//   1. On mount, read tokens from disk.
//   2. If we have an access token, push it into auth-token registry and call
//      /auth/me to confirm + load the user. If /me returns null we attempt
//      refresh; if that fails we drop to 'unauthed'.
//   3. status starts as 'loading' so the AuthGate can render a splash until
//      the bootstrap resolves.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import {
    setAccessToken,
    setRefreshHandler,
    setLogoutHandler,
    clearAccessToken,
} from '../services/auth-token';
import { setSecure, getSecure, deleteSecure } from '../services/storage';

const ACCESS_KEY  = 'auth.access_token';
const REFRESH_KEY = 'auth.refresh_token';
const USER_KEY    = 'auth.user_cache';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [status, setStatus]     = useState('loading');  // loading | unauthed | authed
    const [user, setUser]         = useState(null);
    const refreshTokenRef         = useRef(null);
    const refreshInFlightRef      = useRef(null);

    const _persistTokens = useCallback(async (access, refresh, u) => {
        setAccessToken(access);
        refreshTokenRef.current = refresh;
        await Promise.all([
            setSecure(ACCESS_KEY, access),
            setSecure(REFRESH_KEY, refresh),
            u ? setSecure(USER_KEY, JSON.stringify(u)) : Promise.resolve(),
        ]);
    }, []);

    const _clearAll = useCallback(async () => {
        clearAccessToken();
        refreshTokenRef.current = null;
        setUser(null);
        setStatus('unauthed');
        await Promise.all([
            deleteSecure(ACCESS_KEY),
            deleteSecure(REFRESH_KEY),
            deleteSecure(USER_KEY),
        ]);
    }, []);

    // Refresh handler used by api.js on 401. Returns true on success.
    const _doRefresh = useCallback(async () => {
        if (refreshInFlightRef.current) return refreshInFlightRef.current;
        const rt = refreshTokenRef.current;
        if (!rt) return false;
        const promise = (async () => {
            const res = await api.authRefresh(rt);
            if (res?.access_token) {
                refreshTokenRef.current = res.refresh_token || rt;
                setAccessToken(res.access_token);
                await Promise.all([
                    setSecure(ACCESS_KEY, res.access_token),
                    res.refresh_token ? setSecure(REFRESH_KEY, res.refresh_token) : Promise.resolve(),
                ]);
                return true;
            }
            return false;
        })();
        refreshInFlightRef.current = promise;
        try {
            return await promise;
        } finally {
            refreshInFlightRef.current = null;
        }
    }, []);

    const logout = useCallback(async () => {
        const rt = refreshTokenRef.current;
        if (rt) {
            try { await api.authLogout(rt); } catch (_) { /* server already gone, fine */ }
        }
        await _clearAll();
    }, [_clearAll]);

    // Install handlers exactly once so api.js can call into us.
    useEffect(() => {
        setRefreshHandler(_doRefresh);
        setLogoutHandler(_clearAll);  // 401 → just drop state, don't loop on /auth/logout
    }, [_doRefresh, _clearAll]);

    // Bootstrap: rehydrate tokens, validate via /me, fall through to refresh.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [access, refresh, cachedUserRaw] = await Promise.all([
                getSecure(ACCESS_KEY),
                getSecure(REFRESH_KEY),
                getSecure(USER_KEY),
            ]);
            if (cancelled) return;
            if (!access && !refresh) {
                setStatus('unauthed');
                return;
            }
            setAccessToken(access);
            refreshTokenRef.current = refresh;

            // Optimistically restore the cached user so the home screen has
            // something to render immediately; we'll re-validate via /me.
            if (cachedUserRaw) {
                try { setUser(JSON.parse(cachedUserRaw)); } catch (_) {}
            }

            const me = await api.authMe();
            if (cancelled) return;
            if (me?.id) {
                setUser(me);
                await setSecure(USER_KEY, JSON.stringify(me));
                setStatus('authed');
                return;
            }
            // Access token rejected — try refresh once
            const refreshed = refresh ? await _doRefresh() : false;
            if (cancelled) return;
            if (refreshed) {
                const me2 = await api.authMe();
                if (me2?.id) {
                    setUser(me2);
                    await setSecure(USER_KEY, JSON.stringify(me2));
                    setStatus('authed');
                    return;
                }
            }
            await _clearAll();
        })();
        return () => { cancelled = true; };
    }, [_doRefresh, _clearAll]);

    const login = useCallback(async (email, password) => {
        const res = await api.authLogin(email.trim().toLowerCase(), password);
        if (!res?.access_token) {
            throw new Error('Invalid email or password');
        }
        await _persistTokens(res.access_token, res.refresh_token, res.user);
        setUser(res.user);
        setStatus('authed');
        return res.user;
    }, [_persistTokens]);

    const register = useCallback(async (email, password, name) => {
        const res = await api.authRegister(email.trim().toLowerCase(), password, name);
        if (!res?.access_token) {
            throw new Error(res?.detail || 'Registration failed');
        }
        await _persistTokens(res.access_token, res.refresh_token, res.user);
        setUser(res.user);
        setStatus('authed');
        return res.user;
    }, [_persistTokens]);

    const value = { status, user, login, register, logout };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        return {
            status: 'unauthed',
            user: null,
            login: async () => { throw new Error('AuthProvider missing'); },
            register: async () => { throw new Error('AuthProvider missing'); },
            logout: async () => {},
        };
    }
    return ctx;
}
