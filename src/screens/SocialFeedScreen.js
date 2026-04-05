// SocialFeedScreen — Social Feed with Following/For You tabs + Trending Creators
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, FlatList,
    TouchableOpacity, ScrollView, RefreshControl, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from '../styles/colors';
import { MOCK_FEED_POSTS, TRENDING_CREATORS } from '../data/constants';
import { useUser } from '../context/UserContext';
import api from '../services/api';

const FOLLOWED_KEY = '@followed_creators';
const TABS = ['For You', 'Following'];

function Avatar({ initials, color, size = 42 }) {
    return (
        <View style={[av.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
            <Text style={[av.text, { fontSize: size * 0.38 }]}>{initials}</Text>
        </View>
    );
}

function CreatorChip({ creator, followed, onFollow }) {
    return (
        <View style={cr.chip}>
            <Avatar initials={creator.initials} color={creator.color} size={52} />
            <Text style={cr.name} numberOfLines={1}>{creator.name}</Text>
            <Text style={cr.handle} numberOfLines={1}>{creator.handle}</Text>
            <TouchableOpacity
                style={[cr.followBtn, followed && cr.followBtnDone]}
                onPress={() => onFollow(creator.id)}
                activeOpacity={0.8}
            >
                <Text style={[cr.followText, followed && { color: C.bg }]}>
                    {followed ? 'Following' : 'Follow'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

function PostCard({ post, onLike, liked, onMore }) {
    return (
        <View style={pc.card}>
            <View style={pc.header}>
                <Avatar initials={post.initials} color={post.avatarColor} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={pc.authorName}>{post.author}</Text>
                    <View style={pc.metaRow}>
                        <Text style={pc.handle}>{post.handle}</Text>
                        <Text style={pc.dot}>·</Text>
                        <Text style={pc.time}>{post.timeAgo}</Text>
                        <View style={pc.sportTag}>
                            <Text style={pc.sportText}>{post.sport}</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={pc.moreBtn} onPress={() => onMore?.(post)}>
                    <Text style={pc.moreText}>···</Text>
                </TouchableOpacity>
            </View>

            <Text style={pc.content}>{post.content}</Text>

            <View style={pc.actions}>
                <TouchableOpacity style={pc.actionBtn} onPress={() => onLike(post.id)}>
                    <Text style={[pc.actionIcon, liked && { color: C.red }]}>
                        {liked ? '❤️' : '🤍'}
                    </Text>
                    <Text style={[pc.actionCount, liked && { color: C.red }]}>
                        {post.likes + (liked ? 1 : 0)}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={pc.actionBtn}>
                    <Text style={pc.actionIcon}>💬</Text>
                    <Text style={pc.actionCount}>{post.comments}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pc.actionBtn}>
                    <Text style={pc.actionIcon}>↗️</Text>
                    <Text style={pc.actionCount}>Share</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function SocialFeedScreen({ navigation }) {
    const { userData } = useUser();
    const [tab, setTab]             = useState('For You');
    const [posts, setPosts]         = useState(MOCK_FEED_POSTS);
    const [creators, setCreators]   = useState(TRENDING_CREATORS);
    const [followed, setFollowed]   = useState({});
    const [liked, setLiked]         = useState({});
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(FOLLOWED_KEY).then(raw => {
            if (raw) { try { setFollowed(JSON.parse(raw)); } catch (_) {} }
        });
        api.getTrendingCreators().then(data => {
            const arr = Array.isArray(data) ? data : data?.creators;
            if (arr?.length) setCreators(arr);
        });
    }, []);

    const handleFollow = useCallback((creatorId) => {
        setFollowed(prev => {
            const next = { ...prev, [creatorId]: !prev[creatorId] };
            AsyncStorage.setItem(FOLLOWED_KEY, JSON.stringify(next)).catch(() => {});
            api.followCreator(userData.avatarId, creatorId).catch(() => {});
            return next;
        });
    }, [userData.avatarId]);

    const handleLike = useCallback((postId) => {
        setLiked(prev => ({ ...prev, [postId]: !prev[postId] }));
    }, []);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        api.getFeed(userData.avatarId, tab === 'For You' ? 'for_you' : 'following').then(data => {
            const arr = Array.isArray(data) ? data : data?.posts;
            if (arr?.length) setPosts(arr);
        }).finally(() => setRefreshing(false));
    }, [userData.avatarId, tab]);

    const followedHandles = new Set(
        creators.filter(c => followed[c.id]).map(c => c.handle)
    );
    const filtered = tab === 'Following'
        ? posts.filter(p => p.isFollowing || followedHandles.has(p.handle))
        : posts;

    return (
        <SafeAreaView style={s.safe}>
            {/* Top bar */}
            <View style={s.topbar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={s.back}>‹ Back</Text>
                </TouchableOpacity>
                <View style={s.tabs}>
                    {TABS.map(t => (
                        <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
                            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity style={s.createBtn} onPress={() => Alert.alert('Create Post', 'Post creation coming soon!')}>
                    <Text style={s.createIcon}>✏️</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.cyan} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.feedContent}
                ListHeaderComponent={() => (
                    <>
                        {/* Trending Creators */}
                        <View style={s.trendingSection}>
                            <Text style={s.trendingTitle}>Trending Creator</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 8 }}>
                                {creators.map(c => (
                                    <CreatorChip
                                        key={c.id}
                                        creator={c}
                                        followed={!!followed[c.id]}
                                        onFollow={handleFollow}
                                    />
                                ))}
                            </ScrollView>
                        </View>

                        {/* FOLLOW section header */}
                        <View style={s.followHeader}>
                            <Text style={s.followHeaderText}>FOLLOW</Text>
                            <TouchableOpacity onPress={() => setTab('Following')}>
                                <Text style={s.expandBtn}>⤢</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
                renderItem={({ item }) => (
                    <PostCard
                        post={item}
                        liked={!!liked[item.id]}
                        onLike={handleLike}
                        onMore={(post) => Alert.alert(post.author, 'Report, Mute, or Block', [
                            { text: 'Report', style: 'destructive' },
                            { text: 'Mute' },
                            { text: 'Cancel', style: 'cancel' },
                        ])}
                    />
                )}
                ListEmptyComponent={() => (
                    <View style={s.empty}>
                        <Text style={s.emptyEmoji}>📭</Text>
                        <Text style={s.emptyText}>No posts yet. Follow some creators!</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe:          { flex: 1, backgroundColor: C.bg },
    topbar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 12 },
    back:          { color: C.cyan, fontSize: 16, fontWeight: '700', width: 60 },
    tabs:          { flexDirection: 'row', backgroundColor: C.surf, borderRadius: 10, padding: 2 },
    tab:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9 },
    tabActive:     { backgroundColor: C.indigo },
    tabText:       { fontSize: 13, fontWeight: '700', color: C.muted },
    tabTextActive: { color: '#fff' },
    createBtn:     { width: 38, height: 38, borderRadius: 12, backgroundColor: C.surf, alignItems: 'center', justifyContent: 'center' },
    createIcon:    { fontSize: 16 },

    feedContent:   { paddingBottom: 30 },
    trendingSection:{ backgroundColor: C.surf, padding: 16, marginBottom: 2 },
    trendingTitle: { fontSize: 16, fontWeight: '900', color: C.text, marginBottom: 4 },
    followHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surf },
    followHeaderText:{ fontSize: 13, fontWeight: '900', color: C.text },
    expandBtn:     { fontSize: 16, color: C.muted },
    empty:         { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
    emptyEmoji:    { fontSize: 48, marginBottom: 12 },
    emptyText:     { fontSize: 14, color: C.muted, fontWeight: '600' },
});

const av = StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center' },
    text: { color: '#fff', fontWeight: '900' },
});

const cr = StyleSheet.create({
    chip:       { width: 100, alignItems: 'center', gap: 4 },
    name:       { fontSize: 11, fontWeight: '800', color: C.text, textAlign: 'center' },
    handle:     { fontSize: 10, color: C.muted, textAlign: 'center' },
    followBtn:  { backgroundColor: 'rgba(249,115,22,0.15)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(249,115,22,0.4)' },
    followBtnDone:{ backgroundColor: C.orange },
    followText: { fontSize: 10, color: C.orange, fontWeight: '800' },
});

const pc = StyleSheet.create({
    card:       { backgroundColor: C.surf, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    header:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    authorName: { fontSize: 14, fontWeight: '800', color: C.text },
    metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' },
    handle:     { fontSize: 11, color: C.muted },
    dot:        { color: C.muted, fontSize: 10 },
    time:       { fontSize: 11, color: C.muted },
    sportTag:   { backgroundColor: C.cyan + '18', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
    sportText:  { fontSize: 9, color: C.cyan, fontWeight: '700' },
    moreBtn:    { padding: 4 },
    moreText:   { color: C.muted, fontSize: 16, letterSpacing: 1 },
    content:    { fontSize: 14, color: C.textSub, lineHeight: 21, marginBottom: 12 },
    actions:    { flexDirection: 'row', gap: 20 },
    actionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionIcon: { fontSize: 16 },
    actionCount:{ fontSize: 12, color: C.muted, fontWeight: '700' },
});
