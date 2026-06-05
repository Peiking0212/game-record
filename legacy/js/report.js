// ==================== 骞村害鎶ュ憡 ====================
var TU = window.TimeUtils;
var currentSlide = 0;
var totalSlides = 0;
var reportYearData = {};

function getGames() { return window.GameData.get(window.GameData.KEYS.GAMES, []); }
function getAchievements() { return window.GameData.migrateLegacyAchievements(); }
function getReviews() { return window.GameData.get(window.GameData.KEYS.REVIEWS, []); }
function getSpending() { return window.GameData.get(window.GameData.KEYS.SPENDING, []); }

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

// ==================== 骞翠唤閫夋嫨鍣?====================
function initYearSelector() {
    var select = document.getElementById('report-year');
    if (!select) return;
    var years = TU.collectYears([
        { items: getGames(), dateKey: 'lastPlayed' },
        { items: getAchievements(), dateKey: 'date' },
        { items: getReviews(), dateKey: 'date' },
        { items: getSpending(), dateKey: 'date' },
    ]);
    if (years.length === 0) years = [new Date().getFullYear()];
    while (select.options.length > 1) select.remove(1);
    years.forEach(function (y) {
        var o = document.createElement('option');
        o.value = y; o.textContent = y + ' 骞?;
        select.appendChild(o);
    });
    select.value = years[0];
}

// ==================== 鐢熸垚鎶ュ憡 ====================
function generateReport() {
    var year = parseInt(document.getElementById('report-year').value);
    if (!year) { showToast('璇峰厛閫夋嫨骞翠唤'); return; }

    var games = TU.filterByYear(getGames(), year, 'lastPlayed');
    var achievements = TU.filterByYear(getAchievements(), year, 'date');
    var spending = TU.filterByYear(getSpending(), year, 'date');

    if (games.length === 0 && achievements.length === 0) {
        showToast(year + ' 骞存殏鏃犳父鎴忔暟鎹?);
        return;
    }

    reportYearData = {
        year: year,
        games: games,
        achievements: achievements,
        spending: spending,
        totalHours: games.reduce(function (s, g) { return s + (parseInt(g.playtime) || 0); }, 0),
        totalSpent: spending.reduce(function (s, sp) { return s + (parseFloat(sp.amount) || 0); }, 0),
        typeCounts: games.reduce(function (acc, g) {
            var t = g.type || '鍏朵粬';
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

// ==================== 骞荤伅鐗囨瀯寤?====================
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
        '<span class="slide-year-badge">' + d.year + ' 路 骞村害鍥為【</span>' +
        '<div style="font-size:6rem;margin:1rem 0;">馃幃</div>' +
        '<div class="slide-big-num gradient">' + d.year + '</div>' +
        '<p class="slide-sub" style="font-size:1.3rem;font-weight:600;color:var(--text-dark);">浣犵殑娓告垙骞村害鎶ュ憡</p>' +
        '<p class="slide-sub">璁板綍浜?' + d.games.length + ' 娆炬父鎴忋€? + d.achievements.length + ' 涓垚灏辩殑绮惧僵涓€骞?/p>' +
        '</div>';
}

function buildOverviewSlide(d) {
    var completed = d.games.filter(function (g) { return g.status === 'completed'; }).length;
    var playing = d.games.filter(function (g) { return g.status === 'playing'; }).length;
    return '<div class="slide" style="background:' + SLIDE_BGS[1] + '">' +
        '<span class="slide-year-badge">鏁版嵁鎬昏</span>' +
        '<h2 style="font-size:2rem;font-weight:800;color:var(--text-dark);margin-bottom:1.5rem;">杩欎竴骞达紝浣犫€︹€?/h2>' +
        '<div class="report-grid report-grid-3">' +
            '<div class="r-card"><div class="r-val">' + d.games.length + '</div><div class="r-label">娓哥帺娓告垙</div></div>' +
            '<div class="r-card"><div class="r-val">' + d.totalHours + 'h</div><div class="r-label">娓告垙鏃堕暱</div></div>' +
            '<div class="r-card"><div class="r-val">' + d.achievements.length + '</div><div class="r-label">瑙ｉ攣鎴愬氨</div></div>' +
            '<div class="r-card"><div class="r-val">' + completed + '</div><div class="r-label">宸查€氬叧</div></div>' +
            '<div class="r-card"><div class="r-val">' + playing + '</div><div class="r-label">杩涜涓?/div></div>' +
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
            '<span class="report-genre-count">' + tc[t] + '娆?/span>' +
        '</div>';
    }).join('');
    return '<div class="slide" style="background:' + SLIDE_BGS[2] + '">' +
        '<span class="slide-year-badge">娓告垙绫诲瀷</span>' +
        '<h2 style="font-size:1.8rem;font-weight:800;color:var(--text-dark);margin-bottom:1.5rem;">浣犳渶鐖辩帺鐨勭被鍨?/h2>' +
        '<div class="spend-bar-wrap">' + barsHtml + '</div>' +
        (sorted.length > 0 ? '<p style="margin-top:1rem;color:var(--text-gray);">鏈€鐖憋細<strong style="color:' + SLIDE_COLORS[0] + '">' + sorted[0] + '</strong></p>' : '') +
        '</div>';
}

function buildSpendingSlide(d) {
    var totalSpent = d.totalSpent;
    var costPerHour = d.totalHours > 0 ? (totalSpent / d.totalHours).toFixed(2) : '0.00';

    var gameSpending = {};
    d.spending.forEach(function (s) {
        var n = s.game || '鍏朵粬';
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

    var noSpend = d.spending.length === 0 ? '<p style="color:var(--text-gray);margin-bottom:1rem;">鏆傛棤娑堣垂璁板綍锛屽幓 <a href="spending.html">娑堣垂璁板綍</a> 娣诲姞鍚</p>' : '';

    return '<div class="slide" style="background:' + SLIDE_BGS[4] + '">' +
        '<span class="slide-year-badge">娑堣垂璁板綍</span>' +
        '<div class="slide-big-num gold">&yen;' + totalSpent.toFixed(0) + '</div>' +
        '<p class="slide-sub">骞村害娓告垙鎬昏姳璐?/p>' +
        noSpend +
        '<div class="report-grid" style="margin-bottom:1rem;">' +
            '<div class="r-card"><div class="r-val">&yen;' + costPerHour + '</div><div class="r-label">姣忓皬鏃舵垚鏈?/div></div>' +
            '<div class="r-card"><div class="r-val">' + d.spending.length + '</div><div class="r-label">娑堣垂绗旀暟</div></div>' +
        '</div>' +
        (sortedSpend.length > 0 ? '<div class="spend-bar-wrap">' + spendBars + '</div>' : '') +
        '</div>';
}

function buildTopGamesSlide(d) {
    var sorted = d.games.slice().sort(function (a, b) { return (parseInt(b.playtime) || 0) - (parseInt(a.playtime) || 0); });
    var top3 = sorted.slice(0, 3);
    var rc = ['r1','r2','r3'];
    var topHtml = top3.length > 0 ? top3.map(function (g, i) {
        var cover = typeof gameIconUrl === 'function' ? gameIconUrl(g.icon, g.name) : (g.icon || 'assets/default-cover-male.svg');
        var fallback = typeof defaultGameCover === 'function' ? defaultGameCover(g.name) : 'assets/default-cover-male.svg';
        return '<div class="top-game-row">' +
            '<span class="top-game-rank ' + rc[i] + '">#' + (i + 1) + '</span>' +
            '<img class="top-game-img" src="' + escapeHtml(cover) + '" alt="' + escapeHtml(g.name) + '" onerror="this.onerror=null;this.src=\'' + escapeHtml(fallback) + '\'">' +
            '<div class="top-game-info"><div class="top-game-name">' + escapeHtml(g.name) + '</div><div class="top-game-meta">' + (parseInt(g.playtime, 10) || 0) + ' 灏忔椂 路 杩涘害 ' + (parseInt(g.progress, 10) || 0) + '%</div></div>' +
        '</div>';
    }).join('') : '<p style="color:var(--text-gray);">鏆傛棤娓告垙鏃堕暱璁板綍</p>';
    return '<div class="slide" style="background:' + SLIDE_BGS[5] + '">' +
        '<span class="slide-year-badge">鏈€甯哥帺鐨勬父鎴?/span>' +
        '<h2 style="font-size:1.8rem;font-weight:800;color:var(--text-dark);margin-bottom:1.5rem;">浣犵殑骞村害 TOP 3</h2>' +
        topHtml + '</div>';
}

function buildEndSlide(d) {
    return '<div class="slide" style="background:' + SLIDE_BGS[3] + '">' +
        '<div style="font-size:4rem;margin:1rem 0;">馃弳</div>' +
        '<h2 style="font-size:2rem;font-weight:800;color:var(--text-dark);margin:0.5rem 0;">绮惧僵鐨勪竴骞达紒</h2>' +
        '<p class="slide-sub">' + d.year + ' 骞达紝浣犳€诲叡鐜╀簡 <strong>' + d.games.length + '</strong> 娆炬父鎴?/p>' +
        '<p class="slide-sub">绱 <strong>' + d.totalHours + '</strong> 灏忔椂</p>' +
        '<p class="slide-sub">瑙ｉ攣浜?<strong>' + d.achievements.length + '</strong> 涓垚灏?/p>' +
        '<p style="margin-top:2rem;color:var(--text-gray);font-size:0.85rem;">鏈熷緟鏂扮殑涓€骞达紝缁х画鍐掗櫓锛佲湪</p>' +
        '</div>';
}

// ==================== 瀵艰埅 ====================
function goToSlide(index) {
    if (index < 0 || index >= totalSlides) return;
    currentSlide = index;
    document.getElementById('slide-track').style.transform = 'translateX(-' + (index * 100) + '%)';
    document.querySelectorAll('.report-dot').forEach(function (d, i) { d.classList.toggle('active', i === index); });
}

// 浜嬩欢鐩戝惉鍣ㄥ湪 DOM 鍔犺浇鍚庣粦瀹?document.addEventListener('DOMContentLoaded', async function() {
    await window.awaitGameCloud();
    var generateBtn = document.getElementById('generate-report');
    var slidePrev = document.getElementById('slide-prev');
    var slideNext = document.getElementById('slide-next');
    var reportContainer = document.getElementById('report-container');
    
    if (generateBtn) generateBtn.addEventListener('click', generateReport);
    if (slidePrev) slidePrev.addEventListener('click', function () { goToSlide(currentSlide - 1); });
    if (slideNext) slideNext.addEventListener('click', function () { goToSlide(currentSlide + 1); });
    
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
