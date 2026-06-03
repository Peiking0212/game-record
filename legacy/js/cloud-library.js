/**
 * cloud-library.js — 关系表（user_games + games）→ 全站本地 games 贯通
 *
 * 职责：
 *  1) 登录后从 Supabase 拉取本用户 owned 库（sync-user-games 写入的 user_games），
 *     合并进 localStorage 的 `games`，让 games / stats / index / spending 等页直接呈现。
 *  2) 提供 Steam 库一键同步入口（调用 sync-user-games Edge Function）。
 *
 * 由 cloud-sync.js 在云端拉取完成、readyResolve 之前调用 hydrate()，
 * 因此各页 whenGameCloudSynced(renderX) 重渲染时即可看到 Steam 库。
 */
(function () {
  'use strict';

  var STEAM_ID_LS_KEY = 'steam_id';

  function GD() { return window.GameData; }

  function normalizeName(name) {
    return String(name || '').trim().toLowerCase();
  }

  function readSupabaseEnv() {
    if (window.GameTimeSupabase && window.GameTimeSupabase.readBrowserEnv) {
      return window.GameTimeSupabase.readBrowserEnv();
    }
    return { url: '', anonKey: '' };
  }

  async function getSessionToken() {
    if (!window.SB) return null;
    try {
      var res = await window.SB.auth.getSession();
      return res.data && res.data.session ? res.data.session.access_token : null;
    } catch (e) {
      return null;
    }
  }

  async function isSignedIn() {
    return !!(await getSessionToken());
  }

  /** 拉取本用户已拥有的游戏（user_games.source='owned' join games） */
  async function pullOwnedGames() {
    if (!window.SB) return [];
    if (!(await isSignedIn())) return [];
    try {
      var res = await window.SB
        .from('user_games')
        .select('game_id, playtime_minutes, last_played_at, source, games ( id, steam_app_id, name, cover_url, genres )')
        .eq('source', 'owned');
      if (res.error) {
        console.warn('[cloud-library] pull owned failed', res.error.message);
        return [];
      }
      return (res.data || []).filter(function (row) { return row && row.games; });
    } catch (e) {
      console.warn('[cloud-library] pull owned exception', e);
      return [];
    }
  }

  function toIsoDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function syntheticGameId(g, existingIds) {
    var base = g.steam_app_id ? Number(g.steam_app_id) : (9000000000 + Number(g.id || 0));
    var id = base;
    while (existingIds[String(id)]) id += 1;
    return id;
  }

  /** 把 owned 库合并进本地 games（保留用户已编辑字段；按 steam_app_id / 名称去重） */
  async function hydrate() {
    if (!GD()) return false;
    var owned = await pullOwnedGames();
    if (!owned.length) return false;

    var games = GD().get(GD().KEYS.GAMES, []);
    if (!Array.isArray(games)) games = [];

    var bySteam = {};
    var byName = {};
    var existingIds = {};
    games.forEach(function (game) {
      if (!game) return;
      if (game.id != null) existingIds[String(game.id)] = true;
      if (game.steamAppId != null && game.steamAppId !== '') bySteam[String(game.steamAppId)] = game;
      if (game.name) byName[normalizeName(game.name)] = game;
    });

    var changed = false;

    owned.forEach(function (row) {
      var g = row.games;
      if (!g || !g.name) return;
      var steamId = g.steam_app_id != null ? String(g.steam_app_id) : '';
      var playMin = Number(row.playtime_minutes) || 0;
      var playHours = Math.round(playMin / 60);
      var lastIso = toIsoDate(row.last_played_at);

      var local = (steamId && bySteam[steamId]) || byName[normalizeName(g.name)] || null;

      if (local) {
        if (local.supabaseGameId !== g.id) { local.supabaseGameId = g.id; changed = true; }
        if ((local.steamAppId == null || local.steamAppId === '') && g.steam_app_id != null) {
          local.steamAppId = g.steam_app_id; changed = true;
        }
        if (!local.icon && g.cover_url) { local.icon = g.cover_url; changed = true; }
        if (local.steamPlaytimeMinutes !== playMin) { local.steamPlaytimeMinutes = playMin; changed = true; }
        if ((local.playtime == null || Number(local.playtime) === 0) && playHours > 0) {
          local.playtime = playHours; changed = true;
        }
        if (!local.lastPlayed && lastIso) { local.lastPlayed = lastIso; changed = true; }
      } else {
        var newId = syntheticGameId(g, existingIds);
        var newGame = {
          id: newId,
          name: g.name,
          icon: g.cover_url || '',
          playtime: playHours,
          progress: 0,
          status: playHours > 0 ? 'playing' : 'planned',
          type: '其他',
          description: '',
          lastPlayed: lastIso,
          steamAppId: g.steam_app_id != null ? g.steam_app_id : '',
          supabaseGameId: g.id,
          steamPlaytimeMinutes: playMin,
          cloudSource: 'steam'
        };
        games.push(newGame);
        existingIds[String(newId)] = true;
        if (steamId) bySteam[steamId] = newGame;
        byName[normalizeName(g.name)] = newGame;
        changed = true;
      }
    });

    if (changed) {
      GD().set(GD().KEYS.GAMES, games);
      if (GD().bootstrapFollowedGameDictionaryFromGames) {
        try { GD().bootstrapFollowedGameDictionaryFromGames({ preserveUserEdits: true }); } catch (e) { /* noop */ }
      }
    }
    return changed;
  }

  /** 调用 sync-user-games（Steam 库自动拉取） */
  async function syncSteam(steamId) {
    var cfg = readSupabaseEnv();
    if (!cfg.url || !cfg.anonKey) throw new Error('未配置 Supabase');
    var token = await getSessionToken();
    if (!token) throw new Error('请先登录');

    var body = {};
    var clean = String(steamId || '').replace(/\D/g, '');
    if (clean) body.steamId = clean;

    var res = await fetch(cfg.url.replace(/\/$/, '') + '/functions/v1/sync-user-games', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        apikey: cfg.anonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.ok) {
      var err = (data && (data.hint || data.error)) ? (data.hint || data.error) : ('HTTP ' + res.status);
      throw new Error(err);
    }
    if (clean) {
      try { localStorage.setItem(STEAM_ID_LS_KEY, clean); } catch (e) { /* noop */ }
    }
    return data;
  }

  function refreshLibraryPages() {
    if (typeof window.renderGamesPage === 'function') {
      try { window.renderGamesPage(); } catch (e) { /* noop */ }
    }
    window.dispatchEvent(new CustomEvent('gamelibrary:updated'));
  }

  // ---------- Steam 同步 UI（仅在含 #steam-sync-card 的页面生效，如 games.html） ----------
  function initSteamSyncUI() {
    var card = document.getElementById('steam-sync-card');
    if (!card) return;
    var input = document.getElementById('steam-id-input');
    var btn = document.getElementById('steam-sync-btn');
    var statusEl = document.getElementById('steam-sync-status');
    if (!btn || !input) return;

    isSignedIn().then(function (signed) {
      card.classList.toggle('hidden', !signed);
      if (!signed) return;
      var saved = '';
      try { saved = localStorage.getItem(STEAM_ID_LS_KEY) || ''; } catch (e) { saved = ''; }
      if (saved && !input.value) input.value = saved;
    });

    if (btn._bound) return;
    btn._bound = true;
    btn.addEventListener('click', async function () {
      var steamId = String(input.value || '').replace(/\D/g, '');
      if (steamId.length < 17) {
        if (statusEl) statusEl.textContent = '请输入 17 位 SteamID64（个人资料须公开）';
        return;
      }
      btn.disabled = true;
      var oldLabel = btn.textContent;
      btn.textContent = '同步中…';
      if (statusEl) statusEl.textContent = '正在从 Steam 拉取游戏库…';
      try {
        var data = await syncSteam(steamId);
        await hydrate();
        refreshLibraryPages();
        if (statusEl) {
          if (data.mode === 'steam') {
            statusEl.textContent = '已同步 ' + (data.ownedCount || 0) + ' 款（库内共 ' + (data.gameCount || 0) + ' 款）';
          } else {
            statusEl.textContent = '已同步 ' + (data.syncedCount || 0) + ' 条';
          }
        }
      } catch (e) {
        if (statusEl) statusEl.textContent = '同步失败：' + (e.message || e);
      } finally {
        btn.disabled = false;
        btn.textContent = oldLabel;
      }
    });
  }

  window.GameLibrary = {
    pullOwnedGames: pullOwnedGames,
    hydrate: hydrate,
    syncSteam: syncSteam
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSteamSyncUI);
  } else {
    initSteamSyncUI();
  }
})();
