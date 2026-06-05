/**
 * sample-data-utils.js 鈥?绀轰緥鏁版嵁鏃ユ湡宸ュ叿
 * 鎵€鏈?sample / mock 鏁版嵁涓笉鍐嶇‖缂栫爜骞翠唤锛岀粺涓€鐢?浠婂ぉ"涓洪敋鐐瑰姩鎬佸亸绉? * 椤诲湪 games / achievements / stats / profile 绛変笟鍔¤剼鏈箣鍓嶅姞杞? */
(function (root) {
    'use strict';

    // 鐢熸垚 YYYY-MM-DD 瀛楃涓诧紝璺濅粖澶?n 澶╁墠
    function daysAgo(n) {
        var d = new Date();
        d.setDate(d.getDate() - parseInt(n));
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    // 鐢熸垚"N 澶╁墠寮€濮?鐨勬棩鏈?    function startDaysAgo(n) {
        return daysAgo(n);
    }

    // 鐢熸垚"骞村垵"鏃ユ湡锛堝綋骞?1 鏈堟煇鏃ワ級
    function earlyThisYear(day) {
        return new Date().getFullYear() + '-01-' + String(day || 15).padStart(2, '0');
    }

    // 鐢熸垚"鍘诲勾鏌愭湀"鐨勬棩鏈?    function lastYearMonth(month, day) {
        return (new Date().getFullYear() - 1) + '-' +
            String(month || 6).padStart(2, '0') + '-' +
            String(day || 15).padStart(2, '0');
    }

    root.SampleDate = {
        daysAgo: daysAgo,
        startDaysAgo: startDaysAgo,
        earlyThisYear: earlyThisYear,
        lastYearMonth: lastYearMonth,
        now: daysAgo(0),
    };
})(window);
