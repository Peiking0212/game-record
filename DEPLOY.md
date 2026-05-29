# 部署指南（多人账号版）

## 1. Supabase 配置

1. 在 [Supabase Dashboard](https://supabase.com/dashboard) 打开项目
2. **SQL Editor** 依次执行：
   - `supabase-migration.sql`（若未执行）
   - `supabase-migration-v2-auth.sql`（多人隔离，**必做**）
3. **Authentication → Providers**：启用 Email
4. **Authentication → URL Configuration**：
   - Site URL：`http://localhost:8080`（本地）或生产域名
   - Redirect URLs 添加：
     - `http://localhost:8080/**`
     - `https://你的域名.vercel.app/**`
5. **Settings → API**：将 Project URL 与 **anon public key**（JWT，以 `eyJ` 开头）写入 `js/supabase.js` 的 `SUPABASE_URL` / `SUPABASE_ANON_KEY`

> 执行 v2 迁移会删除 `user_id` 为空的旧共享数据。若需保留，请先在 Dashboard 手动绑定到你的用户 UUID。

## 2. 本地运行

```bash
cd game_record_vibrant
py -m http.server 8080
# 或项目根目录: py serve.py
```

访问 http://localhost:8080/auth.html 注册/登录。

## 3. Vercel 部署

1. 将仓库推送到 GitHub
2. [vercel.com](https://vercel.com) → Import Project
3. **Root Directory** 设为 `game_record_vibrant`
4. Framework Preset：**Other**（静态站点）
5. Deploy
6. 把 Vercel 域名加入 Supabase Redirect URLs

## 4. Netlify 备选

- Publish directory：`game_record_vibrant`
- 无需 build command

## 5. 安全建议

- anon public key 可放前端；**切勿**提交 Secret / service_role key
- 若 key 曾泄露，在 Dashboard 轮换 anon key
- 确认 RLS 策略已生效（v2 迁移脚本）

## 6. 验证多人隔离

1. 注册账号 A，添加游戏
2. 退出，注册账号 B
3. B 不应看到 A 的数据
4. Supabase Table Editor → `site_data` 应有不同 `user_id` 的行
