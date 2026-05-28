/**
 * spending.js — 消费记录业务逻辑
 * localStorage key: game_record_spending
 * 数据结构: { id, recordType: 'purchase'|'recharge', wishlistId?, gameId?, game, amount, date, platform, note }
 * 购买游戏 → 关联愿望单 (wishlistId)；账户充值 → 关联游戏库 (gameId)
 */
(function () {
    'use strict';

    var TU = window.TimeUtils || {
        parseDate: function(val) {
            if (!val) return null;
            if (val instanceof Date && !isNaN(val.getTime())) return val;
            if (typeof val !== 'string') return null;
            var m = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
            var d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        },
        filterByYear: function(items, year, dateKey) {
            dateKey = dateKey || 'date';
            return items.filter(function(item) {
                var d = TU.parseDate(item[dateKey]);
                return d && d.getFullYear() === year;
            });
        },
        groupByMonthSum: function(items, year, dateKey, amountKey) {
            dateKey = dateKey || 'date';
            amountKey = amountKey || 'amount';
            var result = {};
            for (var i = 1; i <= 12; i++) result[i] = 0;
            items.forEach(function(item) {
                var d = TU.parseDate(item[dateKey]);
                if (d && d.getFullYear() === year) {
                    var m = d.getMonth() + 1;
                    result[m] += parseFloat(item[amountKey]) || 0;
                }
            });
            return result;
        }
    };
    var SPENDING_KEY = window.GameData ? window.GameData.KEYS.SPENDING : 'game_record_spending';
    var WISHLIST_KEY = window.GameData ? window.GameData.KEYS.WISHLIST : 'game_record_wishlist';
    var editingId = null;
    var charts = {};
    var migrationDone = false;

    var RECORD_TYPE = { PURCHASE: 'purchase', RECHARGE: 'recharge' };
    var PLATFORM_OPTIONS = [
        'PC', '手机', 'PlayStation', 'Xbox', 'Switch', 'Steam', 'Epic', '其他'
    ];
    var DEFAULT_PLATFORM = 'PC';
    var DEFAULT_GAME_LABEL = '账户充值';
    var RECHARGE_OTHER_VALUE = '__recharge_other__';
    var LEGACY_VALUE = '__legacy__';
    var PLATFORM_COLORS = {
        'PC': '#4338ca', '手机': '#f57c00', 'PlayStation': '#5271ff', 'Xbox': '#107c10',
        'Switch': '#e60050', 'Steam': '#1a9fff', 'Epic': '#7c3aed', '其他': '#64748b',
        'PS Store': '#5271ff', 'Nintendo eShop': '#e60050'
    };
    var PLATFORM_CLASS = {
        'PC': 'platform-pc', '手机': 'platform-mobile', 'PlayStation': 'platform-ps',
        'PS Store': 'platform-ps', 'Xbox': 'platform-xbox', 'Switch': 'platform-nintendo',
        'Nintendo eShop': 'platform-nintendo', 'Steam': 'platform-steam', 'Epic': 'platform-epic'
    };
    var HELP_TEXT = {
        purchase: '购买游戏：从愿望单选择要购买的游戏，记录会显示在愿望单页面。',
        recharge: '账户充值：从游戏库选择充值对应的游戏，记录会显示在该游戏详情页。'
    };

    // ==================== 数据读写 ====================
    function getSpending() {
        if (window.GameData) return window.GameData.get(SPENDING_KEY, []);
        try { return JSON.parse(localStorage.getItem(SPENDING_KEY) || '[]'); }
        catch (e) { return []; }
    }
    function saveSpending(data) {
        if (window.GameData) { window.GameData.set(SPENDING_KEY, data); return; }
        localStorage.setItem(SPENDING_KEY, JSON.stringify(data));
    }

    // ==================== 工具 ====================
    function fmt(v) { return TU.format(v); }
    function fmtMoney(v) {
        v = parseFloat(v);
        return isNaN(v) ? '¥0.00' : '¥' + v.toFixed(2);
    }
    function esc(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.textContent = String(str);
        return d.innerHTML;
    }
    function matchGameName(a, b) {
        return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    }
    function normalizeGame(val) {
        var g = (val || '').trim();
        return g || DEFAULT_GAME_LABEL;
    }
    function isRechargeLabel(name) {
        return matchGameName(normalizeGame(name), DEFAULT_GAME_LABEL);
    }
    function getRecordType(r) {
        if (!r) return RECORD_TYPE.RECHARGE;
        if (r.recordType === RECORD_TYPE.PURCHASE || r.recordType === RECORD_TYPE.RECHARGE) {
            return r.recordType;
        }
        if (r.wishlistId != null && r.wishlistId !== '') return RECORD_TYPE.PURCHASE;
        if (r.gameId != null && r.gameId !== '') return RECORD_TYPE.RECHARGE;
        if (isRechargeLabel(r.game)) return RECORD_TYPE.RECHARGE;
        if (findGameByName(r.game)) return RECORD_TYPE.RECHARGE;
        if (findWishlistByName(r.game)) return RECORD_TYPE.PURCHASE;
        return RECORD_TYPE.PURCHASE;
    }
    function getGamesList() {
        if (!window.GameData) return [];
        return window.GameData.get(window.GameData.KEYS.GAMES, []);
    }
    function getWishlistList() {
        if (!window.GameData) {
            try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); }
            catch (e) { return []; }
        }
        return window.GameData.get(WISHLIST_KEY, []);
    }
    function findGameById(id) {
        return getGamesList().find(function (g) { return String(g.id) === String(id); });
    }
    function findGameByName(name) {
        return getGamesList().find(function (g) { return matchGameName(g.name, name); });
    }
    function findWishlistById(id) {
        return getWishlistList().find(function (w) { return String(w.id) === String(id); });
    }
    function findWishlistByName(name) {
        return getWishlistList().find(function (w) { return matchGameName(w.name, name); });
    }
    function resolveGameId(r) {
        if (getRecordType(r) !== RECORD_TYPE.RECHARGE) return null;
        if (r.gameId != null && r.gameId !== '') return r.gameId;
        var match = findGameByName(r.game);
        return match ? match.id : null;
    }

    function migrateRecord(r) {
        if (r.recordType === RECORD_TYPE.PURCHASE || r.recordType === RECORD_TYPE.RECHARGE) {
            return r;
        }
        var migrated = Object.assign({}, r);
        if (r.wishlistId != null && r.wishlistId !== '') {
            migrated.recordType = RECORD_TYPE.PURCHASE;
            var wish = findWishlistById(r.wishlistId);
            if (wish) migrated.game = wish.name;
            delete migrated.gameId;
            return migrated;
        }
        if (r.gameId != null && r.gameId !== '') {
            migrated.recordType = RECORD_TYPE.RECHARGE;
            var game = findGameById(r.gameId);
            if (game) migrated.game = game.name;
            delete migrated.wishlistId;
            return migrated;
        }
        if (isRechargeLabel(r.game)) {
            migrated.recordType = RECORD_TYPE.RECHARGE;
            migrated.game = DEFAULT_GAME_LABEL;
            delete migrated.gameId;
            delete migrated.wishlistId;
            return migrated;
        }
        var gameMatch = findGameByName(r.game);
        if (gameMatch) {
            migrated.recordType = RECORD_TYPE.RECHARGE;
            migrated.gameId = gameMatch.id;
            migrated.game = gameMatch.name;
            delete migrated.wishlistId;
            return migrated;
        }
        var wishMatch = findWishlistByName(r.game);
        if (wishMatch) {
            migrated.recordType = RECORD_TYPE.PURCHASE;
            migrated.wishlistId = wishMatch.id;
            migrated.game = wishMatch.name;
            delete migrated.gameId;
            return migrated;
        }
        migrated.recordType = RECORD_TYPE.PURCHASE;
        delete migrated.gameId;
        delete migrated.wishlistId;
        return migrated;
    }

    function migrateSpendingIfNeeded() {
        if (migrationDone) return;
        var records = getSpending();
        var changed = false;
        var migrated = records.map(function (r) {
            var next = migrateRecord(r);
            if (JSON.stringify(next) !== JSON.stringify(r)) changed = true;
            return next;
        });
        if (changed) saveSpending(migrated);
        migrationDone = true;
    }

    function populateLinkSelect(selectEl, recordType) {
        if (!selectEl) return;
        var html = '';
        if (recordType === RECORD_TYPE.PURCHASE) {
            var wishlist = getWishlistList().slice().sort(function (a, b) {
                return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
            });
            if (wishlist.length === 0) {
                html = '<option value="">愿望单为空，请先在愿望单页添加</option>';
            } else {
                wishlist.forEach(function (w) {
                    html += '<option value="' + esc(String(w.id)) + '">' + esc(w.name) + '</option>';
                });
            }
        } else {
            html = '<option value="' + RECHARGE_OTHER_VALUE + '">其他 / 账户充值</option>';
            var games = getGamesList().slice().sort(function (a, b) {
                return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
            });
            games.forEach(function (g) {
                html += '<option value="' + esc(String(g.id)) + '">' + esc(g.name) + '</option>';
            });
        }
        selectEl.innerHTML = html;
    }

    function updateLinkHelp(typeEl, helpEl) {
        if (!helpEl || !typeEl) return;
        helpEl.textContent = HELP_TEXT[typeEl.value] || '';
    }

    function initFormControls(typeEl, linkEl, helpEl, record) {
        if (!typeEl || !linkEl) return;
        var recordType = record ? getRecordType(record) : RECORD_TYPE.PURCHASE;
        typeEl.value = recordType;
        populateLinkSelect(linkEl, recordType);
        updateLinkHelp(typeEl, helpEl);
        if (!record) {
            if (recordType === RECORD_TYPE.PURCHASE && linkEl.options.length && linkEl.options[0].value) {
                linkEl.selectedIndex = 0;
            } else {
                linkEl.value = RECHARGE_OTHER_VALUE;
            }
            return;
        }
        setLinkSelectValue(linkEl, record);
    }

    function setLinkSelectValue(linkEl, record) {
        if (!linkEl || !record) return;
        var recordType = getRecordType(record);
        if (recordType === RECORD_TYPE.PURCHASE) {
            if (record.wishlistId != null && record.wishlistId !== '') {
                var byId = findWishlistById(record.wishlistId);
                if (byId) {
                    linkEl.value = String(record.wishlistId);
                    return;
                }
            }
            var byName = findWishlistByName(record.game);
            if (byName) {
                linkEl.value = String(byName.id);
                return;
            }
        } else {
            if (record.gameId != null && record.gameId !== '') {
                var game = findGameById(record.gameId);
                if (game) {
                    linkEl.value = String(record.gameId);
                    return;
                }
            }
            if (isRechargeLabel(record.game)) {
                linkEl.value = RECHARGE_OTHER_VALUE;
                return;
            }
            var gameByName = findGameByName(record.game);
            if (gameByName) {
                linkEl.value = String(gameByName.id);
                return;
            }
        }
        var opt = document.createElement('option');
        opt.value = LEGACY_VALUE;
        opt.textContent = normalizeGame(record.game) + ' (未关联)';
        opt.dataset.gameName = normalizeGame(record.game);
        linkEl.appendChild(opt);
        linkEl.value = LEGACY_VALUE;
    }

    function readFieldsFromForm(typeEl, linkEl) {
        if (!typeEl || !linkEl) return null;
        var recordType = typeEl.value;
        if (recordType === RECORD_TYPE.PURCHASE) {
            var value = linkEl.value;
            if (!value || value === LEGACY_VALUE) {
                if (value === LEGACY_VALUE) {
                    var legacyOpt = linkEl.options[linkEl.selectedIndex];
                    return {
                        recordType: RECORD_TYPE.PURCHASE,
                        wishlistId: null,
                        gameId: null,
                        game: (legacyOpt && legacyOpt.dataset.gameName) || normalizeGame('')
                    };
                }
                showToast('请选择愿望单中的游戏');
                return null;
            }
            var wish = findWishlistById(value);
            if (!wish) {
                showToast('请选择愿望单中的游戏');
                return null;
            }
            return {
                recordType: RECORD_TYPE.PURCHASE,
                wishlistId: wish.id,
                gameId: null,
                game: wish.name
            };
        }
        if (linkEl.value === RECHARGE_OTHER_VALUE) {
            return {
                recordType: RECORD_TYPE.RECHARGE,
                gameId: null,
                wishlistId: null,
                game: DEFAULT_GAME_LABEL
            };
        }
        if (linkEl.value === LEGACY_VALUE) {
            var legacy = linkEl.options[linkEl.selectedIndex];
            return {
                recordType: RECORD_TYPE.RECHARGE,
                gameId: null,
                wishlistId: null,
                game: (legacy && legacy.dataset.gameName) || DEFAULT_GAME_LABEL
            };
        }
        var game = findGameById(linkEl.value);
        if (!game) {
            showToast('请选择充值对应的游戏');
            return null;
        }
        return {
            recordType: RECORD_TYPE.RECHARGE,
            gameId: game.id,
            wishlistId: null,
            game: game.name
        };
    }

    function applyRecordFields(record, fields) {
        record.recordType = fields.recordType;
        record.game = fields.game;
        if (fields.gameId != null && fields.gameId !== '') record.gameId = fields.gameId;
        else delete record.gameId;
        if (fields.wishlistId != null && fields.wishlistId !== '') record.wishlistId = fields.wishlistId;
        else delete record.wishlistId;
    }

    function renderTypeBadge(r) {
        var type = getRecordType(r);
        if (type === RECORD_TYPE.PURCHASE) {
            return '<span class="spending-type-badge spending-type-purchase">购买游戏</span>';
        }
        return '<span class="spending-type-badge spending-type-recharge">账户充值</span>';
    }

    function renderGameCell(r) {
        var label = normalizeGame(r.game);
        var type = getRecordType(r);
        if (type === RECORD_TYPE.RECHARGE) {
            var gameId = resolveGameId(r);
            if (gameId && window.gameDetailUrl) {
                return '<a href="' + esc(window.gameDetailUrl(gameId)) + '" class="text-[#52B6FF] hover:underline font-medium">' + esc(label) + '</a>';
            }
        } else if (r.wishlistId) {
            return '<a href="wishlist.html" class="text-[#52B6FF] hover:underline font-medium" title="查看愿望单">' + esc(label) + '</a>';
        }
        return '<span class="font-medium text-gray-800">' + esc(label) + '</span>';
    }

    function populatePlatformSelect(selectEl) {
        if (!selectEl) return;
        selectEl.innerHTML = PLATFORM_OPTIONS.map(function (p) {
            return '<option value="' + esc(p) + '">' + esc(p) + '</option>';
        }).join('');
    }
    function setPlatformValue(selectEl, value) {
        if (!selectEl) return;
        value = value || DEFAULT_PLATFORM;
        var exists = Array.prototype.some.call(selectEl.options, function (o) { return o.value === value; });
        if (!exists) {
            var opt = document.createElement('option');
            opt.value = value;
            opt.textContent = value;
            selectEl.appendChild(opt);
        }
        selectEl.value = value;
    }
    function initPlatformSelects() {
        populatePlatformSelect(document.getElementById('add-spending-platform'));
        populatePlatformSelect(document.getElementById('spending-platform'));
    }
    function showToast(msg, type) {
        type = type || 'info';
        var t = document.getElementById('toast');
        var m = document.getElementById('toast-message');
        if (!t || !m) return;
        m.textContent = msg;
        t.className = 'toast ' + type + ' show';
        clearTimeout(t._timeout);
        t._timeout = setTimeout(function () { t.classList.remove('show'); }, 3000);
    }
    window.showToast = showToast;

    // ==================== 表格 ====================
    function renderTable(year) {
        var tbody = document.getElementById('spending-table-body');
        var empty = document.getElementById('spending-empty');
        var table = tbody && tbody.closest('table');
        if (!tbody) return;

        var records = TU.filterByYear(getSpending(), year, 'date');
        records.sort(function (a, b) {
            var da = TU.parse(a.date), db = TU.parse(b.date);
            return (db || 0) - (da || 0);
        });

        if (records.length === 0) {
            tbody.innerHTML = '';
            if (empty) empty.classList.remove('hidden');
            if (table) table.style.display = 'none';
            return;
        }
        if (empty) empty.classList.add('hidden');
        if (table) table.style.display = '';

        tbody.innerHTML = records.map(function (r) {
            var pc = getPlatformClass(r.platform);
            return '<tr>' +
                '<td>' + renderTypeBadge(r) + '</td>' +
                '<td>' + renderGameCell(r) + '</td>' +
                '<td><span class="spending-amount">' + fmtMoney(r.amount) + '</span></td>' +
                '<td>' + fmt(r.date) + '</td>' +
                '<td><span class="spending-platform-badge ' + pc + '">' + esc(r.platform || '-') + '</span></td>' +
                '<td><span class="text-gray-600 text-sm">' + esc(r.note || '-') + '</span></td>' +
                '<td>' +
                    '<button class="spending-action-btn edit-btn" data-id="' + r.id + '" title="编辑">' +
                        '<i data-lucide="pencil" class="w-4 h-4"></i>' +
                    '</button>' +
                    '<button class="spending-action-btn delete-btn" data-id="' + r.id + '" title="删除">' +
                        '<i data-lucide="trash-2" class="w-4 h-4"></i>' +
                    '</button>' +
                '</td>' +
            '</tr>';
        }).join('');

        tbody.querySelectorAll('.edit-btn').forEach(function (b) {
            b.addEventListener('click', function () {
                var id = b.dataset.id;
                var item = getSpending().find(function (r) { return r.id === id; });
                if (item) openModal(item);
            });
        });
        tbody.querySelectorAll('.delete-btn').forEach(function (b) {
            b.addEventListener('click', function () { deleteSpending(this.dataset.id); });
        });
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }

    function getPlatformClass(p) {
        return PLATFORM_CLASS[p] || 'platform-other';
    }

    // ==================== 统计 ====================
    function updateStats(year) {
        var records = TU.filterByYear(getSpending(), year, 'date');
        var total = records.reduce(function (s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
        var count = records.length;
        var avg = count > 0 ? total / count : 0;

        var monthlyAvg = 0;
        if (records.length > 0) {
            if (year && year !== 'all') {
                monthlyAvg = total / 12;
            } else {
                var dates = records.map(function (r) { return TU.parse(r.date); }).filter(Boolean);
                if (dates.length > 0) {
                    var minD = new Date(Math.min.apply(null, dates));
                    var maxD = new Date(Math.max.apply(null, dates));
                    var span = (maxD.getFullYear() - minD.getFullYear()) * 12 + (maxD.getMonth() - minD.getMonth()) + 1;
                    monthlyAvg = total / Math.max(1, span);
                }
            }
        }

        document.getElementById('stat-total').textContent = fmtMoney(total);
        document.getElementById('stat-games').textContent = count;
        document.getElementById('stat-avg').textContent = fmtMoney(avg);
        document.getElementById('stat-monthly').textContent = fmtMoney(monthlyAvg);

        var breakdown = document.getElementById('stat-games-breakdown');
        if (breakdown) {
            var purchaseCount = records.filter(function (r) { return getRecordType(r) === RECORD_TYPE.PURCHASE; }).length;
            var rechargeCount = records.filter(function (r) { return getRecordType(r) === RECORD_TYPE.RECHARGE; }).length;
            breakdown.textContent = count > 0 ? (purchaseCount + ' 笔购买 · ' + rechargeCount + ' 笔充值') : '';
        }
    }

    // ==================== 图表 ====================
    function updateCharts(year) {
        var records = TU.filterByYear(getSpending(), year, 'date');
        updateMonthlyChart(records, year);
        updatePlatformChart(records);
    }

    function updateMonthlyChart(records, year) {
        var canvas = document.getElementById('monthly-spending-chart');
        if (!canvas) return;
        if (charts.monthly) { charts.monthly.destroy(); charts.monthly = null; }

        var months, amounts;
        if (year && year !== 'all') {
            months = TU.getMonthNames();
            amounts = new Array(12).fill(0);
            records.forEach(function (r) {
                var m = TU.getMonth(r.date);
                if (m >= 1 && m <= 12) amounts[m - 1] += parseFloat(r.amount) || 0;
            });
            amounts = amounts.map(function (v) { return Math.round(v * 100) / 100; });
        } else {
            var map = TU.groupByMonthSum(records, 'date', 'amount');
            var keys = Object.keys(map).sort();
            months = keys.map(function (k) { return k.split('-')[1] + '月'; });
            amounts = keys.map(function (k) { return Math.round(map[k] * 100) / 100; });
        }

        var dark = document.documentElement.classList.contains('dark');
        var tc = dark ? '#94a3b8' : '#64748b';
        var gc = dark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)';

        charts.monthly = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: '月消费 (¥)',
                    data: amounts,
                    borderColor: '#52B6FF',
                    backgroundColor: 'rgba(82,182,255,0.1)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#52B6FF',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: true, aspectRatio: 2,
                plugins: {
                    legend: { display: true, position: 'top', labels: { color: tc, usePointStyle: true, padding: 20 } },
                    tooltip: { callbacks: { label: function (c) { return '¥' + c.parsed.y.toFixed(2); } } }
                },
                scales: {
                    x: { grid: { color: gc }, ticks: { color: tc, maxRotation: 45 } },
                    y: { grid: { color: gc }, ticks: { color: tc, callback: function (v) { return '¥' + v; } }, beginAtZero: true }
                }
            }
        });
    }

    function updatePlatformChart(records) {
        var canvas = document.getElementById('platform-pie-chart');
        if (!canvas) return;
        if (charts.platform) { charts.platform.destroy(); charts.platform = null; }

        var map = {};
        records.forEach(function (r) {
            var p = r.platform || '其他';
            map[p] = (map[p] || 0) + (parseFloat(r.amount) || 0);
        });
        var labels = Object.keys(map);
        var data = labels.map(function (k) { return Math.round(map[k] * 100) / 100; });
        var fallbackColors = ['#52B6FF','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
        var colors = labels.map(function (label, i) {
            return PLATFORM_COLORS[label] || fallbackColors[i % fallbackColors.length];
        });

        if (labels.length === 0) { labels = ['暂无数据']; data = [1]; }

        var dark = document.documentElement.classList.contains('dark');
        var tc = dark ? '#94a3b8' : '#64748b';

        charts.platform = new Chart(canvas.getContext('2d'), {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{ data: data, backgroundColor: colors.slice(0, labels.length), borderColor: dark ? '#1e293b' : '#fff', borderWidth: 2 }]
            },
            options: {
                responsive: true, maintainAspectRatio: true, aspectRatio: 2,
                plugins: {
                    legend: { position: 'bottom', labels: { color: tc, usePointStyle: true, padding: 16, font: { size: 12 } } },
                    tooltip: { callbacks: { label: function (c) {
                        var t = c.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                        var pct = t > 0 ? Math.round(c.parsed / t * 100) : 0;
                        return c.label + ': ¥' + c.parsed.toFixed(2) + ' (' + pct + '%)';
                    }}}
                }
            }
        });
    }

    // ==================== Modal ====================
    function openModal(editItem) {
        var modal = document.getElementById('spending-modal');
        if (!modal) return;
        if (editItem) {
            editingId = editItem.id;
            document.getElementById('spending-modal-title').textContent = '编辑消费记录';
            document.getElementById('spending-submit-text').textContent = '保存更改';
            document.getElementById('spending-id').value = editItem.id;
            initFormControls(
                document.getElementById('spending-record-type'),
                document.getElementById('spending-link-select'),
                document.getElementById('spending-link-help'),
                editItem
            );
            document.getElementById('spending-amount').value = editItem.amount || '';
            document.getElementById('spending-date').value = editItem.date || '';
            setPlatformValue(document.getElementById('spending-platform'), editItem.platform);
            document.getElementById('spending-note').value = editItem.note || '';
        } else {
            editingId = null;
            document.getElementById('spending-modal-title').textContent = '添加消费记录';
            document.getElementById('spending-submit-text').textContent = '添加记录';
            document.getElementById('spending-id').value = '';
            initFormControls(
                document.getElementById('spending-record-type'),
                document.getElementById('spending-link-select'),
                document.getElementById('spending-link-help'),
                null
            );
            document.getElementById('spending-amount').value = '';
            document.getElementById('spending-date').value = TU.todayISO();
            setPlatformValue(document.getElementById('spending-platform'), DEFAULT_PLATFORM);
            document.getElementById('spending-note').value = '';
        }
        modal.classList.add('active');
    }

    function closeModal() {
        var m = document.getElementById('spending-modal');
        if (m) m.classList.remove('active');
        editingId = null;
    }
    window.closeModal = closeModal;

    function resetAddForm() {
        var form = document.getElementById('spending-add-form');
        if (!form) return;
        form.reset();
        var dateInput = document.getElementById('add-spending-date');
        if (dateInput) dateInput.value = TU.todayISO();
        var platformInput = document.getElementById('add-spending-platform');
        if (platformInput) platformInput.value = DEFAULT_PLATFORM;
        initFormControls(
            document.getElementById('add-spending-record-type'),
            document.getElementById('add-spending-link-select'),
            document.getElementById('add-spending-link-help'),
            null
        );
    }

    function handleAddSubmit() {
        var fields = readFieldsFromForm(
            document.getElementById('add-spending-record-type'),
            document.getElementById('add-spending-link-select')
        );
        if (!fields) return;
        var amount = parseFloat(document.getElementById('add-spending-amount').value);
        var date = document.getElementById('add-spending-date').value;
        var platform = document.getElementById('add-spending-platform').value;
        var note = document.getElementById('add-spending-note').value.trim();

        if (isNaN(amount) || amount < 0) { showToast('请输入有效金额'); return; }
        if (!date) { showToast('请选择消费日期'); return; }

        var records = getSpending();
        var record = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
            amount: amount,
            date: date,
            platform: platform,
            note: note
        };
        applyRecordFields(record, fields);
        records.push(record);
        saveSpending(records);
        showToast('消费记录已添加');
        resetAddForm();
        refreshAll();
    }

    function handleSubmit() {
        var fields = readFieldsFromForm(
            document.getElementById('spending-record-type'),
            document.getElementById('spending-link-select')
        );
        if (!fields) return;
        var amount = parseFloat(document.getElementById('spending-amount').value);
        var date = document.getElementById('spending-date').value;
        var platform = document.getElementById('spending-platform').value;
        var note = document.getElementById('spending-note').value.trim();

        if (isNaN(amount) || amount < 0) { showToast('请输入有效金额'); return; }
        if (!date) { showToast('请选择消费日期'); return; }

        var records = getSpending();
        if (editingId) {
            var idx = records.findIndex(function (r) { return r.id === editingId; });
            if (idx !== -1) {
                applyRecordFields(records[idx], fields);
                records[idx].amount = amount;
                records[idx].date = date;
                records[idx].platform = platform;
                records[idx].note = note;
            }
        } else {
            var record = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
                amount: amount,
                date: date,
                platform: platform,
                note: note
            };
            applyRecordFields(record, fields);
            records.push(record);
        }
        saveSpending(records);
        showToast(editingId ? '消费记录已更新' : '消费记录已添加');
        closeModal();
        refreshAll();
    }

    function deleteSpending(id) {
        if (!confirm('确定要删除这条消费记录吗？')) return;
        saveSpending(getSpending().filter(function (r) { return r.id !== id; }));
        showToast('消费记录已删除');
        refreshAll();
    }

    function bindRecordTypeChange(typeEl, linkEl, helpEl) {
        if (!typeEl || !linkEl) return;
        typeEl.addEventListener('change', function () {
            populateLinkSelect(linkEl, typeEl.value);
            updateLinkHelp(typeEl, helpEl);
            if (typeEl.value === RECORD_TYPE.RECHARGE) {
                linkEl.value = RECHARGE_OTHER_VALUE;
            } else if (linkEl.options.length && linkEl.options[0].value) {
                linkEl.selectedIndex = 0;
            }
        });
    }

    // ==================== 年份筛选 ====================
    function initYearFilter() {
        var select = document.getElementById('filter-year');
        if (!select) return;
        var years = TU.collectYears([{ items: getSpending(), dateKey: 'date' }]);
        select.innerHTML = '<option value="all">全部年份</option>';
        years.forEach(function (y) {
            var o = document.createElement('option');
            o.value = y; o.textContent = y + ' 年';
            select.appendChild(o);
        });
    }

    function getCurrentYear() {
        var s = document.getElementById('filter-year');
        return s ? s.value : 'all';
    }

    function refreshAll() {
        var y = getCurrentYear();
        renderTable(y); updateStats(y); updateCharts(y);
        initYearFilter();
        var s = document.getElementById('filter-year');
        if (s && s.value !== y) s.value = y;
    }

    // ==================== 事件 ====================
    function bindEvents() {
        var addForm = document.getElementById('spending-add-form');
        if (addForm) addForm.addEventListener('submit', function (e) { e.preventDefault(); handleAddSubmit(); });

        var form = document.getElementById('spending-form');
        if (form) form.addEventListener('submit', function (e) { e.preventDefault(); handleSubmit(); });

        bindRecordTypeChange(
            document.getElementById('add-spending-record-type'),
            document.getElementById('add-spending-link-select'),
            document.getElementById('add-spending-link-help')
        );
        bindRecordTypeChange(
            document.getElementById('spending-record-type'),
            document.getElementById('spending-link-select'),
            document.getElementById('spending-link-help')
        );

        var fy = document.getElementById('filter-year');
        if (fy) fy.addEventListener('change', function () {
            var y = this.value;
            renderTable(y); updateStats(y); updateCharts(y);
        });

        document.addEventListener('click', function (e) {
            var modal = document.getElementById('spending-modal');
            if (!modal) return;
            if (e.target.closest('.modal-close')) closeModal();
            else if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var modal = document.getElementById('spending-modal');
                if (modal && modal.classList.contains('active')) closeModal();
            }
        });
    }

    function renderSpendingData() {
        var fy = document.getElementById('filter-year');
        var y = fy ? fy.value : 'all';
        renderTable(y);
        updateStats(y);
        updateCharts(y);
    }

    async function init() {
        await window.awaitGameCloud();
        if (window.GameData && window.GameData.seedGamesIfEmpty) {
            await window.GameData.seedGamesIfEmpty();
        }
        migrateSpendingIfNeeded();
        initPlatformSelects();
        initFormControls(
            document.getElementById('add-spending-record-type'),
            document.getElementById('add-spending-link-select'),
            document.getElementById('add-spending-link-help'),
            null
        );
        resetAddForm();
        bindEvents();
        initYearFilter();
        renderSpendingData();
        window.whenGameCloudSynced(function () {
            migrateSpendingIfNeeded();
            renderSpendingData();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
