(function () {
    'use strict';

    var isRegisterMode = false;
    var form = document.getElementById('auth-form');
    var emailInput = document.getElementById('auth-email');
    var passwordInput = document.getElementById('auth-password');
    var submitBtn = document.getElementById('auth-submit');
    var toggleBtn = document.getElementById('auth-toggle-mode');
    var modeLabel = document.getElementById('auth-mode-label');
    var messageEl = document.getElementById('auth-message');

    function showMessage(text, isError) {
        messageEl.textContent = text;
        messageEl.className = 'auth-message' + (isError ? ' error' : ' success');
        messageEl.classList.remove('hidden');
    }

    function hideMessage() {
        messageEl.classList.add('hidden');
    }

    function setMode(register) {
        isRegisterMode = register;
        submitBtn.textContent = register ? '娉ㄥ唽' : '鐧诲綍';
        modeLabel.textContent = register ? '宸叉湁璐﹀彿锛? : '杩樻病鏈夎处鍙凤紵';
        toggleBtn.textContent = register ? '鍘荤櫥褰? : '娉ㄥ唽';
        passwordInput.autocomplete = register ? 'new-password' : 'current-password';
        hideMessage();
    }

    toggleBtn.addEventListener('click', function () {
        setMode(!isRegisterMode);
    });

    async function redirectAfterAuth() {
        if (window.GameCloud && typeof window.GameCloud.start === 'function') {
            await window.GameCloud.start();
        }
        window.location.href = window.GameAuth.getReturnUrl();
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideMessage();
        submitBtn.disabled = true;
        var email = emailInput.value.trim();
        var password = passwordInput.value;

        try {
            if (isRegisterMode) {
                var signUpData = await window.GameAuth.signUp(email, password);
                if (signUpData.session) {
                    localStorage.setItem('game_auth_user_id', signUpData.user.id);
                    showMessage('娉ㄥ唽鎴愬姛锛屾鍦ㄨ繘鍏モ€?, false);
                    await redirectAfterAuth();
                } else {
                    showMessage('娉ㄥ唽鎴愬姛锛佽鏌ユ敹纭閭欢锛堣嫢宸插紑鍚偖绠遍獙璇侊級锛岀劧鍚庣櫥褰曘€?, false);
                    setMode(false);
                }
            } else {
                await window.GameAuth.signIn(email, password);
                showMessage('鐧诲綍鎴愬姛锛屾鍦ㄥ悓姝モ€?, false);
                await redirectAfterAuth();
            }
        } catch (err) {
            showMessage(err.message || '鎿嶄綔澶辫触锛岃閲嶈瘯', true);
        } finally {
            submitBtn.disabled = false;
        }
    });

    (async function initAuthPage() {
        if (!window.SB) {
            showMessage('Supabase 鏈厤缃紝鏃犳硶鐧诲綍', true);
            return;
        }
        var session = await window.GameAuth.getSession();
        if (session) {
            await redirectAfterAuth();
        }
    })();
})();
