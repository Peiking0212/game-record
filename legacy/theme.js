/**
 * theme.js 鈥?鍏ㄥ眬涓婚鎺у埗
 * 娣辨祬妯″紡鍒囨崲銆佸崱鐗囨牱寮忋€佸姩鐢婚€熷害銆佽嚜瀹氫箟鑳屾櫙
 */
(function () {
    'use strict';

    if (!document.querySelector('link[rel="manifest"]')) {
        var manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = 'manifest.json';
        document.head.appendChild(manifestLink);
    }

    const STORAGE_KEY = 'game_record_theme';

    // 榛樿璁剧疆
    const defaults = {
        theme: 'light',       // light | dark
        cardStyle: 'default', // default | minimal | rounded
        animSpeed: 'normal',  // slow | normal | fast
        hoverEffect: 'lift',  // subtle | lift | glow
        heroBg: '',           // Hero 鍖哄煙鑷畾涔夎儗鏅浘 URL
        siteBg: null          // 鍏ㄧ珯鑳屾櫙鍥?base64锛堝彲鑳藉緢澶э紝鍗曠嫭澶勭悊锛?    };

    // 璇诲彇璁剧疆
    let settings = Object.assign({}, defaults, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));

    // 鑳屾櫙鍥剧墖鍗曠嫭瀛樺偍锛堥伩鍏嶆薄鏌撲富璁剧疆锛?    let siteBgImage = localStorage.getItem('site_bg_image') || null;

    // 瑙嗛鑳屾櫙
    var videoBgUrl = localStorage.getItem('site_video_bg') || null;

    // 鑷姩鏃堕棿鑳屾櫙
    var autoTimeBg = localStorage.getItem('auto_time_bg') === 'true';

    // 鐪嬫澘濞樼浉鍏冲彉閲?    var mascotImage = localStorage.getItem('mascot_image') || null;
    var mascotQuotes = JSON.parse(localStorage.getItem('mascot_quotes') || 'null') || [
        '娆㈣繋鍥炴潵锛佷粖澶╃帺浠€涔堟父鎴忓憖锛?,
        '璁板緱浼戞伅涓€涓嬪摝~',
        '鏂版父鎴忓彂鍞暒锛屽揩鍘荤湅鐪嬶紒',
        '浣犵殑娓告垙鏀惰棌鍙堝浜嗗憿~',
        '鑲濇父鎴忚櫧濂斤紝鍙笉瑕佺啲澶滃摝锛?,
        '浠婂ぉ涔熸槸鍏冩皵婊℃弧鐨勪竴澶╋紒'
    ];
    var mascotEnabled = localStorage.getItem('mascot_enabled') !== 'false';

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }

    // ==================== 搴旂敤涓婚 ====================
    function applyTheme() {
        // 娣辨祬妯″紡
        document.documentElement.setAttribute('data-theme', settings.theme);

        // 鍗＄墖鏍峰紡
        document.body.classList.remove('card-minimal', 'card-rounded');
        if (settings.cardStyle === 'minimal') document.body.classList.add('card-minimal');
        if (settings.cardStyle === 'rounded') document.body.classList.add('card-rounded');

        // 鍔ㄧ敾閫熷害
        document.body.classList.remove('anim-speed-slow', 'anim-speed-normal', 'anim-speed-fast');
        document.body.classList.add('anim-speed-' + settings.animSpeed);

        // 鎮诞鏁堟灉
        document.body.classList.remove('hover-subtle', 'hover-lift', 'hover-glow');
        document.body.classList.add('hover-' + settings.hoverEffect);

        // 鑷畾涔夎儗鏅?        applyHeroBg();
        applySiteBg();
        applyVideoBg();
        applyAutoTimeBg();
    }

    // ==================== 鑷畾涔夎儗鏅?====================
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

    // ==================== 鍏ㄧ珯鑳屾櫙 ====================
    function applySiteBg() {
        console.log('搴旂敤鍏ㄧ珯鑳屾櫙:', siteBgImage ? '鏈夊浘鐗?' + Math.round(siteBgImage.length / 1024) + 'KB)' : '鏃犲浘鐗?);
        
        if (siteBgImage) {
            // 鐢?CSS background-image 璁剧疆鍦?body 涓婏紙鏈€鍙潬鐨勬柟妗堬級
            document.body.style.backgroundImage = 'url(' + siteBgImage + ')';
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center center';
            document.body.style.backgroundAttachment = 'fixed';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.classList.add('has-custom-bg');
            console.log('鑳屾櫙宸插簲鐢紝鍥剧墖澶у皬:', Math.round(siteBgImage.length / 1024) + 'KB');
        } else {
            // 娓呴櫎鑳屾櫙
            document.body.style.backgroundImage = '';
            document.body.style.backgroundSize = '';
            document.body.style.backgroundPosition = '';
            document.body.style.backgroundAttachment = '';
            document.body.style.backgroundRepeat = '';
            document.body.classList.remove('has-custom-bg');
            console.log('鑳屾櫙宸叉竻闄?);
        }
    }

    // ==================== 瑙嗛鑳屾櫙 ====================
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
            console.log('瑙嗛鑳屾櫙宸插簲鐢?);
        } else {
            if (videoEl) videoEl.remove();
            if (overlayEl) overlayEl.remove();
            document.body.classList.remove('has-video-bg');
        }
    }

    // ==================== 鑷姩鏃堕棿鑳屾櫙 ====================
    function applyAutoTimeBg() {
        // 娓呴櫎涔嬪墠鐨勭被
        var body = document.body;
        body.classList.remove('auto-bg-active', 'auto-bg-morning', 'auto-bg-forenoon', 'auto-bg-afternoon', 'auto-bg-dusk', 'auto-bg-night', 'auto-bg-spring', 'auto-bg-summer', 'auto-bg-autumn', 'auto-bg-winter');
        
        // 娓呴櫎鏃х殑鏄熸槦
        var oldStars = document.getElementById('auto-bg-stars');
        if (oldStars) oldStars.remove();
        
        if (!autoTimeBg) return;
        
        body.classList.add('auto-bg-active');
        
        var hour = new Date().getHours();
        var month = new Date().getMonth() + 1;
        
        // 鏃堕棿娈?        var timeClass;
        if (hour >= 5 && hour < 8) timeClass = 'auto-bg-morning';
        else if (hour >= 8 && hour < 12) timeClass = 'auto-bg-forenoon';
        else if (hour >= 12 && hour < 17) timeClass = 'auto-bg-afternoon';
        else if (hour >= 17 && hour < 19) timeClass = 'auto-bg-dusk';
        else timeClass = 'auto-bg-night';
        body.classList.add(timeClass);
        
        // 瀛ｈ妭
        var seasonClass;
        if (month >= 3 && month <= 5) seasonClass = 'auto-bg-spring';
        else if (month >= 6 && month <= 8) seasonClass = 'auto-bg-summer';
        else if (month >= 9 && month <= 11) seasonClass = 'auto-bg-autumn';
        else seasonClass = 'auto-bg-winter';
        body.classList.add(seasonClass);
        
        // 澶滄櫄鍔犳槦鏄?        if (timeClass === 'auto-bg-night') {
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
        
        console.log('鑷姩鑳屾櫙宸插簲鐢?', timeClass, seasonClass);
    }

    // ==================== 娉ㄥ叆璁剧疆闈㈡澘 HTML ====================
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
                <h3 style="font-size:1.25rem;font-weight:700;color:var(--text-dark);">澶栬璁剧疆</h3>\
                <button id="settings-close-btn" style="background:none;border:none;cursor:pointer;color:var(--text-gray);font-size:1.25rem;">&#10005;</button>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">涓婚妯″紡</div>\
                <div class="settings-option' + (settings.theme === 'light' ? ' active' : '') + '" data-setting="theme" data-value="light">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>\
                    娴呰壊妯″紡\
                </div>\
                <div class="settings-option' + (settings.theme === 'dark' ? ' active' : '') + '" data-setting="theme" data-value="dark">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>\
                    娣辫壊妯″紡\
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">鍗＄墖鏍峰紡</div>\
                <div class="settings-option' + (settings.cardStyle === 'default' ? ' active' : '') + '" data-setting="cardStyle" data-value="default">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>\
                    榛樿\
                </div>\
                <div class="settings-option' + (settings.cardStyle === 'minimal' ? ' active' : '') + '" data-setting="cardStyle" data-value="minimal">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1" ry="1"/></svg>\
                    绠€绾﹂\
                </div>\
                <div class="settings-option' + (settings.cardStyle === 'rounded' ? ' active' : '') + '" data-setting="cardStyle" data-value="rounded">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="6" ry="6"/></svg>\
                    鍦嗘鼎椋嶾
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">鍔ㄧ敾閫熷害</div>\
                <div class="settings-option' + (settings.animSpeed === 'slow' ? ' active' : '') + '" data-setting="animSpeed" data-value="slow">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>\
                    鎱㈤€焅
                </div>\
                <div class="settings-option' + (settings.animSpeed === 'normal' ? ' active' : '') + '" data-setting="animSpeed" data-value="normal">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>\
                    姝ｅ父\
                </div>\
                <div class="settings-option' + (settings.animSpeed === 'fast' ? ' active' : '') + '" data-setting="animSpeed" data-value="fast">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>\
                    蹇€焅
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">鎮诞鍔ㄦ晥</div>\
                <div class="settings-option' + (settings.hoverEffect === 'subtle' ? ' active' : '') + '" data-setting="hoverEffect" data-value="subtle">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>\
                    杞诲井\
                </div>\
                <div class="settings-option' + (settings.hoverEffect === 'lift' ? ' active' : '') + '" data-setting="hoverEffect" data-value="lift">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>\
                    鎶崌\
                </div>\
                <div class="settings-option' + (settings.hoverEffect === 'glow' ? ' active' : '') + '" data-setting="hoverEffect" data-value="glow">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>\
                    鍙戝厜\
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">鍏ㄧ珯鑳屾櫙</div>\
                <div id="site-bg-status" style="display:none;margin-bottom:0.5rem;padding:0.4rem 0.75rem;border-radius:0.375rem;background:#d1fae5;color:#059669;font-size:0.8rem;font-weight:500;"></div>\
                <div style="margin-bottom:0.75rem;">\
                    <div id="site-bg-preview" style="width:100%;height:100px;border-radius:0.5rem;border:2px dashed var(--border-medium);display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:0.5rem;background:var(--bg-card-hover);cursor:pointer;position:relative;" title="鐐瑰嚮涓婁紶鑳屾櫙鍥剧墖">\
                        <span id="site-bg-placeholder" style="color:var(--text-gray);font-size:0.8rem;text-align:center;">\
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display:block;margin:0 auto 4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>\
                            鐐瑰嚮涓婁紶鑳屾櫙鍥剧墖<br><span style="font-size:0.7rem;opacity:0.7;">鏀寔 JPG / PNG / WebP锛岃嚜鍔ㄥ帇缂?/span>\
                        </span>\
                        <img id="site-bg-img" src="" alt="" style="width:100%;height:100%;object-fit:cover;display:none;">\
                    </div>\
                    <input type="file" id="site-bg-file" accept="image/*" style="display:none;">\
                    <div style="display:flex;gap:0.5rem;">\
                        <button id="site-bg-clear" style="flex:1;padding:0.4rem;border:1px solid var(--border-medium);border-radius:0.375rem;background:var(--bg-card-hover);color:var(--text-gray);font-size:0.75rem;cursor:pointer;">鎭㈠榛樿鐧借壊</button>\
                    </div>\
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">鈴?鑷姩鏃堕棿鑳屾櫙</div>\
                <p style="font-size:0.7rem;opacity:0.7;margin-bottom:0.5rem;">鏍规嵁褰撳墠鏃堕棿鍜屽鑺傝嚜鍔ㄥ垏鎹㈣儗鏅?/p>\
                <div class="settings-option" id="auto-time-bg-toggle">\
                    <span>' + (autoTimeBg ? '鉁? : '猬?) + '</span>\
                    <span>鍚敤鑷姩鏃堕棿鑳屾櫙</span>\
                </div>\
                <p style="font-size:0.65rem;opacity:0.6;margin-top:0.3rem;">鏅ㄥ厜鈫掍笂鍗堚啋涓嬪崍鈫掗粍鏄忊啋澶滄櫄 鈴?/p>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">馃幀 瑙嗛鑳屾櫙 (PV)</div>\
                <p style="font-size:0.7rem;opacity:0.7;margin-bottom:0.5rem;">绮樿创娓告垙PV瑙嗛閾炬帴锛堢洿閾?mp4/webm锛?/p>\
                <input type="text" id="site-video-input" placeholder="绮樿创瑙嗛鐩撮摼URL..."\
                    style="width:100%;padding:0.5rem;border:1px solid var(--input-border);border-radius:0.5rem;font-size:0.85rem;margin-bottom:0.5rem;"\
                    value="' + (videoBgUrl || '') + '">\
                <div style="display:flex;gap:0.5rem;">\
                    <button id="site-video-apply" style="flex:1;padding:0.5rem;border-radius:0.5rem;border:none;background:linear-gradient(135deg,#52B6FF,#94D8FF);color:#fff;cursor:pointer;">搴旂敤瑙嗛鑳屾櫙</button>\
                    <button id="site-video-clear" style="padding:0.5rem 1rem;border-radius:0.5rem;border:1px solid #ccc;background:var(--bg-card);cursor:pointer;" ' + (videoBgUrl ? '' : 'disabled') + '>娓呴櫎</button>\
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">Hero 鍖哄煙鑳屾櫙</div>\
                <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">\
                    <input type="text" id="hero-bg-input" placeholder="杈撳叆鍥剧墖URL..." value="' + (settings.heroBg || '') + '"\
                        style="flex:1;padding:0.5rem 0.75rem;border:1px solid var(--input-border);border-radius:0.5rem;font-size:0.8rem;background:var(--input-bg);color:var(--text-dark);">\
                    <button id="hero-bg-apply" class="btn-primary" style="padding:0.5rem 0.75rem;font-size:0.75rem;">搴旂敤</button>\
                </div>\
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">\
                    <button class="hero-preset-btn" data-url="" style="padding:0.35rem 0.65rem;border-radius:0.375rem;border:1px solid var(--border-light);background:var(--bg-card-hover);color:var(--text-dark);font-size:0.75rem;cursor:pointer;">榛樿娓愬彉</button>\
                    <button class="hero-preset-btn" data-url="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=80" style="padding:0.35rem 0.65rem;border-radius:0.375rem;border:1px solid var(--border-light);background:var(--bg-card-hover);color:var(--text-dark);font-size:0.75rem;cursor:pointer;">鏄熺┖</button>\
                    <button class="hero-preset-btn" data-url="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&q=80" style="padding:0.35rem 0.65rem;border-radius:0.375rem;border:1px solid var(--border-light);background:var(--bg-card-hover);color:var(--text-dark);font-size:0.75rem;cursor:pointer;">娓告垙鎵嬫焺</button>\
                    <button class="hero-preset-btn" data-url="https://images.unsplash.com/photo-1552820728-8b83bb6b2b28?w=1920&q=80" style="padding:0.35rem 0.65rem;border-radius:0.375rem;border:1px solid var(--border-light);background:var(--bg-card-hover);color:var(--text-dark);font-size:0.75rem;cursor:pointer;">璧涘崥鏈嬪厠</button>\
                    <button class="hero-preset-btn" data-url="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1920&q=80" style="padding:0.35rem 0.65rem;border-radius:0.375rem;border:1px solid var(--border-light);background:var(--bg-card-hover);color:var(--text-dark);font-size:0.75rem;cursor:pointer;">闇撹櫣</button>\
                </div>\
            </div>\
            \
            <div class="settings-section">\
                <div class="settings-label">馃幁 鐪嬫澘濞?/div>\
                <div class="settings-option" id="mascot-toggle-option">\
                    <span>' + (mascotEnabled ? '鉁? : '猬?) + '</span>\
                    <span>鍚敤鐪嬫澘濞?/span>\
                </div>\
                <p style="font-size:0.7rem;opacity:0.7;margin:0.5rem 0;">鑷畾涔夊彴璇嶏紙涓€琛屼竴鍙ワ級锛?/p>\
                <textarea id="mascot-quotes-input" style="width:100%;padding:0.5rem;border:1px solid var(--input-border);border-radius:0.5rem;font-size:0.8rem;min-height:80px;resize:vertical;">' + mascotQuotes.join('\\n') + '</textarea>\
                <button id="mascot-quotes-save" style="margin-top:0.5rem;padding:0.5rem 1rem;border-radius:0.5rem;border:none;background:linear-gradient(135deg,#52B6FF,#94D8FF);color:#fff;cursor:pointer;font-size:0.8rem;">淇濆瓨鍙拌瘝</button>\
            </div>\
            \
            <button id="settings-reset-btn" style="width:100%;padding:0.6rem;border:1px solid var(--border-medium);border-radius:0.5rem;background:var(--bg-card-hover);color:var(--text-gray);font-size:0.8rem;cursor:pointer;">鎭㈠榛樿璁剧疆</button>\
        ';
        document.body.appendChild(panel);

        // 瑙﹀彂鎸夐挳锛堟诞鍔ㄩ娇杞級
        var trigger = document.createElement('button');
        trigger.className = 'settings-trigger';
        trigger.id = 'settings-trigger-btn';
        trigger.title = '澶栬璁剧疆';
        trigger.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
        trigger.addEventListener('click', openPanel);
        document.body.appendChild(trigger);

        // 缁戝畾浜嬩欢
        document.getElementById('settings-close-btn').addEventListener('click', closePanel);

        // 璁剧疆閫夐」鐐瑰嚮
        panel.querySelectorAll('.settings-option').forEach(function (opt) {
            opt.addEventListener('click', function () {
                var key = this.dataset.setting;
                var value = this.dataset.value;
                settings[key] = value;
                save();
                applyTheme();
                // 鏇存柊 active 鐘舵€?                panel.querySelectorAll('.settings-option[data-setting="' + key + '"]').forEach(function (o) {
                    o.classList.remove('active');
                });
                this.classList.add('active');
            });
        });

        // 鑷畾涔夎儗鏅?        document.getElementById('hero-bg-apply').addEventListener('click', function () {
            var url = document.getElementById('hero-bg-input').value.trim();
            settings.heroBg = url;
            save();
            applyHeroBg();
        });

        // 棰勮鑳屾櫙
        panel.querySelectorAll('.hero-preset-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var url = this.dataset.url;
                settings.heroBg = url;
                document.getElementById('hero-bg-input').value = url;
                save();
                applyHeroBg();
            });
        });

        // 鍏ㄧ珯鑳屾櫙涓婁紶
        var siteBgPreview = document.getElementById('site-bg-preview');
        var siteBgFile = document.getElementById('site-bg-file');
        siteBgPreview.addEventListener('click', function () {
            siteBgFile.click();
        });
        siteBgFile.addEventListener('change', function () {
            var file = this.files[0];
            if (!file) return;
            
            console.log('閫夋嫨浜嗘枃浠?', file.name, '澶у皬:', Math.round(file.size / 1024) + 'KB', '绫诲瀷:', file.type);
            
            // 鐢?canvas 鍘嬬缉鍥剧墖
            var reader = new FileReader();
            reader.onload = function (e) {
                var tempImg = new Image();
                tempImg.onload = function () {
                    console.log('鍘熷鍥剧墖灏哄:', tempImg.naturalWidth, 'x', tempImg.naturalHeight);
                    
                    // 璁＄畻鍘嬬缉鍚庡昂瀵革紙鏈€澶?1920px锛?                    var maxW = 1920;
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
                    
                    // 鐢?canvas 鍘嬬缉
                    var canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(tempImg, 0, 0, w, h);
                    
                    // 瀵煎嚭涓?JPEG锛堣川閲?0.6锛?                    var compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                    console.log('鍘嬬缉鍚庡ぇ灏?', Math.round(compressedBase64.length / 1024) + 'KB');
                    
                    // 搴旂敤鑳屾櫙
                    siteBgImage = compressedBase64;
                    applySiteBg();
                    
                    // 淇濆瓨鍒?localStorage
                    try {
                        localStorage.setItem('site_bg_image', compressedBase64);
                        console.log('鍥剧墖宸蹭繚瀛樺埌 localStorage');
                        showBgConfirm('鑳屾櫙宸插簲鐢紒鍒锋柊椤甸潰鍚庝緷鐒舵湁鏁?);
                    } catch (err) {
                        console.warn('localStorage 瀛樺偍澶辫触:', err);
                        showBgConfirm('鑳屾櫙宸插簲鐢紙褰撳墠浼氳瘽锛夛紒鍥剧墖澶ぇ鏃犳硶姘镐箙淇濆瓨');
                    }
                    
                    // 鏇存柊棰勮
                    document.getElementById('site-bg-img').src = compressedBase64;
                    document.getElementById('site-bg-img').style.display = 'block';
                    document.getElementById('site-bg-placeholder').style.display = 'none';
                };
                tempImg.onerror = function () {
                    alert('鍥剧墖瑙ｆ瀽澶辫触锛岃鎹竴寮犺瘯璇?);
                };
                tempImg.src = e.target.result;
            };
            reader.onerror = function () {
                alert('鍥剧墖璇诲彇澶辫触锛岃閲嶈瘯');
            };
            reader.readAsDataURL(file);
        });

        // 娓呴櫎鍏ㄧ珯鑳屾櫙
        document.getElementById('site-bg-clear').addEventListener('click', function () {
            siteBgImage = null;
            localStorage.removeItem('site_bg_image');
            applySiteBg();
            document.getElementById('site-bg-img').style.display = 'none';
            document.getElementById('site-bg-img').src = '';
            document.getElementById('site-bg-placeholder').style.display = '';
            siteBgFile.value = '';
            showBgConfirm('宸叉仮澶嶉粯璁ょ櫧鑹茶儗鏅?);
        });

        // 瑙嗛鑳屾櫙
        document.getElementById('site-video-apply').addEventListener('click', function(){
            var url = document.getElementById('site-video-input').value.trim();
            if (!url) return;
            videoBgUrl = url;
            try { localStorage.setItem('site_video_bg', url); } catch(e){}
            applyVideoBg();
            showBgConfirm('瑙嗛鑳屾櫙宸插簲鐢紒');
        });
        document.getElementById('site-video-clear').addEventListener('click', function(){
            videoBgUrl = null;
            localStorage.removeItem('site_video_bg');
            document.getElementById('site-video-input').value = '';
            applyVideoBg();
            showBgConfirm('瑙嗛鑳屾櫙宸叉竻闄?);
        });

        // 鐪嬫澘濞樿缃?        document.getElementById('mascot-toggle-option').addEventListener('click', function(){
            mascotEnabled = !mascotEnabled;
            localStorage.setItem('mascot_enabled', mascotEnabled);
            initMascot();
            document.getElementById('mascot-toggle-option').querySelector('span').textContent = mascotEnabled ? '鉁? : '猬?;
        });
        document.getElementById('mascot-quotes-save').addEventListener('click', function(){
            var lines = document.getElementById('mascot-quotes-input').value.split('\n').filter(function(l){ return l.trim(); });
            mascotQuotes = lines.length > 0 ? lines : ['璇寸偣浠€涔堝惂~'];
            localStorage.setItem('mascot_quotes', JSON.stringify(mascotQuotes));
            showToast('鍙拌瘝宸蹭繚瀛橈紒');
        });

        // 鑷姩鏃堕棿鑳屾櫙
        document.getElementById('auto-time-bg-toggle').addEventListener('click', function(){
            autoTimeBg = !autoTimeBg;
            localStorage.setItem('auto_time_bg', autoTimeBg);
            applyAutoTimeBg();
            document.getElementById('auto-time-bg-toggle').querySelector('span').textContent = autoTimeBg ? '鉁? : '猬?;
        });

        // 鎭㈠榛樿
        document.getElementById('settings-reset-btn').addEventListener('click', function () {
            settings = Object.assign({}, defaults);
            siteBgImage = null;
            videoBgUrl = null;
            mascotEnabled = true;
            mascotQuotes = [
                '娆㈣繋鍥炴潵锛佷粖澶╃帺浠€涔堟父鎴忓憖锛?,
                '璁板緱浼戞伅涓€涓嬪摝~',
                '鏂版父鎴忓彂鍞暒锛屽揩鍘荤湅鐪嬶紒',
                '浣犵殑娓告垙鏀惰棌鍙堝浜嗗憿~',
                '鑲濇父鎴忚櫧濂斤紝鍙笉瑕佺啲澶滃摝锛?,
                '浠婂ぉ涔熸槸鍏冩皵婊℃弧鐨勪竴澶╋紒'
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
            // 鏇存柊闈㈡澘 active 鐘舵€?            panel.querySelectorAll('.settings-option').forEach(function (o) {
                o.classList.remove('active');
                var key = o.dataset.setting;
                if (settings[key] === o.dataset.value) o.classList.add('active');
            });
            document.getElementById('hero-bg-input').value = '';
            // 娓呴櫎鍏ㄧ珯鑳屾櫙棰勮
            document.getElementById('site-bg-img').style.display = 'none';
            document.getElementById('site-bg-img').src = '';
            document.getElementById('site-bg-placeholder').style.display = '';
            siteBgFile.value = '';
            // 娓呴櫎瑙嗛鑳屾櫙杈撳叆
            document.getElementById('site-video-input').value = '';
            // 鏇存柊鐪嬫澘濞樼姸鎬佹樉绀?            var mascotToggleSpan = document.getElementById('mascot-toggle-option');
            if (mascotToggleSpan) mascotToggleSpan.querySelector('span').textContent = '鉁?;
            // 鏇存柊鑷姩鏃堕棿鑳屾櫙鐘舵€佹樉绀?            var autoTimeBgToggle = document.getElementById('auto-time-bg-toggle');
            if (autoTimeBgToggle) autoTimeBgToggle.querySelector('span').textContent = '猬?;
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

    // 鏄剧ず鑳屾櫙鎿嶄綔纭鎻愮ず
    function showBgConfirm(message) {
        var status = document.getElementById('site-bg-status');
        if (!status) return;
        status.textContent = '鉁?' + message;
        status.style.display = 'block';
        setTimeout(function () {
            status.style.display = 'none';
        }, 3000);
    }

    // 閫氱敤鎻愮ず
    function showToast(msg) {
        var toast = document.getElementById('toast');
        var msgEl = document.getElementById('toast-message');
        if (!toast || !msgEl) return;
        msgEl.textContent = msg;
        toast.className = 'toast info show';
        setTimeout(function(){ toast.classList.remove('show'); }, 3000);
    }

    // ==================== 鐪嬫澘濞?====================
    function initMascot() {
        if (!mascotEnabled) {
            window.MascotBridge = {
                speak: function () { return false; },
                isEnabled: function () { return false; }
            };
            var old = document.getElementById('mascot-container');
            if (old) old.remove();
            return;
        }

        var container = document.getElementById('mascot-container');
        if (container) container.remove();

        container = document.createElement('div');
        container.id = 'mascot-container';
        container.className = 'mascot-container';
        container.innerHTML =
            '<div class="mascot-speech" id="mascot-speech"></div>' +
            '<div class="mascot-character">' +
                '<img src="' + (mascotImage || 'assets/mascot-default.jpg') + '" alt="鐪嬫澘濞? id="mascot-img">' +
            '</div>' +
            '<button class="mascot-upload-btn" id="mascot-upload-trigger">鎹㈣</button>' +
            '<input type="file" id="mascot-file-input" accept="image/*" style="display:none;">';
        document.body.appendChild(container);

        // 鎷栨嫿
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

        // 瀵硅瘽
        function showSpeech(text) {
            var speech = document.getElementById('mascot-speech');
            if (!speech) return;
            speech.textContent = text;
            speech.classList.remove('fade');
            void speech.offsetWidth;
            speech.classList.add('show', 'fade');
        }

        window.MascotBridge = {
            speak: function (text) {
                if (!mascotEnabled || !text) return false;
                showSpeech(String(text));
                return true;
            },
            isEnabled: function () {
                return mascotEnabled;
            }
        };
        container.addEventListener('click', function(e){
            if (isDragging) return;
            var q = mascotQuotes[Math.floor(Math.random() * mascotQuotes.length)];
            showSpeech(q);
        });
        // 鍒濆闂€?        setTimeout(function(){
            showSpeech(mascotQuotes[Math.floor(Math.random() * mascotQuotes.length)]);
        }, 2000);
        // 瀹氭湡璇磋瘽
        setInterval(function(){
            showSpeech(mascotQuotes[Math.floor(Math.random() * mascotQuotes.length)]);
        }, 30000);

        // 涓婁紶绔嬬粯
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
            showToast('鐪嬫澘濞樻柊琛ｆ湇鎹笂鍟︼紒');
        } catch(e){
            showToast('鍥剧墖澶ぇ浜嗭紝鎹㈠紶灏忎竴鐐圭殑鍚');
        }
    }

    // ==================== 瀵艰埅鏍忎富棰樺垏鎹㈡寜閽?====================
    function injectNavToggle() {
        var nav = document.querySelector('nav');
        if (!nav || document.getElementById('nav-theme-toggle')) return;

        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-left:0.5rem;';

        var toggle = document.createElement('button');
        toggle.className = 'theme-toggle';
        toggle.id = 'nav-theme-toggle';
        toggle.title = '鍒囨崲娣辨祬妯″紡';
        toggle.addEventListener('click', function () {
            settings.theme = settings.theme === 'light' ? 'dark' : 'light';
            save();
            applyTheme();
            // 鍚屾璁剧疆闈㈡澘
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

        // 鎻掑叆鍒板鑸爮鍙充晶
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

    // ==================== 鍒濆鍖?====================
    function init() {
        // 璇诲彇淇濆瓨鐨勮儗鏅浘鐗?        siteBgImage = localStorage.getItem('site_bg_image') || null;
        
        applyTheme();
        injectPanel();
        injectNavToggle();

        // 鎭㈠鍏ㄧ珯鑳屾櫙棰勮
        if (siteBgImage) {
            var img = document.getElementById('site-bg-img');
            var placeholder = document.getElementById('site-bg-placeholder');
            if (img && placeholder) {
                img.src = siteBgImage;
                img.style.display = 'block';
                placeholder.style.display = 'none';
            }
        }

        // 鐩戝惉璁剧疆鍙樺寲鏇存柊鍥炬爣
        var originalApply = applyTheme;
        applyTheme = function () {
            originalApply();
            updateNavIcon();
        };

        // 鍒濆鍖栫湅鏉垮
        initMascot();

        // 绉诲姩绔彍鍗曪細浜嬩欢濮旀墭锛岄伩鍏?clone 涓?lucide 閲嶇粯绔炴€?        if (!document.documentElement.dataset.mobileMenuBound) {
            document.documentElement.dataset.mobileMenuBound = '1';
            document.addEventListener('click', function (e) {
                if (!e.target.closest('#mobile-menu-toggle')) return;
                var menu = document.getElementById('mobile-menu');
                if (menu) menu.classList.toggle('open');
            });
        }
        
        console.log('涓婚绯荤粺鍒濆鍖栧畬鎴愶紝鑳屾櫙鐘舵€?', siteBgImage ? '鏈夊浘鐗? : '鏃犲浘鐗?);
    }

    // DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
