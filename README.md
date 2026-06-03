# 游戏记录 (Next.js)

React + Next.js 版游戏记录站点。Supabase 后端与 Edge Functions 保持不变。

## 开发

```bash
cp .env.example .env.local
# 填写 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

## 目录

| 路径 | 说明 |
|------|------|
| `app/` | Next.js App Router 页面 |
| `components/` | React 组件 |
| `lib/` | Supabase 客户端、本地数据工具 |
| `public/` | 静态资源 |
| `legacy/` | 旧版 HTML/JS（迁移参考，不再作为入口） |
| `supabase/` | 数据库迁移与 Edge Functions |

## 部署 (Vercel)

连接本仓库后，框架预设选 **Next.js**，根目录为 `game_record_vibrant`（若 monorepo 则配置子目录）。

在 Vercel 项目环境变量中设置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 迁移进度

- [x] 全部主路由已迁移至 Next.js App Router（见 `docs/MIGRATION_STATUS.md`）
- [x] 旧版页面保留在 `legacy/`，仅作参考，不再作为入口

## 验收

```bash
npm run test:e2e          # 前端：桌面 + mobile，正常流 + 边界流
npm run test:backend:acceptance  # 后端：需 SUPABASE_SERVICE_ROLE_KEY
```

详见 `docs/MIGRATION_STATUS.md`。
