// ========================================
// Supabase 云存储客户端
// ========================================
(function() {
    // ① 打开 https://supabase.com/dashboard → 选择项目
    // ② Settings → API
    // ③ 复制 Project URL 到 SUPABASE_URL
    // ④ API Key：可填 Publishable key（sb_publishable_...）或 Legacy anon public（eyJ...）
    //    若登录/请求报 Invalid API key，请改用同页 Legacy API Keys 里的 anon public JWT（以 eyJ 开头）
    // 切勿使用 service_role / sb_secret_ 密钥
    const SUPABASE_URL = 'https://oxbyshstrvzshxpaztzg.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_qbbNn-xDvSJ3luS7D60ulw_15r6HwCX';

    if (typeof window.supabase === 'undefined') {
        console.warn('Supabase SDK 未加载，使用 localStorage 模式');
        window.SB = null;
        return;
    }

    const key = (SUPABASE_ANON_KEY || '').trim();
    const keyLooksInvalid =
        !key ||
        key.startsWith('PASTE_') ||
        key.startsWith('sb_secret_');

    if (keyLooksInvalid) {
        console.error(
            '[Supabase] API key 未配置或格式错误。\n' +
            '请到 Dashboard → Settings → API，复制 Publishable key 或 anon public（eyJ 开头），粘贴到 js/supabase.js 的 SUPABASE_ANON_KEY。\n' +
            '若 sb_publishable_ 仍报 Invalid API key，请改用 Legacy 里的 anon public JWT。'
        );
        window.SB = null;
        return;
    }

    window.SB = window.supabase.createClient(SUPABASE_URL, key, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
})();
