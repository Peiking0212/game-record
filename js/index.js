// Data storage keys
        const GAMES_KEY = 'games';
        const ACHIEVEMENTS_KEY = 'game_record_achievements';
        const TIMELINE_KEY = 'game_record_timeline';
        const MEDIA_KEY = 'game_record_media';

        function getData(key, defaultValue = []) {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        }

        function saveData(key, data) {
            localStorage.setItem(key, JSON.stringify(data));
        }

        // Load and Display Stats
        function loadStats() {
            const games = getData(GAMES_KEY);
            const achievements = getData(ACHIEVEMENTS_KEY);
            
            document.getElementById('total-games').textContent = games.length || 0;
            
            const totalHours = games.reduce((sum, g) => sum + (parseInt(g.playtime) || 0), 0);
            document.getElementById('total-hours').textContent = totalHours + 'h';
            
            document.getElementById('total-achievements').textContent = achievements.filter(a => a.unlocked).length || 0;
            
            const ratings = games.filter(g => g.progress > 0).map(g => Math.ceil(g.progress / 20));
            const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '0.0';
            document.getElementById('avg-rating').textContent = avgRating;
        }

        // Load Recent Games
        function loadRecentGames() {
            const games = getData(GAMES_KEY);
            const container = document.getElementById('recent-games');
            
            if (games.length === 0) {
                container.innerHTML = `
                    <div class="col-span-4 text-center py-8">
                        <i data-lucide="gamepad-2" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i>
                        <p class="text-gray-500">还没有游戏记录</p>
                        <a href="games.html" class="text-blue-500 hover:underline">去添加一款游戏吧</a>
                    </div>
                `;
                lucide.createIcons();
                return;
            }
            
            const recent = games.slice(-4).reverse();
            container.innerHTML = recent.map(game => `
                <div class="bg-white rounded-lg shadow-lg overflow-hidden" data-aos="fade-up">
                    <div class="h-32 bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
                        <img src="${game.icon || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + game.name}" alt="${game.name}" class="w-20 h-20 rounded-lg object-cover shadow-md">
                    </div>
                    <div class="p-4">
                        <h4 class="font-semibold text-gray-800 truncate">${game.name}</h4>
                        <p class="text-sm text-gray-600">${game.type || '其他'} · ${game.playtime || 0}小时</p>
                        <div class="mt-2">
                            <span class="text-xs px-2 py-1 rounded-full ${getStatusClass(game.status)}">${getStatusText(game.status)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
            
            lucide.createIcons();
        }

        // Load Recent Achievements
        function loadRecentAchievements() {
            const achievements = getData(ACHIEVEMENTS_KEY);
            const container = document.getElementById('recent-achievements');
            
            if (achievements.length === 0 || !achievements.some(a => a.unlocked)) {
                container.innerHTML = `
                    <div class="col-span-2 text-center py-8">
                        <i data-lucide="trophy" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i>
                        <p class="text-gray-500">还没有解锁的成就</p>
                    </div>
                `;
                lucide.createIcons();
                return;
            }
            
            const recent = achievements.filter(a => a.unlocked).slice(-4).reverse();
            container.innerHTML = recent.map(ach => `
                <div class="achievement-card flex items-start gap-4" data-aos="fade-up">
                    <div class="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="trophy" class="w-6 h-6 text-yellow-500"></i>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-bold text-gray-800">${ach.name || '未知成就'}</h4>
                        <p class="text-sm text-gray-500">${ach.game || '未知游戏'} · ${ach.description || ''}</p>
                    </div>
                </div>
            `).join('');
            
            lucide.createIcons();
        }

        // Load Timeline
        function loadTimeline() {
            const events = getData(TIMELINE_KEY);
            const container = document.getElementById('home-timeline');
            
            if (events.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8">
                        <i data-lucide="clock" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i>
                        <p class="text-gray-500">还没有时间线记录</p>
                        <a href="timeline.html" class="text-blue-500 hover:underline">去添加一条记录吧</a>
                    </div>
                `;
                lucide.createIcons();
                return;
            }
            
            const recent = events.slice(-3).reverse();
            container.innerHTML = recent.map((event, index) => `
                <div class="timeline-item" data-aos="fade-up" data-aos-delay="${index * 100}">
                    <div class="timeline-dot"></div>
                    <div class="bg-white rounded-lg p-4 shadow-lg">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm text-gray-500">${event.date || ''}</span>
                            <span class="badge badge-${event.type === 'game' ? 'blue' : event.type === 'achievement' ? 'orange' : 'purple'}">${event.type || '其他'}</span>
                        </div>
                        <p class="text-gray-800">${event.text || ''}</p>
                    </div>
                </div>
            `).join('');
        }

        // File Upload Handlers
        function setupUpload(selector, type, inputId) {
            const area = document.querySelector(selector);
            const input = document.getElementById(inputId);
            
            area.addEventListener('click', () => input.click());
            
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.classList.add('dragover');
            });
            
            area.addEventListener('dragleave', () => {
                area.classList.remove('dragover');
            });
            
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('dragover');
                handleFiles(e.dataTransfer.files, type);
            });
            
            input.addEventListener('change', () => {
                handleFiles(input.files, type);
            });
        }

        function handleFiles(files, type) {
            const media = getData(MEDIA_KEY);
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    media.push({
                        type: type,
                        url: e.target.result,
                        name: file.name,
                        time: new Date().toISOString()
                    });
                    saveData(MEDIA_KEY, media);
                    showToast(`${type === 'image' ? '截图' : '视频'}上传成功！`, 'success');
                };
                reader.readAsDataURL(file);
            });
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

        function getStatusText(status) {
            switch (status) {
                case 'playing': return '正在玩';
                case 'completed': return '已完成';
                case 'paused': return '暂停中';
                case 'dropped': return '已放弃';
                default: return '未知';
            }
        }

        // Mobile menu toggle
        document.getElementById('mobile-menu-toggle').addEventListener('click', () => {
            const mobileMenu = document.getElementById('mobile-menu');
            mobileMenu.classList.toggle('hidden');
        });

        // Initialize page
        document.addEventListener('DOMContentLoaded', () => {
            loadStats();
            loadRecentGames();
            loadRecentAchievements();
            loadTimeline();
            setupUpload('#quick-image-upload', 'image', 'screenshot-upload');
            setupUpload('#quick-video-upload', 'video', 'video-upload');
        });
    </script>