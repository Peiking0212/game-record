/**
 * time-utils.js — 统一时间约束工具
 * 所有页面的日期解析、格式化、年份筛选、月度分组统一走这里
 * 避免时区陷阱：一律用本地时间构造，不做 UTC 偏移
 */
(function (root) {
    'use strict';

    // ==================== 安全日期解析 ====================
    // 规避 new Date("2024-06-10") 的 UTC 时区陷阱
    // 统一拆分为 [year, month, day] 后用本地时间构造
    function parseDate(val) {
        if (!val) return null;
        if (val instanceof Date && !isNaN(val.getTime())) return val;
        if (typeof val !== 'string') return null;
        // 支持 "2024-06-10" 和 "2024-06-10T12:00:00" 两种格式
        var m = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
        // 兜底
        var d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }

    // ==================== 年份/月份提取 ====================
    function getYear(val) {
        var d = parseDate(val);
        return d ? d.getFullYear() : null;
    }
    function getMonth(val) {
        var d = parseDate(val);
        return d ? d.getMonth() + 1 : null;  // 1-12
    }
    function getDay(val) {
        var d = parseDate(val);
        return d ? d.getDate() : null;
    }

    // ==================== 格式化 ====================
    function format(val) {
        var d = parseDate(val);
        if (!d) return '';
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function formatCN(val) {
        var d = parseDate(val);
        if (!d) return '-';
        return d.getFullYear() + '年' +
            (d.getMonth() + 1) + '月' +
            d.getDate() + '日';
    }

    function formatMonth(val) {
        var d = parseDate(val);
        if (!d) return '';
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0');
    }

    function formatShort(val) {
        var d = parseDate(val);
        if (!d) return '-';
        return (d.getMonth() + 1) + '/' + d.getDate();
    }

    // ==================== 年份筛选 ====================
    function filterByYear(items, year, dateKey) {
        if (!year || year === 'all') return items.slice();
        return items.filter(function (item) {
            var val = item[dateKey || 'date'];
            if (!val) return false;
            return getYear(val) === parseInt(year);
        });
    }

    // ==================== 日期范围筛选 ====================
    function filterByRange(items, dateKey, startDate, endDate) {
        var start = startDate ? parseDate(startDate) : null;
        var end = endDate ? parseDate(endDate) : null;
        return items.filter(function (item) {
            var d = parseDate(item[dateKey || 'date']);
            if (!d) return false;
            if (start && d < start) return false;
            if (end) {
                // end date inclusive: set to end of day
                var endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
                if (d > endOfDay) return false;
            }
            return true;
        });
    }

    // ==================== 月份分组（用于图表） ====================
    function groupByMonth(items, dateKey) {
        var map = {};
        items.forEach(function (item) {
            var d = parseDate(item[dateKey || 'date']);
            if (!d) return;
            var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            map[k] = (map[k] || 0) + 1;
        });
        return map;
    }

    function groupByMonthSum(items, dateKey, valueKey) {
        var map = {};
        items.forEach(function (item) {
            var d = parseDate(item[dateKey || 'date']);
            if (!d) return;
            var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            map[k] = (map[k] || 0) + (parseFloat(item[valueKey || 'amount']) || 0);
        });
        return map;
    }

    // ==================== 月度标签数组 ====================
    function getMonthLabels(year) {
        var y = year || new Date().getFullYear();
        var labels = [];
        for (var m = 1; m <= 12; m++) {
            labels.push(y + '-' + String(m).padStart(2, '0'));
        }
        return labels;
    }

    function getMonthNames() {
        return ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    }

    // ==================== 可用年份列表 ====================
    function collectYears(dataSources) {
        var yearSet = {};
        for (var i = 0; i < dataSources.length; i++) {
            var items = dataSources[i].items || [];
            var key = dataSources[i].dateKey || 'date';
            for (var j = 0; j < items.length; j++) {
                var y = getYear(items[j][key]);
                if (y) yearSet[y] = true;
            }
        }
        return Object.keys(yearSet).map(Number).sort(function (a, b) { return b - a; });
    }

    // ==================== 对比 ====================
    function isSameDay(a, b) {
        var da = parseDate(a), db = parseDate(b);
        if (!da || !db) return false;
        return da.getFullYear() === db.getFullYear() &&
            da.getMonth() === db.getMonth() &&
            da.getDate() === db.getDate();
    }

    function daysBetween(a, b) {
        var da = parseDate(a), db = parseDate(b);
        if (!da || !db) return 0;
        return Math.abs(Math.round((db - da) / 86400000));
    }

    // ==================== 今天 ====================
    function todayISO() {
        var d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    // ==================== 暴露 ====================
    var TimeUtils = {
        parse: parseDate,
        getYear: getYear,
        getMonth: getMonth,
        getDay: getDay,
        format: format,
        formatCN: formatCN,
        formatMonth: formatMonth,
        formatShort: formatShort,
        filterByYear: filterByYear,
        filterByRange: filterByRange,
        groupByMonth: groupByMonth,
        groupByMonthSum: groupByMonthSum,
        getMonthLabels: getMonthLabels,
        getMonthNames: getMonthNames,
        collectYears: collectYears,
        isSameDay: isSameDay,
        daysBetween: daysBetween,
        todayISO: todayISO,
        now: new Date(),
    };

    root.TimeUtils = TimeUtils;
})(window);
