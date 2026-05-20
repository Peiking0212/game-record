function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// 瀹夊叏鐨?localStorage 瀛樺偍锛屽甫瀛樺偍绌洪棿妫€鏌?function safeSaveMediaLibrary() {
    try {
        var data = JSON.stringify(mediaLibrary);
        var sizeInMB = (data.length * 2) / 1024 / 1024; // 浼扮畻澶у皬锛圲TF-16 缂栫爜锛?        
        console.log('Media library size:', sizeInMB.toFixed(2), 'MB');
        
        // 濡傛灉鏁版嵁瓒呰繃 4MB锛屾彁绀虹敤鎴?        if (sizeInMB > 4) {
            showToast('濯掍綋搴撴暟鎹緝澶?(' + sizeInMB.toFixed(1) + 'MB)锛屽缓璁垹闄や竴浜涙棫鏂囦欢', 'warning');
        }
        
        localStorage.setItem('mediaLibrary', data);
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
            showToast('瀛樺偍绌洪棿涓嶈冻锛佽鍒犻櫎涓€浜涘獟浣撴枃浠跺悗鍐嶄笂浼?, 'error');
            console.error('Storage quota exceeded:', e);
        } else {
            showToast('淇濆瓨澶辫触: ' + e.message, 'error');
            console.error('Save error:', e);
        }
        return false;
    }
}

// 鍘嬬缉鍥剧墖浠ヨ妭鐪佺┖闂?function compressImage(dataUrl, maxWidth, quality) {
    return new Promise(function(resolve) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            
            // 璁＄畻鏂板昂瀵?            var width = img.width;
            var height = img.height;
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // 鍘嬬缉涓?JPEG
            var compressed = canvas.toDataURL('image/jpeg', quality);
            console.log('Image compressed:', dataUrl.length, '->', compressed.length);
            resolve(compressed);
        };
        img.src = dataUrl;
    });
}

// Data storage
var mediaLibrary = JSON.parse(localStorage.getItem('mediaLibrary')) || {
    covers: [],
    screenshots: [],
    videos: [],
    all: []
};

// Selected items for batch delete
var selectedItems = [];

// Image editor state
var currentImageData = null;
var originalImageData = null;
var currentFilters = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    filter: 'none'
};
var cropMode = false;
var cropArea = { x: 0, y: 0, width: 200, height: 200 };

// Games cache
var gamesList = [];

// Load games from localStorage
function loadGames() {
    try {
        var gamesData = localStorage.getItem('games');
        console.log('Raw games data:', gamesData);
        
        var games = [];
        if (gamesData) {
            games = JSON.parse(gamesData);
        }
        
        // 纭繚 games 鏄暟缁?        if (!Array.isArray(games)) {
            console.warn('Games data is not an array, resetting to empty array');
            games = [];
        }
        
        gamesList = games;
        console.log('Loaded games count:', games.length);
        
        // 濉厖鎵€鏈夋父鎴忛€夋嫨涓嬫媺妗?        var selects = ['cover-game-select', 'screenshots-game-select', 'videos-game-select', 'game-filter'];
        selects.forEach(function(id) {
            var select = document.getElementById(id);
            if (select) {
                var currentValue = select.value;
                // 淇濈暀绗竴涓€夐」
                var firstOption = select.options[0];
                if (!firstOption) {
                    firstOption = document.createElement('option');
                    firstOption.value = id === 'game-filter' ? 'all' : '';
                    firstOption.textContent = id === 'game-filter' ? '鎵€鏈夋父鎴? : '閫夋嫨娓告垙';
                }
                select.innerHTML = '';
                select.appendChild(firstOption);
                
                // 娣诲姞娓告垙閫夐」
                games.forEach(function(game) {
                    if (game && game.id && game.name) {
                        var option = document.createElement('option');
                        option.value = game.id;
                        option.textContent = game.name;
                        select.appendChild(option);
                    }
                });
                
                // 鎭㈠涔嬪墠鐨勯€変腑鍊硷紝濡傛灉璇ュ€间粛鐒舵湁鏁?                if (currentValue) {
                    var optionExists = Array.from(select.options).some(function(opt) {
                        return opt.value === currentValue;
                    });
                    if (optionExists) {
                        select.value = currentValue;
                    }
                }
            }
        });
        
        return games;
    } catch (e) {
        console.error('Error loading games:', e);
        return [];
    }
}

// Get game name by id
function getGameNameById(gameId) {
    if (!gameId) return '';
    var game = gamesList.find(function(g) { return g.id === gameId; });
    return game ? game.name : '';
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadGames();
    setupUploads();
    renderMediaGallery();
    setupImageEditor();
});

// Pending files waiting for upload confirmation
var pendingCoverFile = null;
var pendingScreenshotFiles = [];
var pendingVideoFiles = [];

// Setup file uploads
function setupUploads() {
    // Cover upload - select file only, show preview
    var coverUpload = document.getElementById('cover-upload');
    var coverInput = document.getElementById('cover-input');
    var coverPreview = document.getElementById('cover-preview');
    var coverGameSelect = document.getElementById('cover-game-select');
    var coverUploadBtn = document.getElementById('cover-upload-btn');

    // 纭繚鎸夐挳鍒濆闅愯棌
    if (coverUploadBtn) coverUploadBtn.classList.add('hidden');

    coverUpload.addEventListener('click', function() { coverInput.click(); });

    coverInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('璇烽€夋嫨鍥剧墖鏂囦欢', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('鏂囦欢杩囧ぇ锛岃閫夋嫨灏忎簬5MB鐨勫浘鐗?, 'error');
            return;
        }
        // 棰勮浣嗕笉涓婁紶
        pendingCoverFile = file;
        var reader = new FileReader();
        reader.onload = function(e) {
            coverPreview.innerHTML = '<img src="' + e.target.result + '" alt="灏侀潰棰勮" class="w-full h-32 object-cover rounded-lg">';
            // 鏄剧ず涓婁紶鎸夐挳
            if (coverUploadBtn) {
                coverUploadBtn.classList.remove('hidden');
                coverUploadBtn.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    });

    // Cover confirm upload
    coverUploadBtn.addEventListener('click', function() {
        if (!pendingCoverFile) return;
        var file = pendingCoverFile;
        var gameId = coverGameSelect ? coverGameSelect.value : '';

        var reader = new FileReader();
        reader.onload = async function(e) {
            // 压缩图片以节省空间
            var compressedUrl = await compressImage(e.target.result, 1200, 0.8);
            
            var imageData = {
                id: Date.now(),
                type: 'cover',
                url: compressedUrl,
                thumbnail: await generateThumbnail(compressedUrl, 200),
                uploadedAt: new Date().toISOString(),
                fileName: file.name,
                gameId: gameId
            };

            mediaLibrary.covers.push(imageData);
            mediaLibrary.all.push(imageData);
            
            if (safeSaveMediaLibrary()) {
                renderMediaGallery();
                showToast('封面上传成功', 'success');
            }

            // 重置
            pendingCoverFile = null;
            coverPreview.innerHTML = '';
            coverUploadBtn.classList.add('hidden');
            coverInput.value = '';
        };
        reader.readAsDataURL(file);
    });

    // Screenshots upload - select files only, show count
    var screenshotsUpload = document.getElementById('screenshots-upload');
    var screenshotsInput = document.getElementById('screenshots-input');
    var screenshotsCount = document.getElementById('screenshots-count');
    var screenshotsGameSelect = document.getElementById('screenshots-game-select');
    var screenshotsUploadBtn = document.getElementById('screenshots-upload-btn');

    // 纭繚鎸夐挳鍒濆闅愯棌
    if (screenshotsUploadBtn) screenshotsUploadBtn.classList.add('hidden');

    screenshotsUpload.addEventListener('click', function() { screenshotsInput.click(); });

    screenshotsInput.addEventListener('change', function(e) {
        var files = Array.from(e.target.files).filter(function(f) { return f.type.startsWith('image/'); });
        if (files.length === 0) return;
        pendingScreenshotFiles = files;
        screenshotsCount.textContent = files.length;
        // 鏄剧ず涓婁紶鎸夐挳
        if (screenshotsUploadBtn) {
            screenshotsUploadBtn.classList.remove('hidden');
            screenshotsUploadBtn.style.display = 'block';
        }
    });

    // Screenshots confirm upload
    screenshotsUploadBtn.addEventListener('click', function() {
        if (pendingScreenshotFiles.length === 0) return;
        var files = pendingScreenshotFiles;
        var gameId = screenshotsGameSelect ? screenshotsGameSelect.value : '';
        var processedCount = 0;
        var hasError = false;

        screenshotsUploadBtn.textContent = '上传中...';
        screenshotsUploadBtn.disabled = true;

        for (var i = 0; i < files.length; i++) {
            (function(file) {
                var reader = new FileReader();
                reader.onload = async function(e) {
                    // 压缩图片以节省空间
                    var compressedUrl = await compressImage(e.target.result, 1920, 0.85);
                    
                    var imageData = {
                        id: Date.now() + Math.random(),
                        type: 'screenshot',
                        url: compressedUrl,
                        thumbnail: await generateThumbnail(compressedUrl, 150),
                        uploadedAt: new Date().toISOString(),
                        fileName: file.name,
                        gameId: gameId
                    };

                    mediaLibrary.screenshots.push(imageData);
                    mediaLibrary.all.push(imageData);
                    processedCount++;

                    if (processedCount === files.length) {
                        if (safeSaveMediaLibrary()) {
                            renderMediaGallery();
                            showToast('成功上传 ' + files.length + ' 张截图', 'success');
                        } else {
                            hasError = true;
                            // 回滚添加的数据
                            mediaLibrary.screenshots.splice(-files.length);
                            mediaLibrary.all.splice(-files.length);
                        }

                        // 重置
                        pendingScreenshotFiles = [];
                        screenshotsCount.textContent = '0';
                        screenshotsUploadBtn.classList.add('hidden');
                        screenshotsUploadBtn.disabled = false;
                        screenshotsUploadBtn.innerHTML = '<i data-lucide="upload" class="w-4 h-4 inline mr-2"></i>确认上传';
                        screenshotsInput.value = '';
                        lucide.createIcons();
                    }
                };
                reader.readAsDataURL(file);
            })(files[i]);
        }
    });

    // Videos upload - select files only, show count
    var videosUpload = document.getElementById('videos-upload');
    var videosInput = document.getElementById('videos-input');
    var videosCount = document.getElementById('videos-count');
    var videosGameSelect = document.getElementById('videos-game-select');
    var videosUploadBtn = document.getElementById('videos-upload-btn');

    // 纭繚鎸夐挳鍒濆闅愯棌
    if (videosUploadBtn) videosUploadBtn.classList.add('hidden');

    videosUpload.addEventListener('click', function() { videosInput.click(); });

    videosInput.addEventListener('change', function(e) {
        var files = Array.from(e.target.files).filter(function(f) { return f.type.startsWith('video/'); });
        if (files.length === 0) return;

        var validFiles = files.filter(function(f) {
            if (f.size > 50 * 1024 * 1024) {
                showToast(f.name + ' 杩囧ぇ锛屽凡璺宠繃', 'warning');
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;
        pendingVideoFiles = validFiles;
        videosCount.textContent = validFiles.length;
        // 鏄剧ず涓婁紶鎸夐挳
        if (videosUploadBtn) {
            videosUploadBtn.classList.remove('hidden');
            videosUploadBtn.style.display = 'block';
        }
    });

    // Videos confirm upload
    videosUploadBtn.addEventListener('click', function() {
        if (pendingVideoFiles.length === 0) return;
        var files = pendingVideoFiles;
        var gameId = videosGameSelect ? videosGameSelect.value : '';
        var processedCount = 0;

        videosUploadBtn.textContent = '上传中...';
        videosUploadBtn.disabled = true;

        for (var i = 0; i < files.length; i++) {
            (function(file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var videoData = {
                        id: Date.now() + Math.random(),
                        type: 'video',
                        url: e.target.result,
                        thumbnail: generateVideoThumbnail(e.target.result),
                        uploadedAt: new Date().toISOString(),
                        fileName: file.name,
                        gameId: gameId
                    };

                    mediaLibrary.videos.push(videoData);
                    mediaLibrary.all.push(videoData);
                    processedCount++;

                    if (processedCount === files.length) {
                        if (safeSaveMediaLibrary()) {
                            renderMediaGallery();
                            showToast('成功上传 ' + files.length + ' 个视频', 'success');
                        } else {
                            // 回滚添加的数据
                            mediaLibrary.videos.splice(-files.length);
                            mediaLibrary.all.splice(-files.length);
                        }

                        // 重置
                        pendingVideoFiles = [];
                        videosCount.textContent = '0';
                        videosUploadBtn.classList.add('hidden');
                        videosUploadBtn.disabled = false;
                        videosUploadBtn.innerHTML = '<i data-lucide="upload" class="w-4 h-4 inline mr-2"></i>确认上传';
                        videosInput.value = '';
                        lucide.createIcons();
                    }
                };
                reader.readAsDataURL(file);
            })(files[i]);
        }
    });

    // Drag and drop support
    [coverUpload, screenshotsUpload, videosUpload].forEach(function(area) {
        area.addEventListener('dragover', function(e) {
            e.preventDefault();
            area.classList.add('dragover');
        });

        area.addEventListener('dragleave', function() {
            area.classList.remove('dragover');
        });

        area.addEventListener('drop', function(e) {
            e.preventDefault();
            area.classList.remove('dragover');

            var input = area.querySelector('input[type="file"]');
            input.files = e.dataTransfer.files;
            var event = new Event('change');
            input.dispatchEvent(event);
        });
    });
}

// Generate thumbnail
async function generateThumbnail(imageUrl, size) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            // Calculate aspect ratio
            const ratio = Math.min(size / img.width, size / img.height);
            const x = (size - img.width * ratio) / 2;
            const y = (size - img.height * ratio) / 2;
            
            ctx.drawImage(img, x, y, img.width * ratio, img.height * ratio);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => {
            resolve(imageUrl);
        };
        img.src = imageUrl;
    });
}

// Generate video thumbnail (using inline SVG)
function generateVideoThumbnail(videoUrl) {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><rect fill="%231a2744" width="150" height="150"/><rect fill="%23f0c040" x="55" y="50" width="40" height="40" rx="6"/><polygon fill="%231a2744" points="65,60 85,70 65,80"/></svg>';
}

// Render media gallery
function renderMediaGallery() {
    var gallery = document.getElementById('media-gallery');
    var emptyState = document.getElementById('empty-gallery');
    var filter = document.getElementById('media-filter').value;
    var gameFilter = document.getElementById('game-filter').value;
    var batchDeleteBtn = document.getElementById('batch-delete-btn');

    var items = mediaLibrary.all;

    if (filter === 'images') {
        items = mediaLibrary.screenshots;
    } else if (filter === 'videos') {
        items = mediaLibrary.videos;
    } else if (filter === 'covers') {
        items = mediaLibrary.covers;
    }

    // 鎸夋父鎴忕瓫閫?    if (gameFilter !== 'all') {
        items = items.filter(function(item) {
            return item.gameId === gameFilter;
        });
    }

    if (items.length === 0) {
        gallery.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    gallery.classList.remove('hidden');
    emptyState.classList.add('hidden');

    gallery.innerHTML = items.map(function(item) {
        var gameName = getGameNameById(item.gameId);
        var gameLabel = gameName ? '<span class="bg-blue-500 text-white text-xs px-2 py-1 rounded">' + gameName + '</span>' : '';
        var isVideo = item.type === 'video';
        var mediaContent = isVideo ?
            '<video src="' + item.url + '" poster="' + item.thumbnail + '" class="w-full h-full object-cover">' :
            '<img src="' + item.thumbnail + '" alt="' + item.fileName + '" class="w-full h-full object-cover">';
        var isSelected = selectedItems.includes(item.id) ? 'checked' : '';

        return '<div class="media-item relative group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">' +
            '<label class="absolute top-2 left-2 z-10 cursor-pointer">' +
                '<input type="checkbox" class="media-checkbox" data-id="' + item.id + '" ' + isSelected + '>' +
            '</label>' +
            '<div class="aspect-square overflow-hidden">' + mediaContent + '</div>' +
            '<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">' +
                '<button class="bg-white/90 p-2 rounded-full hover:bg-white transition-colors" onclick="openPreview(' + item.id + ')">' +
                    '<i data-lucide="eye" class="w-5 h-5 text-gray-800"></i>' +
                '</button>' +
                '<button class="bg-white/90 p-2 rounded-full hover:bg-white transition-colors" onclick="openImageEditor(' + item.id + ')">' +
                    '<i data-lucide="edit" class="w-5 h-5 text-gray-800"></i>' +
                '</button>' +
                '<button class="bg-red-500/90 p-2 rounded-full hover:bg-red-500 transition-colors" onclick="deleteMedia(' + item.id + ')">' +
                    '<i data-lucide="trash-2" class="w-5 h-5 text-white"></i>' +
                '</button>' +
            '</div>' +
            '<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">' +
                '<p class="text-white text-xs truncate">' + item.fileName + '</p>' +
                (gameLabel ? '<div class="mt-1">' + gameLabel + '</div>' : '') +
            '</div>' +
        '</div>';
    }).join('');

    // Update batch delete button
    updateBatchDeleteButton();

    // Add checkbox event listeners
    document.querySelectorAll('.media-checkbox').forEach(function(checkbox) {
        checkbox.addEventListener('change', function(e) {
            var id = parseInt(e.target.dataset.id);
            if (e.target.checked) {
                selectedItems.push(id);
            } else {
                selectedItems = selectedItems.filter(function(item) { return item !== id; });
            }
            updateBatchDeleteButton();
        });
    });

    lucide.createIcons();
}

// Update batch delete button
function updateBatchDeleteButton() {
    var batchDeleteBtn = document.getElementById('batch-delete-btn');
    if (selectedItems.length > 0) {
        batchDeleteBtn.classList.remove('hidden');
        batchDeleteBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4 inline mr-2"></i>鎵归噺鍒犻櫎 (' + selectedItems.length + ')';
    } else {
        batchDeleteBtn.classList.add('hidden');
    }
}

// Batch delete
document.getElementById('batch-delete-btn').addEventListener('click', function() {
    if (confirm('纭畾瑕佸垹闄ら€変腑鐨?' + selectedItems.length + ' 涓枃浠跺悧锛?)) {
        mediaLibrary.all = mediaLibrary.all.filter(function(item) { return !selectedItems.includes(item.id); });
        mediaLibrary.covers = mediaLibrary.covers.filter(function(item) { return !selectedItems.includes(item.id); });
        mediaLibrary.screenshots = mediaLibrary.screenshots.filter(function(item) { return !selectedItems.includes(item.id); });
        mediaLibrary.videos = mediaLibrary.videos.filter(function(item) { return !selectedItems.includes(item.id); });

        safeSaveMediaLibrary();
        selectedItems = [];
        renderMediaGallery();
        showToast('鎵归噺鍒犻櫎鎴愬姛', 'success');
    }
});

// Delete single media
function deleteMedia(id) {
    if (confirm('纭畾瑕佸垹闄よ繖涓枃浠跺悧锛?)) {
        mediaLibrary.all = mediaLibrary.all.filter(function(item) { return item.id !== id; });
        mediaLibrary.covers = mediaLibrary.covers.filter(function(item) { return item.id !== id; });
        mediaLibrary.screenshots = mediaLibrary.screenshots.filter(function(item) { return item.id !== id; });
        mediaLibrary.videos = mediaLibrary.videos.filter(function(item) { return item.id !== id; });

        safeSaveMediaLibrary();
        renderMediaGallery();
        showToast('鍒犻櫎鎴愬姛', 'success');
    }
}

// Open preview modal
function openPreview(id) {
    var item = mediaLibrary.all.find(function(item) { return item.id === id; });
    if (!item) return;

    var modal = document.getElementById('preview-modal');
    var content = document.getElementById('preview-content');
    var gameName = getGameNameById(item.gameId);
    var gameInfo = gameName ? '<p class="text-gray-600 mt-2">鍏宠仈娓告垙: ' + gameName + '</p>' : '';

    if (item.type === 'video') {
        content.innerHTML = '<video src="' + item.url + '" controls class="max-w-full max-h-96 rounded-lg"><p class="text-gray-600 mt-4">涓婁紶鏃堕棿: ' + formatDate(item.uploadedAt) + '</p>' + gameInfo;
    } else {
        content.innerHTML = '<img src="' + item.url + '" alt="' + item.fileName + '" class="max-w-full max-h-96 rounded-lg"><p class="text-gray-600 mt-4">涓婁紶鏃堕棿: ' + formatDate(item.uploadedAt) + '</p>' + gameInfo;
    }

    modal.classList.add('active');
}

// Close preview modal
function closePreviewModal() {
    document.getElementById('preview-modal').classList.remove('active');
}

// Setup image editor
function setupImageEditor() {
    // Slider event listeners
    document.getElementById('brightness-slider').addEventListener('input', function(e) {
        currentFilters.brightness = e.target.value;
        document.getElementById('brightness-value').textContent = e.target.value + '%';
        applyFiltersToCanvas();
    });

    document.getElementById('contrast-slider').addEventListener('input', function(e) {
        currentFilters.contrast = e.target.value;
        document.getElementById('contrast-value').textContent = e.target.value + '%';
        applyFiltersToCanvas();
    });

    document.getElementById('saturation-slider').addEventListener('input', function(e) {
        currentFilters.saturation = e.target.value;
        document.getElementById('saturation-value').textContent = e.target.value + '%';
        applyFiltersToCanvas();
    });
}

// Open image editor
function openImageEditor(id) {
    var item = mediaLibrary.all.find(function(item) { return item.id === id; });
    if (!item || item.type === 'video') return;

    var modal = document.getElementById('image-editor-modal');
    var canvas = document.getElementById('editor-canvas');
    var ctx = canvas.getContext('2d');

    currentImageData = item;
    currentFilters = { brightness: 100, contrast: 100, saturation: 100, filter: 'none' };

    // Reset sliders
    document.getElementById('brightness-slider').value = 100;
    document.getElementById('brightness-value').textContent = '100%';
    document.getElementById('contrast-slider').value = 100;
    document.getElementById('contrast-value').textContent = '100%';
    document.getElementById('saturation-slider').value = 100;
    document.getElementById('saturation-value').textContent = '100%';

    // Reset filter buttons
    document.querySelectorAll('.filter-item').forEach(function(item) { item.classList.remove('active'); });

    // Load image
    var img = new Image();
    img.onload = function() {
        // Resize canvas to fit container with max dimensions
        var maxWidth = 600;
        var maxHeight = 400;
        var width = img.width;
        var height = img.height;

        if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
        }
        if (height > maxHeight) {
            width = (maxHeight / height) * width;
            height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Store original
        originalImageData = ctx.getImageData(0, 0, width, height);

        modal.classList.add('active');
    };
    img.src = item.url;
}

// Close image editor
function closeImageEditor() {
    document.getElementById('image-editor-modal').classList.remove('active');
    currentImageData = null;
    originalImageData = null;
    cropMode = false;
    document.getElementById('crop-overlay').classList.add('hidden');
}

// Apply filter
function applyFilter(filter) {
    currentFilters.filter = filter;
    document.querySelectorAll('.filter-item').forEach(function(item) { item.classList.remove('active'); });
    event.target.classList.add('active');
    applyFiltersToCanvas();
}

// Apply filters to canvas
function applyFiltersToCanvas() {
    if (!originalImageData) return;

    var canvas = document.getElementById('editor-canvas');
    var ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw original image
    ctx.putImageData(originalImageData, 0, 0);

    // Apply CSS filters
    var filterString = '';
    filterString += 'brightness(' + currentFilters.brightness + '%) ';
    filterString += 'contrast(' + currentFilters.contrast + '%) ';
    filterString += 'saturate(' + currentFilters.saturation + '%) ';

    switch (currentFilters.filter) {
        case 'grayscale':
            filterString += 'grayscale(100%) ';
            break;
        case 'sepia':
            filterString += 'sepia(80%) ';
            break;
        case 'cool':
            filterString += 'hue-rotate(180deg) saturate(120%) ';
            break;
        case 'warm':
            filterString += 'hue-rotate(-15deg) saturate(110%) ';
            break;
        case 'vintage':
            filterString += 'sepia(40%) contrast(90%) brightness(95%) ';
            break;
        case 'vivid':
            filterString += 'saturate(150%) contrast(110%) ';
            break;
        case 'bright':
            filterString += 'brightness(115%) contrast(105%) ';
            break;
    }

    ctx.filter = filterString;

    // Redraw with filters
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
}

// Toggle crop mode
function toggleCropMode() {
    cropMode = !cropMode;
    var overlay = document.getElementById('crop-overlay');

    if (cropMode) {
        overlay.classList.remove('hidden');
        var canvas = document.getElementById('editor-canvas');
        cropArea = {
            x: (canvas.width - 200) / 2,
            y: (canvas.height - 200) / 2,
            width: 200,
            height: 200
        };
        updateCropBox();
    } else {
        overlay.classList.add('hidden');
    }
}

// Update crop box
function updateCropBox() {
    var cropBox = document.getElementById('crop-box');
    cropBox.style.left = cropArea.x + 'px';
    cropBox.style.top = cropArea.y + 'px';
    cropBox.style.width = cropArea.width + 'px';
    cropBox.style.height = cropArea.height + 'px';

    // Update handles position
    var handles = document.querySelectorAll('.crop-handle');
    handles[0].style.left = cropArea.x + 'px';
    handles[0].style.top = cropArea.y + 'px';
    handles[1].style.left = (cropArea.x + cropArea.width) + 'px';
    handles[1].style.top = cropArea.y + 'px';
    handles[2].style.left = cropArea.x + 'px';
    handles[2].style.top = (cropArea.y + cropArea.height) + 'px';
    handles[3].style.left = (cropArea.x + cropArea.width) + 'px';
    handles[3].style.top = (cropArea.y + cropArea.height) + 'px';
}

// Reset image
function resetImage() {
    currentFilters = { brightness: 100, contrast: 100, saturation: 100, filter: 'none' };

    document.getElementById('brightness-slider').value = 100;
    document.getElementById('brightness-value').textContent = '100%';
    document.getElementById('contrast-slider').value = 100;
    document.getElementById('contrast-value').textContent = '100%';
    document.getElementById('saturation-slider').value = 100;
    document.getElementById('saturation-value').textContent = '100%';

    document.querySelectorAll('.filter-item').forEach(function(item) { item.classList.remove('active'); });

    applyFiltersToCanvas();
}

// Save edited image
async function saveEditedImage() {
    var canvas = document.getElementById('editor-canvas');
    var thumbnailSize = parseInt(document.getElementById('thumbnail-size').value);

    // Get cropped or full image
    var editedDataUrl;
    if (cropMode) {
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropArea.width;
        tempCanvas.height = cropArea.height;
        var tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, cropArea.x, cropArea.y, cropArea.width, cropArea.height, 0, 0, cropArea.width, cropArea.height);
        editedDataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
    } else {
        editedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    }

    // Update media library
    var index = mediaLibrary.all.findIndex(function(item) { return item.id === currentImageData.id; });
    if (index !== -1) {
        mediaLibrary.all[index].url = editedDataUrl;
        mediaLibrary.all[index].thumbnail = await generateThumbnail(editedDataUrl, thumbnailSize);

        // Also update in specific category
        if (mediaLibrary.covers.find(function(item) { return item.id === currentImageData.id; })) {
            var coverIndex = mediaLibrary.covers.findIndex(function(item) { return item.id === currentImageData.id; });
            if (coverIndex !== -1) {
                mediaLibrary.covers[coverIndex].url = editedDataUrl;
                mediaLibrary.covers[coverIndex].thumbnail = mediaLibrary.all[index].thumbnail;
            }
        }
        if (mediaLibrary.screenshots.find(function(item) { return item.id === currentImageData.id; })) {
            var screenshotIndex = mediaLibrary.screenshots.findIndex(function(item) { return item.id === currentImageData.id; });
            if (screenshotIndex !== -1) {
                mediaLibrary.screenshots[screenshotIndex].url = editedDataUrl;
                mediaLibrary.screenshots[screenshotIndex].thumbnail = mediaLibrary.all[index].thumbnail;
            }
        }

        safeSaveMediaLibrary();
        renderMediaGallery();
        closeImageEditor();
        showToast('鍥剧墖缂栬緫淇濆瓨鎴愬姛', 'success');
    }
}

// Filter change
document.getElementById('media-filter').addEventListener('change', function() {
    renderMediaGallery();
});

// Game filter change
document.getElementById('game-filter').addEventListener('change', function() {
    renderMediaGallery();
});

// Show toast
function showToast(message, type) {
    type = type || 'info';
    var toast = document.getElementById('toast');
    var toastMessage = document.getElementById('toast-message');

    toastMessage.textContent = message;
    toast.className = 'toast ' + type + ' show';

    setTimeout(function() {
        toast.classList.remove('show');
    }, 3000);
}

// Mobile menu toggle
document.getElementById('mobile-menu-toggle').addEventListener('click', function() {
    var mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
});

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    var modals = document.querySelectorAll('.modal');
    modals.forEach(function(modal) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});
