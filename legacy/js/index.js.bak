const GD = window.GameData;
const MEDIA_KEY = GD.KEYS.MEDIA;
const HOME_MEDIA_LIMIT = 6;

function achievementDateMs(a) {
    return GD.achievementDateMs(a);
}

function loadStats() {
    const games = GD.get(GD.KEYS.GAMES, []);
    const achievements = GD.migrateLegacyAchievements();

    document.getElementById('total-games').textContent = games.length || 0;

    const totalHours = games.reduce((sum, g) => sum + (parseInt(g.playtime) || 0), 0);
    document.getElementById('total-hours').textContent = totalHours + 'h';

    document.getElementById('total-achievements').textContent = achievements.length || 0;

    const ratings = games.filter(g => g.progress > 0).map(g => Math.ceil(g.progress / 20));
    const avgRating = ratings.length > 0
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : '0.0';
    document.getElementById('avg-rating').textContent = avgRating;
}

function loadRecentGames() {
    const games = GD.get(GD.KEYS.GAMES, []);
    const container = document.getElementById('recent-games');

    if (games.length === 0) {
        container.innerHTML = `
            <div class="col-span-4 text-center py-8">
                <i data-lucide="gamepad-2" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i>
                <p class="text-gray-500">杩樻病鏈夋父鎴忚褰?/p>
                <a href="games.html" class="text-blue-500 hover:underline">鍘绘坊鍔犱竴娆炬父鎴忓惂</a>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    const recent = [...games]
        .sort((a, b) => (parseInt(b.playtime, 10) || 0) - (parseInt(a.playtime, 10) || 0))
        .slice(0, 4);

    const detailUrl = typeof gameDetailUrl === 'function'
        ? gameDetailUrl
        : function (id) { return 'game.html?id=' + encodeURIComponent(id); };

    container.innerHTML = recent.map(game => `
        <a href="${detailUrl(game.id)}" class="bg-white rounded-lg shadow-lg overflow-hidden block hover:shadow-xl transition-shadow" data-aos="fade-up">
            <div class="h-32 bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
                ${imgWithFallback(game.icon, game.name, 'w-20 h-20 rounded-lg object-cover shadow-md')}
            </div>
            <div class="p-4">
                <h4 class="font-semibold text-gray-800 truncate">${escapeHtml(game.name)}</h4>
                <p class="text-sm text-gray-600">${escapeHtml(game.type || '鍏朵粬')} 路 ${parseInt(game.playtime, 10) || 0} 灏忔椂</p>
                <div class="mt-2">
                    <span class="text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(game.status)}">${escapeHtml(getStatusText(game.status))}</span>
                </div>
            </div>
        </a>
    `).join('');

    lucide.createIcons();
}

function escapeAttr(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

function mediaSortTime(item) {
    if (!item.time) return 0;
    const d = new Date(item.time);
    return isNaN(d.getTime()) ? 0 : d.getTime();
}

/** 棣栭〉棰勮鐢ㄦ洿楂樻竻鍥炬簮锛氭埅鍥剧敤鍘熷浘锛岃棰戠敤鐪熷疄灏侀潰 */
function getHomePreviewSrc(item) {
    const isVideo = item.type === 'video';
    if (isVideo) {
        if (item.thumbnail && item.thumbnail.indexOf('svg+xml') === -1) {
            return item.thumbnail;
        }
        return '';
    }
    return item.url || item.thumbnail || '';
}

function getHomePreviewSrcset(item) {
    if (item.type === 'video' || !item.url || !item.thumbnail || item.url === item.thumbnail) {
        return '';
    }
    return `${escapeAttr(item.thumbnail)} 400w, ${escapeAttr(item.url)} 1200w`;
}

async function loadRecentMedia() {
    const section = document.getElementById('home-media-preview-section');
    const container = document.getElementById('home-media-preview');
    if (!section || !container) return;

    const media = window.GameCloud && window.GameCloud.enabled
        ? await window.GameCloud.fetchMedia()
        : GD.get(MEDIA_KEY, []);
    if (media.length === 0) {
        section.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    const recent = [...media]
        .sort((a, b) => mediaSortTime(b) - mediaSortTime(a))
        .slice(0, HOME_MEDIA_LIMIT);

    section.classList.remove('hidden');
    container.innerHTML = recent.map(item => {
        const isVideo = item.type === 'video';
        const src = getHomePreviewSrc(item);
        const srcset = getHomePreviewSrcset(item);
        const label = item.gameName || item.name || (isVideo ? '娓告垙瑙嗛' : '娓告垙鎴浘');
        const badge = isVideo
            ? '<span class="home-media-type-badge"><i data-lucide="video" class="w-3 h-3"></i></span>'
            : '';

        let mediaInner;
        if (src) {
            const srcsetAttr = srcset ? ` srcset="${srcset}" sizes="(max-width: 640px) 30vw, 140px"` : '';
            mediaInner = `<img src="${escapeAttr(src)}"${srcsetAttr} alt="${escapeAttr(label)}" loading="lazy" decoding="async">`;
        } else if (isVideo) {
            mediaInner = '<div class="home-media-preview-placeholder"><i data-lucide="play" class="w-8 h-8"></i></div>';
        } else {
            mediaInner = '<div class="home-media-preview-placeholder"><i data-lucide="image" class="w-8 h-8"></i></div>';
        }

        return `
            <a href="gallery.html" class="home-media-preview-item group" title="${escapeAttr(label)}">
                ${mediaInner}
                ${badge}
                <div class="home-media-preview-overlay">${escapeHtml(label)}</div>
            </a>
        `;
    }).join('');

    lucide.createIcons();
}

function loadRecentAchievements() {
    const achievements = GD.migrateLegacyAchievements();
    const container = document.getElementById('recent-achievements');

    if (achievements.length === 0) {
        container.innerHTML = `
            <div class="col-span-2 text-center py-8">
                <i data-lucide="trophy" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i>
                <p class="text-gray-500">杩樻病鏈夋垚灏辫褰?/p>
                <a href="achievements.html" class="text-blue-500 hover:underline text-sm">鍘绘坊鍔犳垚灏?/a>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    const recent = [...achievements]
        .sort((a, b) => achievementDateMs(b) - achievementDateMs(a))
        .slice(0, 4);

    container.innerHTML = recent.map(ach => `
        <div class="achievement-card flex items-start gap-4" data-aos="fade-up">
            <div class="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <i data-lucide="${safeLucideIcon(ach.icon)}" class="w-6 h-6 text-yellow-500"></i>
            </div>
            <div class="flex-1">
                <h4 class="font-bold text-gray-800">${escapeHtml(ach.title || '鏈煡鎴愬氨')}</h4>
                <p class="text-sm text-gray-500">${escapeHtml(ach.gameName || '鏈煡娓告垙')} 路 ${escapeHtml(ach.description || '')}</p>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

let pendingHomeFiles = [];
let pendingHomeType = '';
let pendingHomeInputId = '';

function resolveHomeSelectedGame(selectValue) {
    if (!selectValue) return { gameId: null, gameName: '' };
    return GD.resolveGameFieldsFromSelect(selectValue);
}

function showHomeUploadModal() {
    const modal = document.getElementById('home-upload-modal');
    const select = document.getElementById('home-upload-game-select');
    if (!modal) return;

    if (select) {
        GD.populateGameSelect(select, { placeholder: '閫夋嫨娓告垙锛堝彲閫夛級' });
        select.value = '';
    }

    const typeName = pendingHomeType === 'image' ? '鎴浘' : '瑙嗛';
    const count = pendingHomeFiles.length;
    const typeLabel = document.getElementById('home-upload-type-label');
    const uploadCount = document.getElementById('home-upload-count');
    const btnText = document.getElementById('home-upload-btn-text');
    if (typeLabel) typeLabel.textContent = typeName;
    if (uploadCount) uploadCount.textContent = String(count);
    if (btnText) btnText.textContent = `纭涓婁紶 ${count} 涓?{typeName}`;

    modal.classList.add('active');
    lucide.createIcons();
}

function closeHomeUploadModal() {
    const modal = document.getElementById('home-upload-modal');
    if (modal) modal.classList.remove('active');
    pendingHomeFiles = [];
    pendingHomeType = '';
    if (pendingHomeInputId) {
        const input = document.getElementById(pendingHomeInputId);
        if (input) input.value = '';
        pendingHomeInputId = '';
    }
}

function queueHomeUpload(files, type, inputId) {
    const list = Array.from(files);
    if (list.length === 0) return;
    pendingHomeFiles = list;
    pendingHomeType = type;
    pendingHomeInputId = inputId || '';
    showHomeUploadModal();
}

function setupUpload(selector, type, inputId) {
    const area = document.querySelector(selector);
    const input = document.getElementById(inputId);
    if (!area || !input) return;

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
        queueHomeUpload(e.dataTransfer.files, type, inputId);
    });

    input.addEventListener('change', () => {
        queueHomeUpload(input.files, type, inputId);
    });
}

async function handleFiles(files, type, gameName, gameId) {
    const list = Array.from(files);
    if (list.length === 0) return;

    const resolvedName = gameName || '';
    const resolvedId = gameId || null;

    if (window.GameCloud && window.GameCloud.enabled && window.GameCloud.uploadMedia) {
        let ok = 0;
        let fail = 0;
        for (const file of list) {
            try {
                await window.GameCloud.uploadMedia(file, type, resolvedName);
                ok += 1;
            } catch (e) {
                console.error(e);
                fail += 1;
            }
        }
        await loadRecentMedia();
        if (ok > 0) {
            showToast(`宸蹭笂浼?${ok} 涓?{type === 'image' ? '鎴浘' : '瑙嗛'}鍒颁簯绔痐, 'success');
        }
        if (fail > 0) {
            showToast(`${fail} 涓枃浠朵笂浼犲け璐, 'error');
        }
        return;
    }

    const media = GD.get(MEDIA_KEY, []);
    let pending = list.length;

    list.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            media.push({
                id: generateId(),
                type: type,
                url: e.target.result,
                name: file.name,
                gameId: resolvedId,
                gameName: resolvedName,
                time: new Date().toISOString()
            });
            GD.set(MEDIA_KEY, media);
            pending -= 1;
            if (pending === 0) {
                loadRecentMedia();
                showToast(`${type === 'image' ? '鎴浘' : '瑙嗛'}涓婁紶鎴愬姛锛乣, 'success');
            }
        };
        reader.readAsDataURL(file);
    });
}

async function confirmHomeUpload() {
    if (pendingHomeFiles.length === 0 || !pendingHomeType) {
        showToast('娌℃湁閫夋嫨鏂囦欢', 'error');
        return;
    }

    const select = document.getElementById('home-upload-game-select');
    const selected = resolveHomeSelectedGame(select ? select.value : '');
    const gameName = selected.gameName || '';
    const gameId = selected.gameId || null;
    const uploadType = pendingHomeType;
    const files = pendingHomeFiles.slice();

    const btn = document.getElementById('home-confirm-upload-btn');
    const btnText = document.getElementById('home-upload-btn-text');
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = '涓婁紶涓?..';

    try {
        await handleFiles(files, uploadType, gameName, gameId);
    } finally {
        if (btn) btn.disabled = false;
        closeHomeUploadModal();
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    toastMessage.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}


async function renderHomeContent() {
    loadStats();
    loadRecentGames();
    loadRecentAchievements();
    await loadRecentMedia();
    await loadPersonalizedFeed(false);
}

function formatMoney(num) {
    const n = parseFloat(num);
    if (isNaN(n)) return '0.00';
    return n.toFixed(2);
}

function renderHomeNews(news) {
    const container = document.getElementById('home-news-feed');
    if (!container) return;
    if (!news || news.length === 0) {
        container.innerHTML = '<div class="game-hub-empty"><i data-lucide="inbox" class="w-8 h-8 text-gray-300"></i><p>鏆傛棤涓€у寲璧勮</p></div>';
        return;
    }
    container.innerHTML = news.slice(0, 5).map(item => `
        <article class="p-3 rounded-lg border border-gray-200 bg-white/70">
            <h4 class="font-semibold text-gray-800">${escapeHtml(item.title || '娓告垙璧勮')}</h4>
            <p class="text-sm text-gray-600 mt-1">${escapeHtml(item.summary || '')}</p>
            <p class="text-xs text-gray-400 mt-2">${escapeHtml(item.gameName || '')}</p>
        </article>
    `).join('');
}

function renderHomeDeals(deals) {
    const container = document.getElementById('home-deals-feed');
    if (!container) return;
    if (!deals || deals.length === 0) {
        container.innerHTML = '<div class="game-hub-empty"><i data-lucide="inbox" class="w-8 h-8 text-gray-300"></i><p>鏆傛棤鎶樻墸璁″垝</p></div>';
        return;
    }
    container.innerHTML = deals.slice(0, 6).map(item => `
        <article class="p-3 rounded-lg border border-gray-200 bg-white/70">
            <div class="flex items-center justify-between gap-2">
                <h4 class="font-semibold text-gray-800 truncate">${escapeHtml(item.gameName || '鏈煡娓告垙')}</h4>
                <span class="badge badge-green">${escapeHtml(String(item.discountPercent || 0))}% OFF</span>
            </div>
            <p class="text-sm text-gray-600 mt-1">${escapeHtml(item.platform || '骞冲彴寰呭畾')}</p>
            <p class="text-sm text-gray-700 mt-1">楼${formatMoney(item.currentPrice)} <span class="text-gray-400 line-through ml-1">楼${formatMoney(item.originalPrice)}</span></p>
        </article>
    `).join('');
}

async function loadPersonalizedFeed(forceRefresh) {
    const meta = document.getElementById('personalized-feed-meta');
    if (!window.GamePersonalizedFeed) return;
    let result = null;
    try {
        if (forceRefresh) {
            result = await window.GamePersonalizedFeed.refresh({ force: true });
        } else {
            const cached = window.GamePersonalizedFeed.getCachedFeed();
            if (cached.news.length === 0 && cached.deals.length === 0) {
                result = await window.GamePersonalizedFeed.refresh({ force: false });
            } else {
                result = { source: 'cache', news: cached.news, deals: cached.deals };
            }
        }
    } catch (e) {
        console.error(e);
        const fallback = window.GamePersonalizedFeed.getCachedFeed();
        result = { source: 'cache', news: fallback.news, deals: fallback.deals };
    }
    renderHomeNews(result.news || []);
    renderHomeDeals(result.deals || []);
    if (meta) {
        const sourceMap = { edge: '浜戠鎺ㄨ崘', local: '鏈湴瑙勫垯', cache: '鏈湴缂撳瓨' };
        meta.textContent = `鏁版嵁鏉ユ簮锛?{sourceMap[result.source] || '鏈煡'} 路 鏇存柊鏃堕棿 ${new Date().toLocaleString('zh-CN')}`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await window.awaitGameCloud();
    await renderHomeContent();
    setupUpload('#quick-image-upload', 'image', 'screenshot-upload');
    setupUpload('#quick-video-upload', 'video', 'video-upload');

    const homeUploadModal = document.getElementById('home-upload-modal');
    const homeUploadClose = document.getElementById('home-upload-modal-close');
    const homeConfirmBtn = document.getElementById('home-confirm-upload-btn');
    if (homeUploadClose) {
        homeUploadClose.addEventListener('click', closeHomeUploadModal);
    }
    if (homeConfirmBtn) {
        homeConfirmBtn.addEventListener('click', confirmHomeUpload);
    }
    if (homeUploadModal) {
        homeUploadModal.addEventListener('click', (e) => {
            if (e.target === homeUploadModal) closeHomeUploadModal();
        });
    }
    const refreshBtn = document.getElementById('refresh-personalized-feed-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            await loadPersonalizedFeed(true);
            refreshBtn.disabled = false;
            showToast('鎺ㄨ崘鍐呭宸叉洿鏂?, 'success');
            lucide.createIcons();
        });
    }
    window.whenGameCloudSynced(renderHomeContent);
    lucide.createIcons();
});
