// ========================================
// Supabase 云存储客户端
// 替代 localStorage 实现数据持久化和云同步
// ========================================
(function() {
    // 如果尚未引入 Supabase SDK 则跳过
    if (typeof window.supabase === 'undefined') {
        console.warn('Supabase SDK 未加载，使用 localStorage 模式');
        window.SB = null;
        return;
    }

    window.SB = window.supabase.createClient(
        'https://oxbyshstrvzshxpaztzg.supabase.co',
        'sb_publishable_qbbNn-xDvSJ3luS7D60ulw_15r6HwCX'
    );

})();
