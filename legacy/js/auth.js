/**
 * Supabase Auth：登录、注册、登出、页面保护
 */
(function () {
    'use strict';

    var AUTH_PAGE = 'auth.html';
    var LOCAL_USER_KEY = 'game_auth_user_id';

    function getSyncKeys() {
        if (window.GameData && window.GameData.SYNC_KEYS) {
            return window.GameData.SYNC_KEYS.slice();
        }
        return [
            'games', 'achievements', 'profile',
            'game_record_wishlist', 'game_record_reviews', 'game_record_spending', 'memos',
            'game_record_theme', 'mascot_quotes', 'mascot_enabled', 'auto_time_bg', 'site_video_bg'
        ];
    }

    function isAuthPage() {
        var path = window.location.pathname || '';
        return path.indexOf(AUTH_PAGE) !== -1;
    }

    function getReturnUrl() {
        var params = new URLSearchParams(window.location.search);
        var ret = params.get('return') || 'index.html';
        if (ret.indexOf('auth.html') !== -1) ret = 'index.html';
        return ret;
    }

    function clearUserSyncData() {
        getSyncKeys().forEach(function (key) {
            localStorage.removeItem(key);
        });
        localStorage.removeItem('game_record_media');
        sessionStorage.removeItem('gamecloud_toast_ok');
        sessionStorage.removeItem('gamecloud_toast_err');
    }

    async function getSession() {
        if (!window.SB) return null;
        var result = await window.SB.auth.getSession();
        if (result.error) {
            console.warn('[GameAuth] getSession error:', result.error);
            return null;
        }
        return result.data && result.data.session ? result.data.session : null;
    }

    async function getUserId() {
        var session = await getSession();
        return session && session.user ? session.user.id : null;
    }

    async function signUp(email, password) {
        if (!window.SB) throw new Error('Supabase 未配置');
        var result = await window.SB.auth.signUp({ email: email, password: password });
        if (result.error) throw result.error;
        return result.data;
    }

    async function signIn(email, password) {
        if (!window.SB) throw new Error('Supabase 未配置');
        var prevUser = localStorage.getItem(LOCAL_USER_KEY);
        var result = await window.SB.auth.signInWithPassword({ email: email, password: password });
        if (result.error) throw result.error;
        var newUserId = result.data.session && result.data.session.user
            ? result.data.session.user.id
            : null;
        if (newUserId && prevUser && prevUser !== newUserId) {
            clearUserSyncData();
        }
        if (newUserId) {
            localStorage.setItem(LOCAL_USER_KEY, newUserId);
        }
        return result.data;
    }

    async function signOut() {
        clearUserSyncData();
        localStorage.removeItem(LOCAL_USER_KEY);
        if (window.SB) {
            await window.SB.auth.signOut();
        }
        window.location.href = AUTH_PAGE;
    }

    async function requireAuth() {
        if (isAuthPage()) return true;
        if (!window.SB) {
            window.location.href = AUTH_PAGE + '?return=' + encodeURIComponent(
                window.location.pathname.split('/').pop() || 'index.html'
            );
            return false;
        }
        var session = await getSession();
        if (!session) {
            var page = window.location.pathname.split('/').pop() || 'index.html';
            window.location.href = AUTH_PAGE + '?return=' + encodeURIComponent(page + window.location.search);
            return false;
        }
        var uid = session.user.id;
        var prev = localStorage.getItem(LOCAL_USER_KEY);
        if (prev && prev !== uid) {
            clearUserSyncData();
        }
        localStorage.setItem(LOCAL_USER_KEY, uid);
        return true;
    }

    function injectLogoutButton() {
        if (isAuthPage()) return;
        var nav = document.querySelector('nav');
        if (!nav || document.getElementById('btn-logout')) return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'btn-logout';
        btn.className = 'utils-toolbar-btn auth-logout-btn';
        btn.title = '退出登录';
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
        btn.addEventListener('click', function () {
            if (confirm('确定退出登录？本地游戏数据将从本机清除。')) {
                signOut();
            }
        });

        var desktopNav = nav.querySelector('.desktop-nav');
        if (desktopNav) {
            desktopNav.appendChild(btn);
        }

        var mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu && !document.getElementById('btn-logout-m')) {
            var mBtn = btn.cloneNode(true);
            mBtn.id = 'btn-logout-m';
            mBtn.addEventListener('click', function () {
                if (confirm('确定退出登录？本地游戏数据将从本机清除。')) {
                    signOut();
                }
            });
            var row = document.getElementById('utils-toolbar-mobile');
            if (row) row.appendChild(mBtn);
        }
    }

    window.GameAuth = {
        getSession: getSession,
        getUserId: getUserId,
        signUp: signUp,
        signIn: signIn,
        signOut: signOut,
        requireAuth: requireAuth,
        clearUserSyncData: clearUserSyncData,
        getReturnUrl: getReturnUrl,
        injectLogoutButton: injectLogoutButton
    };

    if (!isAuthPage()) {
        document.documentElement.classList.add('auth-pending');
        requireAuth().then(function (ok) {
            document.documentElement.classList.remove('auth-pending');
            if (ok && window.GameCloud && typeof window.GameCloud.start === 'function') {
                window.GameCloud.start();
            }
        });
    }
})();
