/**
 * game-detail.js 鈥?鍗曟父鎴忚仛鍚堣鎯呴〉
 * URL: game.html?id=<gameId> 鎴?game.html?name=<encodedName>
 */
(function () {
    'use strict';

    var GD = window.GameData;
    var game = null;

    function matchGameName(a, b) {
        return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    }

    function getQueryParams() {
        var params = new URLSearchParams(window.location.search);
        return {
            id: params.get('id'),
            name: params.get('name')
        };
    }

    function renderStars(rating) {
        var html = '';
        for (var i = 1; i <= 5; i++) {
            html += i <= rating
                ? '<span style="color:#f59e0b;">&#9733;</span>'
                : '<span style="color:#d1d5db;">&#9734;</span>';
        }
        return html;
    }

    function emptySection(message) {
        return '<div class="game-hub-empty"><i data-lucide="inbox" class="w-8 h-8 text-gray-300"></i><p>' + escapeHtml(message) + '</p></div>';
    }

    function showNotFound(message) {
        document.getElementById('game-hub-content').classList.add('hidden');
        var nf = document.getElementById('game-not-found');
        nf.classList.remove('hidden');
        if (message) {
            document.getElementById('not-found-message').textContent = message;
        }
        document.title = '鏈壘鍒版父鎴?- 娓告垙璁板綍';
        if (window.lucide) lucide.createIcons();
    }

    function findGame(games, query) {
        if (query.id) {
            return games.find(function (g) { return String(g.id) === String(query.id); });
        }
        if (query.name) {
            var decoded = decodeURIComponent(query.name);
            return games.find(function (g) { return matchGameName(g.name, decoded); });
        }
        return null;
    }

    function filterRecordsByGame(list, game, nameKey) {
        return list.filter(function (item) {
            return GD.recordBelongsToGame(item, game, nameKey);
        });
    }

    function getSpendingRecordType(s) {
        if (s.recordType === 'purchase' || s.recordType === 'recharge') return s.recordType;
        if (s.wishlistId != null && s.wishlistId !== '') return 'purchase';
        if (s.gameId != null && s.gameId !== '') return 'recharge';
        var label = String(s.game || '').trim().toLowerCase();
        if (label === '璐︽埛鍏呭€?) return 'recharge';
        return 'recharge';
    }

    function filterSpendingByGame(spendingList, currentGame) {
        return spendingList.filter(function (s) {
            var type = getSpendingRecordType(s);
            if (type === 'recharge') {
                if (s.gameId != null && String(s.gameId) === String(currentGame.id)) return true;
                if (!s.gameId && matchGameName(s.game, currentGame.name) && String(s.game || '').trim() !== '璐︽埛鍏呭€?) {
                    return true;
                }
                return false;
            }
            if (type === 'purchase' && matchGameName(s.game, currentGame.name)) return true;
            return false;
        });
    }

    function renderHero() {
        document.getElementById('game-hero-cover').innerHTML = imgWithFallback(game.icon, game.name, 'game-hub-cover-img');
        document.getElementById('game-hero-name').textContent = game.name;
        document.getElementById('game-hero-type').textContent = game.type || '鍏朵粬';
        document.getElementById('game-hero-desc').textContent = game.description || '鏆傛棤鎻忚堪';

        var statusEl = document.getElementById('game-hero-status');
        statusEl.textContent = getStatusText(game.status);
        statusEl.className = 'game-hub-status ' + getStatusClass(game.status);

        var progress = parseInt(game.progress, 10) || 0;
        document.getElementById('game-progress-label').textContent = progress + '%';
        document.getElementById('game-progress-fill').style.width = progress + '%';

        var playtime = parseInt(game.playtime, 10) || 0;
        document.getElementById('game-quick-stats').innerHTML =
            '<div class="game-hub-stat"><i data-lucide="clock" class="w-4 h-4"></i><span><strong>' + playtime + '</strong> 灏忔椂</span></div>';

        document.title = game.name + ' - 娓告垙璁板綍';
    }

    function renderReviews(reviews) {
        var container = document.getElementById('game-reviews-list');
        var section = document.getElementById('section-reviews');

        if (reviews.length === 0) {
            container.innerHTML = emptySection('鏆傛棤璇ユ父鎴忕殑璇勬祴');
            return;
        }

        var html = '';
        reviews.forEach(function (item) {
            var reviewText = item.review || item.comment || '';
            html += '<div class="review-card game-hub-review-card">';
            html += '  <div class="review-cover">' + imgWithFallback(item.coverUrl || item.cover, item.name, 'review-cover-img') + '</div>';
            html += '  <div class="review-info">';
            html += '    <div class="review-stars">' + renderStars(item.rating || 0) + '</div>';
            if (item.tags && item.tags.length) {
                html += '    <div class="review-tags">';
                item.tags.forEach(function (tag) {
                    html += '<span class="tag-pill">' + escapeHtml(tag) + '</span>';
                });
                html += '    </div>';
            }
            if (reviewText) {
                html += '    <p class="review-text" style="-webkit-line-clamp:4;">' + escapeHtml(reviewText) + '</p>';
            }
            html += '    <div class="review-meta"><span class="review-date">' + formatDate(item.date) + '</span></div>';
            html += '  </div>';
            html += '</div>';
        });
        container.innerHTML = html;
        section.classList.remove('hidden');
    }

    function renderAchievements(achievements) {
        var container = document.getElementById('game-achievements-list');
        var section = document.getElementById('section-achievements');

        if (achievements.length === 0) {
            container.innerHTML = emptySection('鏆傛棤璇ユ父鎴忕殑鎴愬氨');
            return;
        }

        achievements.sort(function (a, b) {
            return (GD.achievementDateMs(b) || 0) - (GD.achievementDateMs(a) || 0);
        });

        container.innerHTML = achievements.map(function (a) {
            return '<div class="game-hub-achievement-item">' +
                '<div class="game-hub-achievement-icon"><i data-lucide="' + safeLucideIcon(a.icon) + '" class="w-5 h-5"></i></div>' +
                '<div class="game-hub-achievement-body">' +
                    '<h4>' + escapeHtml(a.title) + '</h4>' +
                    '<p>' + escapeHtml(a.description || '') + '</p>' +
                    '<span class="game-hub-achievement-date">' + formatDateISO(a.date) + '</span>' +
                '</div>' +
            '</div>';
        }).join('');
        section.classList.remove('hidden');
    }

    function normalizeMediaType(item) {
        if (!item || typeof item === 'string') return 'image';
        var t = (item.type || '').toLowerCase();
        return t === 'video' ? 'video' : 'image';
    }

    /** 鍚堝苟濯掍綋搴?(game_record_media) 涓庢父鎴忓璞′笂鐨?legacy screenshots/videos */
    function buildMediaItems(galleryMedia) {
        var items = [];
        var seenUrls = {};

        function addItem(type, url, thumbnail) {
            if (!url || seenUrls[url]) return;
            seenUrls[url] = true;
            items.push({ type: type, url: url, thumbnail: thumbnail || null });
        }

        (galleryMedia || []).forEach(function (item) {
            addItem(normalizeMediaType(item), item.url, item.thumbnail);
        });
        (game.screenshots || []).forEach(function (url) {
            addItem('image', url);
        });
        (game.videos || []).forEach(function (url) {
            addItem('video', url);
        });
        return items;
    }

    function renderScreenshots(galleryMedia) {
        var container = document.getElementById('game-screenshots-grid');
        var section = document.getElementById('section-screenshots');
        var items = buildMediaItems(galleryMedia);

        if (items.length === 0) {
            container.innerHTML = emptySection('鏆傛棤鎴浘鎴栬棰?);
            return;
        }

        container.innerHTML = items.map(function (item, i) {
            if (item.type === 'video') {
                return '<div class="media-item"><video src="' + escapeHtml(item.url) + '" controls class="w-full h-full object-cover"></video></div>';
            }
            return '<div class="media-item"><img src="' + escapeHtml(item.url) + '" alt="鎴浘 ' + (i + 1) + '" loading="lazy"></div>';
        }).join('');
        section.classList.remove('hidden');
    }

    function renderSpending(records) {
        var summaryEl = document.getElementById('game-spending-summary');
        var listEl = document.getElementById('game-spending-list');
        var section = document.getElementById('section-spending');

        if (records.length === 0) {
            summaryEl.innerHTML = '';
            listEl.innerHTML = emptySection('鏆傛棤璇ユ父鎴忕殑娑堣垂璁板綍');
            return;
        }

        var total = records.reduce(function (sum, r) {
            return sum + (parseFloat(r.amount) || 0);
        }, 0);

        summaryEl.innerHTML =
            '<div class="game-hub-spending-total">' +
                '<span>绱娑堣垂</span>' +
                '<strong>楼' + total.toFixed(2) + '</strong>' +
                '<span class="text-sm text-gray-500">' + records.length + ' 绗旇褰?/span>' +
            '</div>';

        records.sort(function (a, b) {
            return String(b.date || '').localeCompare(String(a.date || ''));
        });

        listEl.innerHTML =
            '<table class="game-hub-table">' +
                '<thead><tr><th>绫诲瀷</th><th>閲戦</th><th>鏃ユ湡</th><th>骞冲彴</th><th>澶囨敞</th></tr></thead>' +
                '<tbody>' +
                records.map(function (r) {
                    var typeLabel = getSpendingRecordType(r) === 'purchase' ? '璐拱' : '鍏呭€?;
                    return '<tr>' +
                        '<td>' + escapeHtml(typeLabel) + '</td>' +
                        '<td class="font-medium">楼' + (parseFloat(r.amount) || 0).toFixed(2) + '</td>' +
                        '<td>' + escapeHtml(formatDateISO(r.date) || '-') + '</td>' +
                        '<td>' + escapeHtml(r.platform || '-') + '</td>' +
                        '<td>' + escapeHtml(r.note || '-') + '</td>' +
                    '</tr>';
                }).join('') +
                '</tbody>' +
            '</table>';
        section.classList.remove('hidden');
    }

    function hideEmptySections(counts) {
        if (counts.reviews === 0) document.getElementById('section-reviews').classList.add('game-hub-section-muted');
        if (counts.achievements === 0) document.getElementById('section-achievements').classList.add('game-hub-section-muted');
        if (counts.screenshots === 0) document.getElementById('section-screenshots').classList.add('game-hub-section-muted');
        if (counts.spending === 0) document.getElementById('section-spending').classList.add('game-hub-section-muted');
    }

    function renderPersonalized(news, deals) {
        var newsEl = document.getElementById('game-news-list');
        var dealsEl = document.getElementById('game-deals-list');
        if (!newsEl || !dealsEl) return;

        if (!news || news.length === 0) {
            newsEl.innerHTML = emptySection('鏆傛棤璇ユ父鎴忚祫璁?);
        } else {
            newsEl.innerHTML = news.slice(0, 4).map(function (item) {
                return '<article class="p-3 rounded-lg border border-gray-200 bg-white/70">' +
                    '<h4 class="font-semibold text-gray-800">' + escapeHtml(item.title || '娓告垙璧勮') + '</h4>' +
                    '<p class="text-sm text-gray-600 mt-1">' + escapeHtml(item.summary || '') + '</p>' +
                '</article>';
            }).join('');
        }

        if (!deals || deals.length === 0) {
            dealsEl.innerHTML = emptySection('鏆傛棤璇ユ父鎴忔姌鎵?);
        } else {
            dealsEl.innerHTML = deals.slice(0, 4).map(function (item) {
                return '<article class="p-3 rounded-lg border border-gray-200 bg-white/70">' +
                    '<div class="flex items-center justify-between gap-2">' +
                        '<strong class="text-gray-800">' + escapeHtml(item.platform || '骞冲彴') + '</strong>' +
                        '<span class="badge badge-green">' + escapeHtml(String(item.discountPercent || 0)) + '% OFF</span>' +
                    '</div>' +
                    '<p class="text-sm text-gray-700 mt-2">楼' + Number(item.currentPrice || 0).toFixed(2) +
                    ' <span class="text-gray-400 line-through ml-1">楼' + Number(item.originalPrice || 0).toFixed(2) + '</span></p>' +
                '</article>';
            }).join('');
        }
    }

    async function renderGameContent() {
        if (!game) return;

        var reviews = filterRecordsByGame(GD.get(GD.KEYS.REVIEWS, []), game, 'name');
        var achievements = filterRecordsByGame(GD.get(GD.KEYS.ACHIEVEMENTS, []), game, 'gameName');
        var allMedia = window.GameCloud && window.GameCloud.enabled
            ? await window.GameCloud.fetchMedia()
            : GD.get(GD.KEYS.MEDIA, []);
        allMedia = allMedia.map(function (m) { return GD.migrateRecordGameId(m, 'gameName'); });
        var gallery = filterRecordsByGame(allMedia, game, 'gameName');
        var spending = filterSpendingByGame(GD.get(GD.KEYS.SPENDING, []), game);
        var mediaItems = buildMediaItems(gallery);

        renderHero();
        renderReviews(reviews);
        renderAchievements(achievements);
        renderScreenshots(gallery);
        renderSpending(spending);

        if (window.GamePersonalizedFeed) {
            var cached = window.GamePersonalizedFeed.getCachedFeed();
            var gameNews = (cached.news || []).filter(function (n) { return matchGameName(n.gameName, game.name); });
            var gameDeals = (cached.deals || []).filter(function (d) { return matchGameName(d.gameName, game.name); });
            if (gameNews.length === 0 && gameDeals.length === 0) {
                try {
                    var refreshed = await window.GamePersonalizedFeed.refresh({ force: false });
                    gameNews = (refreshed.news || []).filter(function (n) { return matchGameName(n.gameName, game.name); });
                    gameDeals = (refreshed.deals || []).filter(function (d) { return matchGameName(d.gameName, game.name); });
                } catch (e) {
                    console.warn('涓€у寲鍐呭鍔犺浇澶辫触:', e);
                }
            }
            renderPersonalized(gameNews, gameDeals);
        } else {
            renderPersonalized([], []);
        }

        hideEmptySections({
            reviews: reviews.length,
            achievements: achievements.length,
            screenshots: mediaItems.length,
            spending: spending.length
        });

        if (window.lucide) lucide.createIcons();
    }

    async function init() {
        await window.awaitGameCloud();
        GD.migrateLegacyAchievements();

        var games = await GD.seedGamesIfEmpty();
        var query = getQueryParams();

        if (!query.id && !query.name) {
            showNotFound('缂哄皯娓告垙鍙傛暟銆傝浠庢父鎴忔敹钘忛〉鐐瑰嚮杩涘叆锛屾垨浣跨敤 game.html?id= 閾炬帴銆?);
            return;
        }

        game = findGame(games, query);
        if (!game) {
            showNotFound('鎵句笉鍒板悕涓恒€? + (query.name ? decodeURIComponent(query.name) : 'ID ' + query.id) + '銆嶇殑娓告垙銆?);
            return;
        }

        document.getElementById('game-not-found').classList.add('hidden');
        document.getElementById('game-hub-content').classList.remove('hidden');

        await renderGameContent();
        window.whenGameCloudSynced(renderGameContent);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
