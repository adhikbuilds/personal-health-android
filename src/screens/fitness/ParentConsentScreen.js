// Personal Health — Parent Access screen (Flow 15)
// Athlete manages which parents can view their safety summary.
// Framing is neutral: this is about giving parents peace of mind,
// not surveillance. The athlete stays in full control.

import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE } from '../../services/api';
import { getOrCreateAnonymousAthleteId } from '../../services/deviceIdentity';

const BG      = '#FBFBF8';
const SURFACE = '#FFFFFF';
const CYAN    = '#FC4C02';
const TEXT    = '#242428';
const MUTED   = '#9CA3AF';
const AMBER   = '#f59e0b';
const RED     = '#ef4444';
const BORDER  = 'rgba(255,255,255,0.08)';

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const map = {
        pending:  { label: 'PENDING',  color: AMBER },
        active:   { label: 'ACTIVE',   color: CYAN  },
        revoked:  { label: 'REVOKED',  color: MUTED },
    };
    const cfg = map[status] || { label: status.toUpperCase(), color: MUTED };
    return (
        <View style={[styles.badge, { borderColor: cfg.color }]}>
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
    );
}

// ─── Consent row ──────────────────────────────────────────────────────────────

function ConsentRow({ item, onAccept, onRevoke, loading }) {
    const busy = loading === item.consent_id;
    return (
        <View style={styles.row}>
            <View style={styles.rowTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.parentName}>{item.parent_name}</Text>
                    <Text style={styles.parentEmail}>{item.parent_email}</Text>
                </View>
                <StatusBadge status={item.status} />
            </View>

            {item.status === 'pending' && (
                <View style={styles.rowActions}>
                    <TouchableOpacity
                        style={[styles.btn, styles.btnAccept]}
                        onPress={() => onAccept(item.consent_id)}
                        disabled={busy}
                    >
                        {busy
                            ? <ActivityIndicator size="small" color={BG} />
                            : <Text style={styles.btnAcceptText}>Allow access</Text>
                        }
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.btn, styles.btnDecline]}
                        onPress={() => onRevoke(item.consent_id)}
                        disabled={busy}
                    >
                        <Text style={styles.btnDeclineText}>Decline</Text>
                    </TouchableOpacity>
                </View>
            )}

            {item.status === 'active' && (
                <View style={styles.rowActions}>
                    <TouchableOpacity
                        style={[styles.btn, styles.btnRevoke]}
                        onPress={() => onRevoke(item.consent_id)}
                        disabled={busy}
                    >
                        {busy
                            ? <ActivityIndicator size="small" color={RED} />
                            : <Text style={styles.btnRevokeText}>Revoke access</Text>
                        }
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ParentConsentScreen({ navigation }) {
    const [athleteId, setAthleteId] = useState(null);
    const [consents, setConsents]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [busy, setBusy]           = useState(null); // consent_id being actioned

    useEffect(() => {
        let alive = true;
        getOrCreateAnonymousAthleteId().then((id) => {
            if (!alive) return;
            setAthleteId(id);
        });
        return () => { alive = false; };
    }, []);

    const apiFetch = useCallback(async (path, method = 'GET') => {
        try {
            const res = await fetch(`${API_BASE}${path}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) return null;
            return await res.json();
        } catch {
            return null;
        }
    }, []);

    const loadConsents = useCallback(async (id) => {
        if (!id) return;
        setLoading(true);
        const data = await apiFetch(`/athlete/${id}/parent-consents`);
        setConsents(data?.consents || []);
        setLoading(false);
    }, [apiFetch]);

    useEffect(() => {
        if (athleteId) loadConsents(athleteId);
    }, [athleteId, loadConsents]);

    const handleAccept = async (consentId) => {
        setBusy(consentId);
        await apiFetch(`/athlete/${athleteId}/parent-consent/${consentId}/accept`, 'POST');
        await loadConsents(athleteId);
        setBusy(null);
    };

    const handleRevoke = async (consentId) => {
        setBusy(consentId);
        await apiFetch(`/athlete/${athleteId}/parent-consent/${consentId}/revoke`, 'POST');
        await loadConsents(athleteId);
        setBusy(null);
    };

    return (
        <SafeAreaView style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={22} color={TEXT} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Parent Access</Text>
                <View style={{ width: 22 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={CYAN} />
                </View>
            ) : consents.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="shield-checkmark-outline" size={48} color={MUTED} />
                    <Text style={styles.emptyTitle}>No access requests yet</Text>
                    <Text style={styles.emptyBody}>
                        A parent can request read-only access to see that you're training
                        safely. They'll only see whether you're active and injury-risk
                        signals — not your raw scores or session details.
                        {'\n\n'}
                        You can revoke access at any time.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={consents}
                    keyExtractor={(item) => item.consent_id}
                    contentContainerStyle={styles.list}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    renderItem={({ item }) => (
                        <ConsentRow
                            item={item}
                            onAccept={handleAccept}
                            onRevoke={handleRevoke}
                            loading={busy}
                        />
                    )}
                    ListHeaderComponent={
                        <Text style={styles.listNote}>
                            Parents with active access see your training frequency, sport,
                            and whether injury-risk signals are elevated. No raw data is shared.
                        </Text>
                    }
                />
            )}
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: BG,
    },
    header: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical:   14,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    headerTitle: {
        fontSize:   17,
        fontWeight: '700',
        color:      TEXT,
    },
    center: {
        flex:           1,
        alignItems:     'center',
        justifyContent: 'center',
    },
    empty: {
        flex:            1,
        alignItems:      'center',
        justifyContent:  'center',
        paddingHorizontal: 36,
        gap:             16,
    },
    emptyTitle: {
        fontSize:   18,
        fontWeight: '700',
        color:      TEXT,
        textAlign:  'center',
    },
    emptyBody: {
        fontSize:   14,
        color:      MUTED,
        textAlign:  'center',
        lineHeight: 22,
    },
    list: {
        padding: 16,
    },
    listNote: {
        fontSize:      13,
        color:         MUTED,
        marginBottom:  16,
        lineHeight:    20,
    },
    separator: {
        height:          1,
        backgroundColor: BORDER,
        marginVertical:  4,
    },
    row: {
        backgroundColor: SURFACE,
        borderRadius:    14,
        padding:         16,
        marginBottom:    4,
    },
    rowTop: {
        flexDirection:  'row',
        alignItems:     'flex-start',
        marginBottom:   12,
    },
    parentName: {
        fontSize:   15,
        fontWeight: '700',
        color:      TEXT,
        marginBottom: 2,
    },
    parentEmail: {
        fontSize: 13,
        color:    MUTED,
    },
    badge: {
        borderWidth:   1,
        borderRadius:  6,
        paddingHorizontal: 8,
        paddingVertical:   3,
        alignSelf:     'flex-start',
        marginLeft:    8,
    },
    badgeText: {
        fontSize:   10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    rowActions: {
        flexDirection: 'row',
        gap:           10,
    },
    btn: {
        flex:             1,
        paddingVertical:  10,
        borderRadius:     10,
        alignItems:       'center',
        justifyContent:   'center',
    },
    btnAccept: {
        backgroundColor: CYAN,
    },
    btnAcceptText: {
        color:      BG,
        fontWeight: '700',
        fontSize:   14,
    },
    btnDecline: {
        borderWidth:  1,
        borderColor:  MUTED,
    },
    btnDeclineText: {
        color:      MUTED,
        fontWeight: '600',
        fontSize:   14,
    },
    btnRevoke: {
        borderWidth:  1,
        borderColor:  RED,
    },
    btnRevokeText: {
        color:      RED,
        fontWeight: '600',
        fontSize:   14,
    },
});
