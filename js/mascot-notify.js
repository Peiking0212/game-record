/**
 * mascot-notify.js — 看板娘价格/提醒文案（依赖 theme.js 的 MascotBridge）
 */
(function () {
  'use strict';

  var LAST_ALERT_KEY = 'mascot_last_alert_event_id';

  function formatPriceAlertMessage(gameName, triggerPrice, targetPrice) {
    var name = gameName || '这款游戏';
    var price = Number(triggerPrice);
    var target = Number(targetPrice);
    var priceText = Number.isFinite(price) ? price.toFixed(price % 1 === 0 ? 0 : 2) : String(triggerPrice);
    if (Number.isFinite(target) && target > 0) {
      return name + '降到 ' + priceText + ' 元啦，低于你的目标价 ' + target.toFixed(target % 1 === 0 ? 0 : 2) + ' 元！';
    }
    return name + '降到 ' + priceText + ' 元啦，快去看看愿望单~';
  }

  function speak(text) {
    if (window.MascotBridge && typeof window.MascotBridge.speak === 'function') {
      return window.MascotBridge.speak(text);
    }
    return false;
  }

  function notifyPriceHit(opts) {
    if (!opts) return false;
    var msg = formatPriceAlertMessage(opts.gameName, opts.triggerPrice, opts.targetPrice);
    return speak(msg);
  }

  function notifyLatestUnreadEvent(eventRow) {
    if (!eventRow || eventRow.id == null) return false;
    var lastId = parseInt(localStorage.getItem(LAST_ALERT_KEY) || '0', 10);
    if (eventRow.id <= lastId) return false;

    var gameName = '';
    var targetPrice = null;
    if (eventRow.alerts) {
      targetPrice = eventRow.alerts.target_price;
      if (eventRow.alerts.games && eventRow.alerts.games.name) {
        gameName = eventRow.alerts.games.name;
      }
    }
    var ok = notifyPriceHit({
      gameName: gameName,
      triggerPrice: eventRow.trigger_price,
      targetPrice: targetPrice
    });
    if (ok) {
      try {
        localStorage.setItem(LAST_ALERT_KEY, String(eventRow.id));
      } catch (e) { /* ignore */ }
    }
    return ok;
  }

  window.MascotNotify = {
    formatPriceAlertMessage: formatPriceAlertMessage,
    speak: speak,
    notifyPriceHit: notifyPriceHit,
    notifyLatestUnreadEvent: notifyLatestUnreadEvent
  };
})();
