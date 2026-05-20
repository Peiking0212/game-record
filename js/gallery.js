// ========================================
        // Constants
        // ========================================
        const MEDIA_KEY = 'game_record_media';
        const GAMES_KEY = 'games';

        // ========================================
        // Utility Functions
        // ========================================
        function getData(key, defaultValue) {
            if (defaultValue === undefined) defaultValue = [];
            var data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        }

        function saveData(key, data) {
            localStorage.setItem(key, JSON.stringify(data));
        }

        function generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        }

        function formatDate(dateStr) {
            if (!dateStr) return '';
            var d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            var y = d.getFullYear();
            var m = String(d.getMonth() + 1).padStart(2, '0');
            var day = String(d.getDate()).padStart(2, '0');
            return y + '-' + m + '-' + day;
        }

        function escapeHtml(text) {
            if (!text) return '';
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function showToast(message, type) {
            if (type === undefined) type = 'info';
            var toast = document.getElementById('toast');
            var toastMessage = document.getElementById('toast-message');
            toastMessage.textContent = message;
            toast.className = 'toast ' + type + ' show';
            setTimeout(function () {
                toast.classList.remove('show');
            }, 3000);
        }

        // ========================================
        // Get screenshots from game_record_media
        // ========================================
        function getScreenshots() {
            var allMedia = getData(MEDIA_KEY);
            return allMedia.filter(function (item) {
                return item.type === 'image';
            });
        }

        // ========================================
        // Get game names from games data
        // ========================================
        function getGameNames() {
            var games = getData(GAMES_KEY);
            var names = [];
            games.forEach(function (g) {
                if (g.name && names.indexOf(g.name) === -1) {
                    names.push(g.name);
                }
            });
            return names.sort();
        }

        // ========================================
        // Populate game filter dropdown
        // ========================================
        function populateGameFilter() {
            var select = document.getElementById('game-filter');
            var gameNames = getGameNames();
            var currentVal = select.value;

            // Keep first option
            while (select.options.length > 1) {
                select.remove(1);
            }

            gameNames.forEach(function (name) {
                var opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                select.appendChild(opt);
            });

            select.value = currentVal;
        }

        // ========================================
        // Render Gallery
        // ========================================
        function renderGallery() {
            var screenshots = getScreenshots();
            var grid = document.getElementById('gallery-grid');
            var emptyState = document.getElementById('empty-state');
            var countEl = document.getElementById('total-count');

            // Get filter & sort values
            var searchTerm = document.getElementById('search-input').value.trim().toLowerCase();
            var gameFilter = document.getElementById('game-filter').value;
            var sortOrder = document.getElementById('sort-order').value;

            // Apply filters
            if (searchTerm) {
                screenshots = screenshots.filter(function (item) {
                    return (item.gameName || '').toLowerCase().indexOf(searchTerm) !== -1;
                });
            }
            if (gameFilter && gameFilter !== 'all') {
                screenshots = screenshots.filter(function (item) {
                    return item.gameName === gameFilter;
                });
            }

            // Sort
            screenshots.sort(function (a, b) {
                var timeA = a.time ? new Date(a.time).getTime() : 0;
                var timeB = b.time ? new Date(b.time).getTime() : 0;
                return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
            });

            // Update count
            countEl.textContent = screenshots.length;

            if (screenshots.length === 0) {
                grid.innerHTML = '';
                emptyState.classList.remove('hidden');
                return;
            }

            emptyState.classList.add('hidden');

            grid.innerHTML = screenshots.map(function (item) {
                var thumbnailUrl = item.thumbnail || item.url;
                var displayName = item.gameName ? escapeHtml(item.gameName) : '';
                var displayDate = item.time ? formatDate(item.time) : '';
                var nameHtml = displayName ? '<span class="text-sm font-medium">' + displayName + '</span>' : '';

                return '<div class="gallery-item" data-id="' + item.id + '" onclick="openLightbox(\'' + item.id + '\')">' +
                    '<img src="' + thumbnailUrl + '" alt="' + (displayName || '截图') + '" loading="lazy" onerror="this.src=\'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%23E8F0F8" width="400" height="300"/><text x="200" y="150" text-anchor="middle" dy=".3em" fill="%2394A3B8" font-size="16">图片加载失败</text></svg>') + '">' +
                    '<div class="gallery-actions" onclick="event.stopPropagation()">' +
                        '<button class="gallery-btn" onclick="openLightbox(\'' + item.id + '\')" title="查看">' +
                            '<i data-lucide="eye" class="w-4 h-4"></i>' +
                        '</button>' +
                        '<button class="gallery-btn gallery-btn-danger" onclick="deleteScreenshot(\'' + item.id + '\')" title="删除">' +
                            '<i data-lucide="trash-2" class="w-4 h-4"></i>' +
                        '</button>' +
                    '</div>' +
                    '<div class="gallery-overlay">' +
                        nameHtml +
                        (displayDate ? '<span class="text-xs opacity-80 block mt-1">' + displayDate + '</span>' : '') +
                    '</div>' +
                '</div>';
            }).join('');

            lucide.createIcons();
        }

        // ========================================
        // Lightbox
        // ========================================
        function openLightbox(id) {
            var screenshots = getScreenshots();
            var item = screenshots.find(function (s) { return s.id === id; });
            if (!item) return;

            var lightbox = document.getElementById('lightbox');
            var img = document.getElementById('lightbox-image');
            var info = document.getElementById('lightbox-info');

            img.src = item.url;
            var nameText = item.gameName ? escapeHtml(item.gameName) : '未指定游戏';
            var dateText = item.time ? formatDate(item.time) : '';
            info.innerHTML = '<p class="text-lg font-medium">' + nameText + '</p>' +
                (dateText ? '<p class="text-sm text-gray-300 mt-1">上传于 ' + dateText + '</p>' : '');

            lightbox.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
            document.getElementById('lightbox').classList.remove('open');
            document.body.style.overflow = '';
        }

        // ========================================
        // Delete Screenshot
        // ========================================
        function deleteScreenshot(id) {
            if (!confirm('确定要删除这张截图吗？')) return;

            var allMedia = getData(MEDIA_KEY);
            allMedia = allMedia.filter(function (item) {
                return item.id !== id;
            });
            saveData(MEDIA_KEY, allMedia);
            renderGallery();
            showToast('截图已删除', 'success');
        }

        // ========================================
        // Upload Screenshots
        // ========================================
        var pendingFiles = [];

        document.getElementById('gallery-upload-input').addEventListener('change', function (e) {
            var files = Array.from(e.target.files);
            if (files.length === 0) return;

            // Filter only image files
            pendingFiles = files.filter(function (f) {
                return f.type.startsWith('image/');
            });

            if (pendingFiles.length === 0) {
                showToast('请选择图片文件', 'error');
                return;
            }

            // Populate game select in modal
            var select = document.getElementById('upload-game-select');
            var gameNames = getGameNames();
            while (select.options.length > 1) {
                select.remove(1);
            }
            gameNames.forEach(function (name) {
                var opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                select.appendChild(opt);
            });
            select.value = '';

            // Show modal
            document.getElementById('upload-game-modal').classList.remove('hidden');
            document.getElementById('upload-game-modal').classList.add('active');

            // Reset input
            this.value = '';
        });

        function confirmUpload() {
            var select = document.getElementById('upload-game-select');
            var gameName = select.value;

            if (pendingFiles.length === 0) return;

            var allMedia = getData(MEDIA_KEY);
            var loadedCount = 0;

            pendingFiles.forEach(function (file) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var item = {
                        id: generateId(),
                        type: 'image',
                        url: e.target.result,
                        name: file.name,
                        gameName: gameName || '',
                        time: new Date().toISOString()
                    };
                    allMedia.push(item);
                    loadedCount++;

                    if (loadedCount === pendingFiles.length) {
                        saveData(MEDIA_KEY, allMedia);
                        closeUploadModal();
                        renderGallery();
                        showToast('成功上传 ' + loadedCount + ' 张截图', 'success');
                    }
                };
                reader.readAsDataURL(file);
            });
        }

        function closeUploadModal() {
            document.getElementById('upload-game-modal').classList.remove('active');
            document.getElementById('upload-game-modal').classList.add('hidden');
            pendingFiles = [];
        }

        document.getElementById('upload-modal-close').addEventListener('click', closeUploadModal);

        // ========================================
        // Event Listeners
        // ========================================
        document.getElementById('search-input').addEventListener('input', renderGallery);
        document.getElementById('game-filter').addEventListener('change', renderGallery);
        document.getElementById('sort-order').addEventListener('change', renderGallery);

        // Lightbox close
        document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
        document.getElementById('lightbox').addEventListener('click', function (e) {
            if (e.target === this) closeLightbox();
        });

        // ESC key closes lightbox
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                if (document.getElementById('lightbox').classList.contains('open')) {
                    closeLightbox();
                }
                if (document.getElementById('upload-game-modal').classList.contains('active')) {
                    closeUploadModal();
                }
            }
        });

        // Click outside modal to close
        document.getElementById('upload-game-modal').addEventListener('click', function (e) {
            if (e.target === this) closeUploadModal();
        });

        // Mobile menu toggle
        document.getElementById('mobile-menu-toggle').addEventListener('click', function () {
            var mobileMenu = document.getElementById('mobile-menu');
            mobileMenu.classList.toggle('hidden');
        });

        // ========================================
        // Initialize
        // ========================================
        document.addEventListener('DOMContentLoaded', function () {
            populateGameFilter();
            renderGallery();
        });