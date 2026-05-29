// ============================================================
// wishlist.js - 游戏愿望单页面业务逻辑
// 数据存储: localStorage key = game_record_wishlist
// Supabase fallback: games + game_best_prices（需登录且配置 SB）
// ============================================================

var _supabaseCatalogCache = null;
var _alertCtx = null;
var ALERT_EVENTS_LIMIT = 15;

/** 愿望单中文名 → 云端 games.name（小写）或 steam_app_id */
var WISHLIST_GAME_ALIASES = {
  '星露谷物语': { name: 'stardew valley', steamAppId: 413150 },
  '星露谷': { name: 'stardew valley', steamAppId: 413150 },
  'stardew valley': { name: 'stardew valley', steamAppId: 413150 },
  'dota 2': { name: 'dota 2', steamAppId: 570 },
  'dota2': { name: 'dota 2', steamAppId: 570 },
  '反恐精英2': { name: 'counter-strike 2', steamAppId: 730 },
  'cs2': { name: 'counter-strike 2', steamAppId: 730 },
  'counter-strike 2': { name: 'counter-strike 2', steamAppId: 730 }
};

function normalizeWishlistGameName(name) {
  return String(name || '').trim().toLowerCase();
}

function getWishlistAlias(name) {
  var key = normalizeWishlistGameName(name);
  return WISHLIST_GAME_ALIASES[key] || null;
}

function readSupabaseEnv() {
  if (window.GameTimeSupabase && window.GameTimeSupabase.readBrowserEnv) {
    return window.GameTimeSupabase.readBrowserEnv();
  }
  return { url: '', anonKey: '' };
}

function getDismissedAlertEventIds() {
  var rules = getDealWatchRules();
  return Array.isArray(rules.dismissedAlertEventIds) ? rules.dismissedAlertEventIds : [];
}

function dismissAlertEventId(eventId) {
  var rules = getDealWatchRules();
  if (!rules.dismissedAlertEventIds) rules.dismissedAlertEventIds = [];
  var id = Number(eventId);
  if (!Number.isFinite(id)) return;
  if (rules.dismissedAlertEventIds.indexOf(id) === -1) {
    rules.dismissedAlertEventIds.push(id);
  }
  saveDealWatchRules(rules);
}

function isAlertEventDismissed(eventId) {
  return getDismissedAlertEventIds().indexOf(Number(eventId)) !== -1;
}

async function isUserSignedIn() {
  if (!window.SB) return false;
  try {
    var sessionRes = await window.SB.auth.getSession();
    return !!(sessionRes.data && sessionRes.data.session);
  } catch (e) {
    return false;
  }
}

async function loadAlertContext() {
  if (_alertCtx) return _alertCtx;
  var empty = {
    signedIn: false,
    alertsByGameId: {},
    pricesByGameId: {},
    gamesById: {},
    gamesList: []
  };
  if (!window.SB) {
    _alertCtx = empty;
    return _alertCtx;
  }
  try {
    var signedIn = await isUserSignedIn();
    if (!signedIn) {
      _alertCtx = empty;
      return _alertCtx;
    }
    var alertsRes = await window.SB.from('alerts').select('id, game_id, target_price, enabled');
    var pricesRes = await window.SB.from('game_best_prices').select('*');
    var gamesRes = await window.SB.from('games').select('id, name, steam_app_id, cover_url');

    var alertsByGameId = {};
    (alertsRes.data || []).forEach(function (row) {
      alertsByGameId[String(row.game_id)] = row;
    });
    var pricesByGameId = {};
    (pricesRes.data || []).forEach(function (row) {
      pricesByGameId[String(row.game_id)] = row;
    });
    var gamesById = {};
    (gamesRes.data || []).forEach(function (g) {
      gamesById[String(g.id)] = g;
    });

    _alertCtx = {
      signedIn: true,
      alertsByGameId: alertsByGameId,
      pricesByGameId: pricesByGameId,
      gamesById: gamesById,
      gamesList: gamesRes.data || []
    };
    return _alertCtx;
  } catch (e) {
    console.warn('[wishlist] loadAlertContext failed', e);
    _alertCtx = empty;
    return _alertCtx;
  }
}

function invalidateAlertContext() {
  _alertCtx = null;
}

function resolveSupabaseGameId(item, ctx) {
  if (!item || !ctx) return null;
  if (item.supabaseGameId != null) return Number(item.supabaseGameId);
  var list = ctx.gamesList || [];
  var alias = getWishlistAlias(item.name);
  var wantSteamId = item.steamAppId || (alias && alias.steamAppId);
  var wantName = alias && alias.name ? alias.name : normalizeWishlistGameName(item.name);

  for (var i = 0; i < list.length; i++) {
    var g = list[i];
    if (wantSteamId && g.steam_app_id && String(g.steam_app_id) === String(wantSteamId)) {
      return g.id;
    }
    if (g.name && item.name &&
        normalizeWishlistGameName(g.name) === normalizeWishlistGameName(item.name)) {
      return g.id;
    }
    if (g.name && wantName && normalizeWishlistGameName(g.name) === wantName) {
      return g.id;
    }
  }
  return null;
}

function formatBestPriceLine(priceRow) {
  if (!priceRow) return '';
  var cur = priceRow.currency === 'CNY' || !priceRow.currency ? '¥' : (priceRow.currency + ' ');
  var store = priceRow.best_store ? String(priceRow.best_store) : '';
  if (store === 'gog') store = 'GOG';
  else if (store) store = store.charAt(0).toUpperCase() + store.slice(1);
  return '当前最低 ' + cur + priceRow.price + (store ? ' @' + store : '');
}

async function triggerAlertEvaluatorForGame(gameId) {
  var cfg = readSupabaseEnv();
  if (!cfg.url || !cfg.anonKey) return;
  try {
    var sessionRes = await window.SB.auth.getSession();
    var token = sessionRes.data && sessionRes.data.session && sessionRes.data.session.access_token;
    if (!token) return;
    await fetch(cfg.url.replace(/\/$/, '') + '/functions/v1/run-alert-evaluator', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        apikey: cfg.anonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameId: Number(gameId) })
    });
  } catch (e) {
    console.warn('[wishlist] evaluator invoke failed', e);
  }
}

async function callLookupGame(query, steamAppId) {
  var cfg = readSupabaseEnv();
  if (!cfg.url || !cfg.anonKey) throw new Error('未配置 Supabase');
  var sessionRes = await window.SB.auth.getSession();
  var token = sessionRes.data && sessionRes.data.session && sessionRes.data.session.access_token;
  if (!token) throw new Error('请先登录');

  var bodyPayload = { import: true, allowManual: true };
  if (steamAppId != null && Number(steamAppId) > 0) {
    bodyPayload.steamAppId = Number(steamAppId);
  } else {
    bodyPayload.query = String(query || '').trim();
  }

  var res = await fetch(cfg.url.replace(/\/$/, '') + '/functions/v1/lookup-game', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      apikey: cfg.anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyPayload)
  });
  var body = await res.json().catch(function () { return {}; });
  if (!res.ok || !body.ok) {
    var err = (body && body.error) ? body.error : ('HTTP ' + res.status);
    if (err === 'not_found') {
      err = (body && body.hint) ? body.hint : '未在 Steam/ITAD 找到；主机独占游戏仍会尝试按名称入库';
    }
    throw new Error(err);
  }
  invalidateAlertContext();
  _supabaseCatalogCache = null;
  return body;
}

async function callUpsertAlert(gameId, targetPrice, enabled) {
  var cfg = readSupabaseEnv();
  if (!cfg.url || !cfg.anonKey) throw new Error('未配置 Supabase');
  var sessionRes = await window.SB.auth.getSession();
  var token = sessionRes.data && sessionRes.data.session && sessionRes.data.session.access_token;
  if (!token) throw new Error('请先登录');

  var res = await fetch(cfg.url.replace(/\/$/, '') + '/functions/v1/upsert-alert', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      apikey: cfg.anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      gameId: Number(gameId),
      targetPrice: Number(targetPrice),
      enabled: enabled !== false
    })
  });
  var body = await res.json().catch(function () { return {}; });
  if (!res.ok || !body.ok) {
    var err = (body && body.error) ? body.error : ('HTTP ' + res.status);
    throw new Error(err);
  }
  invalidateAlertContext();
  return body;
}

function renderTargetPriceBlock(item, ctx) {
  if (!ctx || !ctx.signedIn) return '';
  var gameId = resolveSupabaseGameId(item, ctx);
  if (!gameId) {
    var safeName = escapeHtml(item.name || '');
    return '<div class="wishlist-alert-row wishlist-alert-unmatched" data-wishlist-id="' + escapeHtml(String(item.id || '')) + '">' +
      '<span class="wishlist-alert-inline">未在云端目录中。可从 Steam 搜索并入库后即可设目标价提醒。</span>' +
      '<button type="button" class="wishlist-lookup-cloud-btn" data-wishlist-id="' + escapeHtml(String(item.id || '')) + '">从 Steam 搜索入库</button>' +
      '</div>';
  }
  var alertRow = ctx.alertsByGameId[String(gameId)];
  var priceRow = ctx.pricesByGameId[String(gameId)];
  var targetVal = alertRow && alertRow.target_price != null ? alertRow.target_price : '';
  var html = '<div class="wishlist-alert-row" data-game-id="' + gameId + '">';
  html += '<div class="wishlist-alert-prices">';
  if (priceRow) {
    html += '<span class="wishlist-best-price">' + escapeHtml(formatBestPriceLine(priceRow)) + '</span>';
  } else {
    html += '<span class="wishlist-alert-inline">暂无云端最低价</span>';
  }
  if (alertRow && alertRow.target_price != null) {
    html += '<span>已设目标 ¥' + escapeHtml(String(alertRow.target_price)) + '</span>';
  }
  html += '</div>';
  html += '<div class="wishlist-alert-form">';
  html += '<label class="wishlist-alert-inline">目标价（CNY，愿意买的最高价）<input type="number" min="0.01" step="0.01" class="wishlist-target-price-input" value="' +
    escapeHtml(String(targetVal)) + '" placeholder="例如 50" /></label>';
  html += '<button type="button" class="wishlist-save-alert-btn" data-game-id="' + gameId + '">保存提醒</button>';
  html += '<span class="wishlist-alert-inline wishlist-alert-feedback" data-game-id="' + gameId + '"></span>';
  html += '</div></div>';
  return html;
}

function bindLookupCloudHandlers(container) {
  if (!container) return;
  var buttons = container.querySelectorAll('.wishlist-lookup-cloud-btn');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', async function () {
      var wishId = this.getAttribute('data-wishlist-id');
      var list = await loadWishlistWithFallback();
      var item = null;
      for (var j = 0; j < list.length; j++) {
        if (String(list[j].id) === String(wishId)) { item = list[j]; break; }
      }
      if (!item || !item.name) {
        showToast('找不到愿望单条目', 'warning');
        return;
      }
      this.disabled = true;
      try {
        showToast('正在 Steam 搜索「' + item.name + '」…', 'success');
        var lookup = await callLookupGame(item.name);
        if (lookup.game) {
          item.supabaseGameId = lookup.game.id;
          item.steamAppId = lookup.game.steam_app_id;
          if (!item.cover && lookup.game.cover_url) item.cover = lookup.game.cover_url;
          var local = getWishlist();
          for (var k = 0; k < local.length; k++) {
            if (String(local[k].id) === String(wishId)) {
              local[k] = Object.assign({}, local[k], item);
              saveWishlist(local);
              break;
            }
          }
          if (lookup.warning === 'not_on_steam' && lookup.message) {
            showToast(lookup.message, 'warning');
          } else {
            showToast('已入库：' + (lookup.game.name || item.name), 'success');
          }
        }
        await renderWishlist();
        await renderAlertsPanel();
      } catch (e) {
        showToast(e.message || '入库失败', 'warning');
      } finally {
        this.disabled = false;
      }
    });
  }
}

function bindTargetPriceSaveHandlers(container) {
  if (!container) return;
  var buttons = container.querySelectorAll('.wishlist-save-alert-btn');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', async function () {
      var gameId = this.getAttribute('data-game-id');
      var row = container.querySelector('.wishlist-alert-row[data-game-id="' + gameId + '"]');
      var input = row ? row.querySelector('.wishlist-target-price-input') : null;
      var feedback = row ? row.querySelector('.wishlist-alert-feedback') : null;
      var price = input ? parseFloat(input.value) : NaN;
      if (!Number.isFinite(price) || price <= 0) {
        showToast('请输入有效的目标价', 'warning');
        return;
      }
      this.disabled = true;
      if (feedback) {
        feedback.textContent = '保存中…';
        feedback.className = 'wishlist-alert-inline wishlist-alert-feedback';
      }
      try {
        var upsertBody = await callUpsertAlert(gameId, price, true);
        await triggerAlertEvaluatorForGame(gameId);
        var ev = upsertBody && upsertBody.evaluation;
        if (feedback) {
          feedback.textContent = '已保存';
          feedback.className = 'wishlist-alert-inline wishlist-alert-feedback success';
        }
        if (ev && ev.triggered) {
          showToast('已达标！站内提醒与看板娘已更新', 'success');
        } else if (ev && ev.reason === 'above_target') {
          showToast('已保存。当前价高于目标价，降价后会提醒', 'success');
        } else if (ev && ev.reason === 'deduped') {
          showToast('已保存（24 小时内不重复提醒）', 'success');
        } else {
          showToast('目标价提醒已保存', 'success');
        }
        await renderWishlist();
        await renderAlertsPanel();
      } catch (e) {
        if (feedback) {
          feedback.textContent = e.message || '保存失败';
          feedback.className = 'wishlist-alert-inline wishlist-alert-feedback error';
        }
        showToast(e.message || '保存失败', 'warning');
      } finally {
        this.disabled = false;
      }
    });
  }
}

async function fetchInAppAlertEvents() {
  if (!window.SB || !(await isUserSignedIn())) return [];
  var res = await window.SB
    .from('alert_events')
    .select('id, alert_id, trigger_price, channel, status, triggered_at, alerts ( game_id, target_price, games ( name ) )')
    .eq('channel', 'in_app')
    .order('triggered_at', { ascending: false })
    .limit(ALERT_EVENTS_LIMIT);
  if (!res.error && res.data) return res.data;

  if (res.error) {
    console.warn('[wishlist] alert_events embed fetch failed, fallback', res.error.message);
  }
  var plain = await window.SB
    .from('alert_events')
    .select('id, alert_id, trigger_price, channel, status, triggered_at')
    .eq('channel', 'in_app')
    .order('triggered_at', { ascending: false })
    .limit(ALERT_EVENTS_LIMIT);
  if (plain.error || !plain.data || plain.data.length === 0) {
    if (plain.error) console.warn('[wishlist] alert_events fetch failed', plain.error.message);
    return [];
  }
  var alertIds = plain.data.map(function (e) { return e.alert_id; });
  var alertsRes = await window.SB
    .from('alerts')
    .select('id, game_id, target_price')
    .in('id', alertIds);
  var gameIds = (alertsRes.data || []).map(function (a) { return a.game_id; });
  var gamesRes = await window.SB.from('games').select('id, name').in('id', gameIds);
  var alertById = {};
  (alertsRes.data || []).forEach(function (a) { alertById[a.id] = a; });
  var gameById = {};
  (gamesRes.data || []).forEach(function (g) { gameById[g.id] = g; });
  return plain.data.map(function (ev) {
    var alert = alertById[ev.alert_id];
    var game = alert ? gameById[alert.game_id] : null;
    return {
      id: ev.id,
      alert_id: ev.alert_id,
      trigger_price: ev.trigger_price,
      channel: ev.channel,
      status: ev.status,
      triggered_at: ev.triggered_at,
      alerts: alert ? {
        game_id: alert.game_id,
        target_price: alert.target_price,
        games: game ? { name: game.name } : null
      } : null
    };
  });
}

function resolveDisplayGameName(gameId, cloudName, ctx) {
  var gid = gameId != null ? String(gameId) : '';
  var list = getWishlist();
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (!item || !item.name) continue;
    var resolved = resolveSupabaseGameId(item, ctx);
    if (resolved != null && String(resolved) === gid) return item.name;
  }
  if (cloudName) {
    var alias = getWishlistAlias(cloudName);
    if (alias) {
      for (var j = 0; j < list.length; j++) {
        if (list[j].name && normalizeWishlistGameName(list[j].name) === normalizeWishlistGameName(cloudName)) {
          return list[j].name;
        }
      }
    }
  }
  return cloudName || '游戏';
}

function dedupeAlertEventsByGame(events) {
  var seen = {};
  var out = [];
  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    var gid = ev.alerts && ev.alerts.game_id;
    var key = gid != null ? 'g:' + gid : 'e:' + ev.id;
    if (seen[key]) continue;
    seen[key] = true;
    out.push(ev);
  }
  return out;
}

function formatAlertEventMessage(ev, displayName) {
  var gameName = displayName || '游戏';
  var target = null;
  if (!displayName && ev.alerts && ev.alerts.games && ev.alerts.games.name) {
    gameName = ev.alerts.games.name;
  }
  if (ev.alerts && ev.alerts.target_price != null) target = ev.alerts.target_price;
  if (window.MascotNotify && window.MascotNotify.formatPriceAlertMessage) {
    return window.MascotNotify.formatPriceAlertMessage(gameName, ev.trigger_price, target);
  }
  return gameName + ' 现价 ' + ev.trigger_price;
}

function dismissAllVisibleAlertEvents(events) {
  for (var i = 0; i < events.length; i++) {
    dismissAlertEventId(events[i].id);
  }
}

async function renderAlertsPanel() {
  var listEl = document.getElementById('wishlist-alerts-list');
  var emptyEl = document.getElementById('wishlist-alerts-empty');
  var badgeEl = document.getElementById('alerts-unread-badge');
  var loginHint = document.getElementById('alerts-login-hint');
  if (!listEl) return;

  var signedIn = await isUserSignedIn();
  if (loginHint) loginHint.classList.toggle('hidden', signedIn);

  if (!signedIn) {
    listEl.innerHTML = '';
    if (emptyEl) {
      emptyEl.textContent = '登录后可查看云端降价提醒';
      emptyEl.classList.remove('hidden');
    }
    if (badgeEl) badgeEl.classList.add('hidden');
    return;
  }

  var ctx = await loadAlertContext();
  var rawEvents = await fetchInAppAlertEvents();
  var events = dedupeAlertEventsByGame(rawEvents).filter(function (ev) {
    return !isAlertEventDismissed(ev.id);
  });

  var unreadCount = events.length;
  var html = '';
  var newestUnread = events.length ? events[0] : null;

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    var gameId = ev.alerts && ev.alerts.game_id;
    var cloudName = ev.alerts && ev.alerts.games && ev.alerts.games.name;
    var displayName = resolveDisplayGameName(gameId, cloudName, ctx);
    ev._displayName = displayName;
    html += '<li class="wishlist-alert-item is-unread" data-event-id="' + ev.id + '">';
    html += '<div><div class="font-medium text-gray-800">' +
      escapeHtml(formatAlertEventMessage(ev, displayName)) + '</div>';
    html += '<div class="text-xs text-gray-500 mt-1">' + escapeHtml(formatDate(ev.triggered_at)) + '</div></div>';
    html += '<button type="button" class="wishlist-alert-dismiss" data-event-id="' + ev.id + '">知道了</button>';
    html += '</li>';
  }

  listEl.innerHTML = html;
  if (emptyEl) {
    emptyEl.classList.toggle('hidden', events.length > 0);
    emptyEl.textContent = events.length === 0
      ? '暂无未读降价提醒（已读提醒不会重复展示）'
      : '';
  }
  if (badgeEl) badgeEl.classList.toggle('hidden', unreadCount === 0);

  var dismissAllBtn = document.getElementById('alerts-dismiss-all-btn');
  if (dismissAllBtn) dismissAllBtn.classList.toggle('hidden', events.length === 0);

  listEl.querySelectorAll('.wishlist-alert-dismiss').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      var eid = this.getAttribute('data-event-id');
      dismissAlertEventId(eid);
      await renderAlertsPanel();
    });
  });

  if (newestUnread && window.MascotNotify && window.MascotNotify.notifyLatestUnreadEvent) {
    window.MascotNotify.notifyLatestUnreadEvent(newestUnread);
  }

  if (window.lucide) lucide.createIcons();
}

// ---------- Supabase catalog fallback ----------
async function fetchSupabaseWishlistCatalog() {
  if (!window.SB) return [];
  try {
    var sessionRes = await window.SB.auth.getSession();
    if (!sessionRes.data || !sessionRes.data.session) return [];

    var gamesRes = await window.SB.from('games').select('id, steam_app_id, name, cover_url, genres');
    if (gamesRes.error) {
      console.warn('[wishlist] games fetch failed', gamesRes.error.message);
      return [];
    }

    var pricesRes = await window.SB.from('game_best_prices').select('*');
    if (pricesRes.error) {
      console.warn('[wishlist] prices fetch failed', pricesRes.error.message);
      return [];
    }

    var priceByGameId = {};
    (pricesRes.data || []).forEach(function (row) {
      priceByGameId[String(row.game_id)] = row;
    });

    function formatStoreLabel(store) {
      if (!store) return 'Steam';
      var s = String(store);
      if (s === 'gog') return 'GOG';
      if (s === 'ea') return 'EA';
      return s.charAt(0).toUpperCase() + s.slice(1);
    }

    return (gamesRes.data || []).map(function (g) {
      var priceRow = priceByGameId[String(g.id)];
      var platform = formatStoreLabel(priceRow && priceRow.best_store);
      var notes = '来自 Supabase 目录';
      if (priceRow) {
        notes = '最低价 ' + priceRow.price + ' ' + (priceRow.currency || '') +
          ' · ' + formatStoreLabel(priceRow.best_store);
        if (priceRow.discount_pct) notes += ' · 折扣 ' + priceRow.discount_pct + '%';
        if (priceRow.meta && priceRow.meta.historical_low != null) {
          notes += ' · 史低 ' + priceRow.meta.historical_low;
        }
      }
      return {
        id: 'sb_' + g.id,
        supabaseGameId: g.id,
        steamAppId: g.steam_app_id,
        name: g.name,
        cover: g.cover_url || '',
        platform: platform,
        rating: 3,
        priority: 'medium',
        price: priceRow ? String(priceRow.price) : '',
        notes: notes,
        date: priceRow && priceRow.captured_at ? priceRow.captured_at : new Date().toISOString(),
        _fromSupabase: true
      };
    });
  } catch (e) {
    console.warn('[wishlist] Supabase catalog fallback failed', e);
    return [];
  }
}

async function loadWishlistWithFallback() {
  var local = getWishlist();
  if (local.length > 0) {
    return enrichWishlistFromSupabase(local);
  }
  if (_supabaseCatalogCache) return _supabaseCatalogCache.slice();
  _supabaseCatalogCache = await fetchSupabaseWishlistCatalog();
  return _supabaseCatalogCache.slice();
}

async function enrichWishlistFromSupabase(list) {
  if (!window.SB || !list || list.length === 0) return list;
  try {
    var sessionRes = await window.SB.auth.getSession();
    if (!sessionRes.data || !sessionRes.data.session) return list;

    var pricesRes = await window.SB.from('game_best_prices').select('*');
    if (pricesRes.error || !pricesRes.data || pricesRes.data.length === 0) return list;

    var gamesRes = await window.SB.from('games').select('id, name, steam_app_id');
    if (gamesRes.error) return list;

    var priceByGameId = {};
    pricesRes.data.forEach(function (row) {
      priceByGameId[String(row.game_id)] = row;
    });

    function storeLabel(store) {
      if (!store) return '';
      var s = String(store);
      if (s === 'gog') return 'GOG';
      return s.charAt(0).toUpperCase() + s.slice(1);
    }

    return list.map(function (item) {
      var alias = getWishlistAlias(item.name);
      var wantSteamId = item.steamAppId || (alias && alias.steamAppId);
      var wantName = alias && alias.name ? alias.name : normalizeWishlistGameName(item.name);
      var match = (gamesRes.data || []).find(function (g) {
        if (item.supabaseGameId && String(g.id) === String(item.supabaseGameId)) return true;
        if (wantSteamId && g.steam_app_id && String(g.steam_app_id) === String(wantSteamId)) {
          return true;
        }
        if (g.name && item.name &&
          normalizeWishlistGameName(g.name) === normalizeWishlistGameName(item.name)) {
          return true;
        }
        if (g.name && wantName && normalizeWishlistGameName(g.name) === wantName) {
          return true;
        }
        return false;
      });
      if (!match) return item;
      var priceRow = priceByGameId[String(match.id)];
      var next = Object.assign({}, item, { supabaseGameId: match.id });
      if (!priceRow) return next;
      if (!next.price || next.price === '') next.price = String(priceRow.price);
      if (priceRow.best_store) {
        next.platform = storeLabel(priceRow.best_store);
      }
      var priceNote = '最低价 ' + priceRow.price + (priceRow.currency ? ' ' + priceRow.currency : '') +
        (priceRow.best_store ? ' @' + storeLabel(priceRow.best_store) : '');
      next.notes = (next.notes ? next.notes + ' · ' : '') + priceNote;
      return next;
    });
  } catch (e) {
    return list;
  }
}

// ---------- 数据读写 ----------
function getWishlist() {
  try {
    var data = localStorage.getItem(window.GameData.KEYS.WISHLIST);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveWishlist(list) {
  window.GameData.set(window.GameData.KEYS.WISHLIST, list);
}

function getDealWatchRules() {
  if (window.GameData.getDealWatchRules) return window.GameData.getDealWatchRules();
  return window.GameData.get(window.GameData.KEYS.DEAL_WATCH_RULES, {});
}

function saveDealWatchRules(rules) {
  if (window.GameData.setDealWatchRules) return window.GameData.setDealWatchRules(rules);
  return window.GameData.set(window.GameData.KEYS.DEAL_WATCH_RULES, rules);
}

function parsePlatformList(raw) {
  return String(raw || '')
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return !!s; });
}

function bindDealRulesPanel() {
  var minDiscountInput = document.getElementById('deal-min-discount');
  var preferredPlatformsInput = document.getElementById('deal-platform-preferred');
  var onlyNewLowInput = document.getElementById('deal-only-new-low');
  var saveBtn = document.getElementById('save-deal-rules-btn');
  var refreshBtn = document.getElementById('refresh-deals-btn');
  if (!minDiscountInput || !preferredPlatformsInput || !onlyNewLowInput) return;

  var rules = getDealWatchRules();
  minDiscountInput.value = rules.minDiscountPercent || 30;
  preferredPlatformsInput.value = (rules.preferredPlatforms || []).join(', ');
  onlyNewLowInput.checked = rules.notifyOnlyNewLows !== false;

  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      var latest = getDealWatchRules();
      latest.minDiscountPercent = Math.max(1, Math.min(95, parseInt(minDiscountInput.value || '30', 10)));
      latest.preferredPlatforms = parsePlatformList(preferredPlatformsInput.value);
      latest.notifyOnlyNewLows = !!onlyNewLowInput.checked;
      latest.updatedAt = new Date().toISOString();
      saveDealWatchRules(latest);
      showToast('折扣提醒规则已保存', 'success');
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async function () {
      if (!window.GamePersonalizedFeed) return;
      refreshBtn.disabled = true;
      try {
        await window.GamePersonalizedFeed.refresh({ force: true });
        showToast('折扣与资讯已刷新', 'success');
      } catch (e) {
        showToast('刷新失败，已使用本地缓存', 'warning');
      } finally {
        refreshBtn.disabled = false;
      }
    });
  }
}

function getSpendingRecordType(record) {
  if (!record) return 'recharge';
  if (record.recordType === 'purchase' || record.recordType === 'recharge') return record.recordType;
  if (record.wishlistId != null && record.wishlistId !== '') return 'purchase';
  if (record.gameId != null && record.gameId !== '') return 'recharge';
  if (String(record.game || '').trim() === '账户充值') return 'recharge';
  return 'purchase';
}

function getPurchaseRecordsForWishlist(wishlistId, wishlistName) {
  try {
    var list = window.GameData.get(window.GameData.KEYS.SPENDING, []);
    return list.filter(function (record) {
      if (getSpendingRecordType(record) !== 'purchase') return false;
      if (record.wishlistId != null && String(record.wishlistId) === String(wishlistId)) return true;
      if (!record.wishlistId && wishlistName && record.game &&
          String(record.game).trim().toLowerCase() === String(wishlistName).trim().toLowerCase()) {
        return true;
      }
      return false;
    }).sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  } catch (e) {
    return [];
  }
}

function renderWishlistSpendingSummary(records) {
  if (!records || records.length === 0) return '';
  var total = records.reduce(function (sum, r) {
    return sum + (parseFloat(r.amount) || 0);
  }, 0);
  var latest = records[0];
  var html = '<div class="wishlist-spending">';
  html += '  <div class="wishlist-spending-summary">';
  html += '    <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>';
  html += '    <span>已购 ' + records.length + ' 笔 · ¥' + total.toFixed(2) + '</span>';
  html += '  </div>';
  if (latest) {
    html += '  <div class="wishlist-spending-latest">最近：¥' + (parseFloat(latest.amount) || 0).toFixed(2);
    if (latest.date) html += ' · ' + escapeHtml(formatDate(latest.date));
    html += '</div>';
  }
  html += '  <a href="spending.html" class="wishlist-spending-link">查看消费记录</a>';
  html += '</div>';
  return html;
}

// ---------- 工具函数 ----------

function showToast(message, type) {
  type = type || 'info';
  var toast = document.getElementById('toast');
  var toastMsg = document.getElementById('toast-message');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message;
  toast.className = 'toast ' + type + ' show';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function () {
    toast.classList.remove('show');
  }, 3000);
}

// ---------- 封面生成 ----------
function getCoverHtml(url, name) {
  return imgWithFallback(url, name, 'wishlist-cover-img');
}

// ---------- 星级渲染（卡片展示用） ----------
function renderStars(rating, maxStars) {
  maxStars = maxStars || 5;
  var html = '';
  for (var i = 1; i <= maxStars; i++) {
    if (i <= rating) {
      html += '<span class="star star-filled" style="color:#f59e0b;">&#9733;</span>';
    } else {
      html += '<span class="star star-empty" style="color:#9ca3af;">&#9734;</span>';
    }
  }
  return html;
}

// ---------- 优先级标签（使用 high/medium/low） ----------
function getPriorityLabel(p) {
  if (p === 'high') return '<span class="priority-tag priority-high">高</span>';
  if (p === 'medium') return '<span class="priority-tag priority-medium">中</span>';
  if (p === 'low') return '<span class="priority-tag priority-low">低</span>';
  return '';
}

function getPriorityClass(p) {
  if (p === 'high') return 'high';
  if (p === 'medium') return 'medium';
  if (p === 'low') return 'low';
  return 'medium';
}

// ---------- 星级评分点击函数（全局，供 HTML onclick 调用） ----------

/**
 * 设置添加表单的星级评分
 * @param {number} val - 1~5 的评分值
 */
function setRating(val) {
  // 更新隐藏 input 的值
  var ratingInput = document.getElementById('wish-rating');
  if (ratingInput) {
    ratingInput.value = val;
  }
  // 更新星星视觉状态
  var stars = document.querySelectorAll('#rating-select .rating-star');
  for (var i = 0; i < stars.length; i++) {
    var starVal = parseInt(stars[i].getAttribute('data-value'));
    if (starVal <= val) {
      stars[i].style.color = '#f59e0b';
      stars[i].style.fill = '#f59e0b';
      stars[i].classList.add('star-active');
    } else {
      stars[i].style.color = '#9ca3af';
      stars[i].style.fill = 'none';
      stars[i].classList.remove('star-active');
    }
  }
}

/**
 * 设置编辑表单的星级评分
 * @param {number} val - 1~5 的评分值
 */
function setEditRating(val) {
  // 更新隐藏 input 的值
  var ratingInput = document.getElementById('edit-wish-rating');
  if (ratingInput) {
    ratingInput.value = val;
  }
  // 更新星星视觉状态
  var stars = document.querySelectorAll('#edit-rating-select .edit-rating-star');
  for (var i = 0; i < stars.length; i++) {
    var starVal = parseInt(stars[i].getAttribute('data-value'));
    if (starVal <= val) {
      stars[i].style.color = '#f59e0b';
      stars[i].style.fill = '#f59e0b';
      stars[i].classList.add('star-active');
    } else {
      stars[i].style.color = '#9ca3af';
      stars[i].style.fill = 'none';
      stars[i].classList.remove('star-active');
    }
  }
}

/**
 * 重置添加表单的星级视觉状态（所有星星置灰）
 */
function resetAddRatingStars() {
  var stars = document.querySelectorAll('#rating-select .rating-star');
  for (var i = 0; i < stars.length; i++) {
    stars[i].style.color = '#9ca3af';
    stars[i].style.fill = 'none';
    stars[i].classList.remove('star-active');
  }
  var ratingInput = document.getElementById('wish-rating');
  if (ratingInput) {
    ratingInput.value = '0';
  }
}

/**
 * 重置编辑表单的星级视觉状态（所有星星置灰）
 */
function resetEditRatingStars() {
  var stars = document.querySelectorAll('#edit-rating-select .edit-rating-star');
  for (var i = 0; i < stars.length; i++) {
    stars[i].style.color = '#9ca3af';
    stars[i].style.fill = 'none';
    stars[i].classList.remove('star-active');
  }
  var ratingInput = document.getElementById('edit-wish-rating');
  if (ratingInput) {
    ratingInput.value = '0';
  }
}

// ---------- 渲染愿望单列表 ----------
async function renderWishlist() {
  var container = document.getElementById('wishlist-items');
  if (!container) return;

  var alertCtx = await loadAlertContext();
  var list = await loadWishlistWithFallback();

  // 搜索
  var searchInput = document.getElementById('search');
  var keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';

  // 筛选（使用 HTML 中的正确 ID）
  var platformFilter = document.getElementById('platform-filter');
  var priorityFilter = document.getElementById('priority-filter');
  var sortSelect = document.getElementById('sort-by');

  if (keyword) {
    list = list.filter(function (item) {
      return (item.name && item.name.toLowerCase().indexOf(keyword) !== -1) ||
             (item.notes && item.notes.toLowerCase().indexOf(keyword) !== -1);
    });
  }

  if (platformFilter && platformFilter.value && platformFilter.value !== 'all') {
    list = list.filter(function (item) {
      return item.platform === platformFilter.value;
    });
  }

  if (priorityFilter && priorityFilter.value && priorityFilter.value !== 'all') {
    list = list.filter(function (item) {
      return item.priority === priorityFilter.value;
    });
  }

  // 排序
  if (sortSelect && sortSelect.value) {
    var sortVal = sortSelect.value;
    list.sort(function (a, b) {
      switch (sortVal) {
        case 'date-desc':
          return new Date(b.date || 0) - new Date(a.date || 0);
        case 'date-asc':
          return new Date(a.date || 0) - new Date(b.date || 0);
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'rating-asc':
          return (a.rating || 0) - (b.rating || 0);
        case 'price-asc':
          return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
        case 'price-desc':
          return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
        default:
          return 0;
      }
    });
  }

  // 空状态处理
  var emptyState = document.getElementById('empty-state');
  if (list.length === 0) {
    container.innerHTML = '';
    if (emptyState) { emptyState.classList.remove('hidden'); }
    return;
  }

  if (emptyState) { emptyState.classList.add('hidden'); }

  var html = '';
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var pClass = getPriorityClass(item.priority);
    html += '<div class="wishlist-card wishlist-priority-' + pClass + '" data-id="' + item.id + '">';
    html += '  <div class="wishlist-cover">' + getCoverHtml(item.cover, item.name) + '</div>';
    html += '  <div class="wishlist-info">';
    html += '    <div class="wishlist-info-header">';
    html += '      <h3 class="wishlist-name">' + escapeHtml(item.name) + '</h3>';
    html += '      <div class="wishlist-actions">';
    if (!item._fromSupabase) {
      html += '        <button class="btn-edit-wishlist" data-id="' + item.id + '" title="编辑"><i data-lucide="pencil"></i></button>';
      html += '        <button class="btn-delete-wishlist" data-id="' + item.id + '" title="删除"><i data-lucide="trash-2"></i></button>';
    } else {
      html += '        <span class="text-xs text-blue-500 px-2 py-1 rounded bg-blue-50">云端目录</span>';
    }
    html += '      </div>';
    html += '    </div>';
    html += '    <div class="wishlist-meta">';
    if (item.platform) {
      html += '      <span class="wishlist-platform">' + escapeHtml(item.platform) + '</span>';
    }
    html += '      <span class="wishlist-stars">' + renderStars(item.rating || 0) + '</span>';
    if (item.priority) {
      html += '      <span class="wishlist-priority-tag">' + getPriorityLabel(item.priority) + '</span>';
    }
    if (item.price !== undefined && item.price !== null && item.price !== '') {
      html += '      <span class="wishlist-price">&yen;' + escapeHtml(String(item.price)) + '</span>';
    }
    html += '    </div>';
    if (item.notes) {
      html += '    <p class="wishlist-notes">' + escapeHtml(item.notes) + '</p>';
    }
    html += renderTargetPriceBlock(item, alertCtx);
    var purchaseRecords = getPurchaseRecordsForWishlist(item.id, item.name);
    if (purchaseRecords.length > 0) {
      html += renderWishlistSpendingSummary(purchaseRecords);
    }
    html += '    <div class="wishlist-date">' + formatDate(item.date) + '</div>';
    html += '  </div>';
    html += '</div>';
  }

  container.innerHTML = html;
  if (window.lucide) { lucide.createIcons(); }
  bindTargetPriceSaveHandlers(container);
  bindLookupCloudHandlers(container);

  // 绑定编辑/删除按钮
  var editBtns = container.querySelectorAll('.btn-edit-wishlist');
  for (var j = 0; j < editBtns.length; j++) {
    editBtns[j].addEventListener('click', function () {
      openEditWishlistModal(this.getAttribute('data-id'));
    });
  }

  var deleteBtns = container.querySelectorAll('.btn-delete-wishlist');
  for (var k = 0; k < deleteBtns.length; k++) {
    deleteBtns[k].addEventListener('click', function () {
      openDeleteConfirmModal(this.getAttribute('data-id'));
    });
  }
}

// ============================================================
// Modal: 添加愿望单
// ============================================================
function openAddWishlistModal() {
  var modal = document.getElementById('add-wishlist-modal');
  if (!modal) return;
  modal.classList.add('active');
  // 清空表单
  var form = document.getElementById('add-wishlist-form');
  if (form) { form.reset(); }
  // 重置星级评分的视觉状态（lucide star icon，不是 radio button）
  resetAddRatingStars();
  // 重新初始化 lucide 图标（因为 modal display 从 none 变为 flex）
  if (window.lucide) { lucide.createIcons(); }
}

function closeAddWishlistModal() {
  var modal = document.getElementById('add-wishlist-modal');
  if (!modal) return;
  modal.classList.remove('active');
}

// ---------- 添加提交 ----------
async function handleAddWishlistSubmit(e) {
  e.preventDefault();
  var nameInput = document.querySelector('#add-wishlist-form [name="name"]');
  var name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    showToast('请输入游戏名称');
    return;
  }

  // 从隐藏 input #wish-rating 读取评分值
  var ratingInput = document.getElementById('wish-rating');
  var rating = ratingInput ? parseInt(ratingInput.value) : 0;
  if (isNaN(rating) || rating < 1) {
    showToast('请选择期望度');
    return;
  }

  // 使用 HTML 中的 name="cover"
  var coverInput = document.querySelector('#add-wishlist-form [name="cover"]');
  var platformInput = document.querySelector('#add-wishlist-form [name="platform"]');
  var priorityInput = document.querySelector('#add-wishlist-form [name="priority"]');
  var priceInput = document.querySelector('#add-wishlist-form [name="price"]');
  var notesInput = document.querySelector('#add-wishlist-form [name="notes"]');

  var newItem = {
    id: 'wl_' + Date.now(),
    name: name,
    cover: coverInput ? coverInput.value.trim() : '',
    platform: platformInput ? platformInput.value : '',
    rating: rating,
    priority: priorityInput ? priorityInput.value : 'high',
    price: priceInput ? priceInput.value.trim() : '',
    notes: notesInput ? notesInput.value.trim() : '',
    date: new Date().toISOString()
  };

  if (await isUserSignedIn()) {
    try {
      showToast('正在从 Steam 搜索并入库…', 'success');
      var lookup = await callLookupGame(name);
      if (lookup.game) {
        newItem.supabaseGameId = lookup.game.id;
        newItem.steamAppId = lookup.game.steam_app_id;
        if (!newItem.cover && lookup.game.cover_url) newItem.cover = lookup.game.cover_url;
        if (lookup.candidates && lookup.candidates.length > 1) {
          newItem.notes = (newItem.notes ? newItem.notes + ' · ' : '') +
            '已匹配：' + lookup.game.name;
        }
      }
    } catch (lookupErr) {
      showToast((lookupErr.message || '云端入库失败') + '，已仅保存本地', 'warning');
    }
  }

  var list = getWishlist();
  list.push(newItem);
  saveWishlist(list);
  var rules = getDealWatchRules();
  if (!rules.targetPriceByWishlistId) rules.targetPriceByWishlistId = {};
  if (newItem.price !== '') rules.targetPriceByWishlistId[newItem.id] = parseFloat(newItem.price) || 0;
  saveDealWatchRules(rules);
  closeAddWishlistModal();
  await renderWishlist();
  if (newItem.supabaseGameId) {
    showToast('愿望单已添加并已同步云端', 'success');
  } else {
    showToast('愿望单已添加', 'success');
  }
}

// ============================================================
// Modal: 编辑愿望单
// ============================================================
function openEditWishlistModal(id) {
  var modal = document.getElementById('edit-wishlist-modal');
  if (!modal) return;

  var list = getWishlist();
  var item = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { item = list[i]; break; }
  }
  if (!item) return;

  modal.classList.add('active');

  // 填充表单字段
  var nameInput = document.getElementById('edit-wish-name');
  var coverInput = document.getElementById('edit-wish-cover');
  var platformInput = document.getElementById('edit-wish-platform');
  var priorityInput = document.querySelector('#edit-wishlist-form [name="edit-priority"]');
  var priceInput = document.getElementById('edit-wish-price');
  var notesInput = document.getElementById('edit-wish-notes');

  if (nameInput) nameInput.value = item.name || '';
  if (coverInput) coverInput.value = item.cover || '';
  if (platformInput) platformInput.value = item.platform || '';
  if (priorityInput) priorityInput.value = item.priority || 'high';
  if (priceInput) priceInput.value = item.price || '';
  if (notesInput) notesInput.value = item.notes || '';

  // 设置星级评分的视觉状态
  var rating = item.rating || 0;
  if (rating < 1) rating = 0;
  setEditRating(rating);

  // 存储当前编辑 ID
  modal.setAttribute('data-edit-id', id);

  // 重新初始化 lucide 图标
  if (window.lucide) { lucide.createIcons(); }
}

function closeEditWishlistModal() {
  var modal = document.getElementById('edit-wishlist-modal');
  if (!modal) return;
  modal.classList.remove('active');
}

function handleEditWishlistSubmit(e) {
  e.preventDefault();
  var modal = document.getElementById('edit-wishlist-modal');
  var id = modal ? modal.getAttribute('data-edit-id') : '';
  if (!id) return;

  var nameInput = document.querySelector('#edit-wishlist-form [name="name"]');
  var name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    showToast('请输入游戏名称');
    return;
  }

  // 从隐藏 input #edit-wish-rating 读取评分值
  var ratingInput = document.getElementById('edit-wish-rating');
  var rating = ratingInput ? parseInt(ratingInput.value) : 0;
  if (isNaN(rating) || rating < 1) {
    showToast('请选择期望度');
    return;
  }

  // 使用 HTML 中的 name="cover"
  var coverInput = document.getElementById('edit-wish-cover');
  var platformInput = document.getElementById('edit-wish-platform');
  var priorityInput = document.querySelector('#edit-wishlist-form [name="edit-priority"]');
  var priceInput = document.getElementById('edit-wish-price');
  var notesInput = document.getElementById('edit-wish-notes');

  var list = getWishlist();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      list[i].name = name;
      list[i].cover = coverInput ? coverInput.value.trim() : '';
      list[i].platform = platformInput ? platformInput.value : '';
      list[i].rating = rating;
      list[i].priority = priorityInput ? priorityInput.value : 'high';
      list[i].price = priceInput ? priceInput.value.trim() : '';
      list[i].notes = notesInput ? notesInput.value.trim() : '';
      var rules = getDealWatchRules();
      if (!rules.targetPriceByWishlistId) rules.targetPriceByWishlistId = {};
      rules.targetPriceByWishlistId[id] = parseFloat(list[i].price) || 0;
      saveDealWatchRules(rules);
      break;
    }
  }

  saveWishlist(list);
  closeEditWishlistModal();
  renderWishlist();
  showToast('愿望单已更新');
}

// ============================================================
// Modal: 删除确认
// ============================================================
function openDeleteConfirmModal(id) {
  var modal = document.getElementById('delete-modal');
  if (!modal) return;
  modal.classList.add('active');
  modal.setAttribute('data-delete-id', id);
}

function closeDeleteModal() {
  var modal = document.getElementById('delete-modal');
  if (!modal) return;
  modal.classList.remove('active');
}

function handleDeleteConfirm() {
  var modal = document.getElementById('delete-modal');
  var id = modal ? modal.getAttribute('data-delete-id') : '';
  if (!id) return;

  var list = getWishlist();
  var newList = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id !== id) {
      newList.push(list[i]);
    }
  }
  saveWishlist(newList);
  var rules = getDealWatchRules();
  if (rules.targetPriceByWishlistId && rules.targetPriceByWishlistId[id] != null) {
    delete rules.targetPriceByWishlistId[id];
    saveDealWatchRules(rules);
  }
  closeDeleteModal();
  renderWishlist();
  showToast('愿望单已删除');
}

// ============================================================
// 事件绑定 & 初始化
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
  await window.awaitGameCloud();
  // 初始渲染
  await renderWishlist();
  await renderAlertsPanel();
  bindDealRulesPanel();

  var dismissAllBtn = document.getElementById('alerts-dismiss-all-btn');
  if (dismissAllBtn && !dismissAllBtn._bound) {
    dismissAllBtn._bound = true;
    dismissAllBtn.addEventListener('click', async function () {
      var raw = await fetchInAppAlertEvents();
      var visible = dedupeAlertEventsByGame(raw).filter(function (ev) {
        return !isAlertEventDismissed(ev.id);
      });
      dismissAllVisibleAlertEvents(visible);
      await renderAlertsPanel();
      showToast('已清除全部未读提醒', 'success');
    });
  }

  // 添加按钮
  var addBtn = document.getElementById('add-wishlist-btn');
  if (addBtn) {
    addBtn.addEventListener('click', openAddWishlistModal);
  }

  // 搜索
  var searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', renderWishlist);
  }

  // 筛选 & 排序（使用 HTML 中的正确 ID）
  var platformFilter = document.getElementById('platform-filter');
  var priorityFilter = document.getElementById('priority-filter');
  var sortSelect = document.getElementById('sort-by');
  if (platformFilter) { platformFilter.addEventListener('change', renderWishlist); }
  if (priorityFilter) { priorityFilter.addEventListener('change', renderWishlist); }
  if (sortSelect) { sortSelect.addEventListener('change', renderWishlist); }

  // 添加表单提交
  var addForm = document.getElementById('add-wishlist-form');
  if (addForm) {
    addForm.addEventListener('submit', handleAddWishlistSubmit);
  }

  // 编辑表单提交
  var editForm = document.getElementById('edit-wishlist-form');
  if (editForm) {
    editForm.addEventListener('submit', handleEditWishlistSubmit);
  }

  // 删除确认按钮
  var confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleDeleteConfirm);
  }

  // Modal 关闭按钮
  var closeButtons = document.querySelectorAll('.modal-close');
  for (var i = 0; i < closeButtons.length; i++) {
    closeButtons[i].addEventListener('click', function () {
      var modal = this.closest('.modal');
      if (modal) { modal.style.display = 'none'; }
    });
  }

  // 点击遮罩层关闭
  var modals = document.querySelectorAll('.modal');
  for (var j = 0; j < modals.length; j++) {
    modals[j].addEventListener('click', function (e) {
      if (e.target === this) { this.style.display = 'none'; }
    });
  }

});
