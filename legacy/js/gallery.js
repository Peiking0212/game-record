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

/** 绾犳璇爣涓?video 鐨勫浘鐗囷紙涓婁紶鏃?pendingFileType 琚彁鍓嶆竻绌轰細瀵艰嚧姝ら棶棰橈級 */
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
            showToast('瀛樺偍绌洪棿涓嶈冻锛岃鍒犻櫎涓€浜涙棫濯掍綋', 'error');
            return false;
        }
        if (window.GameData) return window.GameData.set(key, data);
        localStorage.setItem(key, json);
        return true;
    } catch (e) {
        console.error('瀛樺偍澶辫触:', e);
        if (e.name === 'QuotaExceededError') {
            showToast('瀛樺偍绌洪棿宸叉弧锛佽鍒犻櫎涓€浜涙棫濯掍綋鍚庨噸璇?, 'error');
        }
        return false;
    }
}

/* 鍕垮湪姝ゆ枃浠跺０鏄?escapeHtml / generateId / formatDate锛屽惁鍒欎細瑕嗙洊 utils.js 鎸傚埌 window 涓婄殑鍚屽悕鍑芥暟瀵艰嚧姝诲惊鐜?*/

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
    if (!err) return '鏈煡閿欒';
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

/** 浜戠涓婁紶澶辫触鏃跺啓鍏ユ湰鏈猴紝閬垮厤瀹屽叏浼犱笉涓婂幓 */
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
    if (!window.SB) return { ok: false, reason: '鏈姞杞?Supabase锛堝皢浣跨敤鏈満瀛樺偍锛? };
    try {
        var userId = await resolveMediaUserId();
        if (!userId) {
            return { ok: false, reason: '鏈櫥褰曪紝鏃犳硶浣跨敤浜戠濯掍綋搴? };
        }
        var tableCheck = await window.SB.from(TABLE).select('id').eq('user_id', userId).limit(1);
        if (tableCheck.error) {
            return { ok: false, reason: '鏁版嵁搴?media 琛細' + formatSupabaseError(tableCheck.error) };
        }
        var bucketCheck = await window.SB.storage.from(BUCKET).list(userId, { limit: 1 });
        if (bucketCheck.error) {
            return { ok: false, reason: 'Storage 妗?media锛? + formatSupabaseError(bucketCheck.error) };
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
    if (!confirm('纭畾瑕佹竻绌烘墍鏈夊獟浣撴枃浠跺悧锛熸鎿嶄綔涓嶅彲鎭㈠锛?)) return;

    if (window.SB) {
        try {
            var userId = await resolveMediaUserId();
            if (!userId) {
                showToast('璇峰厛鐧诲綍', 'error');
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
            showToast('宸叉竻绌烘墍鏈夊獟浣?, 'success');
        } catch (e) {
            console.error('娓呯┖澶辫触:', e);
            showToast('娓呯┖澶辫触', 'error');
        }
    } else {
        saveData('game_record_media', []);
        renderGallery();
        showToast('宸叉竻绌烘墍鏈夊獟浣?, 'success');
    }
}

// ========================================
// Compression & Thumbnail Functions
// ========================================

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
            resolve(compressed);
        };
        img.src = dataUrl;
    });
}

// 鐢熸垚缂╃暐鍥撅紙淇濇寔姣斾緥锛屾渶澶у搴?1080px锛?function generateThumbnail(imageUrl, maxWidth) {
    if (!maxWidth) maxWidth = 1080;
    return new Promise(function(resolve) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            var canvas = document.createElement('canvas');
            
            // 淇濇寔鍘熷姣斾緥
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

// 鐢熸垚瑙嗛缂╃暐鍥撅紙浣跨敤 SVG 鍗犱綅鍥撅級- 鏈湴妯″紡鐢?function generateVideoThumbnail() {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><rect fill="%231a2744" width="150" height="150"/><rect fill="%23f0c040" x="55" y="50" width="40" height="40" rx="6"/><polygon fill="%231a2744" points="65,60 85,70 65,80"/></svg>');
}

// 鎴彇瑙嗛绗竴甯т綔涓哄皝闈紙浜戝瓨鍌ㄦā寮忕敤锛?function generateVideoCover(file) {
    return new Promise(function(resolve, reject) {
        var video = document.createElement('video');
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        
        video.preload = 'metadata';
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        
        video.onloadedmetadata = function() {
            // 璁剧疆 canvas 灏哄锛堜繚鎸佹瘮渚嬶紝鏈€澶у搴?1080锛?            var maxWidth = 1080;
            var scale = Math.min(1, maxWidth / video.videoWidth);
            canvas.width = video.videoWidth * scale;
            canvas.height = video.videoHeight * scale;
            
            video.currentTime = 0.1; // 璺冲埌绗竴甯ч檮杩?        };
        
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
        
        // 鍒涘缓 blob URL 鏉ュ姞杞借棰?        video.src = URL.createObjectURL(file);
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

// 浠?Supabase 鑾峰彇濯掍綋鍒楄〃
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
        // 鏄犲皠瀛楁锛歝reated_at 鈫?time, game_name 鈫?gameName
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
        console.error('鑾峰彇濯掍綋澶辫触:', e);
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

        // 鏍规嵁绫诲瀷鏄剧ず涓嶅悓鍥炬爣
        var typeIcon = '';
        if (item.type === 'video') {
            typeIcon = '<div class="absolute top-2 right-2 bg-purple-500 text-white p-1 rounded"><i data-lucide="video" class="w-4 h-4"></i></div>';
        }

        var actionButtons = '';
        if (item.type === 'video') {
            actionButtons = '<button class="gallery-btn" onclick="openLightbox(\'' + item.id + '\')" title="鎾斁">' +
                '<i data-lucide="play" class="w-4 h-4"></i></button>';
        } else {
            actionButtons = '<button class="gallery-btn" onclick="openLightbox(\'' + item.id + '\')" title="鏌ョ湅">' +
                '<i data-lucide="eye" class="w-4 h-4"></i></button>' +
                '<button class="gallery-btn" onclick="openImageEditor(\'' + item.id + '\')" title="缂栬緫">' +
                '<i data-lucide="edit" class="w-4 h-4"></i></button>';
        }

        return '<div class="gallery-item" data-id="' + item.id + '" onclick="openLightbox(\'' + item.id + '\')">' +
            '<img src="' + thumbnailUrl + '" alt="' + (displayName || '濯掍綋') + '" loading="lazy" onerror="this.src=\'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%23E8F0F8" width="400" height="300"/><text x="200" y="150" text-anchor="middle" dy=".3em" fill="%2394A3B8" font-size="16">鍥剧墖鍔犺浇澶辫触</text></svg>') + '\'">' +
            typeIcon +
            '<div class="gallery-actions" onclick="event.stopPropagation()">' +
            actionButtons +
            '<button class="gallery-btn gallery-btn-danger" onclick="deleteMedia(\'' + item.id + '\')" title="鍒犻櫎">' +
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

    // 鏍规嵁绫诲瀷娓叉煋涓嶅悓鐨勫唴瀹?    if (item.type === 'video') {
        container.innerHTML = '<video src="' + item.url + '" controls class="max-w-full max-h-[70vh] rounded-lg"></video>';
    } else {
        container.innerHTML = '<img id="lightbox-image" src="' + item.url + '" alt="' + (item.gameName || '鍥剧墖') + '" class="max-w-full max-h-[70vh] rounded-lg">';
    }

    var nameText = item.gameName ? window.escapeHtml(item.gameName) : '鏈寚瀹氭父鎴?;
    var dateText = item.time ? window.formatDateISO(item.time) : '';
    var typeText = item.type === 'video' ? '瑙嗛' : '鎴浘';
    info.innerHTML = '<p class="text-lg font-medium">' + nameText + '</p>' +
        '<p class="text-sm text-gray-300 mt-1">' + typeText + '</p>' +
        (dateText ? '<p class="text-sm text-gray-300 mt-1">涓婁紶浜?' + dateText + '</p>' : '');

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
    // 鍋滄瑙嗛鎾斁
    var video = document.querySelector('#lightbox-media-container video');
    if (video) {
        video.pause();
    }
}

// ========================================
// Delete Media
// ========================================
function deleteMedia(id) {
    if (confirm('纭畾瑕佸垹闄よ繖涓獟浣撴枃浠跺悧锛?)) {
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
        if (!userId) throw new Error('鏈櫥褰?);
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
        if (dbResult.error) console.error('鍒犻櫎鏁版嵁搴撹褰曞け璐?', dbResult.error);
        if (paths.length > 0) {
            var storageResult = await window.SB.storage.from(BUCKET).remove(paths);
            if (storageResult.error) console.error('鍒犻櫎瀛樺偍鏂囦欢澶辫触:', storageResult.error);
        }
        renderGallery();
        showToast('濯掍綋宸插垹闄?, 'success');
    } catch (e) {
        console.error('鍒犻櫎澶辫触:', e);
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
    showToast('濯掍綋宸插垹闄?, 'success');
}

// ========================================
// Upload Functions
// ========================================

// 寰呬笂浼犵殑鏂囦欢闃熷垪
var pendingFiles = [];
var pendingFileType = ''; // 'image', 'video'

// 鎴浘涓婁紶澶勭悊
document.getElementById('gallery-upload-input').addEventListener('change', function (e) {
    var files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Filter only image files
    pendingFiles = files.filter(isImageFile);

    if (pendingFiles.length === 0) {
        showToast('璇烽€夋嫨鍥剧墖鏂囦欢', 'error');
        return;
    }

    pendingFileType = 'image';
    showUploadModal();
    this.value = '';
});

// 瑙嗛涓婁紶澶勭悊
document.getElementById('video-upload-input').addEventListener('change', function (e) {
    var files = Array.from(e.target.files);
    if (files.length === 0) return;

    pendingFiles = files.filter(isVideoFile);

    if (pendingFiles.length === 0) {
        showToast('璇烽€夋嫨瑙嗛鏂囦欢', 'error');
        return;
    }

    // 妫€鏌ユ枃浠跺ぇ灏?    var validFiles = pendingFiles.filter(function(f) {
        if (f.size > 50 * 1024 * 1024) {
            showToast(f.name + ' 澶ぇ锛屽凡璺宠繃锛堟渶澶?50MB锛?, 'warning');
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

// 鏄剧ず涓婁紶寮圭獥
function showUploadModal() {
    var select = document.getElementById('upload-type-game-select');
    if (window.GameData) {
        window.GameData.populateGameSelect(select, { placeholder: '閫夋嫨娓告垙锛堝彲閫夛級' });
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

    // 鏄剧ず涓婁紶绫诲瀷鍜屾暟閲?    var typeLabel = document.getElementById('upload-type-label');
    var uploadCount = document.getElementById('upload-count');
    var btnText = document.getElementById('upload-btn-text');

    var typeName = pendingFileType === 'image' ? '鎴浘' : '瑙嗛';
    typeLabel.textContent = typeName;
    uploadCount.textContent = pendingFiles.length;
    btnText.textContent = '纭涓婁紶 ' + pendingFiles.length + ' 涓? + typeName;

    document.getElementById('upload-type-modal').classList.add('active');
}

// 鍏抽棴涓婁紶寮圭獥
function closeUploadTypeModal() {
    document.getElementById('upload-type-modal').classList.remove('active');
    pendingFiles = [];
    pendingFileType = '';
}

// 纭涓婁紶
async function confirmTypeUpload() {
    var select = document.getElementById('upload-type-game-select');
    var selected = resolveSelectedGame(select.value);
    var gameId = selected.gameId;
    var gameName = selected.gameName;

    if (pendingFiles.length === 0 || !pendingFileType) {
        showToast('娌℃湁閫夋嫨鏂囦欢', 'error');
        return;
    }

    var uploadType = pendingFileType;

    var loadedCount = 0;
    var errorCount = 0;
    var total = pendingFiles.length;

    var btnText = document.getElementById('upload-btn-text');
    var btn = document.getElementById('confirm-upload-type-btn');
    btnText.textContent = '涓婁紶涓?..';
    btn.disabled = true;

    var lastError = '';

    if (window.SB) {
        var health = await checkMediaCloudHealth();
        if (!health.ok) {
            showToast('浜戠涓嶅彲鐢細' + health.reason + '锛屽凡鏀瑰瓨鏈満', 'error');
            console.error('[濯掍綋搴揮', health.reason);
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
                console.error('涓婁紶澶辫触:', file.name, err);
                try {
                    await saveMediaLocally(file, gameId, gameName, uploadType);
                    loadedCount++;
                    errorCount++;
                } catch (localErr) {
                    console.error('鏈満澶囦唤涔熷け璐?', file.name, localErr);
                    errorCount++;
                }
            }
        }
    } else {
        // 鏈湴瀛樺偍
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
                    // 鏈湴妯″紡涔熷皾璇曠敓鎴愯棰戝皝闈?                    try {
                        item.thumbnail = await generateVideoCover(file);
                    } catch (e) {
                        item.thumbnail = generateVideoThumbnail(); // 澶辫触鐢ㄥ崰浣嶅浘
                    }
                }
                allMedia.push(item);
                loadedCount++;
            } catch (err) {
                console.error('涓婁紶澶辫触:', file.name, err);
                errorCount++;
            }
        }
        saveData('game_record_media', allMedia);
    }

    var typeName = uploadType === 'image' ? '鎴浘' : '瑙嗛';
    closeUploadTypeModal();
    populateGameFilter();
    renderGallery();
    if (loadedCount > 0) {
        showToast('鎴愬姛涓婁紶 ' + loadedCount + ' 涓? + typeName, 'success');
    }
    if (errorCount > 0) {
        var hint = lastError ? '銆傚師鍥狅細' + lastError : '';
        showToast(errorCount + ' 涓枃浠朵簯绔け璐ワ紝宸插皾璇曞瓨鏈満' + hint, 'error');
    }
    btnText.textContent = '纭涓婁紶';
    btn.disabled = false;
}

// 涓婁紶鍗曚釜鏂囦欢鍒?Supabase锛坒ileType 蹇呴』涓?'image' 鎴?'video'锛屽嬁渚濊禆鍏ㄥ眬 pendingFileType锛?async function uploadFileToCloud(file, gameId, gameName, fileType) {
    var userId = await resolveMediaUserId();
    if (!userId) throw new Error('鏈櫥褰曪紝鏃犳硶涓婁紶鍒颁簯绔?);

    var resolved = window.GameData ? window.GameData.resolveGameFieldsFromSelect(gameId) : { gameId: gameId, gameName: gameName };
    gameName = resolved.gameName || gameName || '';

    if (window.GameCloud && window.GameCloud.uploadMedia && fileType === 'image') {
        var ok = await window.GameCloud.uploadMedia(file, fileType, gameName);
        if (!ok) throw new Error('浜戠涓婁紶澶辫触');
        return;
    }

    var id = window.generateId();
    var ext = (file.name.split('.').pop() || (fileType === 'video' ? 'mp4' : 'jpg')).toLowerCase();
    var prefix = mediaStoragePrefix(userId);
    var storagePath = prefix + id + '.' + ext;

    // 澶勭悊鍥剧墖锛氬帇缂╁悗涓婁紶
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

// 灏?dataURL 杞崲涓?Blob
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

// 鎵撳紑鍥剧墖缂栬緫鍣?function openImageEditor(id) {
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
        showToast('鎵句笉鍒拌濯掍綋', 'error');
        return;
    }
    item.type = normalizeMediaType(item);
    if (item.type === 'video') {
        showToast('瑙嗛鏆備笉鏀寔缂栬緫', 'info');
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
            console.warn('[濯掍綋搴揮 鏃犳硶璇诲彇鍍忕礌鏁版嵁锛屾护闀滃彲鑳藉彈闄?, e);
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
                showToast('鏃犳硶鍔犺浇鍥剧墖杩涜缂栬緫', 'error');
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

// 鍏抽棴鍥剧墖缂栬緫鍣?function closeImageEditor() {
    document.getElementById('image-editor-modal').classList.remove('active');
    currentImageData = null;
    originalImageData = null;
    cropMode = false;
    document.getElementById('crop-overlay').classList.add('hidden');
}

// 搴旂敤婊ら暅
function applyFilter(filter) {
    currentFilters.filter = filter;
    document.querySelectorAll('.filter-item').forEach(function(el) { el.classList.remove('active'); });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    applyFiltersToCanvas();
}

// 搴旂敤婊ら暅鍒扮敾甯?function applyFiltersToCanvas() {
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

// 鍒囨崲瑁佸壀妯″紡
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

// 鏇存柊瑁佸壀妗?function updateCropBox() {
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

// 閲嶇疆鍥剧墖
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

// 淇濆瓨缂栬緫鍚庣殑鍥剧墖
async function saveEditedImage() {
    var canvas = document.getElementById('editor-canvas');
    var thumbnailSize = parseInt(document.getElementById('thumbnail-size').value);

    // 鑾峰彇瑁佸壀鎴栧畬鏁寸殑鍥剧墖
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
        // 浜戝瓨鍌細閲嶆柊涓婁紶缂栬緫鍚庣殑鍥剧墖
        try {
            var userId = await resolveMediaUserId();
            if (!userId) throw new Error('鏈櫥褰?);
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
            showToast('鍥剧墖缂栬緫淇濆瓨鎴愬姛', 'success');
        } catch (e) {
            console.error('淇濆瓨澶辫触:', e);
            showToast('淇濆瓨澶辫触锛岃閲嶈瘯', 'error');
        }
    } else {
        // 鏈湴瀛樺偍
        var allMedia = await getAllMedia();
        var index = allMedia.findIndex(function(item) { return item.id === currentImageData.id; });
        if (index !== -1) {
            allMedia[index].url = editedDataUrl;
            allMedia[index].thumbnail = await generateThumbnail(editedDataUrl, thumbnailSize);
            saveData('game_record_media', allMedia);
            closeImageEditor();
            renderGallery();
            showToast('鍥剧墖缂栬緫淇濆瓨鎴愬姛', 'success');
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
            showToast('濯掍綋搴撲簯绔紓甯革細' + health.reason, 'error');
        }
    }
    populateGameFilter();
    setupImageEditor();
    renderGallery();
});
