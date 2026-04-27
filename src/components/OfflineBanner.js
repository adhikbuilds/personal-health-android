import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const OfflineBanner = () => {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        let interval = null;
        const check = async () => {
            try {
                const { API_BASE } = require('../constants');
                const r = await fetch(`${API_BASE}/livez`, { method: 'GET' });
                setIsOffline(!r.ok);
            } catch {
                setIsOffline(true);
            }
        };
        check();
        interval = setInterval(check, 10000);
        return () => clearInterval(interval);
    }, []);

    if (!isOffline) return null;

    return (
        <View style={styles.banner}>
            <Text style={styles.text}>NO CONNECTION</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#dc2626',
        paddingVertical: 4,
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
    },
});

export default OfflineBanner;
