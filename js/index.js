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
                <p class="text-gray-500">还没有游戏记录</p>
                <a href="games.html" class="text-blue-500 hover:underline">去添加一款游戏吧</a>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    const recent = [...games]
        .sort((a, b) => achievementDateMs({ date: b.lastPlayed }) - achievementDateMs({ date: a.lastPlayed }))
        .slice(0, 4);

    container.innerHTML = recent.map(game => `
        <div class="bg-white rounded-lg shadow-lg overflow-hidden" data-aos="fade-up">
            <div class="h-32 bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
                ${imgWithFallback(game.icon, game.name, 'w-20 h-20 rounded-lg object-cover shadow-md')}
            </div>
            <div class="p-4">
                <h4 class="font-semibold text-gray-800 truncate">${escapeHtml(game.name)}</h4>
                <p class="text-sm text-gray-600">${escapeHtml(game.type || '其他')} · ${parseInt(game.playtime, 10) || 0}小时</p>
                <div class="mt-2">
                    <span class="text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(game.status)}">${escapeHtml(getStatusText(game.status))}</span>
                </div>
            </div>
        </div>
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

/** 首页预览用更高清图源：截图用原图，视频用真实封面 */
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
        const label = item.gameName || item.name || (isVideo ? '游戏视频' : '游戏截图');
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
                <p class="text-gray-500">还没有成就记录</p>
                <a href="achievements.html" class="text-blue-500 hover:underline text-sm">去添加成就</a>
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
                <h4 class="font-bold text-gray-800">${escapeHtml(ach.title || '未知成就')}</h4>
                <p class="text-sm text-gray-500">${escapeHtml(ach.gameName || '未知游戏')} · ${escapeHtml(ach.description || '')}</p>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

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

async function handleFiles(files, type) {
    const list = Array.from(files);
    if (list.length === 0) return;

    if (window.GameCloud && window.GameCloud.enabled && window.GameCloud.uploadMedia) {
        let ok = 0;
        let fail = 0;
        for (const file of list) {
            try {
                await window.GameCloud.uploadMedia(file, type, '');
                ok += 1;
            } catch (e) {
                console.error(e);
                fail += 1;
            }
        }
        await loadRecentMedia();
        if (ok > 0) {
            showToast(`已上传 ${ok} 个${type === 'image' ? '截图' : '视频'}到云端`, 'success');
        }
        if (fail > 0) {
            showToast(`${fail} 个文件上传失败`, 'error');
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
                gameName: '',
                time: new Date().toISOString()
            });
            GD.set(MEDIA_KEY, media);
            pending -= 1;
            if (pending === 0) {
                loadRecentMedia();
                showToast(`${type === 'image' ? '截图' : '视频'}上传成功！`, 'success');
            }
        };
        reader.readAsDataURL(file);
    });
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

document.getElementById('mobile-menu-toggle').addEventListener('click', () => {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
});

document.addEventListener('DOMContentLoaded', async () => {
    await window.awaitGameCloud();
    loadStats();
    loadRecentGames();
    loadRecentAchievements();
    await loadRecentMedia();
    setupUpload('#quick-image-upload', 'image', 'screenshot-upload');
    setupUpload('#quick-video-upload', 'video', 'video-upload');
});
