/**
 * cloud-library.js 鈥?鍏崇郴琛紙user_games + games锛夆啋 鍏ㄧ珯鏈湴 games 璐€? *
 * 鑱岃矗锛? *  1) 鐧诲綍鍚庝粠 Supabase 鎷夊彇鏈敤鎴?owned 搴擄紙sync-user-games 鍐欏叆鐨?user_games锛夛紝
 *     鍚堝苟杩?localStorage 鐨?`games`锛岃 games / stats / index / spending 绛夐〉鐩存帴鍛堢幇銆? *  2) 鎻愪緵 Steam 搴撲竴閿悓姝ュ叆鍙ｏ紙璋冪敤 sync-user-games Edge Function锛夈€? *
 * 鐢?cloud-sync.js 鍦ㄤ簯绔媺鍙栧畬鎴愩€乺eadyResolve 涔嬪墠璋冪敤 hydrate()锛? * 鍥犳鍚勯〉 whenGameCloudSynced(renderX) 閲嶆覆鏌撴椂鍗冲彲鐪嬪埌 Steam 搴撱€? */
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

  /** 鎷夊彇鏈敤鎴峰凡鎷ユ湁鐨勬父鎴忥紙user_games.source='owned' join games锛?*/
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

  /** 鎶?owned 搴撳悎骞惰繘鏈湴 games锛堜繚鐣欑敤鎴峰凡缂栬緫瀛楁锛涙寜 steam_app_id / 鍚嶇О鍘婚噸锛?*/
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
          type: '鍏朵粬',
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

  /** 璋冪敤 sync-user-games锛圫team 搴撹嚜鍔ㄦ媺鍙栵級 */
  async function syncSteam(steamId) {
    var cfg = readSupabaseEnv();
    if (!cfg.url || !cfg.anonKey) throw new Error('鏈厤缃?Supabase');
    var token = await getSessionToken();
    if (!token) throw new Error('璇峰厛鐧诲綍');

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

  // ---------- Steam 鍚屾 UI锛堜粎鍦ㄥ惈 #steam-sync-card 鐨勯〉闈㈢敓鏁堬紝濡?games.html锛?----------
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
        if (statusEl) statusEl.textContent = '璇疯緭鍏?17 浣?SteamID64锛堜釜浜鸿祫鏂欓』鍏紑锛?;
        return;
      }
      btn.disabled = true;
      var oldLabel = btn.textContent;
      btn.textContent = '鍚屾涓€?;
      if (statusEl) statusEl.textContent = '姝ｅ湪浠?Steam 鎷夊彇娓告垙搴撯€?;
      try {
        var data = await syncSteam(steamId);
        await hydrate();
        refreshLibraryPages();
        if (statusEl) {
          if (data.mode === 'steam') {
            statusEl.textContent = '宸插悓姝?' + (data.ownedCount || 0) + ' 娆撅紙搴撳唴鍏?' + (data.gameCount || 0) + ' 娆撅級';
          } else {
            statusEl.textContent = '宸插悓姝?' + (data.syncedCount || 0) + ' 鏉?;
          }
        }
      } catch (e) {
        if (statusEl) statusEl.textContent = '鍚屾澶辫触锛? + (e.message || e);
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
