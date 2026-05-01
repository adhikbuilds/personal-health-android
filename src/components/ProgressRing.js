import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C } from '../styles/colors';

export default function ProgressRing({ value = 0, size = 80, strokeWidth = 8, color = C.cyan, label = '', sublabel = '' }) {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const clampedVal = Math.min(150, Math.max(0, value));
    const fillColor = clampedVal > 110 ? C.red : (clampedVal >= 80 ? C.green : color);
    const offset = circ - (Math.min(clampedVal, 100) / 100) * circ;

    return (
        <View style={[s.container, { width: size, height: size }]}>
            <Svg width={size} height={size}>
                <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} fill="none" />
                <Circle
                    cx={size / 2} cy={size / 2} r={r}
                    stroke={fillColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${size / 2},${size / 2}`}
                />
            </Svg>
            <View style={s.center}>
                <Text style={[s.label, { color: fillColor }]}>{label}</Text>
                {sublabel ? <Text style={s.sublabel}>{sublabel}</Text> : null}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
    center: { position: 'absolute', alignItems: 'center' },
    label: { fontSize: 13, fontWeight: '700' },
    sublabel: { fontSize: 9, color: C.muted, marginTop: 1 },
});
