// ==================== 年度报告 ====================
var TU = window.TimeUtils;
var currentSlide = 0;
var totalSlides = 0;
var reportYearData = {};

function getGames() { return JSON.parse(localStorage.getItem('games') || '[]'); }
function getAchievements() { return JSON.parse(localStorage.getItem('achievements') || '[]'); }
function getTimeline() { return JSON.parse(localStorage.getItem('timeline') || '[]'); }
function getReviews() { return JSON.parse(localStorage.getItem('game_record_reviews') || '[]'); }
function getSpending() { return JSON.parse(localStorage.getItem('game_record_spending') || '[]'); }

// ==================== 年份选择器 ====================
function initYearSelector() {
    var select = document.getElementById('report-year');
    if (!select) return;
    var years = TU.collectYears([
        { items: getGames(), dateKey: 'lastPlayed' },
        { items: getAchievements(), dateKey: 'date' },
        { items: getTimeline(), dateKey: 'date' },
        { items: getReviews(), dateKey: 'date' },
        { items: getSpending(), dateKey: 'date' },
    ]);
    if (years.length === 0) years = [new Date().getFullYear()];
    while (select.options.length > 1) select.remove(1);
    years.forEach(function (y) {
        var o = document.createElement('option');
        o.value = y; o.textContent = y + ' 年';
        select.appendChild(o);
    });
    select.value = years[0];
}

// ==================== 生成报告 ====================
function generateReport() {
    var year = parseInt(document.getElementById('report-year').value);
    if (!year) { showToast('请先选择年份'); return; }

    var games = TU.filterByYear(getGames(), year, 'lastPlayed');
    var achievements = TU.filterByYear(getAchievements(), year, 'date');
    var timeline = TU.filterByYear(getTimeline(), year, 'date');
    var spending = TU.filterByYear(getSpending(), year, 'date');

    if (games.length === 0 && achievements.length === 0 && timeline.length === 0) {
        showToast(year + ' 年暂无游戏数据');
        return;
    }

    reportYearData = {
        year: year,
        games: games,
        achievements: achievements,
        timeline: timeline,
        spending: spending,
        totalHours: games.reduce(function (s, g) { return s + (parseInt(g.playtime) || 0); }, 0),
        totalSpent: spending.reduce(function (s, sp) { return s + (parseFloat(sp.amount) || 0); }, 0),
        typeCounts: games.reduce(function (acc, g) {
            var t = g.type || '其他';
            acc[t] = (acc[t] || 0) + 1;
            return acc;
        }, {})
    };

    currentSlide = 0;
    buildSlides();
    document.getElementById('report-empty').style.display = 'none';
    document.getElementById('report-container').style.display = 'block';
    goToSlide(0);
}

// ==================== 幻灯片构建 ====================
var SLIDE_COLORS = ['#52B6FF','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4','#f97316','#14b8a6'];
var SLIDE_BGS = [
    'linear-gradient(135deg, #E8F4FF, #D4ECFF)',
    'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
    'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
    'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
    'linear-gradient(135deg, #FDF2F8, #FCE7F3)',
    'linear-gradient(135deg, #ECFEFF, #CFFAFE)',
];

function buildSlides() {
    var d = reportYearData;
    var slides = [
        buildCoverSlide(d),
        buildOverviewSlide(d),
        buildGenreSlide(d),
        buildSpendingSlide(d),
        buildTopGamesSlide(d),
        buildEndSlide(d),
    ];
    totalSlides = slides.length;

    var track = document.getElementById('slide-track');
    track.innerHTML = slides.join('');

    var dots = document.getElementById('slide-dots');
    dots.innerHTML = '';
    for (var i = 0; i < totalSlides; i++) {
        var dot = document.createElement('button');
        dot.className = 'report-dot';
        dot.setAttribute('data-index', i);
        dot.addEventListener('click', function () { goToSlide(parseInt(this.getAttribute('data-index'))); });
        dots.appendChild(dot);
    }
    lucide.createIcons();
}

function buildCoverSlide(d) {
    return '<div class="slide" style="background:' + SLIDE_BGS[0] + '">' +
        '<span class="slide-year-badge">' + d.year + ' · 年度回顾</span>' +
        '<div style="font-size:6rem;margin:1rem 0;">🎮</div>' +
        '<div class="slide-big-num gradient">' + d.year + '</div>' +
        '<p class="slide-sub" style="font-size:1.3rem;font-weight:600;color:var(--text-dark);">你的游戏年度报告</p>' +
        '<p class="slide-sub">记录了 ' + d.games.length + ' 款游戏、' + d.achievements.length + ' 个成就的精彩一年</p>' +
        '</div>';
}

function buildOverviewSlide(d) {
    var completed = d.games.filter(function (g) { return g.status === 'completed'; }).length;
    var playing = d.games.filter(function (g) { return g.status === 'playing'; }).length;
    return '<div class="slide" style="background:' + SLIDE_BGS[1] + '">' +
        '<span class="slide-year-badge">数据总览</span>' +
        '<h2 style="font-size:2rem;font-weight:800;color:var(--text-dark);margin-bottom:1.5rem;">这一年，你……</h2>' +
        '<div class="report-grid report-grid-3">' +
            '<div class="r-card"><div class="r-val">' + d.games.length + '</div><div class="r-label">游玩游戏</div></div>' +
            '<div class="r-card"><div class="r-val">' + d.totalHours + 'h</div><div class="r-label">游戏时长</div></div>' +
            '<div class="r-card"><div class="r-val">' + d.achievements.length + '</div><div class="r-label">解锁成就</div></div>' +
            '<div class="r-card"><div class="r-val">' + completed + '</div><div class="r-label">已通关</div></div>' +
            '<div class="r-card"><div class="r-val">' + playing + '</div><div class="r-label">进行中</div></div>' +
            '<div class="r-card"><div class="r-val">' + d.timeline.length + '</div><div class="r-label">时间线事件</div></div>' +
        '</div></div>';
}

function buildGenreSlide(d) {
    var tc = d.typeCounts;
    var maxCount = Math.max.apply(null, Object.values(tc)) || 1;
    var sorted = Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a]; });
    var barsHtml = sorted.map(function (t, i) {
        var pct = Math.round(tc[t] / maxCount * 100);
        return '<div class="report-genre-bar">' +
            '<span class="report-genre-name">' + t + '</span>' +
            '<div class="report-genre-fill" style="width:' + pct + '%;background:' + SLIDE_COLORS[i % SLIDE_COLORS.length] + ';"></div>' +
            '<span class="report-genre-count">' + tc[t] + '款</span>' +
        '</div>';
    }).join('');
    return '<div class="slide" style="background:' + SLIDE_BGS[2] + '">' +
        '<span class="slide-year-badge">游戏类型</span>' +
        '<h2 style="font-size:1.8rem;font-weight:800;color:var(--text-dark);margin-bottom:1.5rem;">你最爱玩的类型</h2>' +
        '<div class="spend-bar-wrap">' + barsHtml + '</div>' +
        (sorted.length > 0 ? '<p style="margin-top:1rem;color:var(--text-gray);">最爱：<strong style="color:' + SLIDE_COLORS[0] + '">' + sorted[0] + '</strong></p>' : '') +
        '</div>';
}

function buildSpendingSlide(d) {
    var totalSpent = d.totalSpent;
    var costPerHour = d.totalHours > 0 ? (totalSpent / d.totalHours).toFixed(2) : '0.00';

    var gameSpending = {};
    d.spending.forEach(function (s) {
        var n = s.game || '其他';
        gameSpending[n] = (gameSpending[n] || 0) + (parseFloat(s.amount) || 0);
    });
    var maxSpend = Math.max.apply(null, Object.values(gameSpending)) || 1;
    var sortedSpend = Object.keys(gameSpending).sort(function (a, b) { return gameSpending[b] - gameSpending[a]; });
    var spendBars = sortedSpend.slice(0, 5).map(function (name, i) {
        var pct = Math.round(gameSpending[name] / maxSpend * 100);
        return '<div class="spend-bar-row">' +
            '<span class="spend-bar-name">' + name + '</span>' +
            '<div class="spend-bar-track"><div class="spend-bar-fill" style="width:' + pct + '%;background:' + SLIDE_COLORS[i % SLIDE_COLORS.length] + ';"></div></div>' +
            '<span class="spend-bar-val">&yen;' + gameSpending[name].toFixed(0) + '</span>' +
        '</div>';
    }).join('');

    var noSpend = d.spending.length === 0 ? '<p style="color:var(--text-gray);margin-bottom:1rem;">暂无消费记录，去 <a href="spending.html">消费统计</a> 添加吧~</p>' : '';

    return '<div class="slide" style="background:' + SLIDE_BGS[4] + '">' +
        '<span class="slide-year-badge">消费统计</span>' +
        '<div class="slide-big-num gold">&yen;' + totalSpent.toFixed(0) + '</div>' +
        '<p class="slide-sub">年度游戏总花费</p>' +
        noSpend +
        '<div class="report-grid" style="margin-bottom:1rem;">' +
            '<div class="r-card"><div class="r-val">&yen;' + costPerHour + '</div><div class="r-label">每小时成本</div></div>' +
            '<div class="r-card"><div class="r-val">' + d.spending.length + '</div><div class="r-label">购买记录</div></div>' +
        '</div>' +
        (sortedSpend.length > 0 ? '<div class="spend-bar-wrap">' + spendBars + '</div>' : '') +
        '</div>';
}

function buildTopGamesSlide(d) {
    var sorted = d.games.slice().sort(function (a, b) { return (parseInt(b.playtime) || 0) - (parseInt(a.playtime) || 0); });
    var top3 = sorted.slice(0, 3);
    var rc = ['r1','r2','r3'];
    var topHtml = top3.length > 0 ? top3.map(function (g, i) {
        return '<div class="top-game-row">' +
            '<span class="top-game-rank ' + rc[i] + '">#' + (i + 1) + '</span>' +
            '<img class="top-game-img" src="' + (g.icon || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + encodeURIComponent(g.name)) + '" alt="' + g.name + '" onerror="this.src=\'https://api.dicebear.com/7.x/shapes/svg?seed=' + encodeURIComponent(g.name) + '\'">' +
            '<div class="top-game-info"><div class="top-game-name">' + g.name + '</div><div class="top-game-meta">' + (parseInt(g.playtime) || 0) + ' 小时 · 进度 ' + (g.progress || 0) + '%</div></div>' +
        '</div>';
    }).join('') : '<p style="color:var(--text-gray);">暂无游戏时长记录</p>';
    return '<div class="slide" style="background:' + SLIDE_BGS[5] + '">' +
        '<span class="slide-year-badge">最常玩的游戏</span>' +
        '<h2 style="font-size:1.8rem;font-weight:800;color:var(--text-dark);margin-bottom:1.5rem;">你的年度 TOP 3</h2>' +
        topHtml + '</div>';
}

function buildEndSlide(d) {
    return '<div class="slide" style="background:' + SLIDE_BGS[3] + '">' +
        '<div style="font-size:4rem;margin:1rem 0;">🏆</div>' +
        '<h2 style="font-size:2rem;font-weight:800;color:var(--text-dark);margin:0.5rem 0;">精彩的一年！</h2>' +
        '<p class="slide-sub">' + d.year + ' 年，你总共玩了 <strong>' + d.games.length + '</strong> 款游戏</p>' +
        '<p class="slide-sub">累计 <strong>' + d.totalHours + '</strong> 小时</p>' +
        '<p class="slide-sub">解锁了 <strong>' + d.achievements.length + '</strong> 个成就</p>' +
        '<p style="margin-top:2rem;color:var(--text-gray);font-size:0.85rem;">期待新的一年，继续冒险！✨</p>' +
        '</div>';
}

// ==================== 导航 ====================
function goToSlide(index) {
    if (index < 0 || index >= totalSlides) return;
    currentSlide = index;
    document.getElementById('slide-track').style.transform = 'translateX(-' + (index * 100) + '%)';
    document.querySelectorAll('.report-dot').forEach(function (d, i) { d.classList.toggle('active', i === index); });
}

// 事件监听器在 DOM 加载后绑定
document.addEventListener('DOMContentLoaded', function() {
    var generateBtn = document.getElementById('generate-report');
    var slidePrev = document.getElementById('slide-prev');
    var slideNext = document.getElementById('slide-next');
    var mobileToggle = document.getElementById('mobile-menu-toggle');
    var reportContainer = document.getElementById('report-container');
    
    if (generateBtn) generateBtn.addEventListener('click', generateReport);
    if (slidePrev) slidePrev.addEventListener('click', function () { goToSlide(currentSlide - 1); });
    if (slideNext) slideNext.addEventListener('click', function () { goToSlide(currentSlide + 1); });
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function () {
            var mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu) mobileMenu.classList.toggle('hidden');
        });
    }
    
    if (reportContainer) {
        var stX = 0;
        reportContainer.addEventListener('touchstart', function (e) { stX = e.touches[0].clientX; });
        reportContainer.addEventListener('touchend', function (e) {
            var diff = stX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) diff > 0 ? goToSlide(currentSlide + 1) : goToSlide(currentSlide - 1);
        });
    }
    
    initYearSelector();
});

document.addEventListener('keydown', function (e) {
    var reportContainer = document.getElementById('report-container');
    if (!reportContainer || reportContainer.style.display === 'none') return;
    if (e.key === 'ArrowLeft') goToSlide(currentSlide - 1);
    if (e.key === 'ArrowRight') goToSlide(currentSlide + 1);
});
