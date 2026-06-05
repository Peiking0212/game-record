/**
 * data.js 鈥?缁熶竴鏁版嵁灞傦紙localStorage + 涓?cloud-sync 閰嶅悎锛? */
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
        SITE_VIDEO_BG: 'site_video_bg',
        USER_INTEREST_PROFILE: 'user_interest_profile',
        DEAL_WATCH_RULES: 'deal_watch_rules',
        DISCOUNT_DEALS: 'discount_deals',
        GAME_NEWS_FEED: 'game_news_feed',
        FOLLOWED_GAME_DICTIONARY: 'followed_game_dictionary'
    };

    /** 鍙備笌 Supabase site_data 鍚屾鐨勯敭锛堜笉鍚獟浣撹〃銆佸瘑鐮侀攣銆佽秴澶ц儗鏅浘锛?*/
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
        KEYS.SITE_VIDEO_BG,
        KEYS.USER_INTEREST_PROFILE,
        KEYS.DEAL_WATCH_RULES,
        KEYS.DISCOUNT_DEALS,
        KEYS.GAME_NEWS_FEED,
        KEYS.FOLLOWED_GAME_DICTIONARY
    ];

    var ARRAY_SYNC_KEYS = [
        KEYS.GAMES,
        KEYS.ACHIEVEMENTS,
        KEYS.WISHLIST,
        KEYS.REVIEWS,
        KEYS.SPENDING,
        KEYS.MEMOS,
        KEYS.DISCOUNT_DEALS,
        KEYS.GAME_NEWS_FEED,
        KEYS.FOLLOWED_GAME_DICTIONARY
    ];

    var OBJECT_SYNC_KEYS = [KEYS.PROFILE, KEYS.THEME, KEYS.USER_INTEREST_PROFILE, KEYS.DEAL_WATCH_RULES];

    /** localStorage 瀛?plain string锛岄潪 JSON.stringify 鍖呰９ */
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
            console.error('淇濆瓨澶辫触:', key, e);
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
                    title: a.title || a.name || '鏈煡鎴愬氨',
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

    function matchGameName(a, b) {
        return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    }

    function normalizeAliasText(text) {
        return String(text || '').trim().toLowerCase();
    }

    function dedupeAliases(aliases) {
        var out = [];
        var seen = {};
        (Array.isArray(aliases) ? aliases : []).forEach(function (alias) {
            var raw = String(alias || '').trim();
            var key = normalizeAliasText(raw);
            if (!raw || !key || seen[key]) return;
            seen[key] = true;
            out.push(raw);
        });
        return out;
    }

    function sanitizeGameDictionaryEntry(entry) {
        if (!entry || typeof entry !== 'object') return null;
        var gameId = entry.gameId != null ? String(entry.gameId).trim() : '';
        if (!gameId) return null;
        return {
            gameId: gameId,
            nameZh: String(entry.nameZh || '').trim(),
            nameEn: String(entry.nameEn || '').trim(),
            aliases: dedupeAliases(entry.aliases),
            steamAppId: String(entry.steamAppId || '').trim(),
            weiboAccount: String(entry.weiboAccount || '').trim(),
            xAccount: String(entry.xAccount || '').trim(),
            updatedAt: entry.updatedAt || new Date().toISOString()
        };
    }

    function createDictionaryEntryFromGame(game) {
        if (!game || game.id == null || game.id === '') return null;
        var normalizedName = String(game.name || '').trim();
        return sanitizeGameDictionaryEntry({
            gameId: String(game.id),
            nameZh: normalizedName,
            nameEn: '',
            aliases: normalizedName ? [normalizedName] : [],
            steamAppId: '',
            weiboAccount: '',
            xAccount: '',
            updatedAt: new Date().toISOString()
        });
    }

    function getFollowedGameDictionary() {
        var list = get(KEYS.FOLLOWED_GAME_DICTIONARY, []);
        if (!Array.isArray(list)) return [];
        return list.map(sanitizeGameDictionaryEntry).filter(Boolean);
    }

    function setFollowedGameDictionary(entries) {
        var map = {};
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
            var normalized = sanitizeGameDictionaryEntry(entry);
            if (!normalized) return;
            map[normalized.gameId] = normalized;
        });
        return set(KEYS.FOLLOWED_GAME_DICTIONARY, Object.values(map));
    }

    function bootstrapFollowedGameDictionaryFromGames(options) {
        options = options || {};
        var preserveUserEdits = options.preserveUserEdits !== false;
        var nowIso = new Date().toISOString();
        var games = getGames();
        var existingMap = {};
        getFollowedGameDictionary().forEach(function (entry) {
            existingMap[String(entry.gameId)] = entry;
        });

        var next = games.map(function (game) {
            var base = createDictionaryEntryFromGame(game);
            if (!base) return null;
            var current = existingMap[String(base.gameId)];
            if (!current) return base;
            var defaultAlias = String(game.name || '').trim();
            return sanitizeGameDictionaryEntry({
                gameId: base.gameId,
                nameZh: preserveUserEdits ? (current.nameZh || base.nameZh) : base.nameZh,
                nameEn: preserveUserEdits ? current.nameEn : '',
                aliases: dedupeAliases((current.aliases || []).concat(defaultAlias ? [defaultAlias] : [])),
                steamAppId: preserveUserEdits ? current.steamAppId : '',
                weiboAccount: preserveUserEdits ? current.weiboAccount : '',
                xAccount: preserveUserEdits ? current.xAccount : '',
                updatedAt: preserveUserEdits ? (current.updatedAt || nowIso) : nowIso
            });
        }).filter(Boolean);

        setFollowedGameDictionary(next);
        return next;
    }

    function buildDictionaryAliasIndex(entries) {
        var index = {};
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
            var normalized = sanitizeGameDictionaryEntry(entry);
            if (!normalized) return;
            var candidates = [normalized.nameZh, normalized.nameEn].concat(normalized.aliases || []);
            candidates.forEach(function (candidate) {
                var key = normalizeAliasText(candidate);
                if (!key || index[key]) return;
                index[key] = normalized;
            });
        });
        return index;
    }

    function findFollowedGameDictionaryEntryByAliasOrName(input, entries) {
        var key = normalizeAliasText(input);
        if (!key) return null;
        var index = buildDictionaryAliasIndex(Array.isArray(entries) ? entries : getFollowedGameDictionary());
        return index[key] || null;
    }

    function getGames() {
        return get(KEYS.GAMES, []);
    }

    function getGameById(id) {
        if (id == null || id === '') return null;
        return getGames().find(function (g) { return String(g.id) === String(id); }) || null;
    }

    /** 鎸夊悕绉板湪搴撲腑鏌ユ壘娓告垙 id锛涙棤鍖归厤杩斿洖 null */
    function resolveGameIdByName(name) {
        if (!name) return null;
        var match = getGames().find(function (g) { return matchGameName(g.name, name); });
        return match ? match.id : null;
    }

    function getRecordGameName(record, nameKey) {
        if (!record) return '';
        if (nameKey === 'name') return record.name || record.gameName || '';
        return record.gameName || record.game || record.name || '';
    }

    /** 鍒ゆ柇璁板綍鏄惁灞炰簬鏌愭父鎴忥細浼樺厛 gameId锛屽洖閫€鍚嶇О鍖归厤 */
    function recordBelongsToGame(record, game, nameKey) {
        if (!record || !game) return false;
        nameKey = nameKey || 'gameName';
        if (record.gameId != null && record.gameId !== '') {
            return String(record.gameId) === String(game.id);
        }
        return matchGameName(getRecordGameName(record, nameKey), game.name);
    }

    /** 涓哄崟鏉¤褰曡ˉ鍏?gameId锛屽苟鍚屾鏍囧噯鍚嶇О */
    function migrateRecordGameId(record, nameKey) {
        nameKey = nameKey || 'gameName';
        var migrated = Object.assign({}, record);
        if (migrated.gameId != null && migrated.gameId !== '') {
            var linked = getGameById(migrated.gameId);
            if (linked) {
                if (nameKey === 'name') migrated.name = linked.name;
                else migrated.gameName = linked.name;
            }
            return migrated;
        }
        var name = getRecordGameName(record, nameKey);
        var gameMatch = getGames().find(function (g) { return matchGameName(g.name, name); });
        if (gameMatch) {
            migrated.gameId = gameMatch.id;
            if (nameKey === 'name') migrated.name = gameMatch.name;
            else migrated.gameName = gameMatch.name;
        }
        return migrated;
    }

    function recordNeedsGameIdMigration(record, nameKey) {
        if (!record) return false;
        if (record.gameId != null && record.gameId !== '') return false;
        var name = getRecordGameName(record, nameKey);
        if (!name) return false;
        return getGames().some(function (g) { return matchGameName(g.name, name); });
    }

    /** 鍔犺浇鍚庤縼绉?reviews / achievements / media 鐨?gameId 鍏宠仈 */
    function migrateGameLinks() {
        migrateLegacyAchievements();
        if (getGames().length === 0) return;

        var achievements = get(KEYS.ACHIEVEMENTS, []);
        var reviews = get(KEYS.REVIEWS, []);
        var media = get(KEYS.MEDIA, []);

        var needAch = achievements.some(function (a) { return recordNeedsGameIdMigration(a, 'gameName'); });
        var needRev = reviews.some(function (r) { return recordNeedsGameIdMigration(r, 'name'); });
        var needMedia = media.some(function (m) { return recordNeedsGameIdMigration(m, 'gameName'); });

        if (needAch) {
            set(KEYS.ACHIEVEMENTS, achievements.map(function (a) { return migrateRecordGameId(a, 'gameName'); }));
        }
        if (needRev) {
            set(KEYS.REVIEWS, reviews.map(function (r) { return migrateRecordGameId(r, 'name'); }));
        }
        if (needMedia) {
            set(KEYS.MEDIA, media.map(function (m) { return migrateRecordGameId(m, 'gameName'); }));
        }
        bootstrapFollowedGameDictionaryFromGames({ preserveUserEdits: true });
    }

    function populateGameSelect(selectEl, options) {
        if (!selectEl) return;
        options = options || {};
        var games = getGames().slice().sort(function (a, b) {
            return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
        });
        var current = selectEl.value;
        var html = options.includeAll
            ? '<option value="all">鍏ㄩ儴娓告垙</option>'
            : '<option value="">' + (options.placeholder || '閫夋嫨娓告垙') + '</option>';
        games.forEach(function (g) {
            var safeName = String(g.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
            html += '<option value="' + String(g.id) + '">' + safeName + '</option>';
        });
        selectEl.innerHTML = html;
        if (current) selectEl.value = current;
    }

    function resolveGameFieldsFromSelect(gameId) {
        var game = getGameById(gameId);
        return {
            gameId: game ? game.id : (gameId || null),
            gameName: game ? game.name : '',
            name: game ? game.name : ''
        };
    }

    async function loadSamples() {
        if (samplesCache) return samplesCache;
        try {
            var res = await fetch('data/samples.json');
            if (!res.ok) throw new Error('samples.json ' + res.status);
            samplesCache = await res.json();
        } catch (e) {
            console.warn('鏃犳硶鍔犺浇 samples.json锛屼娇鐢ㄥ唴缃ず渚?, e);
            samplesCache = { games: [], achievements: [], memos: [] };
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

    function hydrateMemo(item) {
        var m = Object.assign({}, item);
        if (m.dateDaysAgo != null) {
            var d = new Date();
            d.setDate(d.getDate() - parseInt(m.dateDaysAgo, 10));
            d.setHours(10, 30, 0, 0);
            m.date = d.toLocaleString('zh-CN');
            delete m.dateDaysAgo;
        }
        return m;
    }

    async function seedGamesIfEmpty() {
        var games = get(KEYS.GAMES, []);
        if (games.length > 0) {
            bootstrapFollowedGameDictionaryFromGames({ preserveUserEdits: true });
            return games;
        }
        var samples = await loadSamples();
        games = (samples.games || []).map(hydrateGame);
        if (games.length > 0) {
            set(KEYS.GAMES, games);
            bootstrapFollowedGameDictionaryFromGames({ preserveUserEdits: true });
        }
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

    /** 绀轰緥澶囧繕褰?id锛堜笌 data/samples.json 涓€鑷达級 */
    var SAMPLE_MEMO_IDS = [1001, 1002];
    var DISMISSED_SAMPLE_MEMOS_KEY = 'memos_dismissed_samples';

    function getDismissedSampleMemoIds() {
        var list = get(DISMISSED_SAMPLE_MEMOS_KEY, []);
        return Array.isArray(list) ? list.map(Number) : [];
    }

    function markSampleMemoDismissed(id) {
        var numId = Number(id);
        if (SAMPLE_MEMO_IDS.indexOf(numId) === -1) return;
        var dismissed = getDismissedSampleMemoIds();
        if (dismissed.indexOf(numId) === -1) {
            dismissed.push(numId);
            set(DISMISSED_SAMPLE_MEMOS_KEY, dismissed);
        }
    }

    function isSampleMemoId(id) {
        return SAMPLE_MEMO_IDS.indexOf(Number(id)) !== -1;
    }

    /** 琛ュ叏缂哄け鐨勭ず渚嬪蹇樺綍锛堜簯鍚屾鍚庝篃浼氳皟鐢紱鐢ㄦ埛涓诲姩鍒犻櫎鐨勪笉鍐嶆仮澶嶏級 */
    async function ensureSampleMemos() {
        var samples = await loadSamples();
        var sampleMemos = (samples.memos || []).map(hydrateMemo);
        if (sampleMemos.length === 0) {
            var existing = get(KEYS.MEMOS, []);
            return Array.isArray(existing) ? existing : [];
        }

        var memos = get(KEYS.MEMOS, []);
        if (!Array.isArray(memos)) memos = [];

        var dismissed = getDismissedSampleMemoIds();
        var existingIds = {};
        memos.forEach(function (m) {
            if (m && m.id != null) existingIds[String(m.id)] = true;
        });

        var added = false;
        sampleMemos.forEach(function (sample) {
            if (!sample || sample.id == null) return;
            var sid = Number(sample.id);
            if (dismissed.indexOf(sid) !== -1) return;
            if (existingIds[String(sample.id)]) return;
            memos.unshift(sample);
            existingIds[String(sample.id)] = true;
            added = true;
        });

        if (added) set(KEYS.MEMOS, memos);
        return memos;
    }

    async function seedMemosIfEmpty() {
        return ensureSampleMemos();
    }

    var DEFAULT_PROFILE = {
        name: '娓告垙鐜╁',
        title: '鐑埍娓告垙鐨勫啋闄╄€?,
        bio: '鐑埍娓告垙鐨勫啋闄╄€咃紝鍠滄鎺㈢储鍚勭绫诲瀷鐨勬父鎴忎笘鐣岋紝璁板綍姣忎竴娆＄簿褰╃殑娓告垙浣撻獙銆?,
        avatar: 'assets/default-avatar.svg',
        tags: ['鍘熺', '鏄庢棩鏂硅垷', '鐜嬭€呰崳鑰€', '闂€€鏆栨殩'],
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

    var DEFAULT_INTEREST_PROFILE = {
        preferredPlatforms: [],
        favoriteGenres: [],
        priceSensitivity: 'medium',
        followedFranchises: [],
        updatedAt: null
    };

    var DEFAULT_DEAL_WATCH_RULES = {
        enabled: true,
        minDiscountPercent: 30,
        targetPriceByWishlistId: {},
        preferredPlatforms: [],
        notifyOnlyNewLows: true,
        updatedAt: null
    };

    function getInterestProfile() {
        return Object.assign({}, DEFAULT_INTEREST_PROFILE, get(KEYS.USER_INTEREST_PROFILE, {}));
    }

    function setInterestProfile(profile) {
        return set(KEYS.USER_INTEREST_PROFILE, Object.assign({}, DEFAULT_INTEREST_PROFILE, profile || {}));
    }

    function getDealWatchRules() {
        return Object.assign({}, DEFAULT_DEAL_WATCH_RULES, get(KEYS.DEAL_WATCH_RULES, {}));
    }

    function setDealWatchRules(rules) {
        return set(KEYS.DEAL_WATCH_RULES, Object.assign({}, DEFAULT_DEAL_WATCH_RULES, rules || {}));
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
        migrateGameLinks: migrateGameLinks,
        achievementDateMs: achievementDateMs,
        matchGameName: matchGameName,
        normalizeAliasText: normalizeAliasText,
        getGames: getGames,
        getGameById: getGameById,
        resolveGameIdByName: resolveGameIdByName,
        getFollowedGameDictionary: getFollowedGameDictionary,
        setFollowedGameDictionary: setFollowedGameDictionary,
        bootstrapFollowedGameDictionaryFromGames: bootstrapFollowedGameDictionaryFromGames,
        buildDictionaryAliasIndex: buildDictionaryAliasIndex,
        findFollowedGameDictionaryEntryByAliasOrName: findFollowedGameDictionaryEntryByAliasOrName,
        getRecordGameName: getRecordGameName,
        recordBelongsToGame: recordBelongsToGame,
        migrateRecordGameId: migrateRecordGameId,
        populateGameSelect: populateGameSelect,
        resolveGameFieldsFromSelect: resolveGameFieldsFromSelect,
        seedGamesIfEmpty: seedGamesIfEmpty,
        seedAchievementsIfEmpty: seedAchievementsIfEmpty,
        seedMemosIfEmpty: seedMemosIfEmpty,
        ensureSampleMemos: ensureSampleMemos,
        markSampleMemoDismissed: markSampleMemoDismissed,
        isSampleMemoId: isSampleMemoId,
        SAMPLE_MEMO_IDS: SAMPLE_MEMO_IDS,
        getProfile: getProfile,
        setProfile: setProfile,
        DEFAULT_PROFILE: DEFAULT_PROFILE,
        getInterestProfile: getInterestProfile,
        setInterestProfile: setInterestProfile,
        getDealWatchRules: getDealWatchRules,
        setDealWatchRules: setDealWatchRules,
        DEFAULT_INTEREST_PROFILE: DEFAULT_INTEREST_PROFILE,
        DEFAULT_DEAL_WATCH_RULES: DEFAULT_DEAL_WATCH_RULES
    };
})();
