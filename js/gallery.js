// ========================================
// Constants
// ========================================
var GAMES_KEY = window.GameData ? window.GameData.KEYS.GAMES : 'games';
var BUCKET = 'media';
var TABLE  = 'media';

var IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|heic|heif|svg)(\?|#|$)/i;
var VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|avi|mkv)(\?|#|$)/i;

function compareMediaId(a, b) {
    return String(a) === String(b);
}

/** 纠正误标为 video 的图片（上传时 pendingFileType 被提前清空会导致此问题） */
function normalizeMediaType(item) {
    if (!item) return 'image';
    var t = (item.type || '').toLowerCase();
    var name = (item.name || '').toLowerCase();
    var url = (item.url || '').toLowerCase();
    if (t === 'image') return 'image';
    if (IMAGE_EXT_RE.test(name) || IMAGE_EXT_RE.test(url)) return 'image';
    if (t === 'video' || VIDEO_EXT_RE.test(name) || VIDEO_EXT_RE.test(url)) return 'video';
    return t || 'image';
}

function isImageFile(file) {
    if (file.type && file.type.indexOf('image/') === 0) return true;
    return IMAGE_EXT_RE.test(file.name || '');
}

function isVideoFile(file) {
    if (file.type && file.type.indexOf('video/') === 0) return true;
    return VIDEO_EXT_RE.test(file.name || '');
}

// ========================================
// Utility Functions
// ========================================
function getData(key, defaultValue) {
    if (window.GameData) return window.GameData.get(key, defaultValue === undefined ? [] : defaultValue);
    if (defaultValue === undefined) defaultValue = [];
    var data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
}

function saveData(key, data) {
    try {
        var json = JSON.stringify(data);
        if (json.length > 4 * 1024 * 1024) {
            showToast('存储空间不足，请删除一些旧媒体', 'error');
            return false;
        }
        if (window.GameData) return window.GameData.set(key, data);
        localStorage.setItem(key, json);
        return true;
    } catch (e) {
        console.error('存储失败:', e);
        if (e.name === 'QuotaExceededError') {
            showToast('存储空间已满！请删除一些旧媒体后重试', 'error');
        }
        return false;
    }
}

/* 勿在此文件声明 escapeHtml / generateId / formatDate，否则会覆盖 utils.js 挂到 window 上的同名函数导致死循环 */

function showToast(message, type) {
    if (type === undefined) type = 'info';
    var toast = document.getElementById('toast');
    var toastMessage = document.getElementById('toast-message');
    toastMessage.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(function () {
        toast.classList.remove('show');
    }, 5000);
}

function formatSupabaseError(err) {
    if (!err) return '未知错误';
    if (typeof err === 'string') return err;
    var msg = err.message || err.error_description || err.msg || '';
    if (err.statusCode) msg = (msg ? msg + ' ' : '') + '(' + err.statusCode + ')';
    return msg || JSON.stringify(err);
}

async function resolveMediaUserId() {
    if (window.GameAuth && window.GameAuth.getUserId) {
        return await window.GameAuth.getUserId();
    }
    if (window.SB) {
        var session = await window.SB.auth.getSession();
        return session.data && session.data.session ? session.data.session.user.id : null;
    }
    return null;
}

function mediaStoragePrefix(userId) {
    return userId + '/media/';
}

function storagePathFromPublicUrl(url) {
    if (!url) return null;
    var markers = [
        '/object/public/' + BUCKET + '/',
        '/object/sign/' + BUCKET + '/'
    ];
    for (var i = 0; i < markers.length; i++) {
        var idx = url.indexOf(markers[i]);
        if (idx !== -1) {
            return decodeURIComponent(url.slice(idx + markers[i].length).split('?')[0]);
        }
    }
    return null;
}

/** 云端上传失败时写入本机，避免完全传不上去 */
async function saveMediaLocally(file, gameId, gameName, type) {
    var allMedia = getData('game_record_media');
    var dataUrl = await readFile(file);
    var resolved = window.GameData ? window.GameData.resolveGameFieldsFromSelect(gameId) : { gameId: gameId, gameName: gameName };
    var item = {
        id: window.generateId(),
        type: type,
        url: dataUrl,
        name: file.name,
        gameId: resolved.gameId || null,
        gameName: resolved.gameName || gameName || '',
        time: new Date().toISOString()
    };
    if (type === 'image') {
        item.url = await compressImage(dataUrl, 1920, 0.9);
        item.thumbnail = await generateThumbnail(item.url);
    } else {
        try {
            item.thumbnail = await generateVideoCover(file);
        } catch (e) {
            item.thumbnail = generateVideoThumbnail();
        }
    }
    allMedia.push(item);
    saveData('game_record_media', allMedia);
}

async function checkMediaCloudHealth() {
    if (!window.SB) return { ok: false, reason: '未加载 Supabase（将使用本机存储）' };
    try {
        var userId = await resolveMediaUserId();
        if (!userId) {
            return { ok: false, reason: '未登录，无法使用云端媒体库' };
        }
        var tableCheck = await window.SB.from(TABLE).select('id').eq('user_id', userId).limit(1);
        if (tableCheck.error) {
            return { ok: false, reason: '数据库 media 表：' + formatSupabaseError(tableCheck.error) };
        }
        var bucketCheck = await window.SB.storage.from(BUCKET).list(userId, { limit: 1 });
        if (bucketCheck.error) {
            return { ok: false, reason: 'Storage 桶 media：' + formatSupabaseError(bucketCheck.error) };
        }
        return { ok: true, reason: '' };
    } catch (e) {
        return { ok: false, reason: formatSupabaseError(e) };
    }
}

// ========================================
// Clear All Media
// ========================================
async function clearAllMedia() {
    if (!confirm('确定要清空所有媒体文件吗？此操作不可恢复！')) return;

    if (window.SB) {
        try {
            var userId = await resolveMediaUserId();
            if (!userId) {
                showToast('请先登录', 'error');
                return;
            }
            var result = await window.SB.from(TABLE).select('url, thumbnail').eq('user_id', userId);
            if (result.data && result.data.length > 0) {
                var paths = [];
                result.data.forEach(function (row) {
                    var mainPath = storagePathFromPublicUrl(row.url);
                    var thumbPath = storagePathFromPublicUrl(row.thumbnail);
                    if (mainPath) paths.push(mainPath);
                    if (thumbPath) paths.push(thumbPath);
                });
                if (paths.length > 0) {
                    await window.SB.storage.from(BUCKET).remove(paths);
                }
                await window.SB.from(TABLE).delete().eq('user_id', userId);
            }
            renderGallery();
            showToast('已清空所有媒体', 'success');
        } catch (e) {
            console.error('清空失败:', e);
            showToast('清空失败', 'error');
        }
    } else {
        saveData('game_record_media', []);
        renderGallery();
        showToast('已清空所有媒体', 'success');
    }
}

// ========================================
// Compression & Thumbnail Functions
// ========================================

// 压缩图片以节省空间
function compressImage(dataUrl, maxWidth, quality) {
    return new Promise(function(resolve) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');

            // 计算新尺寸
            var width = img.width;
            var height = img.height;
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // 压缩为 JPEG
            var compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
        };
        img.src = dataUrl;
    });
}

// 生成缩略图（保持比例，最大宽度 1080px）
function generateThumbnail(imageUrl, maxWidth) {
    if (!maxWidth) maxWidth = 1080;
    return new Promise(function(resolve) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            var canvas = document.createElement('canvas');
            
            // 保持原始比例
            var scale = Math.min(1, maxWidth / img.width);
            var width = img.width * scale;
            var height = img.height * scale;
            
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.92));
        };
        img.onerror = function() {
            resolve(imageUrl);
        };
        img.src = imageUrl;
    });
}

// 生成视频缩略图（使用 SVG 占位图）- 本地模式用
function generateVideoThumbnail() {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><rect fill="%231a2744" width="150" height="150"/><rect fill="%23f0c040" x="55" y="50" width="40" height="40" rx="6"/><polygon fill="%231a2744" points="65,60 85,70 65,80"/></svg>');
}

// 截取视频第一帧作为封面（云存储模式用）
function generateVideoCover(file) {
    return new Promise(function(resolve, reject) {
        var video = document.createElement('video');
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        
        video.preload = 'metadata';
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        
        video.onloadedmetadata = function() {
            // 设置 canvas 尺寸（保持比例，最大宽度 1080）
            var maxWidth = 1080;
            var scale = Math.min(1, maxWidth / video.videoWidth);
            canvas.width = video.videoWidth * scale;
            canvas.height = video.videoHeight * scale;
            
            video.currentTime = 0.1; // 跳到第一帧附近
        };
        
        video.onseeked = function() {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            var dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            URL.revokeObjectURL(video.src);
            resolve(dataUrl);
        };
        
        video.onerror = function(e) {
            URL.revokeObjectURL(video.src);
            reject(e);
        };
        
        // 创建 blob URL 来加载视频
        video.src = URL.createObjectURL(file);
    });
}

// ========================================
// Get all media from game_record_media
// ========================================
function getAllMedia() {
    if (window.SB) {
        return fetchMediaFromCloud();
    }
    return getData('game_record_media');
}

// 从 Supabase 获取媒体列表
async function fetchMediaFromCloud() {
    if (window.GameCloud && window.GameCloud.fetchMedia) {
        return window.GameCloud.fetchMedia();
    }
    try {
        var userId = await resolveMediaUserId();
        if (!userId) return [];
        var result = await window.SB
            .from(TABLE)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (result.error) throw result.error;
        // 映射字段：created_at → time, game_name → gameName
        return (result.data || []).map(function(row) {
            var item = {
                id: row.id,
                type: row.type,
                url: row.url,
                name: row.name,
                gameName: row.game_name || '',
                time: row.created_at,
                thumbnail: row.thumbnail || null
            };
            item.type = normalizeMediaType(item);
            if (window.GameData) item = window.GameData.migrateRecordGameId(item, 'gameName');
            return item;
        });
    } catch (e) {
        console.error('获取媒体失败:', e);
        return [];
    }
}

// Get game names from games data
function getLibraryGames() {
    return window.GameData ? window.GameData.getGames() : getData(GAMES_KEY);
}

function resolveSelectedGame(selectValue) {
    if (!selectValue || selectValue === 'all') return { gameId: null, gameName: '' };
    if (window.GameData) return window.GameData.resolveGameFieldsFromSelect(selectValue);
    return { gameId: selectValue, gameName: selectValue };
}

function mediaBelongsToGameFilter(item, gameFilter) {
    if (!gameFilter || gameFilter === 'all') return true;
    var game = window.GameData ? window.GameData.getGameById(gameFilter) : null;
    if (game && window.GameData) return window.GameData.recordBelongsToGame(item, game, 'gameName');
    return item.gameName === gameFilter;
}

// ========================================
// Populate game filter dropdown
// ========================================
function populateGameFilter() {
    var select = document.getElementById('game-filter');
    if (window.GameData) {
        window.GameData.populateGameSelect(select, { includeAll: true });
        return;
    }
    var games = getLibraryGames();
    var currentVal = select.value;
    while (select.options.length > 1) select.remove(1);
    games.forEach(function (g) {
        var opt = document.createElement('option');
        opt.value = String(g.id);
        opt.textContent = g.name;
        select.appendChild(opt);
    });
    select.value = currentVal;
}

// ========================================
// Render Gallery
// ========================================
async function renderGallery() {
    if (window.GameData) window.GameData.migrateGameLinks();
    var allMedia = await getAllMedia();
    var grid = document.getElementById('gallery-grid');
    var emptyState = document.getElementById('empty-state');
    var countEl = document.getElementById('total-count');

    // Get filter & sort values
    var searchTerm = document.getElementById('search-input').value.trim().toLowerCase();
    var gameFilter = document.getElementById('game-filter').value;
    var typeFilter = document.getElementById('media-type-filter') ? document.getElementById('media-type-filter').value : 'all';
    var sortOrder = document.getElementById('sort-order').value;

    // Apply filters
    var filteredMedia = allMedia;

    if (searchTerm) {
        filteredMedia = filteredMedia.filter(function (item) {
            return (item.gameName || '').toLowerCase().indexOf(searchTerm) !== -1;
        });
    }
    if (gameFilter && gameFilter !== 'all') {
        filteredMedia = filteredMedia.filter(function (item) {
            return mediaBelongsToGameFilter(item, gameFilter);
        });
    }
    if (typeFilter && typeFilter !== 'all') {
        filteredMedia = filteredMedia.filter(function (item) {
            return item.type === typeFilter;
        });
    }

    // Sort
    filteredMedia.sort(function (a, b) {
        var timeA = a.time ? new Date(a.time).getTime() : 0;
        var timeB = b.time ? new Date(b.time).getTime() : 0;
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    // Update count
    countEl.textContent = filteredMedia.length;

    if (filteredMedia.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    grid.innerHTML = filteredMedia.map(function (item) {
        item.type = normalizeMediaType(item);
        var thumbnailUrl = item.thumbnail || item.url;
        var displayName = item.gameName ? window.escapeHtml(item.gameName) : '';
        var displayDate = item.time ? window.formatDateISO(item.time) : '';
        var nameHtml = displayName ? '<span class="text-sm font-medium">' + displayName + '</span>' : '';

        // 根据类型显示不同图标
        var typeIcon = '';
        if (item.type === 'video') {
            typeIcon = '<div class="absolute top-2 right-2 bg-purple-500 text-white p-1 rounded"><i data-lucide="video" class="w-4 h-4"></i></div>';
        }

        var actionButtons = '';
        if (item.type === 'video') {
            actionButtons = '<button class="gallery-btn" onclick="openLightbox(\'' + item.id + '\')" title="播放">' +
                '<i data-lucide="play" class="w-4 h-4"></i></button>';
        } else {
            actionButtons = '<button class="gallery-btn" onclick="openLightbox(\'' + item.id + '\')" title="查看">' +
                '<i data-lucide="eye" class="w-4 h-4"></i></button>' +
                '<button class="gallery-btn" onclick="openImageEditor(\'' + item.id + '\')" title="编辑">' +
                '<i data-lucide="edit" class="w-4 h-4"></i></button>';
        }

        return '<div class="gallery-item" data-id="' + item.id + '" onclick="openLightbox(\'' + item.id + '\')">' +
            '<img src="' + thumbnailUrl + '" alt="' + (displayName || '媒体') + '" loading="lazy" onerror="this.src=\'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%23E8F0F8" width="400" height="300"/><text x="200" y="150" text-anchor="middle" dy=".3em" fill="%2394A3B8" font-size="16">图片加载失败</text></svg>') + '\'">' +
            typeIcon +
            '<div class="gallery-actions" onclick="event.stopPropagation()">' +
            actionButtons +
            '<button class="gallery-btn gallery-btn-danger" onclick="deleteMedia(\'' + item.id + '\')" title="删除">' +
            '<i data-lucide="trash-2" class="w-4 h-4"></i></button></div>' +
            '<div class="gallery-overlay">' +
            nameHtml +
            (displayDate ? '<span class="text-xs opacity-80 block mt-1">' + displayDate + '</span>' : '') +
            '</div></div>';
    }).join('');

    lucide.createIcons();
}

// ========================================
// Lightbox
// ========================================
function openLightbox(id) {
    var allMedia = getAllMedia();
    if (window.SB) {
        allMedia.then(function(media) { showLightbox(media, id); });
        return;
    }
    showLightbox(allMedia, id);
}

function showLightbox(allMedia, id) {
    var item = allMedia.find(function (m) { return compareMediaId(m.id, id); });
    if (!item) return;
    item.type = normalizeMediaType(item);

    var lightbox = document.getElementById('lightbox');
    var container = document.getElementById('lightbox-media-container');
    var info = document.getElementById('lightbox-info');

    // 根据类型渲染不同的内容
    if (item.type === 'video') {
        container.innerHTML = '<video src="' + item.url + '" controls class="max-w-full max-h-[70vh] rounded-lg"></video>';
    } else {
        container.innerHTML = '<img id="lightbox-image" src="' + item.url + '" alt="' + (item.gameName || '图片') + '" class="max-w-full max-h-[70vh] rounded-lg">';
    }

    var nameText = item.gameName ? window.escapeHtml(item.gameName) : '未指定游戏';
    var dateText = item.time ? window.formatDateISO(item.time) : '';
    var typeText = item.type === 'video' ? '视频' : '截图';
    info.innerHTML = '<p class="text-lg font-medium">' + nameText + '</p>' +
        '<p class="text-sm text-gray-300 mt-1">' + typeText + '</p>' +
        (dateText ? '<p class="text-sm text-gray-300 mt-1">上传于 ' + dateText + '</p>' : '');

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
    // 停止视频播放
    var video = document.querySelector('#lightbox-media-container video');
    if (video) {
        video.pause();
    }
}

// ========================================
// Delete Media
// ========================================
function deleteMedia(id) {
    if (confirm('确定要删除这个媒体文件吗？')) {
        if (window.SB) {
            deleteFromCloud(id);
            return;
        }
        deleteFromLocal(id);
    }
}

async function deleteFromCloud(id) {
    try {
        var userId = await resolveMediaUserId();
        if (!userId) throw new Error('未登录');
        var rowResult = await window.SB.from(TABLE).select('url, thumbnail').eq('id', id).eq('user_id', userId).maybeSingle();
        if (rowResult.error) throw rowResult.error;
        var paths = [];
        if (rowResult.data) {
            var mainPath = storagePathFromPublicUrl(rowResult.data.url);
            var thumbPath = storagePathFromPublicUrl(rowResult.data.thumbnail);
            if (mainPath) paths.push(mainPath);
            if (thumbPath) paths.push(thumbPath);
        }
        var dbResult = await window.SB.from(TABLE).delete().eq('id', id).eq('user_id', userId);
        if (dbResult.error) console.error('删除数据库记录失败:', dbResult.error);
        if (paths.length > 0) {
            var storageResult = await window.SB.storage.from(BUCKET).remove(paths);
            if (storageResult.error) console.error('删除存储文件失败:', storageResult.error);
        }
        renderGallery();
        showToast('媒体已删除', 'success');
    } catch (e) {
        console.error('删除失败:', e);
        deleteFromLocal(id);
    }
}

function deleteFromLocal(id) {
    var allMedia = getAllMedia();
    allMedia = allMedia.filter(function (item) {
        return item.id !== id;
    });
    saveData('game_record_media', allMedia);
    renderGallery();
    showToast('媒体已删除', 'success');
}

// ========================================
// Upload Functions
// ========================================

// 待上传的文件队列
var pendingFiles = [];
var pendingFileType = ''; // 'image', 'video'

// 截图上传处理
document.getElementById('gallery-upload-input').addEventListener('change', function (e) {
    var files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Filter only image files
    pendingFiles = files.filter(isImageFile);

    if (pendingFiles.length === 0) {
        showToast('请选择图片文件', 'error');
        return;
    }

    pendingFileType = 'image';
    showUploadModal();
    this.value = '';
});

// 视频上传处理
document.getElementById('video-upload-input').addEventListener('change', function (e) {
    var files = Array.from(e.target.files);
    if (files.length === 0) return;

    pendingFiles = files.filter(isVideoFile);

    if (pendingFiles.length === 0) {
        showToast('请选择视频文件', 'error');
        return;
    }

    // 检查文件大小
    var validFiles = pendingFiles.filter(function(f) {
        if (f.size > 50 * 1024 * 1024) {
            showToast(f.name + ' 太大，已跳过（最大 50MB）', 'warning');
            return false;
        }
        return true;
    });

    if (validFiles.length === 0) {
        pendingFiles = [];
        return;
    }

    pendingFiles = validFiles;
    pendingFileType = 'video';
    showUploadModal();
    this.value = '';
});

// 显示上传弹窗
function showUploadModal() {
    var select = document.getElementById('upload-type-game-select');
    if (window.GameData) {
        window.GameData.populateGameSelect(select, { placeholder: '选择游戏（可选）' });
    } else {
        var games = getLibraryGames();
        while (select.options.length > 1) select.remove(1);
        games.forEach(function (g) {
            var opt = document.createElement('option');
            opt.value = String(g.id);
            opt.textContent = g.name;
            select.appendChild(opt);
        });
    }
    select.value = '';

    // 显示上传类型和数量
    var typeLabel = document.getElementById('upload-type-label');
    var uploadCount = document.getElementById('upload-count');
    var btnText = document.getElementById('upload-btn-text');

    var typeName = pendingFileType === 'image' ? '截图' : '视频';
    typeLabel.textContent = typeName;
    uploadCount.textContent = pendingFiles.length;
    btnText.textContent = '确认上传 ' + pendingFiles.length + ' 个' + typeName;

    document.getElementById('upload-type-modal').classList.add('active');
}

// 关闭上传弹窗
function closeUploadTypeModal() {
    document.getElementById('upload-type-modal').classList.remove('active');
    pendingFiles = [];
    pendingFileType = '';
}

// 确认上传
async function confirmTypeUpload() {
    var select = document.getElementById('upload-type-game-select');
    var selected = resolveSelectedGame(select.value);
    var gameId = selected.gameId;
    var gameName = selected.gameName;

    if (pendingFiles.length === 0 || !pendingFileType) {
        showToast('没有选择文件', 'error');
        return;
    }

    var uploadType = pendingFileType;

    var loadedCount = 0;
    var errorCount = 0;
    var total = pendingFiles.length;

    var btnText = document.getElementById('upload-btn-text');
    var btn = document.getElementById('confirm-upload-type-btn');
    btnText.textContent = '上传中...';
    btn.disabled = true;

    var lastError = '';

    if (window.SB) {
        var health = await checkMediaCloudHealth();
        if (!health.ok) {
            showToast('云端不可用：' + health.reason + '，已改存本机', 'error');
            console.error('[媒体库]', health.reason);
        }

        for (var i = 0; i < pendingFiles.length; i++) {
            var file = pendingFiles[i];
            try {
                if (health.ok) {
                    await uploadFileToCloud(file, gameId, gameName, uploadType);
                } else {
                    await saveMediaLocally(file, gameId, gameName, uploadType);
                }
                loadedCount++;
            } catch (err) {
                lastError = formatSupabaseError(err);
                console.error('上传失败:', file.name, err);
                try {
                    await saveMediaLocally(file, gameId, gameName, uploadType);
                    loadedCount++;
                    errorCount++;
                } catch (localErr) {
                    console.error('本机备份也失败:', file.name, localErr);
                    errorCount++;
                }
            }
        }
    } else {
        // 本地存储
        var allMedia = await getAllMedia();
        for (var i = 0; i < pendingFiles.length; i++) {
            var file = pendingFiles[i];
            try {
                var dataUrl = await readFile(file);
                var item = {
                    id: window.generateId(),
                    type: uploadType,
                    url: dataUrl,
                    name: file.name,
                    gameId: gameId || null,
                    gameName: gameName || '',
                    time: new Date().toISOString()
                };
                if (uploadType === 'image') {
                    item.url = await compressImage(dataUrl, 1920, 0.9);
                    item.thumbnail = await generateThumbnail(item.url);
                } else if (uploadType === 'video') {
                    // 本地模式也尝试生成视频封面
                    try {
                        item.thumbnail = await generateVideoCover(file);
                    } catch (e) {
                        item.thumbnail = generateVideoThumbnail(); // 失败用占位图
                    }
                }
                allMedia.push(item);
                loadedCount++;
            } catch (err) {
                console.error('上传失败:', file.name, err);
                errorCount++;
            }
        }
        saveData('game_record_media', allMedia);
    }

    var typeName = uploadType === 'image' ? '截图' : '视频';
    closeUploadTypeModal();
    populateGameFilter();
    renderGallery();
    if (loadedCount > 0) {
        showToast('成功上传 ' + loadedCount + ' 个' + typeName, 'success');
    }
    if (errorCount > 0) {
        var hint = lastError ? '。原因：' + lastError : '';
        showToast(errorCount + ' 个文件云端失败，已尝试存本机' + hint, 'error');
    }
    btnText.textContent = '确认上传';
    btn.disabled = false;
}

// 上传单个文件到 Supabase（fileType 必须为 'image' 或 'video'，勿依赖全局 pendingFileType）
async function uploadFileToCloud(file, gameId, gameName, fileType) {
    var userId = await resolveMediaUserId();
    if (!userId) throw new Error('未登录，无法上传到云端');

    var resolved = window.GameData ? window.GameData.resolveGameFieldsFromSelect(gameId) : { gameId: gameId, gameName: gameName };
    gameName = resolved.gameName || gameName || '';

    if (window.GameCloud && window.GameCloud.uploadMedia && fileType === 'image') {
        var ok = await window.GameCloud.uploadMedia(file, fileType, gameName);
        if (!ok) throw new Error('云端上传失败');
        return;
    }

    var id = window.generateId();
    var ext = (file.name.split('.').pop() || (fileType === 'video' ? 'mp4' : 'jpg')).toLowerCase();
    var prefix = mediaStoragePrefix(userId);
    var storagePath = prefix + id + '.' + ext;

    // 处理图片：压缩后上传
    if (fileType === 'image') {
        var dataUrl = await readFile(file);
        var compressed = await compressImage(dataUrl, 1920, 0.9);
        var thumb = await generateThumbnail(compressed);

        var blob = dataURLtoBlob(compressed);
        var uploadResult = await window.SB.storage.from(BUCKET).upload(storagePath, blob, {
            contentType: 'image/jpeg',
            upsert: true
        });
        if (uploadResult.error) throw uploadResult.error;

        var thumbPath = prefix + 'thumb_' + id + '.jpg';
        var thumbUp = await window.SB.storage.from(BUCKET).upload(thumbPath, dataURLtoBlob(thumb), {
            contentType: 'image/jpeg',
            upsert: true
        });
        if (thumbUp.error) throw thumbUp.error;

        var publicUrl = window.SB.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
        var thumbUrl = window.SB.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;

        var insertResult = await window.SB.from(TABLE).insert({
            id: id,
            type: 'image',
            url: publicUrl,
            thumbnail: thumbUrl,
            name: file.name,
            game_name: gameName || '',
            user_id: userId
        });
        if (insertResult.error) throw insertResult.error;
    } else {
        var videoThumb = await generateVideoCover(file);

        var uploadResult = await window.SB.storage.from(BUCKET).upload(storagePath, file, {
            contentType: file.type || 'video/mp4',
            upsert: true
        });
        if (uploadResult.error) throw uploadResult.error;

        var thumbPath = prefix + 'thumb_' + id + '.jpg';
        var thumbUpV = await window.SB.storage.from(BUCKET).upload(thumbPath, dataURLtoBlob(videoThumb), {
            contentType: 'image/jpeg',
            upsert: true
        });
        if (thumbUpV.error) throw thumbUpV.error;

        var publicUrl = window.SB.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
        var thumbUrl = window.SB.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;

        var insertResult = await window.SB.from(TABLE).insert({
            id: id,
            type: 'video',
            url: publicUrl,
            thumbnail: thumbUrl,
            name: file.name,
            game_name: gameName || '',
            user_id: userId
        });
        if (insertResult.error) throw insertResult.error;
    }
}

// 将 dataURL 转换为 Blob
function dataURLtoBlob(dataUrl) {
    var parts = dataUrl.split(',');
    var mime = parts[0].match(/:(.*?);/)[1];
    var bstr = atob(parts[1]);
    var n = bstr.length;
    var u8arr = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
}

function readFile(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) { resolve(e.target.result); };
        reader.onerror = function(e) { reject(e); };
        reader.readAsDataURL(file);
    });
}

// ========================================
// Image Editor Functions
// ========================================

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

// 打开图片编辑器
function openImageEditor(id) {
    var allMedia = getAllMedia();
    if (window.SB) {
        allMedia.then(function(media) { openEditorWithData(media, id); });
        return;
    }
    openEditorWithData(allMedia, id);
}

function openEditorWithData(allMedia, id) {
    var item = allMedia.find(function (m) { return compareMediaId(m.id, id); });
    if (!item) {
        showToast('找不到该媒体', 'error');
        return;
    }
    item.type = normalizeMediaType(item);
    if (item.type === 'video') {
        showToast('视频暂不支持编辑', 'info');
        return;
    }

    var modal = document.getElementById('image-editor-modal');
    var canvas = document.getElementById('editor-canvas');
    var ctx = canvas.getContext('2d');

    currentImageData = item;
    currentFilters = { brightness: 100, contrast: 100, saturation: 100, filter: 'none' };

    document.getElementById('brightness-slider').value = 100;
    document.getElementById('brightness-value').textContent = '100%';
    document.getElementById('contrast-slider').value = 100;
    document.getElementById('contrast-value').textContent = '100%';
    document.getElementById('saturation-slider').value = 100;
    document.getElementById('saturation-value').textContent = '100%';
    document.querySelectorAll('.filter-item').forEach(function(el) { el.classList.remove('active'); });

    function finishEditorSetup(img) {
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

        try {
            originalImageData = ctx.getImageData(0, 0, width, height);
        } catch (e) {
            originalImageData = null;
            console.warn('[媒体库] 无法读取像素数据，滤镜可能受限', e);
        }

        modal.classList.add('active');
    }

    function loadViaImage(src, useCors) {
        var img = new Image();
        if (useCors) img.crossOrigin = 'anonymous';
        img.onload = function() { finishEditorSetup(img); };
        img.onerror = function() {
            if (useCors) {
                loadViaImage(src, false);
            } else {
                showToast('无法加载图片进行编辑', 'error');
            }
        };
        img.src = src;
    }

    fetch(item.url, { mode: 'cors' })
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.blob();
        })
        .then(function(blob) {
            var objectUrl = URL.createObjectURL(blob);
            var img = new Image();
            img.onload = function() {
                finishEditorSetup(img);
                URL.revokeObjectURL(objectUrl);
            };
            img.onerror = function() {
                URL.revokeObjectURL(objectUrl);
                loadViaImage(item.url, true);
            };
            img.src = objectUrl;
        })
        .catch(function() {
            loadViaImage(item.url, true);
        });
}

// 关闭图片编辑器
function closeImageEditor() {
    document.getElementById('image-editor-modal').classList.remove('active');
    currentImageData = null;
    originalImageData = null;
    cropMode = false;
    document.getElementById('crop-overlay').classList.add('hidden');
}

// 应用滤镜
function applyFilter(filter) {
    currentFilters.filter = filter;
    document.querySelectorAll('.filter-item').forEach(function(el) { el.classList.remove('active'); });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    applyFiltersToCanvas();
}

// 应用滤镜到画布
function applyFiltersToCanvas() {
    if (!originalImageData) return;

    var canvas = document.getElementById('editor-canvas');
    var ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw original image
    ctx.putImageData(originalImageData, 0, 0);

    // Build filter string
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

// 切换裁剪模式
function toggleCropMode() {
    cropMode = !cropMode;
    var overlay = document.getElementById('crop-overlay');

    if (cropMode) {
        overlay.classList.remove('hidden');
        var canvas = document.getElementById('editor-canvas');
        cropArea = {
            x: Math.max(0, (canvas.width - 200) / 2),
            y: Math.max(0, (canvas.height - 200) / 2),
            width: 200,
            height: 200
        };
        updateCropBox();
    } else {
        overlay.classList.add('hidden');
    }
}

// 更新裁剪框
function updateCropBox() {
    var cropBox = document.getElementById('crop-box');
    cropBox.style.left = cropArea.x + 'px';
    cropBox.style.top = cropArea.y + 'px';
    cropBox.style.width = cropArea.width + 'px';
    cropBox.style.height = cropArea.height + 'px';

    // Update handles position
    var handles = document.querySelectorAll('.crop-handle');
    if (handles.length >= 4) {
        handles[0].style.left = cropArea.x + 'px';
        handles[0].style.top = cropArea.y + 'px';
        handles[1].style.left = (cropArea.x + cropArea.width) + 'px';
        handles[1].style.top = cropArea.y + 'px';
        handles[2].style.left = cropArea.x + 'px';
        handles[2].style.top = (cropArea.y + cropArea.height) + 'px';
        handles[3].style.left = (cropArea.x + cropArea.width) + 'px';
        handles[3].style.top = (cropArea.y + cropArea.height) + 'px';
    }
}

// 重置图片
function resetImage() {
    currentFilters = { brightness: 100, contrast: 100, saturation: 100, filter: 'none' };

    document.getElementById('brightness-slider').value = 100;
    document.getElementById('brightness-value').textContent = '100%';
    document.getElementById('contrast-slider').value = 100;
    document.getElementById('contrast-value').textContent = '100%';
    document.getElementById('saturation-slider').value = 100;
    document.getElementById('saturation-value').textContent = '100%';

    document.querySelectorAll('.filter-item').forEach(function(el) { el.classList.remove('active'); });

    applyFiltersToCanvas();
}

// 保存编辑后的图片
async function saveEditedImage() {
    var canvas = document.getElementById('editor-canvas');
    var thumbnailSize = parseInt(document.getElementById('thumbnail-size').value);

    // 获取裁剪或完整的图片
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

    if (window.SB) {
        // 云存储：重新上传编辑后的图片
        try {
            var userId = await resolveMediaUserId();
            if (!userId) throw new Error('未登录');
            var id = currentImageData.id;
            var prefix = mediaStoragePrefix(userId);
            var storagePath = prefix + 'edited_' + window.generateId() + '.jpg';
            var blob = dataURLtoBlob(editedDataUrl);
            var uploadResult = await window.SB.storage.from(BUCKET).upload(storagePath, blob, {
                contentType: 'image/jpeg',
                upsert: true
            });
            if (uploadResult.error) throw uploadResult.error;

            var thumb = await generateThumbnail(editedDataUrl, thumbnailSize);
            var thumbPath = prefix + 'thumb_' + id + '.jpg';
            await window.SB.storage.from(BUCKET).upload(thumbPath, dataURLtoBlob(thumb), {
                contentType: 'image/jpeg',
                upsert: true
            });

            var publicUrl = window.SB.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
            var thumbUrl = window.SB.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;

            var updateResult = await window.SB.from(TABLE).update({
                url: publicUrl,
                thumbnail: thumbUrl
            }).eq('id', id).eq('user_id', userId);
            if (updateResult.error) throw updateResult.error;

            closeImageEditor();
            renderGallery();
            showToast('图片编辑保存成功', 'success');
        } catch (e) {
            console.error('保存失败:', e);
            showToast('保存失败，请重试', 'error');
        }
    } else {
        // 本地存储
        var allMedia = await getAllMedia();
        var index = allMedia.findIndex(function(item) { return item.id === currentImageData.id; });
        if (index !== -1) {
            allMedia[index].url = editedDataUrl;
            allMedia[index].thumbnail = await generateThumbnail(editedDataUrl, thumbnailSize);
            saveData('game_record_media', allMedia);
            closeImageEditor();
            renderGallery();
            showToast('图片编辑保存成功', 'success');
        }
    }
}

// ========================================
// Setup Image Editor Sliders
// ========================================
function setupImageEditor() {
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

// ========================================
// Event Listeners
// ========================================

// Search and filter
document.getElementById('search-input').addEventListener('input', renderGallery);
document.getElementById('game-filter').addEventListener('change', renderGallery);
document.getElementById('media-type-filter').addEventListener('change', renderGallery);
document.getElementById('sort-order').addEventListener('change', renderGallery);

// Lightbox close
document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox').addEventListener('click', function(e) {
    if (e.target === this) closeLightbox();
});

// ESC key closes modals
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (document.getElementById('lightbox').classList.contains('open')) {
            closeLightbox();
        }
        if (document.getElementById('upload-type-modal') && document.getElementById('upload-type-modal').classList.contains('active')) {
            closeUploadTypeModal();
        }
        if (document.getElementById('image-editor-modal') && document.getElementById('image-editor-modal').classList.contains('active')) {
            closeImageEditor();
        }
    }
});

// Click outside modal to close
document.getElementById('upload-type-modal').addEventListener('click', function(e) {
    if (e.target === this) closeUploadTypeModal();
});

// ========================================
// Initialize
// ========================================
document.addEventListener('DOMContentLoaded', async function () {
    await window.awaitGameCloud();
    if (window.SB) {
        var health = await checkMediaCloudHealth();
        if (!health.ok) {
            showToast('媒体库云端异常：' + health.reason, 'error');
        }
    }
    populateGameFilter();
    setupImageEditor();
    renderGallery();
});
