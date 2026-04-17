import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null, info: null, key: 0 };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        this.setState({ info });
        if (typeof console !== 'undefined' && console.error) {
            console.error('[ErrorBoundary]', error, info?.componentStack);
        }
    }

    reset = () => {
        this.setState(({ key }) => ({ error: null, info: null, key: key + 1 }));
    };

    render() {
        if (!this.state.error) {
            return <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>;
        }

        const message = String(this.state.error?.message || this.state.error || 'Unknown error');
        const stack = this.state.info?.componentStack || this.state.error?.stack || '';

        return (
            <View style={styles.root}>
                <ScrollView contentContainerStyle={styles.scroll}>
                    <Text style={styles.badge}>SOMETHING WENT WRONG</Text>
                    <Text style={styles.title}>We caught a crash before the app died.</Text>
                    <Text style={styles.subtitle}>{message}</Text>

                    {!!stack && (
                        <View style={styles.stackBox}>
                            <Text style={styles.stackText}>{stack.slice(0, 1200)}</Text>
                        </View>
                    )}

                    <Pressable style={styles.btn} onPress={this.reset}>
                        <Text style={styles.btnText}>Try again</Text>
                    </Pressable>
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    scroll: { flexGrow: 1, padding: 28, justifyContent: 'center' },
    badge: {
        fontSize: 10, fontWeight: '800', color: '#f59e0b',
        letterSpacing: 2, marginBottom: 12,
    },
    title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 10 },
    subtitle: { fontSize: 14, color: '#cbd5e1', marginBottom: 20, lineHeight: 20 },
    stackBox: {
        backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b',
        borderRadius: 10, padding: 12, marginBottom: 20, maxHeight: 260,
    },
    stackText: { fontSize: 11, color: '#64748b', fontFamily: 'monospace', lineHeight: 16 },
    btn: {
        backgroundColor: '#06b6d4', borderRadius: 12, padding: 14,
        alignItems: 'center',
    },
    btnText: { color: '#000', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
});
