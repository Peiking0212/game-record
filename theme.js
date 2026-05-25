/**
 * theme.js — 全局主题控制
 * 深浅模式切换、卡片样式、动画速度、自定义背景
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'game_record_theme';

    // 默认设置
    const defaults = {
        theme: 'light',       // light | dark
        cardStyle: 'default', // default | minimal | rounded
        animSpeed: 'normal',  // slow | normal | fast
        hoverEffect: 'lift',  // subtle | lift | glow
        heroBg: '',           // Hero 区域自定义背景图 URL
        siteBg: null          // 全站背景图 base64（可能很大，单独处理）
    };

    // 读取设置
    let settings = Object.assign({}, defaults, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));

    // 背景图片单独存储（避免污染主设置）
    let siteBgImage = localStorage.getItem('site_bg_image') || null;

    // 视频背景
    var videoBgUrl = localStorage.getItem('site_video_bg') || null;

    // 自动时间背景
    var autoTimeBg = localStorage.getItem('auto_time_bg') === 'true';

    // 看板娘相关变量
    var mascotImage = localStorage.getItem('mascot_image') || null;
    var mascotQuotes = JSON.parse(localStorage.getItem('mascot_quotes') || 'null') || [
        '欢迎回来！今天玩什么游戏呀？',
        '记得休息一下哦~',
        '新游戏发售啦，快去看看！',
        '你的游戏收藏又多了呢~',
        '肝游戏虽好，可不要熬夜哦！',
        '今天也是元气满满的一天！'
    ];
    var mascotEnabled = localStorage.getItem('mascot_enabled') !== 'false';

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }

    // ==================== 应用主题 ====================
    function applyTheme() {
        // 深浅模式
        document.documentElement.setAttribute('data-theme', settings.theme);

        // 卡片样式
        document.body.classList.remove('card-minimal', 'card-rounded');
        if (settings.cardStyle === 'minimal') document.body.classList.add('card-minimal');
        if (settings.cardStyle === 'rounded') document.body.classList.add('card-rounded');

        // 动画速度
        document.body.classList.remove('anim-speed-slow', 'anim-speed-normal', 'anim-speed-fast');
        document.body.classList.add('anim-speed-' + settings.animSpeed);

        // 悬浮效果
        document.body.classList.remove('hover-subtle', 'hover-lift', 'hover-glow');
        document.body.classList.add('hover-' + settings.hoverEffect);

        // 自定义背景
        applyHeroBg();
        applySiteBg();
        applyVideoBg();
        applyAutoTimeBg();
    }

    // ==================== 自定义背景 ====================
    function applyHeroBg() {
        const heroSections = document.querySelectorAll('[data-hero]');
        heroSections.forEach(function (el) {
            el.classList.remove('hero-custom-bg');
            if (settings.heroBg) {
                el.style.backgroundImage = 'url(' + settings.heroBg + ')';
                el.classList.add('hero-custom-bg');
            } else {
                el.style.backgroundImage = '';
            }
        });
    }

    // ==================== 全站背景 ====================
    function applySiteBg() {
        console.log('应用全站背景:', siteBgImage ? '有图片(' + Math.round(siteBgImage.length / 1024) + 'KB)' : '无图片');
        
        if (siteBgImage) {
            // 用 CSS background-image 设置在 body 上（最可靠的方案）
            document.body.style.backgroundImage = 'url(' + siteBgImage + ')';
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center center';
            document.body.style.backgroundAttachment = 'fixed';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.classList.add('has-custom-bg');
            console.log('背景已应用，图片大小:', Math.round(siteBgImage.length / 1024) + 'KB');
        } else {
            // 清除背景
            document.body.style.backgroundImage = '';
            document.body.style.backgroundSize = '';
            document.body.style.backgroundPosition = '';
            document.body.style.backgroundAttachment = '';
            document.body.style.backgroundRepeat = '';
            document.body.classList.remove('has-custom-bg');
            console.log('背景已清除');
        }
    }

    // ==================== 视频背景 ====================
    function applyVideoBg() {
        var videoEl = document.getElementById('site-video-bg');
        var overlayEl = document.getElementById('site-video-overlay');

        if (videoBgUrl) {
            if (!videoEl) {
                videoEl = document.createElement('video');
                videoEl.id = 'site-video-bg';
                videoEl.autoplay = true;
                videoEl.loop = true;
                videoEl.muted = true;
                videoEl.playsInline = true;
                document.body.insertBefore(videoEl, document.body.firstChild);

                overlayEl = document.createElement('div');
                overlayEl.id = 'site-video-overlay';
                document.body.insertBefore(overlayEl, videoEl.nextSibling);
            }
            videoEl.src = videoBgUrl;
            videoEl.play().catch(function(){});
            document.body.classList.add('has-video-bg');
            console.log('视频背景已应用');
        } else {
            if (videoEl) videoEl.remove();
            if (overlayEl) overlayEl.remove();
            document.body.classList.remove('has-video-bg');
        }
    }

    // ==================== 自动时间背景 ====================
    function applyAutoTimeBg() {
        // 清除之前的类
        var body = document.body;
        body.classList.remove('auto-bg-active', 'auto-bg-morning', 'auto-bg-forenoon', 'auto-bg-afternoon', 'auto-bg-dusk', 'auto-bg-night', 'auto-bg-spring', 'auto-bg-summer', 'auto-bg-autumn', 'auto-bg-winter');
        
        // 清除旧的星星
        var oldStars = document.getElementById('auto-bg-stars');
        if (oldStars) oldStars.remove();
        
        if (!autoTimeBg) return;
        
        body.classList.add('auto-bg-active');
        
        var hour = new Date().getHours();
        var month = new Date().getMonth() + 1;
        
        // 时间段
        var timeClass;
        if (hour >= 5 && hour < 8) timeClass = 'auto-bg-morning';
        else if (hour >= 8 && hour < 12) timeClass = 'auto-bg-forenoon';
        else if (hour >= 12 && hour < 17) timeClass = 'auto-bg-afternoon';
        else if (hour >= 17 && hour < 19) timeClass = 'auto-bg-dusk';
        else timeClass = 'auto-bg-night';
        body.classList.add(timeClass);
        
        // 季节
        var seasonClass;
        if (month >= 3 && month <= 5) seasonClass = 'auto-bg-spring';
        else if (month >= 6 && month <= 8) seasonClass = 'auto-bg-summer';
        else if (month >= 9 && month <= 11) seasonClass = 'auto-bg-autumn';
        else seasonClass = 'auto-bg-winter';
        body.classList.add(seasonClass);
        
        // 夜晚加星星
        if (timeClass === 'auto-bg-night') {
            var starsContainer = document.createElement('div');
            starsContainer.id = 'auto-bg-stars';
            starsContainer.className = 'auto-bg-stars';
            for (var i = 0; i < 50; i++) {
                var star = document.createElement('div');
                star.className = 'auto-bg-star';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 70 + '%';
                var size = Math.random() * 3 + 1;
                star.style.width = size + 'px';
                star.style.height = size + 'px';
                star.style.animationDelay = Math.random() * 3 + 's';
                star.style.animationDuration = (Math.random() * 3 + 2) + 's';
                starsContainer.appendChild(star);
            }
            body.appendChild(starsContainer);
        }
        
        console.log('自动背景已应用:', timeClass, seasonClass);
    }

    // ==================== 注入设置面板 HTML ====================
    function injectPanel() {
        if (document.getElementById('settings-panel-root')) return;

        var overlay = document.createElement('div');
        overlay.className = 'settings-overlay';
        overlay.id = 'settings-overlay';
        overlay.addEventListener('click', closePanel);
        document.body.appendChild(overlay);

        var panel = document.createElement('div');
        panel.className = 'settings-panel';
        panel.id = 'settings-panel-root';
        panel.innerHTML = '\
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">\
                <h3 style="font-size:1.25rem;font-weight:700;color:var(--text-dark);">外观设置</h3>\
                <button id="settings-close-btn" style="background:none;border:none;cursor:pointer;color:var(--text-gray);font-size:1.25rem;">&#10005;</button>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">主题模式</div>\
                <div class="settings-option' + (settings.theme === 'light' ? ' active' : '') + '" data-setting="theme" data-value="light">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>\
                    浅色模式\
                </div>\
                <div class="settings-option' + (settings.theme === 'dark' ? ' active' : '') + '" data-setting="theme" data-value="dark">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>\
                    深色模式\
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">卡片样式</div>\
                <div class="settings-option' + (settings.cardStyle === 'default' ? ' active' : '') + '" data-setting="cardStyle" data-value="default">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>\
                    默认\
                </div>\
                <div class="settings-option' + (settings.cardStyle === 'minimal' ? ' active' : '') + '" data-setting="cardStyle" data-value="minimal">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1" ry="1"/></svg>\
                    简约风\
                </div>\
                <div class="settings-option' + (settings.cardStyle === 'rounded' ? ' active' : '') + '" data-setting="cardStyle" data-value="rounded">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="6" ry="6"/></svg>\
                    圆润风\
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">动画速度</div>\
                <div class="settings-option' + (settings.animSpeed === 'slow' ? ' active' : '') + '" data-setting="animSpeed" data-value="slow">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>\
                    慢速\
                </div>\
                <div class="settings-option' + (settings.animSpeed === 'normal' ? ' active' : '') + '" data-setting="animSpeed" data-value="normal">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>\
                    正常\
                </div>\
                <div class="settings-option' + (settings.animSpeed === 'fast' ? ' active' : '') + '" data-setting="animSpeed" data-value="fast">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>\
                    快速\
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">悬浮动效</div>\
                <div class="settings-option' + (settings.hoverEffect === 'subtle' ? ' active' : '') + '" data-setting="hoverEffect" data-value="subtle">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>\
                    轻微\
                </div>\
                <div class="settings-option' + (settings.hoverEffect === 'lift' ? ' active' : '') + '" data-setting="hoverEffect" data-value="lift">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>\
                    抬升\
                </div>\
                <div class="settings-option' + (settings.hoverEffect === 'glow' ? ' active' : '') + '" data-setting="hoverEffect" data-value="glow">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>\
                    发光\
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">全站背景</div>\
                <div id="site-bg-status" style="display:none;margin-bottom:0.5rem;padding:0.4rem 0.75rem;border-radius:0.375rem;background:#d1fae5;color:#059669;font-size:0.8rem;font-weight:500;"></div>\
                <div style="margin-bottom:0.75rem;">\
                    <div id="site-bg-preview" style="width:100%;height:100px;border-radius:0.5rem;border:2px dashed var(--border-medium);display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:0.5rem;background:var(--bg-card-hover);cursor:pointer;position:relative;" title="点击上传背景图片">\
                        <span id="site-bg-placeholder" style="color:var(--text-gray);font-size:0.8rem;text-align:center;">\
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display:block;margin:0 auto 4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                            点击上传背景图片<br><span style="font-size:0.7rem;opacity:0.7;">支持 JPG / PNG / WebP，自动压缩</span>\
                        </span>\
                        <img id="site-bg-img" src="" alt="" style="width:100%;height:100%;object-fit:cover;display:none;">\
                    </div>\
                    <input type="file" id="site-bg-file" accept="image/*" style="display:none;">\
                    <div style="display:flex;gap:0.5rem;">\
                        <button id="site-bg-clear" style="flex:1;padding:0.4rem;border:1px solid var(--border-medium);border-radius:0.375rem;background:var(--bg-card-hover);color:var(--text-gray);font-size:0.75rem;cursor:pointer;">恢复默认白色</button>\
                    </div>\
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">⏰ 自动时间背景</div>\
                <p style="font-size:0.7rem;opacity:0.7;margin-bottom:0.5rem;">根据当前时间和季节自动切换背景</p>\
                <div class="settings-option" id="auto-time-bg-toggle">\
                    <span>' + (autoTimeBg ? '✅' : '⬜') + '</span>\
                    <span>启用自动时间背景</span>\
                </div>\
                <p style="font-size:0.65rem;opacity:0.6;margin-top:0.3rem;">晨光→上午→下午→黄昏→夜晚 ⏰</p>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">🎬 视频背景 (PV)</div>\
                <p style="font-size:0.7rem;opacity:0.7;margin-bottom:0.5rem;">粘贴游戏PV视频链接（直链.mp4/webm）</p>\
                <input type="text" id="site-video-input" placeholder="粘贴视频直链URL..."\
                    style="width:100%;padding:0.5rem;border:1px solid var(--input-border);border-radius:0.5rem;font-size:0.85rem;margin-bottom:0.5rem;"\
                    value="' + (videoBgUrl || '') + '">\
                <div style="display:flex;gap:0.5rem;">\
                    <button id="site-video-apply" style="flex:1;padding:0.5rem;border-radius:0.5rem;border:none;background:linear-gradient(135deg,#52B6FF,#94D8FF);color:#fff;cursor:pointer;">应用视频背景</button>\
                    <button id="site-video-clear" style="padding:0.5rem 1rem;border-radius:0.5rem;border:1px solid #ccc;background:var(--bg-card);cursor:pointer;" ' + (videoBgUrl ? '' : 'disabled') + '>清除</button>\
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">Hero 区域背景</div>\
                <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">\
                    <input type="text" id="hero-bg-input" placeholder="输入图片URL..." value="' + (settings.heroBg || '') + '"\
                        style="flex:1;padding:0.5rem 0.75rem;border:1px solid var(--input-border);border-radius:0.5rem;font-size:0.8rem;background:var(--input-bg);color:var(--text-dark);">\
                    <button id="hero-bg-apply" class="btn-primary" style="padding:0.5rem 0.75rem;font-size:0.75rem;">应用</button>\
                </div>\
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">\
                    <button class="hero-preset-btn" data-url="" style="padding:0.35rem 0.65rem;border-radius:0.375rem;border:1px solid var(--border-light);background:var(--bg-card-hover);color:var(--text-dark);font-size:0.75rem;cursor:pointer;">默认渐变</button>\
                    <button class="hero-preset-btn" data-url="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=80" style="padding:0.35rem 0.65rem;border-radius:0.375rem;border:1px solid var(--border-light);background:var(--bg-card-hover);color:var(--text-dark);font-size:0.75rem;cursor:pointer;">星空</button>\
                    <button class="hero-preset-btn" data-url="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&q=80" style="padding:0.35rem 0.65rem;border-radius:0.375rem;border:1px solid var(--border-light);background:var(--bg-card-hover);color:var(--text-dark);font-size:0.75rem;cursor:pointer;">游戏手柄</button>\
                    <button class="hero-preset-btn" data-url="https://images.unsplash.com/photo-1552820728-8b83bb6b2b28?w=1920&q=80" style="padding:0.35rem 0.65rem;border-radius:0.375rem;border:1px solid var(--border-light);background:var(--bg-card-hover);color:var(--text-dark);font-size:0.75rem;cursor:pointer;">赛博朋克</button>\
                    <button class="hero-preset-btn" data-url="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1920&q=80" style="padding:0.35rem 0.65rem;border-radius:0.375rem;border:1px solid var(--border-light);background:var(--bg-card-hover);color:var(--text-dark);font-size:0.75rem;cursor:pointer;">霓虹</button>\
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">🎭 看板娘</div>\
                <div class="settings-option" id="mascot-toggle-option">\
                    <span>' + (mascotEnabled ? '✅' : '⬜') + '</span>\
                    <span>启用看板娘</span>\
                </div>\
                <p style="font-size:0.7rem;opacity:0.7;margin:0.5rem 0;">自定义台词（一行一句）：</p>\
                <textarea id="mascot-quotes-input" style="width:100%;padding:0.5rem;border:1px solid var(--input-border);border-radius:0.5rem;font-size:0.8rem;min-height:80px;resize:vertical;">' + mascotQuotes.join('\\n') + '</textarea>\
                <button id="mascot-quotes-save" style="margin-top:0.5rem;padding:0.5rem 1rem;border-radius:0.5rem;border:none;background:linear-gradient(135deg,#52B6FF,#94D8FF);color:#fff;cursor:pointer;font-size:0.8rem;">保存台词</button>\
            </div>\
            \
            <button id="settings-reset-btn" style="width:100%;padding:0.6rem;border:1px solid var(--border-medium);border-radius:0.5rem;background:var(--bg-card-hover);color:var(--text-gray);font-size:0.8rem;cursor:pointer;">恢复默认设置</button>\
        ';
        document.body.appendChild(panel);

        // 触发按钮（浮动齿轮）
        var trigger = document.createElement('button');
        trigger.className = 'settings-trigger';
        trigger.id = 'settings-trigger-btn';
        trigger.title = '外观设置';
        trigger.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
        trigger.addEventListener('click', openPanel);
        document.body.appendChild(trigger);

        // 绑定事件
        document.getElementById('settings-close-btn').addEventListener('click', closePanel);

        // 设置选项点击
        panel.querySelectorAll('.settings-option').forEach(function (opt) {
            opt.addEventListener('click', function () {
                var key = this.dataset.setting;
                var value = this.dataset.value;
                settings[key] = value;
                save();
                applyTheme();
                // 更新 active 状态
                panel.querySelectorAll('.settings-option[data-setting="' + key + '"]').forEach(function (o) {
                    o.classList.remove('active');
                });
                this.classList.add('active');
            });
        });

        // 自定义背景
        document.getElementById('hero-bg-apply').addEventListener('click', function () {
            var url = document.getElementById('hero-bg-input').value.trim();
            settings.heroBg = url;
            save();
            applyHeroBg();
        });

        // 预设背景
        panel.querySelectorAll('.hero-preset-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var url = this.dataset.url;
                settings.heroBg = url;
                document.getElementById('hero-bg-input').value = url;
                save();
                applyHeroBg();
            });
        });

        // 全站背景上传
        var siteBgPreview = document.getElementById('site-bg-preview');
        var siteBgFile = document.getElementById('site-bg-file');
        siteBgPreview.addEventListener('click', function () {
            siteBgFile.click();
        });
        siteBgFile.addEventListener('change', function () {
            var file = this.files[0];
            if (!file) return;
            
            console.log('选择了文件:', file.name, '大小:', Math.round(file.size / 1024) + 'KB', '类型:', file.type);
            
            // 用 canvas 压缩图片
            var reader = new FileReader();
            reader.onload = function (e) {
                var tempImg = new Image();
                tempImg.onload = function () {
                    console.log('原始图片尺寸:', tempImg.naturalWidth, 'x', tempImg.naturalHeight);
                    
                    // 计算压缩后尺寸（最大 1920px）
                    var maxW = 1920;
                    var maxH = 1080;
                    var w = tempImg.naturalWidth;
                    var h = tempImg.naturalHeight;
                    
                    if (w > maxW) {
                        h = Math.round(h * maxW / w);
                        w = maxW;
                    }
                    if (h > maxH) {
                        w = Math.round(w * maxH / h);
                        h = maxH;
                    }
                    
                    // 用 canvas 压缩
                    var canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(tempImg, 0, 0, w, h);
                    
                    // 导出为 JPEG（质量 0.6）
                    var compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                    console.log('压缩后大小:', Math.round(compressedBase64.length / 1024) + 'KB');
                    
                    // 应用背景
                    siteBgImage = compressedBase64;
                    applySiteBg();
                    
                    // 保存到 localStorage
                    try {
                        localStorage.setItem('site_bg_image', compressedBase64);
                        console.log('图片已保存到 localStorage');
                        showBgConfirm('背景已应用！刷新页面后依然有效');
                    } catch (err) {
                        console.warn('localStorage 存储失败:', err);
                        showBgConfirm('背景已应用（当前会话）！图片太大无法永久保存');
                    }
                    
                    // 更新预览
                    document.getElementById('site-bg-img').src = compressedBase64;
                    document.getElementById('site-bg-img').style.display = 'block';
                    document.getElementById('site-bg-placeholder').style.display = 'none';
                };
                tempImg.onerror = function () {
                    alert('图片解析失败，请换一张试试');
                };
                tempImg.src = e.target.result;
            };
            reader.onerror = function () {
                alert('图片读取失败，请重试');
            };
            reader.readAsDataURL(file);
        });

        // 清除全站背景
        document.getElementById('site-bg-clear').addEventListener('click', function () {
            siteBgImage = null;
            localStorage.removeItem('site_bg_image');
            applySiteBg();
            document.getElementById('site-bg-img').style.display = 'none';
            document.getElementById('site-bg-img').src = '';
            document.getElementById('site-bg-placeholder').style.display = '';
            siteBgFile.value = '';
            showBgConfirm('已恢复默认白色背景');
        });

        // 视频背景
        document.getElementById('site-video-apply').addEventListener('click', function(){
            var url = document.getElementById('site-video-input').value.trim();
            if (!url) return;
            videoBgUrl = url;
            try { localStorage.setItem('site_video_bg', url); } catch(e){}
            applyVideoBg();
            showBgConfirm('视频背景已应用！');
        });
        document.getElementById('site-video-clear').addEventListener('click', function(){
            videoBgUrl = null;
            localStorage.removeItem('site_video_bg');
            document.getElementById('site-video-input').value = '';
            applyVideoBg();
            showBgConfirm('视频背景已清除');
        });

        // 看板娘设置
        document.getElementById('mascot-toggle-option').addEventListener('click', function(){
            mascotEnabled = !mascotEnabled;
            localStorage.setItem('mascot_enabled', mascotEnabled);
            initMascot();
            document.getElementById('mascot-toggle-option').querySelector('span').textContent = mascotEnabled ? '✅' : '⬜';
        });
        document.getElementById('mascot-quotes-save').addEventListener('click', function(){
            var lines = document.getElementById('mascot-quotes-input').value.split('\n').filter(function(l){ return l.trim(); });
            mascotQuotes = lines.length > 0 ? lines : ['说点什么吧~'];
            localStorage.setItem('mascot_quotes', JSON.stringify(mascotQuotes));
            showToast('台词已保存！');
        });

        // 自动时间背景
        document.getElementById('auto-time-bg-toggle').addEventListener('click', function(){
            autoTimeBg = !autoTimeBg;
            localStorage.setItem('auto_time_bg', autoTimeBg);
            applyAutoTimeBg();
            document.getElementById('auto-time-bg-toggle').querySelector('span').textContent = autoTimeBg ? '✅' : '⬜';
        });

        // 恢复默认
        document.getElementById('settings-reset-btn').addEventListener('click', function () {
            settings = Object.assign({}, defaults);
            siteBgImage = null;
            videoBgUrl = null;
            mascotEnabled = true;
            mascotQuotes = [
                '欢迎回来！今天玩什么游戏呀？',
                '记得休息一下哦~',
                '新游戏发售啦，快去看看！',
                '你的游戏收藏又多了呢~',
                '肝游戏虽好，可不要熬夜哦！',
                '今天也是元气满满的一天！'
            ];
            mascotImage = null;
            autoTimeBg = false;
            localStorage.removeItem('site_bg_image');
            localStorage.removeItem('site_video_bg');
            localStorage.removeItem('mascot_enabled');
            localStorage.removeItem('mascot_quotes');
            localStorage.removeItem('mascot_image');
            localStorage.removeItem('auto_time_bg');
            save();
            applyTheme();
            // 更新面板 active 状态
            panel.querySelectorAll('.settings-option').forEach(function (o) {
                o.classList.remove('active');
                var key = o.dataset.setting;
                if (settings[key] === o.dataset.value) o.classList.add('active');
            });
            document.getElementById('hero-bg-input').value = '';
            // 清除全站背景预览
            document.getElementById('site-bg-img').style.display = 'none';
            document.getElementById('site-bg-img').src = '';
            document.getElementById('site-bg-placeholder').style.display = '';
            siteBgFile.value = '';
            // 清除视频背景输入
            document.getElementById('site-video-input').value = '';
            // 更新看板娘状态显示
            var mascotToggleSpan = document.getElementById('mascot-toggle-option');
            if (mascotToggleSpan) mascotToggleSpan.querySelector('span').textContent = '✅';
            // 更新自动时间背景状态显示
            var autoTimeBgToggle = document.getElementById('auto-time-bg-toggle');
            if (autoTimeBgToggle) autoTimeBgToggle.querySelector('span').textContent = '⬜';
            document.getElementById('mascot-quotes-input').value = mascotQuotes.join('\n');
            initMascot();
        });
    }

    function openPanel() {
        document.getElementById('settings-panel-root').classList.add('open');
        document.getElementById('settings-overlay').classList.add('open');
    }

    function closePanel() {
        document.getElementById('settings-panel-root').classList.remove('open');
        document.getElementById('settings-overlay').classList.remove('open');
    }

    // 显示背景操作确认提示
    function showBgConfirm(message) {
        var status = document.getElementById('site-bg-status');
        if (!status) return;
        status.textContent = '✓ ' + message;
        status.style.display = 'block';
        setTimeout(function () {
            status.style.display = 'none';
        }, 3000);
    }

    // 通用提示
    function showToast(msg) {
        var toast = document.getElementById('toast');
        var msgEl = document.getElementById('toast-message');
        if (!toast || !msgEl) return;
        msgEl.textContent = msg;
        toast.className = 'toast info show';
        setTimeout(function(){ toast.classList.remove('show'); }, 3000);
    }

    // ==================== 看板娘 ====================
    function initMascot() {
        if (!mascotEnabled) return;

        var container = document.getElementById('mascot-container');
        if (container) container.remove();

        container = document.createElement('div');
        container.id = 'mascot-container';
        container.className = 'mascot-container';
        container.innerHTML =
            '<div class="mascot-speech" id="mascot-speech"></div>' +
            '<div class="mascot-character">' +
                '<img src="' + (mascotImage || 'assets/mascot-default.jpg') + '" alt="看板娘" id="mascot-img">' +
            '</div>' +
            '<button class="mascot-upload-btn" id="mascot-upload-trigger">换装</button>' +
            '<input type="file" id="mascot-file-input" accept="image/*" style="display:none;">';
        document.body.appendChild(container);

        // 拖拽
        var isDragging = false, startX, startY, startLeft, startTop;
        container.addEventListener('mousedown', function(e){
            if (e.target.tagName === 'BUTTON' || e.target.id === 'mascot-file-input') return;
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            var rect = container.getBoundingClientRect();
            startLeft = rect.left; startTop = rect.top;
            container.classList.add('dragging');
            e.preventDefault();
        });
        document.addEventListener('mousemove', function(e){
            if (!isDragging) return;
            container.style.left = (startLeft + e.clientX - startX) + 'px';
            container.style.top = (startTop + e.clientY - startY) + 'px';
            container.style.right = 'auto';
            container.style.bottom = 'auto';
        });
        document.addEventListener('mouseup', function(){
            isDragging = false;
            container.classList.remove('dragging');
        });

        // 对话
        function showSpeech(text) {
            var speech = document.getElementById('mascot-speech');
            if (!speech) return;
            speech.textContent = text;
            speech.classList.remove('fade');
            void speech.offsetWidth;
            speech.classList.add('show', 'fade');
        }
        container.addEventListener('click', function(e){
            if (isDragging) return;
            var q = mascotQuotes[Math.floor(Math.random() * mascotQuotes.length)];
            showSpeech(q);
        });
        // 初始问候
        setTimeout(function(){
            showSpeech(mascotQuotes[Math.floor(Math.random() * mascotQuotes.length)]);
        }, 2000);
        // 定期说话
        setInterval(function(){
            showSpeech(mascotQuotes[Math.floor(Math.random() * mascotQuotes.length)]);
        }, 30000);

        // 上传立绘
        document.getElementById('mascot-upload-trigger').addEventListener('click', function(){
            document.getElementById('mascot-file-input').click();
        });
        document.getElementById('mascot-file-input').addEventListener('change', function(){
            var file = this.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(e){
                var compressed = e.target.result;
                if (compressed.length > 500000) {
                    var img = new Image();
                    img.onload = function(){
                        var canvas = document.createElement('canvas');
                        var scale = Math.min(1, 500000 / compressed.length * 1.5);
                        canvas.width = img.width * scale;
                        canvas.height = img.height * scale;
                        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                        compressed = canvas.toDataURL('image/png');
                        saveMascotImage(compressed);
                    };
                    img.src = compressed;
                } else {
                    saveMascotImage(compressed);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    function saveMascotImage(dataUrl) {
        try {
            localStorage.setItem('mascot_image', dataUrl);
            mascotImage = dataUrl;
            document.getElementById('mascot-img').src = dataUrl;
            showToast('看板娘新衣服换上啦！');
        } catch(e){
            showToast('图片太大了，换张小一点的吧~');
        }
    }

    // ==================== 导航栏主题切换按钮 ====================
    function injectNavToggle() {
        var nav = document.querySelector('nav');
        if (!nav || document.getElementById('nav-theme-toggle')) return;

        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-left:0.5rem;';

        var toggle = document.createElement('button');
        toggle.className = 'theme-toggle';
        toggle.id = 'nav-theme-toggle';
        toggle.title = '切换深浅模式';
        toggle.addEventListener('click', function () {
            settings.theme = settings.theme === 'light' ? 'dark' : 'light';
            save();
            applyTheme();
            // 同步设置面板
            var panel = document.getElementById('settings-panel-root');
            if (panel) {
                panel.querySelectorAll('.settings-option[data-setting="theme"]').forEach(function (o) {
                    o.classList.toggle('active', o.dataset.value === settings.theme);
                });
            }
        });

        var icon = document.createElement('span');
        icon.id = 'theme-icon';
        icon.style.cssText = 'position:absolute;top:50%;left:7px;transform:translateY(-50%);pointer-events:none;z-index:1;';
        icon.innerHTML = settings.theme === 'light'
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="5"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="#94a3b8" stroke="#94a3b8" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

        toggle.appendChild(icon);
        wrapper.appendChild(toggle);

        // 插入到导航栏右侧
        var desktopNav = nav.querySelector('.desktop-nav');
        if (desktopNav) {
            desktopNav.appendChild(wrapper);
        }
    }

    function updateNavIcon() {
        var icon = document.getElementById('theme-icon');
        if (!icon) return;
        icon.innerHTML = settings.theme === 'light'
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="5"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="#94a3b8" stroke="#94a3b8" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }

    // ==================== 初始化 ====================
    function init() {
        // 读取保存的背景图片
        siteBgImage = localStorage.getItem('site_bg_image') || null;
        
        applyTheme();
        injectPanel();
        injectNavToggle();

        // 恢复全站背景预览
        if (siteBgImage) {
            var img = document.getElementById('site-bg-img');
            var placeholder = document.getElementById('site-bg-placeholder');
            if (img && placeholder) {
                img.src = siteBgImage;
                img.style.display = 'block';
                placeholder.style.display = 'none';
            }
        }

        // 监听设置变化更新图标
        var originalApply = applyTheme;
        applyTheme = function () {
            originalApply();
            updateNavIcon();
        };

        // 初始化看板娘
        initMascot();

        // 修复移动端菜单：替换 toggle 以清除各页面重复/错误的 hidden 切换逻辑
        var mobileToggle = document.getElementById('mobile-menu-toggle');
        var mobileMenu = document.getElementById('mobile-menu');
        if (mobileToggle && mobileMenu) {
            var freshToggle = mobileToggle.cloneNode(true);
            mobileToggle.parentNode.replaceChild(freshToggle, mobileToggle);
            freshToggle.addEventListener('click', function () {
                mobileMenu.classList.toggle('open');
            });
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
        }
        
        console.log('主题系统初始化完成，背景状态:', siteBgImage ? '有图片' : '无图片');
    }

    // DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
