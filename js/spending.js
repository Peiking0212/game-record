/**
 * spending.js — 消费统计业务逻辑
 * localStorage key: game_record_spending
 * 数据结构: { id, game, amount, date, platform, note }
 * 时间约束统一由 TimeUtils 处理
 */
(function () {
    'use strict';

    var TU = window.TimeUtils || {
        parseDate: function(val) {
            if (!val) return null;
            if (val instanceof Date && !isNaN(val.getTime())) return val;
            if (typeof val !== 'string') return null;
            var m = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
            var d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        },
        filterByYear: function(items, year, dateKey) {
            dateKey = dateKey || 'date';
            return items.filter(function(item) {
                var d = TU.parseDate(item[dateKey]);
                return d && d.getFullYear() === year;
            });
        },
        groupByMonthSum: function(items, year, dateKey, amountKey) {
            dateKey = dateKey || 'date';
            amountKey = amountKey || 'amount';
            var result = {};
            for (var i = 1; i <= 12; i++) result[i] = 0;
            items.forEach(function(item) {
                var d = TU.parseDate(item[dateKey]);
                if (d && d.getFullYear() === year) {
                    var m = d.getMonth() + 1;
                    result[m] += parseFloat(item[amountKey]) || 0;
                }
            });
            return result;
        }
    };
    var SPENDING_KEY = 'game_record_spending';
    var editingId = null;
    var charts = {};

    // ==================== 数据读写 ====================
    function getSpending() {
        try { return JSON.parse(localStorage.getItem(SPENDING_KEY) || '[]'); }
        catch (e) { return []; }
    }
    function saveSpending(data) {
        localStorage.setItem(SPENDING_KEY, JSON.stringify(data));
    }

    // ==================== 工具 ====================
    function fmt(v) { return TU.format(v); }
    function fmtMoney(v) {
        v = parseFloat(v);
        return isNaN(v) ? '¥0.00' : '¥' + v.toFixed(2);
    }
    function esc(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.textContent = String(str);
        return d.innerHTML;
    }
    function showToast(msg) {
        var t = document.getElementById('toast');
        var m = document.getElementById('toast-message');
        if (!t || !m) return;
        m.textContent = msg;
        t.classList.add('show');
        setTimeout(function () { t.classList.remove('show'); }, 3000);
    }

    // ==================== 表格 ====================
    function renderTable(year) {
        var tbody = document.getElementById('spending-table-body');
        var empty = document.getElementById('spending-empty');
        var table = tbody && tbody.closest('table');
        if (!tbody) return;

        var records = TU.filterByYear(getSpending(), year, 'date');
        records.sort(function (a, b) {
            var da = TU.parse(a.date), db = TU.parse(b.date);
            return (db || 0) - (da || 0);
        });

        if (records.length === 0) {
            tbody.innerHTML = '';
            if (empty) empty.classList.remove('hidden');
            if (table) table.style.display = 'none';
            return;
        }
        if (empty) empty.classList.add('hidden');
        if (table) table.style.display = '';

        tbody.innerHTML = records.map(function (r) {
            var pc = getPlatformClass(r.platform);
            return '<tr>' +
                '<td><span class="font-medium text-gray-800">' + esc(r.game) + '</span></td>' +
                '<td><span class="spending-amount">' + fmtMoney(r.amount) + '</span></td>' +
                '<td>' + fmt(r.date) + '</td>' +
                '<td><span class="spending-platform-badge ' + pc + '">' + esc(r.platform || '-') + '</span></td>' +
                '<td><span class="text-gray-600 text-sm">' + esc(r.note || '-') + '</span></td>' +
                '<td>' +
                    '<button class="spending-action-btn edit-btn" data-id="' + r.id + '" title="编辑">' +
                        '<i data-lucide="pencil" class="w-4 h-4"></i>' +
                    '</button>' +
                    '<button class="spending-action-btn delete-btn" data-id="' + r.id + '" title="删除">' +
                        '<i data-lucide="trash-2" class="w-4 h-4"></i>' +
                    '</button>' +
                '</td>' +
            '</tr>';
        }).join('');

        tbody.querySelectorAll('.edit-btn').forEach(function (b) {
            b.addEventListener('click', function () {
                var item = getSpending().find(function (r) { return r.id === this.dataset.id; });
                if (item) openModal(item);
            });
        });
        tbody.querySelectorAll('.delete-btn').forEach(function (b) {
            b.addEventListener('click', function () { deleteSpending(this.dataset.id); });
        });
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }

    function getPlatformClass(p) {
        var m = { 'Steam':'platform-steam','PS Store':'platform-ps','Nintendo eShop':'platform-nintendo',
            'Xbox':'platform-xbox','Epic':'platform-epic','手机':'platform-mobile' };
        return m[p] || 'platform-other';
    }

    // ==================== 统计 ====================
    function updateStats(year) {
        var records = TU.filterByYear(getSpending(), year, 'date');
        var total = records.reduce(function (s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
        var count = records.length;
        var avg = count > 0 ? total / count : 0;

        var monthlyAvg = 0;
        if (records.length > 0) {
            if (year && year !== 'all') {
                monthlyAvg = total / 12;
            } else {
                var dates = records.map(function (r) { return TU.parse(r.date); }).filter(Boolean);
                if (dates.length > 0) {
                    var minD = new Date(Math.min.apply(null, dates));
                    var maxD = new Date(Math.max.apply(null, dates));
                    var span = (maxD.getFullYear() - minD.getFullYear()) * 12 + (maxD.getMonth() - minD.getMonth()) + 1;
                    monthlyAvg = total / Math.max(1, span);
                }
            }
        }

        document.getElementById('stat-total').textContent = fmtMoney(total);
        document.getElementById('stat-games').textContent = count;
        document.getElementById('stat-avg').textContent = fmtMoney(avg);
        document.getElementById('stat-monthly').textContent = fmtMoney(monthlyAvg);
    }

    // ==================== 图表 ====================
    function updateCharts(year) {
        var records = TU.filterByYear(getSpending(), year, 'date');
        updateMonthlyChart(records, year);
        updatePlatformChart(records);
    }

    function updateMonthlyChart(records, year) {
        var canvas = document.getElementById('monthly-spending-chart');
        if (!canvas) return;
        if (charts.monthly) { charts.monthly.destroy(); charts.monthly = null; }

        var months, amounts;
        if (year && year !== 'all') {
            months = TU.getMonthNames();
            amounts = new Array(12).fill(0);
            records.forEach(function (r) {
                var m = TU.getMonth(r.date);
                if (m >= 1 && m <= 12) amounts[m - 1] += parseFloat(r.amount) || 0;
            });
            amounts = amounts.map(function (v) { return Math.round(v * 100) / 100; });
        } else {
            var map = TU.groupByMonthSum(records, 'date', 'amount');
            var keys = Object.keys(map).sort();
            months = keys.map(function (k) { return k.split('-')[1] + '月'; });
            amounts = keys.map(function (k) { return Math.round(map[k] * 100) / 100; });
        }

        var dark = document.documentElement.classList.contains('dark');
        var tc = dark ? '#94a3b8' : '#64748b';
        var gc = dark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)';

        charts.monthly = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: '月消费 (¥)',
                    data: amounts,
                    borderColor: '#52B6FF',
                    backgroundColor: 'rgba(82,182,255,0.1)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#52B6FF',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: true, aspectRatio: 2,
                plugins: {
                    legend: { display: true, position: 'top', labels: { color: tc, usePointStyle: true, padding: 20 } },
                    tooltip: { callbacks: { label: function (c) { return '¥' + c.parsed.y.toFixed(2); } } }
                },
                scales: {
                    x: { grid: { color: gc }, ticks: { color: tc, maxRotation: 45 } },
                    y: { grid: { color: gc }, ticks: { color: tc, callback: function (v) { return '¥' + v; } }, beginAtZero: true }
                }
            }
        });
    }

    function updatePlatformChart(records) {
        var canvas = document.getElementById('platform-pie-chart');
        if (!canvas) return;
        if (charts.platform) { charts.platform.destroy(); charts.platform = null; }

        var map = {};
        records.forEach(function (r) {
            var p = r.platform || '其他';
            map[p] = (map[p] || 0) + (parseFloat(r.amount) || 0);
        });
        var labels = Object.keys(map);
        var data = labels.map(function (k) { return Math.round(map[k] * 100) / 100; });
        var colors = ['#52B6FF','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];

        if (labels.length === 0) { labels = ['暂无数据']; data = [1]; }

        var dark = document.documentElement.classList.contains('dark');
        var tc = dark ? '#94a3b8' : '#64748b';

        charts.platform = new Chart(canvas.getContext('2d'), {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{ data: data, backgroundColor: colors.slice(0, labels.length), borderColor: dark ? '#1e293b' : '#fff', borderWidth: 2 }]
            },
            options: {
                responsive: true, maintainAspectRatio: true, aspectRatio: 2,
                plugins: {
                    legend: { position: 'bottom', labels: { color: tc, usePointStyle: true, padding: 16, font: { size: 12 } } },
                    tooltip: { callbacks: { label: function (c) {
                        var t = c.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                        var pct = t > 0 ? Math.round(c.parsed / t * 100) : 0;
                        return c.label + ': ¥' + c.parsed.toFixed(2) + ' (' + pct + '%)';
                    }}}
                }
            }
        });
    }

    // ==================== Modal ====================
    function openModal(editItem) {
        var modal = document.getElementById('spending-modal');
        if (!modal) return;
        if (editItem) {
            editingId = editItem.id;
            document.getElementById('spending-modal-title').textContent = '编辑消费记录';
            document.getElementById('spending-submit-text').textContent = '保存更改';
            document.getElementById('spending-id').value = editItem.id;
            document.getElementById('spending-game').value = editItem.game || '';
            document.getElementById('spending-amount').value = editItem.amount || '';
            document.getElementById('spending-date').value = editItem.date || '';
            document.getElementById('spending-platform').value = editItem.platform || 'Steam';
            document.getElementById('spending-note').value = editItem.note || '';
        } else {
            editingId = null;
            document.getElementById('spending-modal-title').textContent = '添加消费记录';
            document.getElementById('spending-submit-text').textContent = '添加记录';
            document.getElementById('spending-id').value = '';
            document.getElementById('spending-game').value = '';
            document.getElementById('spending-amount').value = '';
            document.getElementById('spending-date').value = TU.todayISO();
            document.getElementById('spending-platform').value = 'Steam';
            document.getElementById('spending-note').value = '';
        }
        modal.classList.add('active');
    }

    function closeModal() {
        var m = document.getElementById('spending-modal');
        if (m) m.classList.remove('active');
        editingId = null;
    }

    function handleSubmit() {
        var game = document.getElementById('spending-game').value.trim();
        var amount = parseFloat(document.getElementById('spending-amount').value);
        var date = document.getElementById('spending-date').value;
        var platform = document.getElementById('spending-platform').value;
        var note = document.getElementById('spending-note').value.trim();

        if (!game) { showToast('请输入游戏名称'); return; }
        if (isNaN(amount) || amount < 0) { showToast('请输入有效金额'); return; }
        if (!date) { showToast('请选择购买日期'); return; }

        var records = getSpending();
        if (editingId) {
            var idx = records.findIndex(function (r) { return r.id === editingId; });
            if (idx !== -1) {
                records[idx].game = game; records[idx].amount = amount;
                records[idx].date = date; records[idx].platform = platform;
                records[idx].note = note;
            }
        } else {
            records.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
                game: game, amount: amount, date: date, platform: platform, note: note
            });
        }
        saveSpending(records);
        showToast(editingId ? '消费记录已更新' : '消费记录已添加');
        closeModal();
        refreshAll();
    }

    function deleteSpending(id) {
        if (!confirm('确定要删除这条消费记录吗？')) return;
        saveSpending(getSpending().filter(function (r) { return r.id !== id; }));
        showToast('消费记录已删除');
        refreshAll();
    }

    // ==================== 年份筛选 ====================
    function initYearFilter() {
        var select = document.getElementById('filter-year');
        if (!select) return;
        var years = TU.collectYears([{ items: getSpending(), dateKey: 'date' }]);
        select.innerHTML = '<option value="all">全部年份</option>';
        years.forEach(function (y) {
            var o = document.createElement('option');
            o.value = y; o.textContent = y + ' 年';
            select.appendChild(o);
        });
    }

    function getCurrentYear() {
        var s = document.getElementById('filter-year');
        return s ? s.value : 'all';
    }

    function refreshAll() {
        var y = getCurrentYear();
        renderTable(y); updateStats(y); updateCharts(y);
        initYearFilter();
        var s = document.getElementById('filter-year');
        if (s && s.value !== y) s.value = y;
    }

    // ==================== 事件 ====================
    function bindEvents() {
        var addBtn = document.getElementById('add-spending-btn');
        if (addBtn) addBtn.addEventListener('click', function () { openModal(null); });

        var form = document.getElementById('spending-form');
        if (form) form.addEventListener('submit', function (e) { e.preventDefault(); handleSubmit(); });

        var fy = document.getElementById('filter-year');
        if (fy) fy.addEventListener('change', function () {
            var y = this.value;
            renderTable(y); updateStats(y); updateCharts(y);
        });

        document.addEventListener('click', function (e) {
            var modal = document.getElementById('spending-modal');
            if (!modal) return;
            if (e.target.closest('.modal-close')) closeModal();
            else if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var modal = document.getElementById('spending-modal');
                if (modal && modal.classList.contains('active')) closeModal();
            }
        });

        var mt = document.getElementById('mobile-menu-toggle');
        var mm = document.getElementById('mobile-menu');
        if (mt && mm) mt.addEventListener('click', function () { mm.classList.toggle('hidden'); });
    }

    async function init() {
        await window.awaitGameCloud();
        bindEvents(); initYearFilter();
        renderTable('all'); updateStats('all'); updateCharts('all');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
