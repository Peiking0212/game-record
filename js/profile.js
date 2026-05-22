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
let profile = Object.assign({}, GD.DEFAULT_PROFILE);
let games = [];
let achievements = [];

function loadProfileData() {
    profile = GD.getProfile();
    games = GD.get(GD.KEYS.GAMES, []);
    achievements = GD.migrateLegacyAchievements();
}

// Render profile info
function renderProfile() {
    document.getElementById('profile-name').textContent = profile.name;
    document.getElementById('profile-title').textContent = profile.title;
    document.getElementById('profile-bio').textContent = profile.bio;
    document.getElementById('profile-avatar').src = profile.avatar;
    
    document.getElementById('name').value = profile.name;
    document.getElementById('title').value = profile.title;
    document.getElementById('bio').value = profile.bio;
    
    // Update stats
    document.getElementById('profile-total-games').textContent = games.length;
    document.getElementById('profile-total-playtime').textContent = games.reduce((sum, game) => sum + game.playtime, 0);
    document.getElementById('profile-total-achievements').textContent = achievements.length;
    
    const joinDate = new Date(profile.joinDate);
    const now = new Date();
    const daysDiff = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));
    document.getElementById('profile-member-since').textContent = daysDiff;
    
    // Render game tags
    renderGameTags();
}

// Render game tags
function renderGameTags() {
    const gameTags = document.getElementById('game-tags');
    gameTags.innerHTML = profile.tags.map(tag => `
        <span class="badge badge-blue flex items-center">
            ${escapeHtml(tag)}
            <button type="button" class="ml-1 text-xs" onclick="removeTag(this)">×</button>
        </span>
    `).join('');
}

// Render favorite games
function renderFavoriteGames() {
    const favoriteGames = document.getElementById('favorite-games');
    const favoriteGameIds = profile.favoriteGames || [];

    // 获取用户选择的最喜欢的游戏
    let displayGames = [];
    if (favoriteGameIds.length > 0) {
        displayGames = favoriteGameIds.map(id => games.find(g => g.id === id)).filter(g => g);
    }

    // 如果没有选择任何游戏，显示提示
    if (displayGames.length === 0) {
        favoriteGames.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <p>还没有选择最喜欢的游戏</p>
                <p class="text-sm">点击"编辑偏好"按钮添加</p>
            </div>
        `;
        return;
    }

    favoriteGames.innerHTML = displayGames.map(game => `
        <div class="flex items-center gap-4">
            <img src="${game.icon}" alt="${game.name}" class="w-12 h-12 rounded-lg object-cover">
            <div class="flex-1">
                <h4 class="font-semibold text-gray-800">${escapeHtml(game.name)}</h4>
                <p class="text-sm text-gray-600">${game.playtime} 小时</p>
            </div>
            <div class="text-yellow-500">
                <i data-lucide="star" class="w-5 h-5 fill-current"></i>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

// Render play style
function renderPlayStyle() {
    const playStyleContainer = document.getElementById('play-style');
    const ps = profile.playStyle || { singlePlayer: 80, multiPlayer: 60, pve: 90, pvp: 40 };

    playStyleContainer.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="text-gray-700">单人游戏</span>
            <div class="w-32 bg-gray-200 rounded-full h-2">
                <div class="progress-bar-fill" style="width: ${ps.singlePlayer}%"></div>
            </div>
            <span class="text-gray-600 font-medium">${ps.singlePlayer}%</span>
        </div>
        <div class="flex justify-between items-center">
            <span class="text-gray-700">多人游戏</span>
            <div class="w-32 bg-gray-200 rounded-full h-2">
                <div class="progress-bar-fill" style="width: ${ps.multiPlayer}%"></div>
            </div>
            <span class="text-gray-600 font-medium">${ps.multiPlayer}%</span>
        </div>
        <div class="flex justify-between items-center">
            <span class="text-gray-700">PVE</span>
            <div class="w-32 bg-gray-200 rounded-full h-2">
                <div class="progress-bar-fill" style="width: ${ps.pve}%"></div>
            </div>
            <span class="text-gray-600 font-medium">${ps.pve}%</span>
        </div>
        <div class="flex justify-between items-center">
            <span class="text-gray-700">PVP</span>
            <div class="w-32 bg-gray-200 rounded-full h-2">
                <div class="progress-bar-fill" style="width: ${ps.pvp}%"></div>
            </div>
            <span class="text-gray-600 font-medium">${ps.pvp}%</span>
        </div>
    `;
}

// Avatar upload
document.getElementById('avatar-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            profile.avatar = e.target.result;
            document.getElementById('profile-avatar').src = e.target.result;
            GD.setProfile(profile);
            showToast('头像已更新', 'success');
        };
        reader.readAsDataURL(file);
    }
});

// Profile form submission
document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    profile.name = document.getElementById('name').value;
    profile.title = document.getElementById('title').value;
    profile.bio = document.getElementById('bio').value;
    
    GD.setProfile(profile);
    renderProfile();
    showToast('个人信息已更新', 'success');
});

// Add tag
function addTag() {
    const newTagInput = document.getElementById('new-tag');
    const tag = newTagInput.value.trim();
    
    if (tag && !profile.tags.includes(tag)) {
        profile.tags.push(tag);
        GD.setProfile(profile);
        renderGameTags();
        newTagInput.value = '';
        showToast('标签已添加', 'success');
    }
}

// Remove tag
function removeTag(button) {
    const tag = button.parentElement.textContent.trim().replace('×', '').trim();
    profile.tags = profile.tags.filter(t => t !== tag);
    GD.setProfile(profile);
    renderGameTags();
    showToast('标签已删除', 'success');
}

// Modal functions
function openEditModal(type) {
    const modal = document.getElementById('edit-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    modalTitle.textContent = type === 'favorite-games' ? '编辑最喜欢的游戏' : '编辑游戏风格';
    
    if (type === 'favorite-games') {
        const favoriteGameIds = profile.favoriteGames || [];
        modalContent.innerHTML = `
            <div class="space-y-4 max-h-80 overflow-y-auto">
                ${games.length === 0 ? '<p class="text-gray-500 text-center">还没有添加任何游戏</p>' : games.map(game => `
                    <div class="flex items-center">
                        <input type="checkbox" id="game-${game.id}" class="mr-3" ${favoriteGameIds.includes(game.id) ? 'checked' : ''}>
                        <label for="game-${game.id}" class="flex items-center gap-2 cursor-pointer">
                            ${imgWithFallback(game.icon, game.name, 'w-8 h-8 rounded')}
                            <span>${escapeHtml(game.name)}</span>
                        </label>
                    </div>
                `).join('')}
                <button class="btn-primary w-full mt-4" onclick="saveFavoriteGames()">保存</button>
            </div>
        `;
    } else {
        const ps = profile.playStyle || { singlePlayer: 80, multiPlayer: 60, pve: 90, pvp: 40 };
        modalContent.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label for="single-player" class="block mb-2">单人游戏</label>
                    <input type="range" id="single-player" min="0" max="100" value="${ps.singlePlayer}" class="w-full">
                    <div class="flex justify-between text-sm text-gray-600">
                        <span>0%</span>
                        <span id="single-player-value">${ps.singlePlayer}%</span>
                        <span>100%</span>
                    </div>
                </div>
                <div>
                    <label for="multi-player" class="block mb-2">多人游戏</label>
                    <input type="range" id="multi-player" min="0" max="100" value="${ps.multiPlayer}" class="w-full">
                    <div class="flex justify-between text-sm text-gray-600">
                        <span>0%</span>
                        <span id="multi-player-value">${ps.multiPlayer}%</span>
                        <span>100%</span>
                    </div>
                </div>
                <div>
                    <label for="pve" class="block mb-2">PVE</label>
                    <input type="range" id="pve" min="0" max="100" value="${ps.pve}" class="w-full">
                    <div class="flex justify-between text-sm text-gray-600">
                        <span>0%</span>
                        <span id="pve-value">${ps.pve}%</span>
                        <span>100%</span>
                    </div>
                </div>
                <div>
                    <label for="pvp" class="block mb-2">PVP</label>
                    <input type="range" id="pvp" min="0" max="100" value="${ps.pvp}" class="w-full">
                    <div class="flex justify-between text-sm text-gray-600">
                        <span>0%</span>
                        <span id="pvp-value">${ps.pvp}%</span>
                        <span>100%</span>
                    </div>
                </div>
                <button class="btn-primary w-full mt-4" onclick="savePlayStyle()">保存</button>
            </div>
        `;

        // Add event listeners for range inputs
        document.getElementById('single-player').addEventListener('input', (e) => {
            document.getElementById('single-player-value').textContent = e.target.value + '%';
        });

        document.getElementById('multi-player').addEventListener('input', (e) => {
            document.getElementById('multi-player-value').textContent = e.target.value + '%';
        });

        document.getElementById('pve').addEventListener('input', (e) => {
            document.getElementById('pve-value').textContent = e.target.value + '%';
        });

        document.getElementById('pvp').addEventListener('input', (e) => {
            document.getElementById('pvp-value').textContent = e.target.value + '%';
        });
    }
    
    modal.classList.add('active');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
}

// Save functions
function saveFavoriteGames() {
    // 获取所有选中的游戏ID
    const selectedGames = [];
    games.forEach(game => {
        const checkbox = document.getElementById(`game-${game.id}`);
        if (checkbox && checkbox.checked) {
            selectedGames.push(game.id);
        }
    });

    // 保存到profile
    profile.favoriteGames = selectedGames;
    GD.setProfile(profile);

    // 重新渲染
    renderFavoriteGames();
    closeEditModal();
    showToast('最喜欢的游戏已更新', 'success');
}

function savePlayStyle() {
    // Save all play style values
    profile.playStyle = {
        singlePlayer: parseInt(document.getElementById('single-player').value),
        multiPlayer: parseInt(document.getElementById('multi-player').value),
        pve: parseInt(document.getElementById('pve').value),
        pvp: parseInt(document.getElementById('pvp').value)
    };
    GD.setProfile(profile);
    renderPlayStyle();
    closeEditModal();
    showToast('游戏风格已更新', 'success');
}

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
    loadProfileData();
    renderProfile();
    renderFavoriteGames();
    renderPlayStyle();
});
