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

const GD = window.GameData;
let achievements = [];
let games = [];

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
    const gamesWithAchievements = [...new Set(achievements.map(achievement =>
        achievement.gameId != null && achievement.gameId !== '' ? String(achievement.gameId) : achievement.gameName
    ))].length;
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
        filteredAchievements = filteredAchievements.filter(achievement => {
            if (achievement.gameId != null && achievement.gameId !== '') {
                return String(achievement.gameId) === String(gameFilter);
            }
            const game = GD.getGameById(gameFilter);
            return game ? GD.matchGameName(achievement.gameName, game.name) : achievement.gameName === gameFilter;
        });
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
            <div class="achievement-card cursor-pointer" data-aos="fade-up" onclick="openAchievementDetailModal(${parseInt(achievement.id, 10)})">
                <div class="p-6 bg-white rounded-lg shadow-lg border border-gray-100 h-full">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center">
                            <i data-lucide="${safeLucideIcon(achievement.icon)}" class="text-white w-6 h-6"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="font-bold text-gray-800">${escapeHtml(achievement.title)}</h4>
                            <p class="text-sm text-gray-600">${escapeHtml(achievement.gameName)}</p>
                        </div>
                        <div class="flex gap-2">
                            <button class="text-blue-500 hover:text-blue-600" onclick="event.stopPropagation(); openEditAchievementModal(${parseInt(achievement.id, 10)})">
                                <i data-lucide="edit" class="w-4 h-4"></i>
                            </button>
                            <button class="text-red-500 hover:text-red-600" onclick="event.stopPropagation(); deleteAchievement(${parseInt(achievement.id, 10)})">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                    <p class="text-gray-600 mb-3">${escapeHtml(achievement.description)}</p>
                    <div class="text-sm text-gray-500">
                        鑾峰緱鏃堕棿: ${formatDateISO(achievement.date)}
                    </div>
                    ${achievement.screenshot ? `
                        <div class="mt-4">
                            <img src="${escapeHtml(achievement.screenshot)}" alt="${escapeHtml(achievement.title)}" class="w-full h-32 object-cover rounded-lg">
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
                        <i data-lucide="${safeLucideIcon(achievement.icon)}" class="w-3 h-3 text-yellow-500"></i>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-lg">
                        <div class="flex items-center gap-2 mb-2">
                            <i data-lucide="${safeLucideIcon(achievement.icon)}" class="w-5 h-5 text-yellow-500"></i>
                            <h4 class="font-bold text-gray-800">${escapeHtml(achievement.title)}</h4>
                        </div>
                        <p class="text-gray-600 mb-2">${escapeHtml(achievement.description)}</p>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-500">${formatDateISO(achievement.date)}</span>
                            <span class="text-sm font-medium text-blue-600">${escapeHtml(achievement.gameName)}</span>
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

    GD.populateGameSelect(gameFilter, { includeAll: true });
    GD.populateGameSelect(editGameFilter, { placeholder: '閫夋嫨娓告垙' });
    GD.populateGameSelect(addGameFilter, { placeholder: '閫夋嫨娓告垙' });
}

// Add achievement form submission
document.getElementById('add-achievement-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const screenshotFile = document.getElementById('achievement-screenshot').files[0];
    const gameFields = GD.resolveGameFieldsFromSelect(formData.get('gameId'));
    if (!gameFields || !gameFields.gameId) {
        showToast('璇烽€夋嫨鎵€灞炴父鎴?, 'error');
        return;
    }

    const newAchievement = {
        id: Date.now(),
        title: formData.get('title'),
        description: formData.get('description'),
        gameId: gameFields.gameId,
        gameName: gameFields.gameName,
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
    GD.set(GD.KEYS.ACHIEVEMENTS, achievements);
    updateAchievementStats();
    renderAchievements();
    renderAchievementTimeline();
    closeAddAchievementModal();
    showToast('鎴愬氨宸叉坊鍔?, 'success');
}

// Edit achievement form submission
document.getElementById('edit-achievement-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const achievementId = parseInt(document.getElementById('edit-achievement-id').value);
    const achievementIndex = achievements.findIndex(achievement => achievement.id === achievementId);
    
    if (achievementIndex !== -1) {
        const gameFields = GD.resolveGameFieldsFromSelect(formData.get('gameId'));
        if (!gameFields || !gameFields.gameId) {
            showToast('璇烽€夋嫨鎵€灞炴父鎴?, 'error');
            return;
        }
        achievements[achievementIndex] = {
            ...achievements[achievementIndex],
            title: formData.get('title'),
            description: formData.get('description'),
            gameId: gameFields.gameId,
            gameName: gameFields.gameName,
            date: formData.get('date'),
            icon: formData.get('icon')
        };
        
        GD.set(GD.KEYS.ACHIEVEMENTS, achievements);
        updateAchievementStats();
        renderAchievements();
        renderAchievementTimeline();
        closeEditAchievementModal();
        showToast('鎴愬氨淇℃伅宸叉洿鏂?, 'success');
    }
});

// Delete achievement
function deleteAchievement(id) {
    if (confirm('纭畾瑕佸垹闄よ繖涓垚灏卞悧锛熸鎿嶄綔涓嶅彲鎾ら攢銆?)) {
        achievements = achievements.filter(achievement => achievement.id !== id);
        GD.set(GD.KEYS.ACHIEVEMENTS, achievements);
        updateAchievementStats();
        renderAchievements();
        renderAchievementTimeline();
        showToast('鎴愬氨宸插垹闄?, 'success');
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
                <h4 class="font-semibold text-gray-800 mb-2">鎴愬氨鎻忚堪</h4>
                <p class="text-gray-600">${achievement.description}</p>
            </div>
            
            <div>
                <h4 class="font-semibold text-gray-800 mb-2">鑾峰緱淇℃伅</h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">鑾峰緱鏃ユ湡:</span>
                        <span class="font-medium">${formatDateISO(achievement.date)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">鎵€灞炴父鎴?</span>
                        <span class="font-medium">${achievement.gameName}</span>
                    </div>
                </div>
            </div>
            
            ${achievement.screenshot ? `
                <div>
                    <h4 class="font-semibold text-gray-800 mb-2">鎴愬氨鎴浘</h4>
                    <img src="${achievement.screenshot}" alt="${achievement.title}" class="w-full rounded-lg">
                </div>
            ` : ''}
            
            <div class="flex gap-3">
                <button class="btn-primary flex-1" onclick="openEditAchievementModal(${achievement.id})">
                    <i data-lucide="edit" class="w-5 h-5 inline mr-2"></i>
                    缂栬緫鎴愬氨
                </button>
                <button class="btn-danger" onclick="deleteAchievement(${achievement.id})">
                    <i data-lucide="trash-2" class="w-5 h-5 inline mr-2"></i>
                    鍒犻櫎鎴愬氨
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
    document.getElementById('edit-achievement-game').value = achievement.gameId != null && achievement.gameId !== ''
        ? String(achievement.gameId)
        : String(GD.resolveGameIdByName(achievement.gameName) || '');
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
    achievements = await GD.seedAchievementsIfEmpty();
    games = GD.get(GD.KEYS.GAMES, []);
    updateAchievementStats();
    updateGameFilter();
    renderAchievements();
    renderAchievementTimeline();
});
