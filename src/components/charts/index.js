// SVG chart primitives — no third-party chart deps, everything is
// react-native-svg and vanilla React. Each component is pure: pass data,
// get a view.
//
// Included:
//   - Ring       — progress ring with center text
//   - Sparkline  — tiny single-line trend
//   - MultiLine  — smooth line series with axis + optional area fill
//   - Bar        — vertical bar chart
//   - StackedArea— area chart with multiple series stacked
//   - Radar      — polar radar chart (up to ~8 axes)
//   - Heatmap    — calendar-style grid
//   - Gauge      — semicircle gauge with zones

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
    Circle, Line, Path, Polygon, Polyline, Rect, Text as SvgText,
    Defs, LinearGradient, Stop, G,
} from 'react-native-svg';

// ─── Shared helpers ─────────────────────────────────────────────────────────

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function niceRange(vals) {
    if (!vals || !vals.length) return [0, 1];
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    if (lo === hi) return [lo - 1, hi + 1];
    const pad = (hi - lo) * 0.1;
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
}

function smoothCubic(points) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
}

// ─── Ring (stroked circular progress + center) ─────────────────────────────

export function Ring({ pct = 0, color = '#06b6d4', size = 120, stroke = 8, label, value }) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size}>
                <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" fill="none" strokeWidth={stroke} />
                <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                    strokeDasharray={c} strokeDashoffset={c * (1 - clamp(pct / 100, 0, 1))}
                    strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            </Svg>
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    {value != null && <Text style={[styles.ringValue, { color }]}>{value}</Text>}
                    {label && <Text style={styles.ringLabel}>{label}</Text>}
                </View>
            </View>
        </View>
    );
}

// ─── Sparkline ─────────────────────────────────────────────────────────────
// Has a subtle gradient area fill by default so it reads as a data trail
// rather than a flat stroke. Set `area={false}` for pure line mode.

export function Sparkline({ data = [], color = '#06b6d4', width = 120, height = 32, stroke = 2, area = true }) {
    if (!data.length) return <View style={{ width, height }} />;
    const [lo, hi] = niceRange(data);
    const step = data.length > 1 ? width / (data.length - 1) : 0;
    const points = data.map((v, i) => ({ x: i * step, y: height - ((v - lo) / (hi - lo || 1)) * height }));
    const d = smoothCubic(points);
    const areaD = `${d} L ${width} ${height} L 0 ${height} Z`;
    const gradId = `sl-${color.replace('#', '')}-${Math.round(width)}`;
    return (
        <Svg width={width} height={height}>
            <Defs>
                <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={color} stopOpacity="0.32" />
                    <Stop offset="1" stopColor={color} stopOpacity="0.02" />
                </LinearGradient>
            </Defs>
            {area && <Path d={areaD} fill={`url(#${gradId})`} />}
            <Path d={d} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        </Svg>
    );
}

// ─── MultiLine with optional gradient area ─────────────────────────────────

export function MultiLine({
    series = [],          // [{ label, color, data: [{x, y}] }] OR [{ color, data: [v, v, v] }]
    width = 320, height = 160, padding = 28,
    yTicks = 4, showGrid = true, area = true, labelColor = '#64748b',
    xLabels = null,
}) {
    const allY = [];
    series.forEach(s => s.data.forEach(p => allY.push(typeof p === 'number' ? p : p.y)));
    const [lo, hi] = niceRange(allY);
    const w = width - padding * 2;
    const h = height - padding * 2;
    const xMax = Math.max(...series.map(s => s.data.length - 1), 1);

    const toPx = (i, v) => ({
        x: padding + (i / xMax) * w,
        y: padding + (1 - (v - lo) / (hi - lo || 1)) * h,
    });

    return (
        <Svg width={width} height={height}>
            <Defs>
                {series.map((s, i) => (
                    <LinearGradient key={i} id={`ml-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={s.color || '#06b6d4'} stopOpacity="0.35" />
                        <Stop offset="1" stopColor={s.color || '#06b6d4'} stopOpacity="0.02" />
                    </LinearGradient>
                ))}
            </Defs>
            {showGrid && Array.from({ length: yTicks + 1 }, (_, t) => {
                const y = padding + (t / yTicks) * h;
                const label = Math.round(hi - (hi - lo) * (t / yTicks));
                return (
                    <React.Fragment key={t}>
                        <Line x1={padding} y1={y} x2={padding + w} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <SvgText x={padding - 6} y={y + 3} fontSize="9" fill={labelColor} textAnchor="end">{label}</SvgText>
                    </React.Fragment>
                );
            })}
            {series.map((s, i) => {
                const points = s.data.map((p, j) => {
                    const v = typeof p === 'number' ? p : p.y;
                    return toPx(j, v);
                });
                const d = smoothCubic(points);
                const areaD = `${d} L ${padding + w} ${padding + h} L ${padding} ${padding + h} Z`;
                return (
                    <G key={i}>
                        {area && <Path d={areaD} fill={`url(#ml-grad-${i})`} />}
                        <Path d={d} stroke={s.color || '#06b6d4'} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    </G>
                );
            })}
            {xLabels && xLabels.map((label, i) => (
                <SvgText key={`xl-${i}`}
                    x={padding + (i / (xLabels.length - 1 || 1)) * w}
                    y={height - 6}
                    fontSize="9" fill={labelColor} textAnchor="middle">{label}</SvgText>
            ))}
        </Svg>
    );
}

// ─── Bar chart ─────────────────────────────────────────────────────────────

export function Bar({
    data = [],                // [{ label, value, color? }]
    width = 320, height = 160, padding = 28, barGap = 8,
    color = '#06b6d4', labelColor = '#64748b',
}) {
    if (!data.length) return <View style={{ width, height }} />;
    const [lo, hi] = niceRange([0, ...data.map(d => d.value)]);
    const w = width - padding * 2;
    const h = height - padding * 2;
    const barW = Math.max(6, (w - barGap * (data.length - 1)) / data.length);
    return (
        <Svg width={width} height={height}>
            <Line x1={padding} y1={padding + h} x2={padding + w} y2={padding + h} stroke="rgba(255,255,255,0.1)" />
            {data.map((d, i) => {
                const value = d.value || 0;
                const normalized = (value - lo) / (hi - lo || 1);
                const bh = normalized * h;
                const x = padding + i * (barW + barGap);
                const y = padding + h - bh;
                return (
                    <G key={i}>
                        <Rect x={x} y={y} width={barW} height={bh} fill={d.color || color} rx="3" />
                        <SvgText x={x + barW / 2} y={height - 6} fontSize="9" fill={labelColor} textAnchor="middle">
                            {d.label}
                        </SvgText>
                    </G>
                );
            })}
        </Svg>
    );
}

// ─── Stacked area (zones or multi-series overlap) ─────────────────────────

export function StackedArea({
    series = [],              // [{ label, color, data: [v, v, v] }]  lengths must match
    width = 320, height = 160, padding = 28, labelColor = '#64748b',
}) {
    if (!series.length || !series[0].data.length) return <View style={{ width, height }} />;
    const len = series[0].data.length;
    const cumulative = series[0].data.map(() => 0);
    const w = width - padding * 2;
    const h = height - padding * 2;

    // Compute stacked tops
    const tops = series.map(s => s.data.map((v, i) => {
        cumulative[i] += v;
        return cumulative[i];
    }));
    const total = Math.max(...cumulative, 1);

    return (
        <Svg width={width} height={height}>
            <Line x1={padding} y1={padding + h} x2={padding + w} y2={padding + h} stroke="rgba(255,255,255,0.1)" />
            {series.map((s, si) => {
                const bottom = si === 0 ? series[0].data.map(() => 0) : tops[si - 1];
                const top = tops[si];
                const points = [];
                for (let i = 0; i < len; i++) {
                    const x = padding + (i / (len - 1 || 1)) * w;
                    const y = padding + (1 - top[i] / total) * h;
                    points.push({ x, y });
                }
                for (let i = len - 1; i >= 0; i--) {
                    const x = padding + (i / (len - 1 || 1)) * w;
                    const y = padding + (1 - bottom[i] / total) * h;
                    points.push({ x, y });
                }
                const d = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ') + ' Z';
                return <Path key={si} d={d} fill={s.color} opacity="0.85" />;
            })}
        </Svg>
    );
}

// ─── Radar chart ───────────────────────────────────────────────────────────

export function Radar({
    axes = [],                // [{ label, value (0-100) }]
    color = '#06b6d4', size = 220, labelColor = '#9ca3af',
}) {
    if (!axes.length) return <View style={{ width: size, height: size }} />;
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.38;
    const n = axes.length;
    const step = (Math.PI * 2) / n;

    function polarPt(angleIdx, value) {
        const angle = -Math.PI / 2 + angleIdx * step;
        const norm = clamp(value / 100, 0, 1);
        return { x: cx + Math.cos(angle) * r * norm, y: cy + Math.sin(angle) * r * norm };
    }
    function outerPt(angleIdx) {
        return polarPt(angleIdx, 100);
    }

    const gridLevels = [25, 50, 75, 100];
    const dataPoints = axes.map((a, i) => polarPt(i, a.value || 0));

    return (
        <Svg width={size} height={size}>
            {gridLevels.map((lvl, gi) => {
                const pts = axes.map((_, i) => polarPt(i, lvl));
                const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ') + ' Z';
                return <Path key={gi} d={d} stroke="rgba(255,255,255,0.07)" strokeWidth="1" fill="none" />;
            })}
            {axes.map((a, i) => {
                const op = outerPt(i);
                return (
                    <G key={`ax-${i}`}>
                        <Line x1={cx} y1={cy} x2={op.x} y2={op.y} stroke="rgba(255,255,255,0.08)" />
                        <SvgText
                            x={cx + Math.cos(-Math.PI / 2 + i * step) * (r + 14)}
                            y={cy + Math.sin(-Math.PI / 2 + i * step) * (r + 14) + 3}
                            fontSize="9"
                            fill={labelColor}
                            textAnchor="middle">
                            {a.label}
                        </SvgText>
                    </G>
                );
            })}
            <Polygon
                points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2" />
            {dataPoints.map((p, i) => (
                <Circle key={`dp-${i}`} cx={p.x} cy={p.y} r="3" fill={color} />
            ))}
        </Svg>
    );
}

// ─── Heatmap (calendar-style) ──────────────────────────────────────────────

export function Heatmap({
    cells = [],               // [{ date, value }]  flat list sorted ascending
    cols = 7, width = 320, cellGap = 3, label = null,
    colorLow = '#082f49', colorHigh = '#06b6d4',
}) {
    if (!cells.length) return <View style={{ width, height: 40 }} />;
    const rows = Math.ceil(cells.length / cols);
    const cellW = (width - cellGap * (cols - 1)) / cols;
    const cellH = cellW;
    const height = rows * cellH + (rows - 1) * cellGap + (label ? 14 : 0);
    const max = Math.max(...cells.map(c => c.value || 0), 1);

    function lerp(a, b, t) { return a + (b - a) * t; }
    function hexToRgb(h) {
        const v = h.replace('#', '');
        return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
    }
    const lowRgb = hexToRgb(colorLow);
    const highRgb = hexToRgb(colorHigh);
    function color(t) {
        const c = lowRgb.map((v, i) => Math.round(lerp(v, highRgb[i], t)));
        return `rgb(${c.join(',')})`;
    }

    return (
        <Svg width={width} height={height}>
            {cells.map((c, i) => {
                const row = Math.floor(i / cols);
                const col = i % cols;
                const x = col * (cellW + cellGap);
                const y = row * (cellH + cellGap);
                const t = Math.sqrt((c.value || 0) / max);
                return (
                    <Rect key={i} x={x} y={y} width={cellW} height={cellH} rx="3"
                        fill={c.value ? color(t) : '#0b1220'} />
                );
            })}
            {label && (
                <SvgText x={0} y={height - 2} fontSize="9" fill="#64748b">{label}</SvgText>
            )}
        </Svg>
    );
}

// ─── Gauge ─────────────────────────────────────────────────────────────────

export function Gauge({ value = 0, max = 100, color = '#06b6d4', size = 180, label, zones = [] }) {
    const r = size * 0.38;
    const cx = size / 2;
    const cy = size * 0.62;
    const strokeW = size * 0.08;
    const start = Math.PI;
    const end = 0;
    const angle = start + (clamp(value / max, 0, 1)) * (end - start);

    function arc(a1, a2) {
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        const x2 = cx + r * Math.cos(a2);
        const y2 = cy + r * Math.sin(a2);
        const large = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
        const sweep = a2 > a1 ? 1 : 0;
        return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
    }

    return (
        <Svg width={size} height={size * 0.75}>
            <Path d={arc(start, end)} stroke="rgba(255,255,255,0.1)" strokeWidth={strokeW} fill="none" strokeLinecap="round" />
            {zones.map((z, i) => {
                const a1 = start + (z.from / max) * (end - start);
                const a2 = start + (z.to / max) * (end - start);
                return <Path key={i} d={arc(a1, a2)} stroke={z.color} strokeWidth={strokeW} fill="none" strokeLinecap="round" opacity="0.45" />;
            })}
            <Path d={arc(start, angle)} stroke={color} strokeWidth={strokeW} fill="none" strokeLinecap="round" />
            <SvgText x={cx} y={cy + 6} fontSize={size * 0.22} fontWeight="800" fill="#fff" textAnchor="middle">
                {Math.round(value)}
            </SvgText>
            {label && (
                <SvgText x={cx} y={cy + size * 0.14} fontSize="10" fill="#64748b" textAnchor="middle" letterSpacing="2">
                    {label}
                </SvgText>
            )}
        </Svg>
    );
}

// ─── Shared styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    ringValue: { fontSize: 26, fontWeight: '800' },
    ringLabel: { fontSize: 10, color: '#64748b', letterSpacing: 2, marginTop: 2 },
});
