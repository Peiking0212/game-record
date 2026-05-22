/**
 * sample-data-utils.js — 示例数据日期工具
 * 所有 sample / mock 数据中不再硬编码年份，统一用"今天"为锚点动态偏移
 * 须在 games / achievements / stats / profile 等业务脚本之前加载
 */
(function (root) {
    'use strict';

    // 生成 YYYY-MM-DD 字符串，距今天 n 天前
    function daysAgo(n) {
        var d = new Date();
        d.setDate(d.getDate() - parseInt(n));
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    // 生成"N 天前开始"的日期
    function startDaysAgo(n) {
        return daysAgo(n);
    }

    // 生成"年初"日期（当年 1 月某日）
    function earlyThisYear(day) {
        return new Date().getFullYear() + '-01-' + String(day || 15).padStart(2, '0');
    }

    // 生成"去年某月"的日期
    function lastYearMonth(month, day) {
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
