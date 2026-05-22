var SD = window.SampleDate || {
    daysAgo: function (n) {
        var d = new Date();
        d.setDate(d.getDate() - parseInt(n, 10));
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    lastYearMonth: function (month, day) {
        return (new Date().getFullYear() - 1) + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    }
};

function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Data storage
let achievements = [];
let games = [];

function seedAchievementsIfEmpty() {
    achievements = JSON.parse(localStorage.getItem('achievements')) || [];
    games = JSON.parse(localStorage.getItem('games')) || [];
    if (achievements.length > 0) return;
    achievements = [
        {
            id: 1,
            title: '初次相遇',
            description: '完成新手教程',
            gameName: '原神',
            date: SD.daysAgo(10),
            icon: 'trophy',
            screenshot: null
        },
        {
            id: 2,
            title: '资深玩家',
            description: '游戏时长达到100小时',
            gameName: '原神',
            date: SD.daysAgo(12),
            icon: 'clock',
            screenshot: null
        },
        {
            id: 3,
            title: '收集大师',
            description: '收集所有角色',
            gameName: '明日方舟',
            date: SD.daysAgo(15),
            icon: 'collection',
            screenshot: null
        },
        {
            id: 4,
            title: 'MVP达人',
            description: '获得10次MVP',
            gameName: '王者荣耀',
            date: SD.daysAgo(17),
            icon: 'star',
            screenshot: null
        },
        {
            id: 5,
            title: '时尚达人',
            description: '解锁所有服装',
            gameName: '闪耀暖暖',
            date: SD.daysAgo(19),
            icon: 'diamond',
            screenshot: null
        },
        {
            id: 6,
            title: '探索者',
            description: '探索所有地图区域',
            gameName: '原神',
            date: SD.daysAgo(22),
            icon: 'map',
            screenshot: null
        }
    ];
    localStorage.setItem('achievements', JSON.stringify(achievements));
}

// Update achievement stats
function updateAchievementStats() {
    document.getElementById('total-achievements').textContent = achievements.length;
    
    // Calculate achievements this month
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const achievementsThisMonth = achievements.filter(achievement => {
        const achievementDate = new Date(achievement.date);
        return achievementDate.getMonth() === thisMonth && achievementDate.getFullYear() === thisYear;
    }).length;
    document.getElementById('achievements-this-month').textContent = achievementsThisMonth;
    
    // Calculate games with achievements
    const gamesWithAchievements = [...new Set(achievements.map(achievement => achievement.gameName))].length;
    document.getElementById('games-with-achievements').textContent = gamesWithAchievements;
}

// Render achievements list
function renderAchievements() {
    const achievementsList = document.getElementById('achievements-list');
    const emptyState = document.getElementById('empty-state');
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const gameFilter = document.getElementById('game-filter').value;
    
    let filteredAchievements = achievements;
    
    // Apply filters
    if (searchTerm) {
        filteredAchievements = filteredAchievements.filter(achievement => 
            achievement.title.toLowerCase().includes(searchTerm) || 
            achievement.gameName.toLowerCase().includes(searchTerm)
        );
    }
    
    if (gameFilter !== 'all') {
        filteredAchievements = filteredAchievements.filter(achievement => achievement.gameName === gameFilter);
    }
    
    if (filteredAchievements.length === 0) {
        achievementsList.classList.add('hidden');
        emptyState.classList.remove('hidden');
    } else {
        achievementsList.classList.remove('hidden');
        emptyState.classList.add('hidden');
        
        // Sort by date (newest first)
        filteredAchievements.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        achievementsList.innerHTML = filteredAchievements.map(achievement => `
            <div class="achievement-card cursor-pointer" data-aos="fade-up" onclick="openAchievementDetailModal(${achievement.id})">
                <div class="p-6 bg-white rounded-lg shadow-lg border border-gray-100 h-full">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center">
                            <i data-lucide="${achievement.icon}" class="text-white w-6 h-6"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="font-bold text-gray-800">${achievement.title}</h4>
                            <p class="text-sm text-gray-600">${achievement.gameName}</p>
                        </div>
                        <div class="flex gap-2">
                            <button class="text-blue-500 hover:text-blue-600" onclick="event.stopPropagation(); openEditAchievementModal(${achievement.id})">
                                <i data-lucide="edit" class="w-4 h-4"></i>
                            </button>
                            <button class="text-red-500 hover:text-red-600" onclick="event.stopPropagation(); deleteAchievement(${achievement.id})">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                    <p class="text-gray-600 mb-3">${achievement.description}</p>
                    <div class="text-sm text-gray-500">
                        获得时间: ${formatDate(achievement.date)}
                    </div>
                    ${achievement.screenshot ? `
                        <div class="mt-4">
                            <img src="${achievement.screenshot}" alt="${achievement.title}" class="w-full h-32 object-cover rounded-lg">
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        lucide.createIcons();
    }
}

// Render achievement timeline
function renderAchievementTimeline() {
    const timeline = document.getElementById('achievement-timeline');
    const sortedAchievements = achievements.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
    
    timeline.innerHTML = `
        <div class="relative pl-8 border-l-2 border-blue-200">
            ${sortedAchievements.map(achievement => `
                <div class="mb-8 relative" data-aos="fade-up">
                    <div class="absolute -left-[25px] w-6 h-6 rounded-full bg-yellow-100 border-4 border-white flex items-center justify-center">
                        <i data-lucide="${achievement.icon}" class="w-3 h-3 text-yellow-500"></i>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-lg">
                        <div class="flex items-center gap-2 mb-2">
                            <i data-lucide="${achievement.icon}" class="w-5 h-5 text-yellow-500"></i>
                            <h4 class="font-bold text-gray-800">${achievement.title}</h4>
                        </div>
                        <p class="text-gray-600 mb-2">${achievement.description}</p>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-500">${formatDate(achievement.date)}</span>
                            <span class="text-sm font-medium text-blue-600">${achievement.gameName}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    lucide.createIcons();
}

// Update game filter options
function updateGameFilter() {
    const gameFilter = document.getElementById('game-filter');
    const editGameFilter = document.getElementById('edit-achievement-game');
    const addGameFilter = document.getElementById('achievement-game');
    
    const gameNames = [...new Set(games.map(game => game.name))];
    
    const options = gameNames.map(name => `<option value="${name}">${name}</option>`).join('');
    
    gameFilter.innerHTML = '<option value="all">全部游戏</option>' + options;
    editGameFilter.innerHTML = '<option value="">选择游戏</option>' + options;
    addGameFilter.innerHTML = '<option value="">选择游戏</option>' + options;
}

// Add achievement form submission
document.getElementById('add-achievement-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const screenshotFile = document.getElementById('achievement-screenshot').files[0];
    
    const newAchievement = {
        id: Date.now(),
        title: formData.get('title'),
        description: formData.get('description'),
        gameName: formData.get('gameName'),
        date: formData.get('date'),
        icon: formData.get('icon'),
        screenshot: null
    };
    
    if (screenshotFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            newAchievement.screenshot = e.target.result;
            saveAchievement(newAchievement);
        };
        reader.readAsDataURL(screenshotFile);
    } else {
        saveAchievement(newAchievement);
    }
});

// Save achievement
function saveAchievement(achievement) {
    achievements.push(achievement);
    localStorage.setItem('achievements', JSON.stringify(achievements));
    updateAchievementStats();
    renderAchievements();
    renderAchievementTimeline();
    closeAddAchievementModal();
    showToast('成就已添加', 'success');
}

// Edit achievement form submission
document.getElementById('edit-achievement-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const achievementId = parseInt(document.getElementById('edit-achievement-id').value);
    const achievementIndex = achievements.findIndex(achievement => achievement.id === achievementId);
    
    if (achievementIndex !== -1) {
        achievements[achievementIndex] = {
            ...achievements[achievementIndex],
            title: formData.get('title'),
            description: formData.get('description'),
            gameName: formData.get('gameName'),
            date: formData.get('date'),
            icon: formData.get('icon')
        };
        
        localStorage.setItem('achievements', JSON.stringify(achievements));
        updateAchievementStats();
        renderAchievements();
        renderAchievementTimeline();
        closeEditAchievementModal();
        showToast('成就信息已更新', 'success');
    }
});

// Delete achievement
function deleteAchievement(id) {
    if (confirm('确定要删除这个成就吗？此操作不可撤销。')) {
        achievements = achievements.filter(achievement => achievement.id !== id);
        localStorage.setItem('achievements', JSON.stringify(achievements));
        updateAchievementStats();
        renderAchievements();
        renderAchievementTimeline();
        showToast('成就已删除', 'success');
    }
}

// Open achievement detail modal
function openAchievementDetailModal(id) {
    const achievement = achievements.find(achievement => achievement.id === id);
    if (!achievement) return;
    
    const modal = document.getElementById('achievement-detail-modal');
    const content = document.getElementById('achievement-detail-content');
    
    content.innerHTML = `
        <div class="text-center mb-6">
            <div class="w-20 h-20 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center mx-auto mb-4">
                <i data-lucide="${achievement.icon}" class="text-white w-10 h-10"></i>
            </div>
            <h3 class="text-2xl font-bold text-gray-800 mb-2">${achievement.title}</h3>
            <p class="text-lg text-gray-600">${achievement.gameName}</p>
        </div>
        
        <div class="space-y-6">
            <div>
                <h4 class="font-semibold text-gray-800 mb-2">成就描述</h4>
                <p class="text-gray-600">${achievement.description}</p>
            </div>
            
            <div>
                <h4 class="font-semibold text-gray-800 mb-2">获得信息</h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">获得日期:</span>
                        <span class="font-medium">${formatDate(achievement.date)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">所属游戏:</span>
                        <span class="font-medium">${achievement.gameName}</span>
                    </div>
                </div>
            </div>
            
            ${achievement.screenshot ? `
                <div>
                    <h4 class="font-semibold text-gray-800 mb-2">成就截图</h4>
                    <img src="${achievement.screenshot}" alt="${achievement.title}" class="w-full rounded-lg">
                </div>
            ` : ''}
            
            <div class="flex gap-3">
                <button class="btn-primary flex-1" onclick="openEditAchievementModal(${achievement.id})">
                    <i data-lucide="edit" class="w-5 h-5 inline mr-2"></i>
                    编辑成就
                </button>
                <button class="btn-danger" onclick="deleteAchievement(${achievement.id})">
                    <i data-lucide="trash-2" class="w-5 h-5 inline mr-2"></i>
                    删除成就
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    lucide.createIcons();
}

// Modal functions
function openAddAchievementModal() {
    const modal = document.getElementById('add-achievement-modal');
    modal.classList.add('active');
    document.getElementById('add-achievement-form').reset();
    document.getElementById('achievement-date').value = new Date().toISOString().split('T')[0];
}

function closeAddAchievementModal() {
    document.getElementById('add-achievement-modal').classList.remove('active');
}

function openEditAchievementModal(id) {
    const achievement = achievements.find(achievement => achievement.id === id);
    if (!achievement) return;
    
    const modal = document.getElementById('edit-achievement-modal');
    
    document.getElementById('edit-achievement-id').value = achievement.id;
    document.getElementById('edit-achievement-title').value = achievement.title;
    document.getElementById('edit-achievement-description').value = achievement.description;
    document.getElementById('edit-achievement-game').value = achievement.gameName;
    document.getElementById('edit-achievement-date').value = achievement.date;
    document.getElementById('edit-achievement-icon').value = achievement.icon;
    
    modal.classList.add('active');
}

function closeEditAchievementModal() {
    document.getElementById('edit-achievement-modal').classList.remove('active');
}

function closeAchievementDetailModal() {
    document.getElementById('achievement-detail-modal').classList.remove('active');
}

// Search and filter event listeners
document.getElementById('search').addEventListener('input', renderAchievements);
document.getElementById('game-filter').addEventListener('change', renderAchievements);

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
document.addEventListener('DOMContentLoaded', async () => {
    await window.awaitGameCloud();
    seedAchievementsIfEmpty();
    updateAchievementStats();
    updateGameFilter();
    renderAchievements();
    renderAchievementTimeline();
});
