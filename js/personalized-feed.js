/**
 * personalized-feed.js — 个性化资讯与折扣聚合
 * 优先调用 Supabase Edge Function，失败时回退本地规则引擎。
 */
(function () {
    'use strict';

    var GD = window.GameData;
    if (!GD) return;

    function clampNumber(val, min, max, fallback) {
        var num = parseFloat(val);
        if (isNaN(num)) return fallback;
        if (num < min) return min;
        if (num > max) return max;
        return num;
    }

    function isoNow() {
        return new Date().toISOString();
    }

    function sanitizeDealRules(raw) {
        var base = GD.getDealWatchRules ? GD.getDealWatchRules() : (raw || {});
        var rules = Object.assign({}, base, raw || {});
        rules.enabled = rules.enabled !== false;
        rules.minDiscountPercent = clampNumber(rules.minDiscountPercent, 1, 95, 30);
        rules.targetPriceByWishlistId = rules.targetPriceByWishlistId && typeof rules.targetPriceByWishlistId === 'object'
            ? rules.targetPriceByWishlistId
            : {};
        if (!Array.isArray(rules.preferredPlatforms)) rules.preferredPlatforms = [];
        rules.notifyOnlyNewLows = rules.notifyOnlyNewLows !== false;
        return rules;
    }

    function buildInterestProfile() {
        var profile = GD.getProfile ? GD.getProfile() : GD.get(GD.KEYS.PROFILE, {});
        var wishlist = GD.get(GD.KEYS.WISHLIST, []);
        var games = GD.get(GD.KEYS.GAMES, []);
        var spending = GD.get(GD.KEYS.SPENDING, []);

        var platformCounter = {};
        wishlist.forEach(function (w) {
            var key = String(w.platform || '').trim();
            if (!key) return;
            platformCounter[key] = (platformCounter[key] || 0) + 1;
        });

        var genreCounter = {};
        games.forEach(function (g) {
            var t = String(g.type || '').trim();
            if (!t) return;
            genreCounter[t] = (genreCounter[t] || 0) + 1;
        });

        var totalSpend = spending.reduce(function (sum, row) {
            return sum + (parseFloat(row.amount) || 0);
        }, 0);
        var avgSpend = spending.length > 0 ? (totalSpend / spending.length) : 0;
        var priceSensitivity = avgSpend > 180 ? 'low' : (avgSpend > 80 ? 'medium' : 'high');

        var preferredPlatforms = Object.keys(platformCounter).sort(function (a, b) {
            return platformCounter[b] - platformCounter[a];
        }).slice(0, 3);

        var favoriteGenres = Object.keys(genreCounter).sort(function (a, b) {
            return genreCounter[b] - genreCounter[a];
        }).slice(0, 4);

        var followedFranchises = (profile.tags || []).slice(0, 6);

        var merged = Object.assign({}, GD.getInterestProfile ? GD.getInterestProfile() : {}, {
            preferredPlatforms: preferredPlatforms,
            favoriteGenres: favoriteGenres,
            priceSensitivity: priceSensitivity,
            followedFranchises: followedFranchises,
            updatedAt: isoNow()
        });

        if (GD.setInterestProfile) GD.setInterestProfile(merged);
        else GD.set(GD.KEYS.USER_INTEREST_PROFILE, merged);
        return merged;
    }

    function localNewsCandidates() {
        var games = GD.get(GD.KEYS.GAMES, []);
        var wishlist = GD.get(GD.KEYS.WISHLIST, []);
        var records = games.concat(wishlist).slice(0, 10);
        return records.map(function (item, idx) {
            var gameName = item.name || '未知游戏';
            return {
                id: 'local-news-' + String(item.id || idx),
                gameName: gameName,
                title: gameName + ' 社区热度上升，近期值得关注',
                summary: '根据你的游玩与收藏偏好，这款游戏近期更新讨论度较高，建议查看版本公告与社区攻略。',
                source: 'local-fallback',
                link: '',
                publishedAt: isoNow(),
                score: Math.max(0, 100 - idx * 5)
            };
        });
    }

    function localDealCandidates(rules) {
        var wishlist = GD.get(GD.KEYS.WISHLIST, []);
        return wishlist.map(function (item, idx) {
            var origin = parseFloat(item.price) || (99 + idx * 12);
            var discountRate = Math.max(rules.minDiscountPercent, 25 + (idx % 4) * 10);
            var finalPrice = Math.max(1, origin * (1 - discountRate / 100));
            return {
                id: 'local-deal-' + String(item.id || idx),
                gameName: item.name || '未知游戏',
                platform: item.platform || 'PC',
                originalPrice: Number(origin.toFixed(2)),
                currentPrice: Number(finalPrice.toFixed(2)),
                discountPercent: Number(discountRate.toFixed(0)),
                isNewLow: idx % 2 === 0,
                source: 'local-fallback',
                dealUrl: '',
                fetchedAt: isoNow()
            };
        }).filter(function (deal) {
            if (!rules.enabled) return false;
            if (rules.preferredPlatforms.length > 0 && rules.preferredPlatforms.indexOf(deal.platform) === -1) return false;
            if (deal.discountPercent < rules.minDiscountPercent) return false;
            return true;
        });
    }

    async function fetchFromEdge(payload) {
        if (!window.SB || !window.SB.functions || typeof window.SB.functions.invoke !== 'function') {
            throw new Error('Supabase functions unavailable');
        }
        var response = await window.SB.functions.invoke('fetch-personalized-feed', { body: payload });
        if (response.error) throw response.error;
        return response.data || {};
    }

    function persistFeed(data) {
        var news = Array.isArray(data.news) ? data.news : [];
        var deals = Array.isArray(data.deals) ? data.deals : [];
        GD.set(GD.KEYS.GAME_NEWS_FEED, news);
        GD.set(GD.KEYS.DISCOUNT_DEALS, deals);
        return { news: news, deals: deals };
    }

    async function refreshPersonalizedFeed(options) {
        options = options || {};
        var rules = sanitizeDealRules(GD.getDealWatchRules ? GD.getDealWatchRules() : GD.get(GD.KEYS.DEAL_WATCH_RULES, {}));
        if (GD.setDealWatchRules) GD.setDealWatchRules(rules);
        else GD.set(GD.KEYS.DEAL_WATCH_RULES, rules);

        var interestProfile = buildInterestProfile();
        var payload = {
            force: !!options.force,
            userInterestProfile: interestProfile,
            dealWatchRules: rules,
            wishlist: GD.get(GD.KEYS.WISHLIST, []),
            games: GD.get(GD.KEYS.GAMES, []),
            reviews: GD.get(GD.KEYS.REVIEWS, []),
            profile: GD.getProfile ? GD.getProfile() : GD.get(GD.KEYS.PROFILE, {})
        };

        try {
            var data = await fetchFromEdge(payload);
            var persisted = persistFeed({
                news: data.news || [],
                deals: data.deals || []
            });
            return { source: 'edge', news: persisted.news, deals: persisted.deals };
        } catch (err) {
            console.warn('个性化 feed 使用本地回退:', err);
            var fallback = {
                news: localNewsCandidates(),
                deals: localDealCandidates(rules)
            };
            persistFeed(fallback);
            return { source: 'local', news: fallback.news, deals: fallback.deals };
        }
    }

    function getCachedFeed() {
        return {
            news: GD.get(GD.KEYS.GAME_NEWS_FEED, []),
            deals: GD.get(GD.KEYS.DISCOUNT_DEALS, [])
        };
    }

    window.GamePersonalizedFeed = {
        refresh: refreshPersonalizedFeed,
        getCachedFeed: getCachedFeed,
        buildInterestProfile: buildInterestProfile,
        sanitizeDealRules: sanitizeDealRules
    };
})();
