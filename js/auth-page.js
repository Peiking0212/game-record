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
        submitBtn.textContent = register ? '注册' : '登录';
        modeLabel.textContent = register ? '已有账号？' : '还没有账号？';
        toggleBtn.textContent = register ? '去登录' : '注册';
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
                    showMessage('注册成功，正在进入…', false);
                    await redirectAfterAuth();
                } else {
                    showMessage('注册成功！请查收确认邮件（若已开启邮箱验证），然后登录。', false);
                    setMode(false);
                }
            } else {
                await window.GameAuth.signIn(email, password);
                showMessage('登录成功，正在同步…', false);
                await redirectAfterAuth();
            }
        } catch (err) {
            showMessage(err.message || '操作失败，请重试', true);
        } finally {
            submitBtn.disabled = false;
        }
    });

    (async function initAuthPage() {
        if (!window.SB) {
            showMessage('Supabase 未配置，无法登录', true);
            return;
        }
        var session = await window.GameAuth.getSession();
        if (session) {
            await redirectAfterAuth();
        }
    })();
})();
