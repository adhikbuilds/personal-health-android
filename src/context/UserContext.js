// ActiveBharat — Global User Context (with DataBridge)
// ─────────────────────────────────────────────────────────────────────────────
// DataBridge: tracks whether we're on mock or real data.
// Real-data mode activates when athlete.sessions > 3 from API.
// All screens read from userData — one consistent source of truth.
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { INITIAL_USER_DATA } from '../data/constants';
import api from '../services/api';

const UserContext = createContext(null);

export function UserProvider({ children }) {
    const [userData, setUserData] = useState(INITIAL_USER_DATA);
    const [recentSession, setRecentSession] = useState(null);
    const [dataMode, setDataMode] = useState('mock'); // 'mock' | 'real' | 'hybrid'

    // On mount: load real athlete data from API — merge over mock defaults
    useEffect(() => {
        api.getAthlete(INITIAL_USER_DATA.avatarId).then(athlete => {
            if (!athlete?.id) return;
            const realSessions = athlete.sessions || 0;
            const newMode = realSessions > 3 ? 'real' : realSessions > 0 ? 'hybrid' : 'mock';
            setDataMode(newMode);
            setUserData(prev => ({
                ...prev,
                bpi: athlete.bpi ?? prev.bpi,
                sessions: realSessions ?? prev.sessions,
                scoutReadiness: prev.scoutReadiness, // computed locally for now
                // name/tier/level/xp/streak stay as-is until auth is implemented
            }));
        }).catch(() => { });
    }, []);

    const addXp = useCallback((xpEarned, sessionSummary = null) => {
        setUserData(prev => {
            const newXp = prev.xp + xpEarned;
            const newBpi = (prev.bpi ?? 12450) + Math.round(xpEarned * 0.5);
            const levelUp = newXp >= prev.xpRequired && prev.level < 7;
            const newSessions = (prev.sessions ?? 0) + 1;
            // Unlock real-data mode once enough sessions are recorded
            if (newSessions > 3) setDataMode('real');
            else if (newSessions > 0) setDataMode('hybrid');
            return {
                ...prev,
                xp: newXp,
                bpi: newBpi,
                sessions: newSessions,
                level: levelUp ? prev.level + 1 : prev.level,
                xpRequired: levelUp ? Math.round(prev.xpRequired * 1.4) : prev.xpRequired,
                streak: prev.streak,
                // Bump scout readiness slightly per session
                scoutReadiness: Math.min(100, prev.scoutReadiness + Math.round(xpEarned / 120)),
            };
        });
        if (sessionSummary) setRecentSession(sessionSummary);
    }, []);

    const updateScoutReadiness = useCallback((delta) => {
        setUserData(prev => ({
            ...prev,
            scoutReadiness: Math.min(100, Math.max(0, prev.scoutReadiness + delta)),
        }));
    }, []);

    return (
        <UserContext.Provider value={{ userData, addXp, updateScoutReadiness, recentSession, dataMode }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser must be used inside UserProvider');
    return ctx;
}
