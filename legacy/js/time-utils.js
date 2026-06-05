/**
 * time-utils.js 鈥?缁熶竴鏃堕棿绾︽潫宸ュ叿
 * 鎵€鏈夐〉闈㈢殑鏃ユ湡瑙ｆ瀽銆佹牸寮忓寲銆佸勾浠界瓫閫夈€佹湀搴﹀垎缁勭粺涓€璧拌繖閲? * 閬垮厤鏃跺尯闄烽槺锛氫竴寰嬬敤鏈湴鏃堕棿鏋勯€狅紝涓嶅仛 UTC 鍋忕Щ
 */
(function (root) {
    'use strict';

    // ==================== 瀹夊叏鏃ユ湡瑙ｆ瀽 ====================
    // 瑙勯伩 new Date("2024-06-10") 鐨?UTC 鏃跺尯闄烽槺
    // 缁熶竴鎷嗗垎涓?[year, month, day] 鍚庣敤鏈湴鏃堕棿鏋勯€?    function parseDate(val) {
        if (!val) return null;
        if (val instanceof Date && !isNaN(val.getTime())) return val;
        if (typeof val !== 'string') return null;
        // 鏀寔 "2024-06-10" 鍜?"2024-06-10T12:00:00" 涓ょ鏍煎紡
        var m = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
        // 鍏滃簳
        var d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }

    // ==================== 骞翠唤/鏈堜唤鎻愬彇 ====================
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

    // ==================== 鏍煎紡鍖?====================
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
        return d.getFullYear() + '骞? +
            (d.getMonth() + 1) + '鏈? +
            d.getDate() + '鏃?;
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

    // ==================== 骞翠唤绛涢€?====================
    function filterByYear(items, year, dateKey) {
        if (!year || year === 'all') return items.slice();
        return items.filter(function (item) {
            var val = item[dateKey || 'date'];
            if (!val) return false;
            return getYear(val) === parseInt(year);
        });
    }

    // ==================== 鏃ユ湡鑼冨洿绛涢€?====================
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

    // ==================== 鏈堜唤鍒嗙粍锛堢敤浜庡浘琛級 ====================
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

    // ==================== 鏈堝害鏍囩鏁扮粍 ====================
    function getMonthLabels(year) {
        var y = year || new Date().getFullYear();
        var labels = [];
        for (var m = 1; m <= 12; m++) {
            labels.push(y + '-' + String(m).padStart(2, '0'));
        }
        return labels;
    }

    function getMonthNames() {
        return ['1鏈?,'2鏈?,'3鏈?,'4鏈?,'5鏈?,'6鏈?,'7鏈?,'8鏈?,'9鏈?,'10鏈?,'11鏈?,'12鏈?];
    }

    // ==================== 鍙敤骞翠唤鍒楄〃 ====================
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

    // ==================== 瀵规瘮 ====================
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

    // ==================== 浠婂ぉ ====================
    function todayISO() {
        var d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    // ==================== 鏆撮湶 ====================
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
