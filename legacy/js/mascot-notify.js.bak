/**
 * mascot-notify.js 鈥?鐪嬫澘濞樹环鏍?鎻愰啋鏂囨锛堜緷璧?theme.js 鐨?MascotBridge锛? */
(function () {
  'use strict';

  var LAST_ALERT_KEY = 'mascot_last_alert_event_id';

  function formatPriceAlertMessage(gameName, triggerPrice, targetPrice) {
    var name = gameName || '杩欐娓告垙';
    var price = Number(triggerPrice);
    var target = Number(targetPrice);
    var priceText = Number.isFinite(price) ? price.toFixed(price % 1 === 0 ? 0 : 2) : String(triggerPrice);
    if (Number.isFinite(target) && target > 0) {
      return name + '闄嶅埌 ' + priceText + ' 鍏冨暒锛屼綆浜庝綘鐨勭洰鏍囦环 ' + target.toFixed(target % 1 === 0 ? 0 : 2) + ' 鍏冿紒';
    }
    return name + '闄嶅埌 ' + priceText + ' 鍏冨暒锛屽揩鍘荤湅鐪嬫効鏈涘崟~';
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

    var gameName = eventRow._displayName || '';
    var targetPrice = null;
    if (eventRow.alerts) {
      targetPrice = eventRow.alerts.target_price;
      if (!gameName && eventRow.alerts.games && eventRow.alerts.games.name) {
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
