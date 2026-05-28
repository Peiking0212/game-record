// ========================================
// Supabase 云存储客户端
// 项目 URL 与 Publishable key：Supabase Dashboard → Settings → API
// ========================================
(function() {
    if (typeof window.supabase === 'undefined') {
        console.warn('Supabase SDK 未加载，使用 localStorage 模式');
        window.SB = null;
        return;
    }

    window.SB = window.supabase.createClient(
        'https://oxbyshstrvzshxpaztzg.supabase.co',
        'sb_publishable_qbbMn-xDvSJ3luS7D60ulw_15r6HwCX',
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );
})();
