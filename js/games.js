var SD = window.SampleDate || {
    daysAgo: function(n) {
        var d = new Date();
        d.setDate(d.getDate() - parseInt(n));
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    lastYearMonth: function(month, day) {
        var d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        d.setMonth(parseInt(month) - 1);
        d.setDate(parseInt(day));
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
};

function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getStatusText(status) {
    var texts = { playing: '正在玩', completed: '已完成', paused: '暂停中', dropped: '已放弃', planned: '计划中' };
    return texts[status] || '未知';
}

// Data storage
let games = JSON.parse(localStorage.getItem('games')) || [];
let isEditMode = false;

// Sample data if no data exists
if (games.length === 0) {
    games = [
        {
            id: 1,
            name: '原神',
            icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=genshin&backgroundColor=b6e3f4',
            playtime: 245,
            progress: 75,
            status: 'playing',
            lastPlayed: SD.daysAgo(10),
            type: '开放世界',
            description: '一款开放世界冒险游戏，拥有精美的画面和丰富的剧情。',
            screenshots: [],
            videos: []
        },
        {
            id: 2,
            name: '明日方舟',
            icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=arknights&backgroundColor=c0aede',
            playtime: 180,
            progress: 60,
            status: 'playing',
            lastPlayed: SD.daysAgo(12),
            type: '策略',
            description: '一款策略塔防游戏，拥有丰富的角色和策略玩法。',
            screenshots: [],
            videos: []
        },
        {
            id: 3,
            name: '王者荣耀',
            icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=honor&backgroundColor=ffdfbf',
            playtime: 320,
            progress: 85,
            status: 'playing',
            lastPlayed: SD.daysAgo(15),
            type: 'MOBA',
            description: '一款多人在线战术竞技游戏，拥有丰富的英雄和多样的玩法。',
            screenshots: [],
            videos: []
        },
        {
            id: 4,
            name: '闪耀暖暖',
            icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=shining&backgroundColor=ffd5dc',
            playtime: 150,
            progress: 90,
            status: 'completed',
            lastPlayed: SD.daysAgo(19),
            type: '养成',
            description: '一款女性向养成游戏，拥有精美的服装和剧情。',
            screenshots: [],
            videos: []
        }
    ];
    localStorage.setItem('games', JSON.stringify(games));
}

// Render games list
function renderGames() {
    const gamesList = document.getElementById('games-list');
    const emptyState = document.getElementById('empty-state');
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    
    let filteredGames = games;
    
    // Apply filters
    if (searchTerm) {
        filteredGames = filteredGames.filter(game => game.name.toLowerCase().includes(searchTerm));
    }
    
    if (statusFilter !== 'all') {
        filteredGames = filteredGames.filter(game => game.status === statusFilter);
    }
    
    if (typeFilter !== 'all') {
        filteredGames = filteredGames.filter(game => game.type === typeFilter);
    }
    
    if (filteredGames.length === 0) {
        gamesList.classList.add('hidden');
        emptyState.classList.remove('hidden');
    } else {
        gamesList.classList.remove('hidden');
        emptyState.classList.add('hidden');
        
        gamesList.innerHTML = filteredGames.map(game => `
            <div class="cassette-3d cassette-${game.status}" data-aos="fade-up">
                <div class="cassette-3d-inner">
                    <div class="cassette-3d-front">
                        <div class="cassette-cover">
                            <div class="cassette-ribbon"></div>
                            <img src="${game.icon}" alt="${game.name}">
                        </div>
                        <div class="cassette-label">${game.name}</div>
                    </div>
                    <div class="cassette-3d-back">
                        <h4>${game.name}</h4>
                        <div class="cassette-info-row"><span>类型</span><span>${game.type || '其他'}</span></div>
                        <div class="cassette-info-row"><span>状态</span><span>${getStatusText(game.status)}</span></div>
                        <div class="cassette-info-row"><span>时长</span><span>${game.playtime} 小时</span></div>
                        <div class="cassette-info-row"><span>进度</span><span>${game.progress}%</span></div>
                        <div class="cassette-info-row"><span>最近</span><span>${formatDate(game.lastPlayed)}</span></div>
                        <div class="cassette-actions">
                            <button class="cassette-btn-play" onclick="event.stopPropagation(); openGameDetailModal(${game.id})">查 看</button>
                            <button class="cassette-btn-edit" onclick="event.stopPropagation(); openEditGameModal(${game.id})">编 辑</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        lucide.createIcons();
    }
}

// Render recently added games
function renderRecentlyAdded() {
    const recentlyAdded = document.getElementById('recently-added');
    const sortedGames = games.sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed)).slice(0, 4);
    
    recentlyAdded.innerHTML = sortedGames.map(game => `
        <div class="bg-white rounded-lg shadow-lg overflow-hidden" data-aos="fade-up">
            <img src="${game.icon}" alt="${game.name}" class="w-full h-32 object-cover">
            <div class="p-4">
                <h4 class="font-semibold text-gray-800">${game.name}</h4>
                <p class="text-sm text-gray-600">${game.type}</p>
                <div class="mt-2 text-xs text-gray-500">
                    最近游玩: ${formatDate(game.lastPlayed)}
                </div>
            </div>
        </div>
    `).join('');
}

// Add game form submission
document.getElementById('add-game-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const newGame = {
        id: Date.now(),
        name: formData.get('name'),
        icon: formData.get('icon') || 'https://i.pravatar.cc/300',
        playtime: parseInt(formData.get('playtime')),
        progress: parseInt(formData.get('progress')),
        status: formData.get('status'),
        type: formData.get('type'),
        description: formData.get('description') || '',
        lastPlayed: new Date().toISOString().split('T')[0],
        screenshots: [],
        videos: []
    };
    
    games.push(newGame);
    localStorage.setItem('games', JSON.stringify(games));
    renderGames();
    renderRecentlyAdded();
    closeAddGameModal();
    showToast('游戏已添加', 'success');
});

// Edit game form submission
document.getElementById('edit-game-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const gameId = parseInt(document.getElementById('edit-game-id').value);
    const gameIndex = games.findIndex(game => game.id === gameId);
    
    if (gameIndex !== -1) {
        games[gameIndex] = {
            ...games[gameIndex],
            name: formData.get('name'),
            icon: formData.get('icon') || 'https://i.pravatar.cc/300',
            playtime: parseInt(formData.get('playtime')),
            progress: parseInt(formData.get('progress')),
            status: formData.get('status'),
            type: formData.get('type'),
            description: formData.get('description') || '',
            lastPlayed: new Date().toISOString().split('T')[0]
        };
        
        localStorage.setItem('games', JSON.stringify(games));
        renderGames();
        renderRecentlyAdded();
        closeEditGameModal();
        showToast('游戏信息已更新', 'success');
    }
});

// Delete game
function deleteGame(id) {
    if (confirm('确定要删除这款游戏吗？此操作不可撤销。')) {
        games = games.filter(game => game.id !== id);
        localStorage.setItem('games', JSON.stringify(games));
        renderGames();
        renderRecentlyAdded();
        showToast('游戏已删除', 'success');
    }
}

// Open game detail modal
function openGameDetailModal(id) {
    const game = games.find(game => game.id === id);
    if (!game) return;
    
    const modal = document.getElementById('game-detail-modal');
    const content = document.getElementById('game-detail-content');
    
    content.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <img src="${game.icon}" alt="${game.name}" class="w-full h-64 object-cover rounded-lg mb-4">
                <div class="space-y-4">
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-2">游戏信息</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">游戏类型:</span>
                                <span class="font-medium">${game.type}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">游戏状态:</span>
                                <span class="font-medium ${getStatusClass(game.status)} px-2 py-1 rounded">${getStatusText(game.status)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">游戏时长:</span>
                                <span class="font-medium">${game.playtime} 小时</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">完成进度:</span>
                                <span class="font-medium">${game.progress}%</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">最近游玩:</span>
                                <span class="font-medium">${formatDate(game.lastPlayed)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div>
                <h3 class="text-2xl font-bold text-gray-800 mb-4">${game.name}</h3>
                <div class="mb-6">
                    <h4 class="font-semibold text-gray-800 mb-2">游戏描述</h4>
                    <p class="text-gray-600">${game.description || '暂无描述'}</p>
                </div>
                
                <!-- Screenshots -->
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-semibold text-gray-800">游戏截图</h4>
                        <button class="text-blue-500 hover:text-blue-600 text-sm" onclick="openScreenshotUpload(${game.id})">
                            <i data-lucide="plus" class="w-4 h-4 inline mr-1"></i>
                            添加截图
                        </button>
                    </div>
                    <div class="media-gallery" id="screenshots-${game.id}">
                        ${game.screenshots && game.screenshots.length > 0 ? game.screenshots.map((screenshot, index) => `
                            <div class="media-item">
                                <img src="${screenshot}" alt="Screenshot ${index + 1}">
                                <div class="media-overlay">
                                    <button class="media-remove" onclick="removeScreenshot(${game.id}, ${index})">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('') : '<p class="text-gray-500 text-sm">暂无截图</p>'}
                    </div>
                </div>
                
                <!-- Videos -->
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-semibold text-gray-800">游戏视频</h4>
                        <button class="text-blue-500 hover:text-blue-600 text-sm" onclick="openVideoUpload(${game.id})">
                            <i data-lucide="plus" class="w-4 h-4 inline mr-1"></i>
                            添加视频
                        </button>
                    </div>
                    <div class="media-gallery" id="videos-${game.id}">
                        ${game.videos && game.videos.length > 0 ? game.videos.map((video, index) => `
                            <div class="media-item">
                                <video src="${video}" controls class="w-full h-full object-cover"></video>
                                <div class="media-overlay">
                                    <button class="media-remove" onclick="removeVideo(${game.id}, ${index})">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('') : '<p class="text-gray-500 text-sm">暂无视频</p>'}
                    </div>
                </div>
                
                <div class="flex gap-3">
                    <button class="btn-primary flex-1" onclick="openEditGameModal(${game.id})">
                        <i data-lucide="edit" class="w-5 h-5 inline mr-2"></i>
                        编辑游戏
                    </button>
                    <button class="btn-danger" onclick="deleteGame(${game.id})">
                        <i data-lucide="trash-2" class="w-5 h-5 inline mr-2"></i>
                        删除游戏
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    lucide.createIcons();
}

// Modal functions
function openAddGameModal() {
    document.getElementById('add-game-modal').classList.add('active');
    document.getElementById('add-game-form').reset();
    document.getElementById('progress-value').textContent = '0%';
    var addPreview = document.getElementById('add-icon-preview');
    if (addPreview) addPreview.style.display = 'none';
}

function closeAddGameModal() {
    document.getElementById('add-game-modal').classList.remove('active');
}

function openEditGameModal(id) {
    const game = games.find(game => game.id === id);
    if (!game) return;
    
    const modal = document.getElementById('edit-game-modal');
    
    document.getElementById('edit-game-id').value = game.id;
    document.getElementById('edit-game-name').value = game.name;
    document.getElementById('edit-game-icon').value = game.icon;
    document.getElementById('edit-game-type').value = game.type;
    document.getElementById('edit-game-status').value = game.status;
    document.getElementById('edit-game-progress').value = game.progress;
    document.getElementById('edit-progress-value').textContent = game.progress + '%';
    document.getElementById('edit-game-playtime').value = game.playtime;
    document.getElementById('edit-game-description').value = game.description || '';
    
    // Show existing icon preview
    var preview = document.getElementById('edit-icon-preview');
    if (preview && game.icon) {
        preview.src = game.icon;
        preview.style.display = 'block';
    } else if (preview) {
        preview.style.display = 'none';
    }
    
    modal.classList.add('active');
}

function closeEditGameModal() {
    document.getElementById('edit-game-modal').classList.remove('active');
}

function closeGameDetailModal() {
    document.getElementById('game-detail-modal').classList.remove('active');
}

function openIconUpload() {
    isEditMode = false;
    document.getElementById('icon-upload-modal').classList.add('active');
}

function openEditIconUpload() {
    isEditMode = true;
    document.getElementById('icon-upload-modal').classList.add('active');
}

function closeIconUploadModal() {
    document.getElementById('icon-upload-modal').classList.remove('active');
}

// Screenshot and video upload
function openScreenshotUpload(gameId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = (e) => handleScreenshotUpload(gameId, e.target.files);
    input.click();
}

function openVideoUpload(gameId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => handleVideoUpload(gameId, e.target.files[0]);
    input.click();
}

function handleScreenshotUpload(gameId, files) {
    const game = games.find(game => game.id === gameId);
    if (!game) return;
    
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (!game.screenshots) game.screenshots = [];
                game.screenshots.push(e.target.result);
                localStorage.setItem('games', JSON.stringify(games));
                openGameDetailModal(gameId); // Refresh modal
            };
            reader.readAsDataURL(file);
        }
    });
}

function handleVideoUpload(gameId, file) {
    const game = games.find(game => game.id === gameId);
    if (!game) return;
    
    if (file && file.type.startsWith('video/')) {
        if (file.size > 50 * 1024 * 1024) {
            showToast('视频文件过大，请选择小于50MB的文件', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            if (!game.videos) game.videos = [];
            game.videos.push(e.target.result);
            localStorage.setItem('games', JSON.stringify(games));
            openGameDetailModal(gameId); // Refresh modal
        };
        reader.readAsDataURL(file);
    }
}

function removeScreenshot(gameId, index) {
    const game = games.find(game => game.id === gameId);
    if (game && game.screenshots) {
        game.screenshots.splice(index, 1);
        localStorage.setItem('games', JSON.stringify(games));
        openGameDetailModal(gameId); // Refresh modal
    }
}

function removeVideo(gameId, index) {
    const game = games.find(game => game.id === gameId);
    if (game && game.videos) {
        game.videos.splice(index, 1);
        localStorage.setItem('games', JSON.stringify(games));
        openGameDetailModal(gameId); // Refresh modal
    }
}

// Icon upload handling
function initIconUpload() {
    var input = document.getElementById('icon-upload-input');
    var area = document.getElementById('icon-upload-area');
    if (!input || !area) return;

    // Click upload area to trigger file input
    area.addEventListener('click', function (e) {
        e.stopPropagation();
        input.click();
    });

    input.addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            if (file.size > 2 * 1024 * 1024) {
                showToast('图片文件过大，请选择小于2MB的文件', 'error');
                return;
            }
            var reader = new FileReader();
            reader.onload = function (ev) {
                var preview = document.getElementById('edit-icon-preview');
                if (isEditMode) {
                    var editIcon = document.getElementById('edit-game-icon');
                    if (editIcon) editIcon.value = ev.target.result;
                    if (preview) { preview.src = ev.target.result; preview.style.display = 'block'; }
                } else {
                    var addIcon = document.getElementById('game-icon');
                    if (addIcon) addIcon.value = ev.target.result;
                    var addPreview = document.getElementById('add-icon-preview');
                    if (addPreview) { addPreview.src = ev.target.result; addPreview.style.display = 'block'; }
                }
                closeIconUploadModal();
                showToast('图标已上传');
            };
            reader.readAsDataURL(file);
        } else {
            showToast('请选择图片文件', 'error');
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIconUpload);
} else {
    initIconUpload();
}

// Progress bar update
document.getElementById('game-progress').addEventListener('input', (e) => {
    document.getElementById('progress-value').textContent = e.target.value + '%';
});

document.getElementById('edit-game-progress').addEventListener('input', (e) => {
    document.getElementById('edit-progress-value').textContent = e.target.value + '%';
});

// Filter event listeners
document.getElementById('search').addEventListener('input', renderGames);
document.getElementById('status-filter').addEventListener('change', renderGames);
document.getElementById('type-filter').addEventListener('change', renderGames);

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Helper functions
function getStatusClass(status) {
    switch (status) {
        case 'playing': return 'text-blue-600 bg-blue-100';
        case 'completed': return 'text-green-600 bg-green-100';
        case 'paused': return 'text-yellow-600 bg-yellow-100';
        case 'dropped': return 'text-red-600 bg-red-100';
        default: return 'text-gray-600 bg-gray-100';
    }
}

// Mobile menu toggle
document.getElementById('mobile-menu-toggle').addEventListener('click', () => {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    renderGames();
    renderRecentlyAdded();
});