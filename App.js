// ActiveBharat — Root
// Loads the persisted theme BEFORE requiring any screen module so module-level
// StyleSheet.create() captures the right tokens. Screens are required lazily
// inside AppRoot to guarantee load order.

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyTheme, getActiveTheme } from './src/styles/colors';
import { THEMES, DEFAULT_THEME, THEME_STORAGE_KEY } from './src/styles/themes';

export default function App() {
    const [Root, setRoot] = useState(null);

    useEffect(() => {
        let cancelled = false;
        AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
            const name = saved && THEMES[saved] ? saved : DEFAULT_THEME;
            applyTheme(name);
            // Now that the theme is in place, require the rest of the app.
            // This ensures every screen's StyleSheet.create() captures the
            // right token values at module load time.
            const AppRoot = require('./src/AppRoot').default;
            if (!cancelled) setRoot(() => AppRoot);
        }).catch(() => {
            applyTheme(DEFAULT_THEME);
            const AppRoot = require('./src/AppRoot').default;
            if (!cancelled) setRoot(() => AppRoot);
        });
        return () => { cancelled = true; };
    }, []);

    if (!Root) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
    return <Root activeTheme={getActiveTheme()} />;
}
