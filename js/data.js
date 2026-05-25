/**
 * data.js — 统一数据层（localStorage + 与 cloud-sync 配合）
 */
(function () {
    'use strict';

    var SD = window.SampleDate || {
        daysAgo: function (n) {
            var d = new Date();
            d.setDate(d.getDate() - parseInt(n, 10));
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
    };

    var KEYS = {
        GAMES: 'games',
        ACHIEVEMENTS: 'achievements',
        LEGACY_ACHIEVEMENTS: 'game_record_achievements',
        MEDIA: 'game_record_media',
        PROFILE: 'profile',
        WISHLIST: 'game_record_wishlist',
        REVIEWS: 'game_record_reviews',
        SPENDING: 'game_record_spending',
        MEMOS: 'memos',
        THEME: 'game_record_theme',
        MASCOT_QUOTES: 'mascot_quotes',
        MASCOT_ENABLED: 'mascot_enabled',
        AUTO_TIME_BG: 'auto_time_bg',
        SITE_VIDEO_BG: 'site_video_bg'
    };

    /** 参与 Supabase site_data 同步的键（不含媒体表、密码锁、超大背景图） */
    var SYNC_KEYS = [
        KEYS.GAMES,
        KEYS.ACHIEVEMENTS,
        KEYS.PROFILE,
        KEYS.WISHLIST,
        KEYS.REVIEWS,
        KEYS.SPENDING,
        KEYS.MEMOS,
        KEYS.THEME,
        KEYS.MASCOT_QUOTES,
        KEYS.MASCOT_ENABLED,
        KEYS.AUTO_TIME_BG,
        KEYS.SITE_VIDEO_BG
    ];

    var ARRAY_SYNC_KEYS = [
        KEYS.GAMES,
        KEYS.ACHIEVEMENTS,
        KEYS.WISHLIST,
        KEYS.REVIEWS,
        KEYS.SPENDING,
        KEYS.MEMOS
    ];

    var OBJECT_SYNC_KEYS = [KEYS.PROFILE, KEYS.THEME];

    /** localStorage 存 plain string，非 JSON.stringify 包裹 */
    var RAW_STRING_SYNC_KEYS = [
        KEYS.MASCOT_ENABLED,
        KEYS.AUTO_TIME_BG,
        KEYS.SITE_VIDEO_BG
    ];

    var samplesCache = null;

    function parseJson(raw, fallback) {
        try {
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function get(key, fallback) {
        if (fallback === undefined) fallback = [];
        return parseJson(localStorage.getItem(key), fallback);
    }

    function set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('保存失败:', key, e);
            return false;
        }
    }

    function remove(key) {
        localStorage.removeItem(key);
    }

    function migrateLegacyAchievements() {
        var list = get(KEYS.ACHIEVEMENTS, []);
        if (list.length > 0) return list;

        var legacy = get(KEYS.LEGACY_ACHIEVEMENTS, []);
        if (legacy.length === 0) return list;

        list = legacy
            .filter(function (a) { return a.unlocked !== false; })
            .map(function (a, i) {
                return {
                    id: a.id != null ? a.id : Date.now() + i,
                    title: a.title || a.name || '未知成就',
                    gameName: a.gameName || a.game || '',
                    description: a.description || '',
                    date: a.date || '',
                    icon: a.icon || 'trophy',
                    screenshot: a.screenshot || null
                };
            });

        if (list.length > 0) {
            set(KEYS.ACHIEVEMENTS, list);
            remove(KEYS.LEGACY_ACHIEVEMENTS);
        }
        return list;
    }

    function achievementDateMs(a) {
        if (!a || !a.date) return 0;
        var m = String(a.date).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
        var d = new Date(a.date);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    }

    async function loadSamples() {
        if (samplesCache) return samplesCache;
        try {
            var res = await fetch('data/samples.json');
            if (!res.ok) throw new Error('samples.json ' + res.status);
            samplesCache = await res.json();
        } catch (e) {
            console.warn('无法加载 samples.json，使用内置示例', e);
            samplesCache = { games: [], achievements: [] };
        }
        return samplesCache;
    }

    function hydrateGame(item) {
        var g = Object.assign({}, item);
        if (g.lastPlayedDaysAgo != null) {
            g.lastPlayed = SD.daysAgo(g.lastPlayedDaysAgo);
            delete g.lastPlayedDaysAgo;
        }
        return g;
    }

    function hydrateAchievement(item) {
        var a = Object.assign({}, item);
        if (a.dateDaysAgo != null) {
            a.date = SD.daysAgo(a.dateDaysAgo);
            delete a.dateDaysAgo;
        }
        return a;
    }

    async function seedGamesIfEmpty() {
        var games = get(KEYS.GAMES, []);
        if (games.length > 0) return games;
        var samples = await loadSamples();
        games = (samples.games || []).map(hydrateGame);
        if (games.length > 0) set(KEYS.GAMES, games);
        return games;
    }

    async function seedAchievementsIfEmpty() {
        migrateLegacyAchievements();
        var achievements = get(KEYS.ACHIEVEMENTS, []);
        if (achievements.length > 0) return achievements;
        var samples = await loadSamples();
        achievements = (samples.achievements || []).map(hydrateAchievement);
        if (achievements.length > 0) set(KEYS.ACHIEVEMENTS, achievements);
        return achievements;
    }

    var DEFAULT_PROFILE = {
        name: '游戏玩家',
        title: '热爱游戏的冒险者',
        bio: '热爱游戏的冒险者，喜欢探索各种类型的游戏世界，记录每一次精彩的游戏体验。',
        avatar: 'assets/default-avatar.svg',
        tags: ['原神', '明日方舟', '王者荣耀', '闪耀暖暖'],
        joinDate: SD.lastYearMonth ? SD.lastYearMonth(6, 15) : SD.daysAgo(200),
        playStyle: { singlePlayer: 80, multiPlayer: 60, pve: 90, pvp: 40 },
        favoriteGames: []
    };

    function getProfile() {
        return Object.assign({}, DEFAULT_PROFILE, get(KEYS.PROFILE, {}));
    }

    function setProfile(profile) {
        return set(KEYS.PROFILE, profile);
    }

    window.GameData = {
        KEYS: KEYS,
        SYNC_KEYS: SYNC_KEYS,
        ARRAY_SYNC_KEYS: ARRAY_SYNC_KEYS,
        OBJECT_SYNC_KEYS: OBJECT_SYNC_KEYS,
        RAW_STRING_SYNC_KEYS: RAW_STRING_SYNC_KEYS,
        get: get,
        set: set,
        remove: remove,
        migrateLegacyAchievements: migrateLegacyAchievements,
        achievementDateMs: achievementDateMs,
        seedGamesIfEmpty: seedGamesIfEmpty,
        seedAchievementsIfEmpty: seedAchievementsIfEmpty,
        getProfile: getProfile,
        setProfile: setProfile,
        DEFAULT_PROFILE: DEFAULT_PROFILE
    };
})();
