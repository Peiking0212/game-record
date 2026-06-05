// Data
var SD = window.SampleDate || {
    daysAgo: function (n) {
        var d = new Date();
        d.setDate(d.getDate() - parseInt(n, 10));
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
};
const GD = window.GameData;
let games = [];
let achievements = [];
let charts = {};

function getCurrentYear() {
    return new Date().getFullYear();
}

function ensureYearFilterOption(select, year) {
    const value = String(year);
    if ([...select.options].some(o => o.value === value)) return;
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = `${year}骞碻;
    select.appendChild(opt);
}

// Initialize year filter 鈥?default to current year
function initYearFilter() {
    const select = document.getElementById('filter-year');
    const currentYear = getCurrentYear();
    const years = [...new Set(games.map(g => new Date(g.lastPlayed).getFullYear()))];
    if (!years.includes(currentYear)) years.push(currentYear);
    years.sort((a, b) => b - a);
    years.forEach(year => {
        select.innerHTML += `<option value="${year}">${year}骞?/option>`;
    });
    select.value = String(currentYear);
}

// Get filtered games
function getFilteredGames() {
    let filtered = [...games];
    
    const year = document.getElementById('filter-year').value;
    const type = document.getElementById('filter-type').value;
    const status = document.getElementById('filter-status').value;
    
    if (year !== 'all') {
        filtered = filtered.filter(g => new Date(g.lastPlayed).getFullYear() === parseInt(year));
    }
    if (type !== 'all') {
        filtered = filtered.filter(g => g.type === type);
    }
    if (status !== 'all') {
        filtered = filtered.filter(g => g.status === status);
    }
    
    return filtered;
}

// Update stats
function updateStats() {
    const filtered = getFilteredGames();
    document.getElementById('stat-total-games').textContent = filtered.length;
    document.getElementById('stat-total-playtime').textContent = filtered.reduce((sum, g) => sum + g.playtime, 0);
    document.getElementById('stat-completed').textContent = filtered.filter(g => g.status === 'completed').length;
    document.getElementById('stat-achievements').textContent = achievements.length;
}

// Update table
function updateTable() {
    const filtered = getFilteredGames();
    const tbody = document.getElementById('games-table-body');
    
    tbody.innerHTML = filtered.map(game => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    ${imgWithFallback(game.icon, game.name, 'w-10 h-10 rounded-lg object-cover')}
                    <span class="font-medium text-gray-800">${escapeHtml(game.name)}</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">${escapeHtml(game.type)}</span>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded text-sm ${getStatusBadgeClass(game.status)}">${escapeHtml(getStatusText(game.status))}</span>
            </td>
            <td class="px-6 py-4 text-gray-700">${parseInt(game.playtime, 10) || 0} 灏忔椂</td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                    <div class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500 rounded-full" style="width: ${Math.min(100, parseInt(game.progress, 10) || 0)}%"></div>
                    </div>
                    <span class="text-sm text-gray-600">${parseInt(game.progress, 10) || 0}%</span>
                </div>
            </td>
        </tr>
    `).join('');
}

// Chart colors
function generateColors(count) {
    const colors = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#eab308', '#14b8a6', '#f43f5e'];
    if (count <= colors.length) return colors.slice(0, count);
    const result = [...colors];
    for (let i = colors.length; i < count; i++) {
        result.push(`hsl(${(i * 137) % 360}, 70%, 60%)`);
    }
    return result;
}

// Create/update charts
function updateCharts() {
    const filtered = getFilteredGames();
    
    // Destroy existing charts
    Object.values(charts).forEach(c => c.destroy());
    
    // Game Type Chart
    const typeCounts = {};
    filtered.forEach(g => typeCounts[g.type] = (typeCounts[g.type] || 0) + 1);
    charts.type = new Chart(document.getElementById('gameTypeChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(typeCounts),
            datasets: [{
                data: Object.values(typeCounts),
                backgroundColor: generateColors(Object.keys(typeCounts).length)
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
    
    // Playtime by type 鈥?uses cumulative playtime per game (no monthly breakdown in data model)
    const typePlaytime = {};
    filtered.forEach(g => {
        const type = g.type || '鍏朵粬';
        typePlaytime[type] = (typePlaytime[type] || 0) + (parseInt(g.playtime, 10) || 0);
    });
    const typeLabels = Object.keys(typePlaytime);
    charts.playtimeByType = new Chart(document.getElementById('playtimeByTypeChart'), {
        type: 'bar',
        data: {
            labels: typeLabels,
            datasets: [{
                label: '娓告垙鏃堕暱(灏忔椂)',
                data: typeLabels.map(t => typePlaytime[t]),
                backgroundColor: generateColors(typeLabels.length)
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
    
    // Progress Chart
    charts.progress = new Chart(document.getElementById('gameProgressChart'), {
        type: 'radar',
        data: {
            labels: filtered.map(g => g.name),
            datasets: [{
                label: '杩涘害(%)',
                data: filtered.map(g => g.progress),
                backgroundColor: 'rgba(249, 115, 22, 0.2)',
                borderColor: '#f97316'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, max: 100 } } }
    });
    
    // Comparison Chart
    charts.comparison = new Chart(document.getElementById('gameComparisonChart'), {
        type: 'bar',
        data: {
            labels: filtered.map(g => g.name),
            datasets: [{
                label: '娓告垙鏃堕暱(灏忔椂)',
                data: filtered.map(g => g.playtime),
                backgroundColor: generateColors(filtered.length)
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
    });
}

const CHART_CANVAS_IDS = {
    gameTypeChart: 'type',
    playtimeByTypeChart: 'playtimeByType',
    gameProgressChart: 'progress',
    gameComparisonChart: 'comparison',
    yearTypeChart: 'yearType'
};

function replaceChartsWithImages(clonedRoot, sourceRoot) {
    sourceRoot.querySelectorAll('canvas[id]').forEach(sourceCanvas => {
        const chartKey = CHART_CANVAS_IDS[sourceCanvas.id];
        const chart = chartKey ? charts[chartKey] : null;
        if (!chart) return;

        const clonedCanvas = clonedRoot.querySelector('#' + CSS.escape(sourceCanvas.id));
        if (!clonedCanvas) return;

        const parent = clonedCanvas.parentElement;
        const sourceParent = sourceCanvas.parentElement;
        if (!parent || !sourceParent) return;

        const img = clonedCanvas.ownerDocument.createElement('img');
        img.src = chart.toBase64Image('image/png', 1);
        img.alt = sourceCanvas.id;
        img.style.display = 'block';
        img.style.width = sourceCanvas.offsetWidth + 'px';
        img.style.height = sourceCanvas.offsetHeight + 'px';
        img.style.maxWidth = '100%';

        parent.style.position = 'relative';
        parent.style.width = sourceParent.offsetWidth + 'px';
        parent.style.height = sourceParent.offsetHeight + 'px';
        parent.style.overflow = 'hidden';
        parent.replaceChild(img, clonedCanvas);
    });

    clonedRoot.querySelectorAll('[data-aos]').forEach(el => {
        el.removeAttribute('data-aos');
        el.style.transform = 'none';
        el.style.opacity = '1';
    });
}

function captureElement(element, options) {
    return html2canvas(element, Object.assign({
        backgroundColor: '#f9fafb',
        scale: 2,
        useCORS: true,
        onclone: (clonedDoc) => {
            const clonedTarget = element.id
                ? clonedDoc.getElementById(element.id)
                : null;
            if (clonedTarget) {
                replaceChartsWithImages(clonedTarget, element);
            }
        }
    }, options || {}));
}

function downloadCanvasAsPng(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Export functions
function exportToImage() {
    if (typeof html2canvas === 'undefined') {
        showToast('瀵煎嚭鍔熻兘鏆傛椂涓嶅彲鐢紝璇峰埛鏂伴〉闈㈤噸璇?);
        return;
    }
    const element = document.getElementById('charts-section');
    if (!element) {
        showToast('鎵句笉鍒拌瀵煎嚭鐨勫唴瀹?);
        return;
    }
    captureElement(element).then(canvas => {
        downloadCanvasAsPng(canvas, `娓告垙缁熻_${new Date().toISOString().split('T')[0]}.png`);
        showToast('宸蹭繚瀛樹负鍥剧墖');
    }).catch(err => {
        console.error('瀵煎嚭鍥剧墖澶辫触:', err);
        showToast('瀵煎嚭鍥剧墖澶辫触锛岃閲嶈瘯');
    });
}

function resolveSummaryYear(forYear) {
    if (forYear !== undefined && forYear !== null && forYear !== '') {
        return parseInt(forYear, 10);
    }
    const year = document.getElementById('filter-year').value;
    return year === 'all' ? getCurrentYear() : parseInt(year, 10);
}

function openYearSummary(forYear) {
    const yearNum = resolveSummaryYear(forYear);
    const select = document.getElementById('filter-year');
    ensureYearFilterOption(select, yearNum);
    select.value = String(yearNum);
    updateStats();
    updateTable();
    updateCharts();
    generateYearSummary(yearNum);
}

// Year Summary
function generateYearSummary(forYear) {
    const yearNum = resolveSummaryYear(forYear);
    const yearGames = games.filter(g => new Date(g.lastPlayed).getFullYear() === yearNum);
    
    document.getElementById('year-summary-title').textContent = `${yearNum}骞村害娓告垙鎬荤粨`;
    document.getElementById('summary-year').textContent = yearNum;
    document.getElementById('summary-games').textContent = yearGames.length;
    document.getElementById('summary-hours').textContent = yearGames.reduce((s, g) => s + g.playtime, 0);
    document.getElementById('summary-completed').textContent = yearGames.filter(g => g.status === 'completed').length;
    document.getElementById('summary-achievements').textContent = achievements.filter(a => new Date(a.date).getFullYear() === yearNum).length;
    
    // Top games
    const topGames = [...yearGames].sort((a, b) => b.playtime - a.playtime).slice(0, 3);
    document.getElementById('summary-top-games').innerHTML = topGames.map((g, i) => `
        <div class="flex items-center gap-3">
            <span class="text-2xl">${['馃', '馃', '馃'][i]}</span>
            <div>
                <div class="font-medium">${g.name}</div>
                <div class="text-sm opacity-80">${g.playtime} 灏忔椂</div>
            </div>
        </div>
    `).join('');
    
    // Year type chart
    const typeCounts = {};
    yearGames.forEach(g => typeCounts[g.type] = (typeCounts[g.type] || 0) + 1);
    if (charts.yearType) charts.yearType.destroy();
    charts.yearType = new Chart(document.getElementById('yearTypeChart'), {
        type: 'pie',
        data: {
            labels: Object.keys(typeCounts),
            datasets: [{
                data: Object.values(typeCounts),
                backgroundColor: generateColors(Object.keys(typeCounts).length)
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
    
    document.getElementById('year-summary-modal').classList.add('active');
}

function saveSummaryImage() {
    if (typeof html2canvas === 'undefined') {
        showToast('瀵煎嚭鍔熻兘鏆傛椂涓嶅彲鐢紝璇峰埛鏂伴〉闈㈤噸璇?);
        return;
    }
    const element = document.getElementById('year-summary-content');
    if (!element) {
        showToast('鎵句笉鍒拌瀵煎嚭鐨勫唴瀹?);
        return;
    }
    captureElement(element, { backgroundColor: '#ffffff' }).then(canvas => {
        const yearEl = document.getElementById('summary-year');
        downloadCanvasAsPng(canvas, `骞村害鎬荤粨_${yearEl ? yearEl.textContent : new Date().getFullYear()}.png`);
        showToast('宸蹭繚瀛樹负鍥剧墖');
    }).catch(err => {
        console.error('瀵煎嚭鍥剧墖澶辫触:', err);
        showToast('瀵煎嚭鍥剧墖澶辫触锛岃閲嶈瘯');
    });
}

// Toast
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Event listeners
document.getElementById('apply-filters').addEventListener('click', () => {
    updateStats();
    updateTable();
    updateCharts();
});

document.getElementById('clear-filters').addEventListener('click', () => {
    document.getElementById('filter-year').value = 'all';
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-status').value = 'all';
    updateStats();
    updateTable();
    updateCharts();
});

document.getElementById('export-image').addEventListener('click', exportToImage);
document.getElementById('year-summary-btn').addEventListener('click', () => openYearSummary(getCurrentYear()));
document.getElementById('save-summary-image').addEventListener('click', saveSummaryImage);

document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('year-summary-modal').classList.remove('active');
    });
});

window.addEventListener('click', (e) => {
    const modal = document.getElementById('year-summary-modal');
    if (e.target === modal) modal.classList.remove('active');
});

async function renderStatsPage() {
    games = await GD.seedGamesIfEmpty();
    achievements = GD.migrateLegacyAchievements();
    updateStats();
    updateTable();
    updateCharts();
}

// Initialize
(async function initStatsPage() {
    await window.awaitGameCloud();
    initYearFilter();
    await renderStatsPage();
    window.whenGameCloudSynced(renderStatsPage);
})();