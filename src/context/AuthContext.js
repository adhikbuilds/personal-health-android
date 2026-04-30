import React, { createContext, useContext, useState } from 'react';
import api from '../services/api';
import { setSecure, deleteSecure } from '../services/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [authUser, setAuthUser] = useState(null);

    const login = async (email, password) => {
        const res = await api.authLogin(email, password);
        if (!res || res.error) throw new Error(res?.detail || res?.error || 'Login failed');
        if (res.access_token) {
            await setSecure('access_token', res.access_token);
            if (res.refresh_token) await setSecure('refresh_token', res.refresh_token);
        }
        setAuthUser(res.user || { email });
        return res;
    };

    const register = async (email, password, name) => {
        const res = await api.authRegister(name, email, password, 'athlete');
        if (!res || res.error) throw new Error(res?.detail || res?.error || 'Registration failed');
        if (res.access_token) {
            await setSecure('access_token', res.access_token);
            if (res.refresh_token) await setSecure('refresh_token', res.refresh_token);
        }
        setAuthUser(res.user || { email, name });
        return res;
    };

    const logout = async () => {
        await deleteSecure('access_token');
        await deleteSecure('refresh_token');
        setAuthUser(null);
    };

    return (
        <AuthContext.Provider value={{ authUser, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
