/**
 * utils.js — 实用小功能
 * 全局搜索、备忘录、密码锁、数据备份恢复、通用工具函数
 */
(function () {
    'use strict';

    // ==================== 通用工具函数 ====================

    // 日期格式化（完整格式）
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // 日期格式化（短格式）
    function formatDateShort(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    // 获取状态文本
    function getStatusText(status) {
        const map = {
            playing: '正在玩',
            completed: '已完成',
            paused: '暂停中',
            dropped: '已放弃',
            abandoned: '已放弃',
            wishlist: '愿望单',
            planned: '计划中'
        };
        return map[status] || status || '-';
    }

    // 获取状态样式类
    function getStatusClass(status) {
        const map = {
            playing: 'status-playing',
            completed: 'status-completed',
            paused: 'status-paused',
            abandoned: 'status-abandoned',
            wishlist: 'status-wishlist'
        };
        return map[status] || '';
    }

    // 生成唯一ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 防抖函数
    function debounce(fn, delay) {
        let timer = null;
        return function () {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, arguments), delay);
        };
    }

    // ISO 日期 YYYY-MM-DD（列表、卡带等）
    function formatDateISO(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return String(dateString);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    // Tailwind 状态徽章 class
    function getStatusBadgeClass(status) {
        const map = {
            playing: 'text-blue-600 bg-blue-100',
            completed: 'text-green-600 bg-green-100',
            paused: 'text-yellow-600 bg-yellow-100',
            dropped: 'text-red-600 bg-red-100',
            planned: 'text-purple-600 bg-purple-100'
        };
        return map[status] || 'text-gray-600 bg-gray-100';
    }

    function escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function defaultGameCover(seed) {
        const text = String(seed || '');
        let hash = 0;
        for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash) + text.charCodeAt(i);
        return Math.abs(hash) % 2 === 0
            ? 'assets/default-cover-male.svg'
            : 'assets/default-cover-female.svg';
    }

    function gameIconUrl(icon, name) {
        return icon || defaultGameCover(name);
    }

    function safeLucideIcon(name) {
        const n = String(name || 'trophy');
        return /^[a-z0-9-]+$/.test(n) ? n : 'trophy';
    }

    function validateGameForm(formData) {
        const name = (formData.get('name') || '').trim();
        if (!name) return '请输入游戏名称';
        const playtime = parseInt(formData.get('playtime'), 10);
        if (isNaN(playtime) || playtime < 0) return '请输入有效的游戏时长';
        const progress = parseInt(formData.get('progress'), 10);
        if (isNaN(progress) || progress < 0 || progress > 100) return '进度需在 0–100 之间';
        if (!formData.get('status')) return '请选择游戏状态';
        if (!formData.get('type')) return '请选择游戏类型';
        return null;
    }

    function imgWithFallback(src, alt, className) {
        const safeSrc = escapeHtml(gameIconUrl(src, alt));
        const safeAlt = escapeHtml(alt || '');
        const cls = className ? ' class="' + escapeHtml(className) + '"' : '';
        const fallback = escapeHtml(defaultGameCover(alt));
        return '<img src="' + safeSrc + '" alt="' + safeAlt + '"' + cls +
            ' onerror="this.onerror=null;this.src=\'' + fallback + '\'">';
    }

    /** 游戏详情页 URL：优先 id，其次 name */
    function gameDetailUrl(gameOrId, name) {
        if (gameOrId != null && typeof gameOrId === 'object') {
            return 'game.html?id=' + encodeURIComponent(gameOrId.id);
        }
        if (gameOrId != null && gameOrId !== '') {
            return 'game.html?id=' + encodeURIComponent(gameOrId);
        }
        if (name) {
            return 'game.html?name=' + encodeURIComponent(name);
        }
        return 'games.html';
    }

    // 暴露全局函数
    window.formatDate = formatDate;
    window.formatDateShort = formatDateShort;
    window.formatDateISO = formatDateISO;
    window.getStatusText = getStatusText;
    window.getStatusClass = getStatusClass;
    window.getStatusBadgeClass = getStatusBadgeClass;
    window.generateId = generateId;
    window.debounce = debounce;
    window.escapeHtml = escapeHtml;
    window.defaultGameCover = defaultGameCover;
    window.gameIconUrl = gameIconUrl;
    window.imgWithFallback = imgWithFallback;
    window.safeLucideIcon = safeLucideIcon;
    window.validateGameForm = validateGameForm;
    window.gameDetailUrl = gameDetailUrl;

    // ==================== SVG 图标 ====================
    var ICONS = {
        search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        memo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
        lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        unlock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
        backup: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
        x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        gamepad: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/></svg>',
        trophy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
        clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        note: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'
    };

    // ==================== 注入工具栏按钮 ====================
    function injectToolbar() {
        var nav = document.querySelector('nav');
        if (!nav || document.getElementById('utils-toolbar')) return;

        var toolbar = document.createElement('div');
        toolbar.className = 'utils-toolbar';
        toolbar.id = 'utils-toolbar';
        toolbar.innerHTML =
            '<button class="utils-toolbar-btn" id="btn-search" title="全局搜索 (Ctrl+K)">' + ICONS.search + '</button>' +
            '<button class="utils-toolbar-btn" id="btn-memo" title="备忘录">' + ICONS.memo + '</button>' +
            '<button class="utils-toolbar-btn" id="btn-backup" title="数据备份恢复">' + ICONS.backup + '</button>' +
            '<button class="utils-toolbar-btn" id="btn-lock" title="锁屏 / 访客模式">' + ICONS.unlock + '</button>';

        // 插入到导航栏
        var desktopNav = nav.querySelector('.desktop-nav');
        if (desktopNav) {
            desktopNav.appendChild(toolbar);
        }

        // 移动端菜单也加上
        var mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu && !document.getElementById('utils-toolbar-mobile')) {
            var mobileToolbar = document.createElement('div');
            mobileToolbar.className = 'flex items-center gap-3 py-3 border-t mt-2';
            mobileToolbar.id = 'utils-toolbar-mobile';
            mobileToolbar.innerHTML =
                '<button class="utils-toolbar-btn" id="btn-search-m" title="搜索">' + ICONS.search + '</button>' +
                '<button class="utils-toolbar-btn" id="btn-memo-m" title="备忘录">' + ICONS.memo + '</button>' +
                '<button class="utils-toolbar-btn" id="btn-backup-m" title="备份">' + ICONS.backup + '</button>' +
                '<button class="utils-toolbar-btn" id="btn-lock-m" title="锁屏">' + ICONS.unlock + '</button>';
            mobileMenu.appendChild(mobileToolbar);
        }
    }

    // ==================== 1. 全局搜索 ====================
    function initSearch() {
        // 注入搜索界面
        var searchOverlay = document.createElement('div');
        searchOverlay.className = 'global-search-bar';
        searchOverlay.id = 'global-search-bar';
        searchOverlay.innerHTML =
            '<div class="global-search-container">' +
                '<div class="global-search-input-wrap">' +
                    ICONS.search +
                    '<input type="text" class="global-search-input" id="global-search-input" placeholder="搜索游戏、成就、时间线、备忘录..." autocomplete="off">' +
                    '<span class="global-search-hint">ESC 关闭</span>' +
                '</div>' +
                '<div class="global-search-results" id="global-search-results"></div>' +
            '</div>';
        document.body.appendChild(searchOverlay);

        var input = document.getElementById('global-search-input');
        var results = document.getElementById('global-search-results');

        function openSearch() {
            searchOverlay.classList.add('open');
            setTimeout(function () { input.focus(); }, 100);
        }
        function closeSearch() {
            searchOverlay.classList.remove('open');
            input.value = '';
            results.innerHTML = '';
        }

        // 按钮触发
        document.addEventListener('click', function (e) {
            if (e.target.closest('#btn-search') || e.target.closest('#btn-search-m')) openSearch();
        });

        // 点击背景关闭
        searchOverlay.addEventListener('click', function (e) {
            if (e.target === searchOverlay) closeSearch();
        });

        // ESC 关闭
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeSearch();
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                openSearch();
            }
        });

        // 搜索逻辑
        input.addEventListener('input', function () {
            var query = this.value.trim().toLowerCase();
            if (!query) {
                results.innerHTML = '<div class="global-search-empty">输入关键词开始搜索</div>';
                return;
            }

            var items = [];

            // 搜索游戏
            var games = JSON.parse(localStorage.getItem('games') || '[]');
            games.forEach(function (g) {
                if ((g.name + (g.type || '') + (g.description || '')).toLowerCase().indexOf(query) !== -1) {
                    var statusText = g.status === 'playing' ? '正在玩' : g.status === 'completed' ? '已完成' : g.status || '';
                    items.push({ title: g.name, desc: (g.type || '') + ' · ' + statusText, badge: '游戏', badgeColor: '#52B6FF', icon: ICONS.gamepad, href: gameDetailUrl(g.id) });
                }
            });

            // 搜索成就
            var achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
            achievements.forEach(function (a) {
                var gameLabel = a.gameName || a.game || '';
                if ((a.title + (a.description || '') + gameLabel).toLowerCase().indexOf(query) !== -1) {
                    var achHref = 'achievements.html';
                    if (a.gameId != null && a.gameId !== '') {
                        achHref = gameDetailUrl(a.gameId);
                    } else if (gameLabel) {
                        var resolvedId = window.GameData && window.GameData.resolveGameIdByName
                            ? window.GameData.resolveGameIdByName(gameLabel)
                            : null;
                        if (resolvedId) achHref = gameDetailUrl(resolvedId);
                    }
                    items.push({
                        title: a.title,
                        desc: gameLabel + ' · ' + (a.date || ''),
                        badge: '成就',
                        badgeColor: '#f59e0b',
                        icon: ICONS.trophy,
                        href: achHref
                    });
                }
            });

            // 搜索评测
            var reviews = JSON.parse(localStorage.getItem('game_record_reviews') || '[]');
            reviews.forEach(function (r) {
                var reviewName = r.name || r.gameName || '';
                if ((reviewName + (r.review || r.comment || '')).toLowerCase().indexOf(query) !== -1) {
                    var reviewHref = 'reviews.html';
                    if (r.gameId != null && r.gameId !== '') {
                        reviewHref = gameDetailUrl(r.gameId);
                    } else if (reviewName && window.GameData && window.GameData.resolveGameIdByName) {
                        var reviewGameId = window.GameData.resolveGameIdByName(reviewName);
                        if (reviewGameId) reviewHref = gameDetailUrl(reviewGameId);
                    }
                    items.push({
                        title: reviewName,
                        desc: (r.rating || 0) + ' 星 · ' + (r.date || ''),
                        badge: '评测',
                        badgeColor: '#10b981',
                        icon: ICONS.note,
                        href: reviewHref
                    });
                }
            });

            // 搜索备忘录
            var memos = JSON.parse(localStorage.getItem('memos') || '[]');
            memos.forEach(function (m) {
                if (m.text.toLowerCase().indexOf(query) !== -1) {
                    items.push({ title: m.text.substring(0, 30), desc: m.date, badge: '备忘录', badgeColor: '#B8A9C9', icon: ICONS.note, href: null });
                }
            });

            if (items.length === 0) {
                results.innerHTML = '<div class="global-search-empty">没有找到 "' + escapeHtml(query) + '" 相关结果</div>';
                return;
            }

            results.innerHTML = items.slice(0, 10).map(function (item) {
                return '<a class="global-search-item" href="' + (item.href || '#') + '" ' + (item.href ? '' : 'onclick="return false"') + '>' +
                    '<div class="global-search-item-icon" style="background:' + item.badgeColor + '15;color:' + item.badgeColor + '">' + item.icon + '</div>' +
                    '<div class="global-search-item-info">' +
                        '<div class="global-search-item-title">' + highlightText(item.title, query) + '</div>' +
                        '<div class="global-search-item-desc">' + escapeHtml(item.desc) + '</div>' +
                    '</div>' +
                    '<span class="global-search-item-badge" style="background:' + item.badgeColor + '18;color:' + item.badgeColor + '">' + item.badge + '</span>' +
                '</a>';
            }).join('');
        });
    }

    function highlightText(text, query) {
        var escaped = escapeHtml(text);
        var regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        return escaped.replace(regex, '<mark style="background:#f0c04040;color:inherit;padding:0 2px;border-radius:2px;">$1</mark>');
    }

    // ==================== 2. 备忘录 ====================
    function initMemo() {
        // 注入备忘录面板
        var overlay = document.createElement('div');
        overlay.className = 'settings-overlay';
        overlay.id = 'memo-overlay';
        overlay.addEventListener('click', closeMemo);
        document.body.appendChild(overlay);

        var panel = document.createElement('div');
        panel.className = 'memo-panel';
        panel.id = 'memo-panel';
        panel.innerHTML =
            '<div class="memo-panel-header">' +
                '<h3>备忘录</h3>' +
                '<button id="memo-close-btn" style="background:none;border:none;cursor:pointer;color:var(--text-gray);font-size:1.25rem;">' + ICONS.x + '</button>' +
            '</div>' +
            '<div class="memo-list" id="memo-list"></div>' +
            '<div class="memo-input-area">' +
                '<div class="memo-input-wrap">' +
                    '<textarea id="memo-input" placeholder="写点什么..." rows="2"></textarea>' +
                    '<button class="memo-send-btn" id="memo-send-btn" title="发送">' + ICONS.send + '</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(panel);

        // 打开/关闭
        document.addEventListener('click', function (e) {
            if (e.target.closest('#btn-memo') || e.target.closest('#btn-memo-m')) openMemo();
        });
        document.getElementById('memo-close-btn').addEventListener('click', closeMemo);

        // 发送备忘录
        document.getElementById('memo-send-btn').addEventListener('click', addMemo);
        document.getElementById('memo-input').addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addMemo();
        });

        ensureSampleMemosAndRender();
        if (window.whenGameCloudSynced) {
            window.whenGameCloudSynced(ensureSampleMemosAndRender);
        }
    }

    function ensureSampleMemosAndRender() {
        var seedFn = window.GameData && (window.GameData.ensureSampleMemos || window.GameData.seedMemosIfEmpty);
        if (seedFn) {
            seedFn.call(window.GameData).then(renderMemos).catch(renderMemos);
        } else {
            renderMemos();
        }
    }

    function closeMobileMenu() {
        var menu = document.getElementById('mobile-menu');
        if (menu) menu.classList.remove('open');
    }

    function openMemo() {
        closeMobileMenu();
        document.body.classList.add('memo-open');
        document.getElementById('memo-panel').classList.add('open');
        document.getElementById('memo-overlay').classList.add('open');
        renderMemos();
    }

    function closeMemo() {
        document.body.classList.remove('memo-open');
        document.getElementById('memo-panel').classList.remove('open');
        document.getElementById('memo-overlay').classList.remove('open');
    }

    function getMemos() {
        return JSON.parse(localStorage.getItem('memos') || '[]');
    }

    function saveMemos(memos) {
        localStorage.setItem('memos', JSON.stringify(memos));
    }

    function addMemo() {
        var input = document.getElementById('memo-input');
        var text = input.value.trim();
        if (!text) return;

        var memos = getMemos();
        memos.unshift({
            id: Date.now(),
            text: text,
            date: new Date().toLocaleString('zh-CN')
        });
        saveMemos(memos);
        input.value = '';
        renderMemos();
    }

    function deleteMemo(id) {
        var memos = getMemos().filter(function (m) { return String(m.id) !== String(id); });
        saveMemos(memos);
        if (window.GameData && window.GameData.markSampleMemoDismissed) {
            window.GameData.markSampleMemoDismissed(id);
        }
        renderMemos();
    }

    function renderMemos() {
        var list = document.getElementById('memo-list');
        if (!list) return;
        var memos = getMemos();

        if (memos.length === 0) {
            list.innerHTML = '<div class="memo-empty">暂无备忘录<br>记录你的游戏灵感吧</div>';
            return;
        }

        list.innerHTML = memos.map(function (m) {
            return '<div class="memo-item">' +
                '<div class="memo-item-header">' +
                    '<span class="memo-item-time">' + m.date + '</span>' +
                    '<div class="memo-item-actions">' +
                        '<button class="memo-delete" data-id="' + m.id + '" title="删除">' + ICONS.trash + '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="memo-item-text">' + escapeHtml(m.text) + '</div>' +
            '</div>';
        }).join('');

        // 绑定事件
        list.querySelectorAll('.memo-delete').forEach(function (btn) {
            btn.addEventListener('click', function () { deleteMemo(this.dataset.id); });
        });
    }

    // ==================== 3. 密码锁 / 访客模式 ====================
    function initLock() {
        var lockScreen = document.createElement('div');
        lockScreen.className = 'lock-screen';
        lockScreen.id = 'lock-screen';
        lockScreen.innerHTML =
            '<div class="lock-screen-icon">' +
                '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
            '</div>' +
            '<h2>已锁定</h2>' +
            '<p>请输入密码解锁</p>' +
            '<div class="lock-screen-input-wrap">' +
                '<input type="password" class="lock-screen-input" id="lock-input" placeholder="输入密码" autocomplete="off">' +
                '<button class="lock-screen-btn" id="lock-unlock-btn">解锁</button>' +
            '</div>' +
            '<div class="lock-screen-error" id="lock-error"></div>' +
            '<div class="lock-screen-setup" id="lock-setup-area">' +
                '<a id="lock-setup-link">首次使用，设置密码</a>' +
            '</div>';
        document.body.appendChild(lockScreen);

        // 检查是否已锁定
        if (localStorage.getItem('is_locked') === 'true') {
            lockScreen.classList.add('active');
        }

        // 解锁
        document.getElementById('lock-unlock-btn').addEventListener('click', tryUnlock);
        document.getElementById('lock-input').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') tryUnlock();
        });

        // 设置密码
        document.getElementById('lock-setup-link').addEventListener('click', function () {
            var pwd = prompt('设置密码（至少4位）');
            if (!pwd || pwd.length < 4) {
                if (pwd !== null) alert('密码至少4位');
                return;
            }
            localStorage.setItem('lock_password', pwd);
            localStorage.setItem('is_locked', 'false');
            lockScreen.classList.remove('active');
            showToast('密码已设置');
            updateLockBtn();
        });

        // 锁定按钮
        document.addEventListener('click', function (e) {
            if (e.target.closest('#btn-lock') || e.target.closest('#btn-lock-m')) toggleLock();
        });
    }

    function toggleLock() {
        var pwd = localStorage.getItem('lock_password');
        if (!pwd) {
            var newPwd = prompt('设置密码（至少4位）');
            if (!newPwd || newPwd.length < 4) {
                if (newPwd !== null) alert('密码至少4位');
                return;
            }
            localStorage.setItem('lock_password', newPwd);
            showToast('密码已设置，已锁定');
        }
        localStorage.setItem('is_locked', 'true');
        document.getElementById('lock-screen').classList.add('active');
        document.getElementById('lock-input').value = '';
        document.getElementById('lock-error').textContent = '';
        updateLockBtn();
    }

    function tryUnlock() {
        var pwd = localStorage.getItem('lock_password');
        var input = document.getElementById('lock-input').value;
        if (!pwd) {
            document.getElementById('lock-error').textContent = '请先设置密码';
            return;
        }
        if (input === pwd) {
            localStorage.setItem('is_locked', 'false');
            document.getElementById('lock-screen').classList.remove('active');
            updateLockBtn();
        } else {
            document.getElementById('lock-error').textContent = '密码错误，请重试';
            document.getElementById('lock-input').value = '';
            document.getElementById('lock-input').focus();
        }
    }

    function updateLockBtn() {
        var isLocked = localStorage.getItem('is_locked') === 'true';
        var btn = document.getElementById('btn-lock');
        if (btn) {
            btn.innerHTML = isLocked ? ICONS.lock : ICONS.unlock;
            btn.title = isLocked ? '已锁定' : '锁屏 / 访客模式';
        }
    }

    // ==================== 4. 数据备份 & 恢复 ====================
    function initBackup() {
        var modal = document.createElement('div');
        modal.className = 'backup-modal';
        modal.id = 'backup-modal';
        modal.innerHTML =
            '<div class="backup-modal-content">' +
                '<h3>数据备份与恢复</h3>' +
                '<div class="backup-option" id="backup-export">' +
                    '<div class="backup-option-icon" style="background:#52B6FF15;color:#52B6FF;">' + ICONS.backup + '</div>' +
                    '<div class="backup-option-info">' +
                        '<h4>导出备份</h4>' +
                        '<p>将所有数据导出为 JSON 文件，保存到本地</p>' +
                    '</div>' +
                '</div>' +
                '<div class="backup-option" id="backup-import">' +
                    '<div class="backup-option-icon" style="background:#f59e0b15;color:#f59e0b;">' +
                        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
                    '</div>' +
                    '<div class="backup-option-info">' +
                        '<h4>导入恢复</h4>' +
                        '<p>从 JSON 备份文件恢复数据，将覆盖当前数据</p>' +
                    '</div>' +
                '</div>' +
                '<div class="backup-option" id="backup-clear">' +
                    '<div class="backup-option-icon" style="background:#ef444415;color:#ef4444;">' + ICONS.trash + '</div>' +
                    '<div class="backup-option-info">' +
                        '<h4>清除所有数据</h4>' +
                        '<p>删除游戏、成就、时间线、备忘录等全部数据</p>' +
                    '</div>' +
                '</div>' +
                '<input type="file" id="backup-file-input" accept=".json" style="display:none;">' +
                '<button class="backup-close-btn" id="backup-close-btn">关闭</button>' +
            '</div>';
        document.body.appendChild(modal);

        // 打开/关闭
        document.addEventListener('click', function (e) {
            if (e.target.closest('#btn-backup') || e.target.closest('#btn-backup-m')) {
                modal.classList.add('open');
            }
        });
        modal.addEventListener('click', function (e) {
            if (e.target === modal) modal.classList.remove('open');
        });
        document.getElementById('backup-close-btn').addEventListener('click', function () {
            modal.classList.remove('open');
        });

        // 导出
        document.getElementById('backup-export').addEventListener('click', function () {
            var data = {};
            var keys = (window.GameData && window.GameData.SYNC_KEYS)
                ? window.GameData.SYNC_KEYS.slice()
                : ['games', 'achievements', 'memos', 'profile', 'game_record_wishlist', 'game_record_reviews', 'game_record_spending'];
            keys.push('lock_password', 'is_locked', 'site_bg_image', 'mascot_image');
            keys.forEach(function (key) {
                var val = localStorage.getItem(key);
                if (val) {
                    try { data[key] = JSON.parse(val); }
                    catch (e) { data[key] = val; }
                }
            });
            data._export_time = new Date().toISOString();
            data._version = '1.0';

            var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = '游戏记录_备份_' + new Date().toISOString().split('T')[0] + '.json';
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('备份文件已生成');
            modal.classList.remove('open');
        });

        // 导入
        var fileInput = document.getElementById('backup-file-input');
        document.getElementById('backup-import').addEventListener('click', function () {
            fileInput.click();
        });
        fileInput.addEventListener('change', function () {
            var file = this.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (e) {
                try {
                    var data = JSON.parse(e.target.result);
                    if (!data._version) {
                        alert('无效的备份文件');
                        return;
                    }
                    if (!confirm('导入将覆盖当前所有数据，确定继续？')) return;

                    var keys = (window.GameData && window.GameData.SYNC_KEYS)
                        ? window.GameData.SYNC_KEYS.slice()
                        : ['games', 'achievements', 'memos', 'profile', 'game_record_wishlist', 'game_record_reviews', 'game_record_spending'];
                    keys.push('lock_password', 'is_locked', 'site_bg_image', 'mascot_image');
                    keys.forEach(function (key) {
                        if (data[key] !== undefined) {
                            localStorage.setItem(key, typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]));
                        }
                    });

                    showToast('数据已恢复，页面将刷新');
                    modal.classList.remove('open');
                    setTimeout(function () { location.reload(); }, 1000);
                } catch (err) {
                    alert('文件读取失败：' + err.message);
                }
            };
            reader.readAsText(file);
            this.value = '';
        });

        // 清除数据
        document.getElementById('backup-clear').addEventListener('click', function () {
            if (!confirm('确定要清除所有数据吗？此操作不可撤销')) return;
            if (!confirm('再次确认：将要删除全部数据')) return;

            var keys = (window.GameData && window.GameData.SYNC_KEYS)
                ? window.GameData.SYNC_KEYS.slice()
                : ['games', 'achievements', 'memos', 'profile', 'game_record_wishlist', 'game_record_reviews', 'game_record_spending'];
            keys.push('lock_password', 'is_locked', 'site_bg_image', 'mascot_image');
            keys.forEach(function (key) { localStorage.removeItem(key); });

            showToast('数据已清除，页面将刷新');
            modal.classList.remove('open');
            setTimeout(function () { location.reload(); }, 1000);
        });
    }

    // ==================== Toast ====================
    function showToast(message) {
        var existing = document.getElementById('utils-toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.id = 'utils-toast';
        toast.style.cssText = 'position:fixed;top:5rem;right:1.5rem;padding:0.75rem 1.25rem;border-radius:0.5rem;color:#fff;font-size:0.85rem;font-weight:500;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);transform:translateX(120%);transition:transform 0.3s ease;background:#52B6FF;';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(function () {
            toast.style.transform = 'translateX(0)';
        });
        setTimeout(function () {
            toast.style.transform = 'translateX(120%)';
            setTimeout(function () { toast.remove(); }, 300);
        }, 2500);
    }

    // ==================== 安全的 localStorage 操作 ====================
    function safeGetItem(key, defaultValue) {
        try {
            var data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('localStorage read error:', e);
            return defaultValue;
        }
    }

    function safeSetItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('localStorage write error:', e);
            showToast('存储空间不足，请清理数据');
            return false;
        }
    }

    // 暴露全局函数
    window.safeGetItem = safeGetItem;
    window.safeSetItem = safeSetItem;

    // ==================== 阻止浏览器/密码管理器自动填充账号 ====================
    // 本站非登录页（登录在 auth.html，不加载本脚本），所以这里所有输入框都不应被
    // 当成账号/密码字段。给它们打上明确标记，避免 Edge/Chrome 及 1Password/LastPass
    // 弹出账号填充。可在某个输入上加 data-allow-autofill 主动豁免。
    function hardenInputAutofill(root) {
        var scope = root && root.querySelectorAll ? root : document;
        var fields = scope.querySelectorAll('input, textarea, select');
        for (var i = 0; i < fields.length; i++) {
            var el = fields[i];
            if (!el || el.nodeType !== 1) continue;
            if (el.hasAttribute('data-allow-autofill')) continue;
            if (el.getAttribute('data-no-autofill') === '1') continue;
            var type = (el.getAttribute('type') || '').toLowerCase();
            // 这些类型不会触发账号填充，跳过即可
            if (type === 'checkbox' || type === 'radio' || type === 'file' ||
                type === 'range' || type === 'hidden' || type === 'submit' ||
                type === 'button' || type === 'color') continue;
            el.setAttribute('autocomplete', 'off');
            el.setAttribute('data-lpignore', 'true');
            el.setAttribute('data-1p-ignore', '');
            if (!el.hasAttribute('data-form-type')) {
                el.setAttribute('data-form-type', 'other');
            }
            el.setAttribute('data-no-autofill', '1');
        }
    }

    function initAutofillGuard() {
        hardenInputAutofill(document);
        if (typeof MutationObserver === 'undefined') return;
        var pending = false;
        var observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
                    if (pending) return;
                    pending = true;
                    // 合并多次 DOM 变更，下一帧统一处理
                    requestAnimationFrame(function () {
                        pending = false;
                        hardenInputAutofill(document);
                    });
                    return;
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.hardenInputAutofill = hardenInputAutofill;

    // ==================== 初始化 ====================
    function init() {
        injectToolbar();
        if (window.GameAuth && window.GameAuth.injectLogoutButton) {
            window.GameAuth.injectLogoutButton();
        }
        initSearch();
        initMemo();
        initLock();
        initBackup();
        updateLockBtn();
        initAutofillGuard();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
