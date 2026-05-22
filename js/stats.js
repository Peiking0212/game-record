// Data
var SD = window.SampleDate || {
    daysAgo: function (n) {
        var d = new Date();
        d.setDate(d.getDate() - parseInt(n, 10));
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
};
let games = [];
let achievements = [];
let charts = {};

function seedStatsData() {
    games = JSON.parse(localStorage.getItem('games')) || [];
    achievements = JSON.parse(localStorage.getItem('achievements')) || [];
    if (games.length > 0) return;
    games = [
        { id: 1, name: '原神', icon: 'assets/default-cover-male.jpg', playtime: 245, progress: 75, status: 'playing', lastPlayed: SD.daysAgo(10), type: '开放世界' },
        { id: 2, name: '明日方舟', icon: 'assets/default-cover-female.jpg', playtime: 180, progress: 60, status: 'playing', lastPlayed: SD.daysAgo(12), type: '策略' },
        { id: 3, name: '王者荣耀', icon: 'assets/default-cover-male.jpg', playtime: 320, progress: 85, status: 'playing', lastPlayed: SD.daysAgo(15), type: 'MOBA' },
        { id: 4, name: '闪耀暖暖', icon: 'assets/default-cover-female.jpg', playtime: 150, progress: 90, status: 'completed', lastPlayed: SD.daysAgo(19), type: '养成' }
    ];
    localStorage.setItem('games', JSON.stringify(games));
}

// Initialize year filter
function initYearFilter() {
    const select = document.getElementById('filter-year');
    const years = [...new Set(games.map(g => new Date(g.lastPlayed).getFullYear()))].sort((a, b) => b - a);
    years.forEach(year => {
        select.innerHTML += `<option value="${year}">${year}年</option>`;
    });
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
                    <img src="${game.icon}" alt="${game.name}" class="w-10 h-10 rounded-lg object-cover">
                    <span class="font-medium text-gray-800">${game.name}</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">${game.type}</span>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded text-sm ${getStatusClass(game.status)}">${getStatusText(game.status)}</span>
            </td>
            <td class="px-6 py-4 text-gray-700">${game.playtime} 小时</td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                    <div class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500 rounded-full" style="width: ${game.progress}%"></div>
                    </div>
                    <span class="text-sm text-gray-600">${game.progress}%</span>
                </div>
            </td>
            <td class="px-6 py-4 text-gray-600">${formatDate(game.lastPlayed)}</td>
        </tr>
    `).join('');
}

function getStatusClass(status) {
    const classes = {
        playing: 'bg-blue-100 text-blue-700',
        completed: 'bg-green-100 text-green-700',
        planned: 'bg-gray-100 text-gray-700',
        dropped: 'bg-red-100 text-red-700'
    };
    return classes[status] || classes.planned;
}

function getStatusText(status) {
    const texts = { playing: '正在玩', completed: '已完成', planned: '计划中', dropped: '已放弃' };
    return texts[status] || '未知';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
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
    
    // Monthly Chart
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    charts.monthly = new Chart(document.getElementById('monthlyPlaytimeChart'), {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: '游戏时长(小时)',
                data: months.map(() => Math.floor(Math.random() * 100) + 20),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
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
                label: '进度(%)',
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
                label: '游戏时长(小时)',
                data: filtered.map(g => g.playtime),
                backgroundColor: generateColors(filtered.length)
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
    });
}

// Export functions
function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        showToast('导出功能暂时不可用，请刷新页面重试');
        return;
    }
    const filtered = getFilteredGames();
    const data = filtered.map(g => ({
        '游戏名称': g.name,
        '类型': g.type,
        '状态': getStatusText(g.status),
        '游戏时长(小时)': g.playtime,
        '进度(%)': g.progress,
        '最后游玩': g.lastPlayed
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '游戏统计');
    XLSX.writeFile(wb, `游戏统计_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('已导出为 Excel');
}

function exportToImage() {
    if (typeof html2canvas === 'undefined') {
        showToast('导出功能暂时不可用，请刷新页面重试');
        return;
    }
    const element = document.getElementById('charts-section');
    if (!element) {
        showToast('找不到要导出的内容');
        return;
    }
    html2canvas(element, { backgroundColor: '#f9fafb', scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `游戏统计_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL();
        link.click();
        showToast('已保存为图片');
    }).catch(err => {
        console.error('导出图片失败:', err);
        showToast('导出图片失败，请重试');
    });
}

// Year Summary
function generateYearSummary() {
    const year = document.getElementById('filter-year').value;
    const yearNum = year === 'all' ? new Date().getFullYear() : parseInt(year);
    const yearGames = games.filter(g => new Date(g.lastPlayed).getFullYear() === yearNum);
    
    document.getElementById('year-summary-title').textContent = `${yearNum}年度游戏总结`;
    document.getElementById('summary-year').textContent = yearNum;
    document.getElementById('summary-games').textContent = yearGames.length;
    document.getElementById('summary-hours').textContent = yearGames.reduce((s, g) => s + g.playtime, 0);
    document.getElementById('summary-completed').textContent = yearGames.filter(g => g.status === 'completed').length;
    document.getElementById('summary-achievements').textContent = achievements.filter(a => new Date(a.date).getFullYear() === yearNum).length;
    
    // Top games
    const topGames = [...yearGames].sort((a, b) => b.playtime - a.playtime).slice(0, 3);
    document.getElementById('summary-top-games').innerHTML = topGames.map((g, i) => `
        <div class="flex items-center gap-3">
            <span class="text-2xl">${['?', '?', '?'][i]}</span>
            <div>
                <div class="font-medium">${g.name}</div>
                <div class="text-sm opacity-80">${g.playtime} 小时</div>
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
    
    document.getElementById('year-summary-modal').classList.remove('hidden');
}

function saveSummaryImage() {
    if (typeof html2canvas === 'undefined') {
        showToast('导出功能暂时不可用，请刷新页面重试');
        return;
    }
    const element = document.getElementById('summary-card-capture');
    if (!element) {
        showToast('找不到要导出的内容');
        return;
    }
    html2canvas(element, { backgroundColor: null, scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        const yearEl = document.getElementById('summary-year');
        link.download = `年度总结_${yearEl ? yearEl.textContent : new Date().getFullYear()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        showToast('已保存为图片');
    }).catch(err => {
        console.error('导出图片失败:', err);
        showToast('导出图片失败，请重试');
    });
}

// Toast
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.add('show');
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

document.getElementById('export-excel').addEventListener('click', exportToExcel);
document.getElementById('export-image').addEventListener('click', exportToImage);
document.getElementById('year-summary-btn').addEventListener('click', generateYearSummary);
document.getElementById('save-summary-image').addEventListener('click', saveSummaryImage);
document.getElementById('export-summary-excel').addEventListener('click', exportToExcel);

document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('year-summary-modal').classList.add('hidden');
    });
});

document.getElementById('mobile-menu-toggle').addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.toggle('hidden');
});

// Initialize
(async function initStatsPage() {
    await window.awaitGameCloud();
    seedStatsData();
    initYearFilter();
    updateStats();
    updateTable();
    updateCharts();
})();