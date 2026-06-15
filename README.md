# 游戏记录 (Next.js)

React + Next.js 版游戏记录站点。Supabase 后端与 Edge Functions 保持不变。

## 特性

- **全局自定义背景** - 支持上传本地图片或粘贴 B站视频链接作为全站背景
- **毛玻璃 UI** - 所有内容卡片采用白色半透明毛玻璃效果，适配背景图
- **蓝色主题** - 统一的蓝色系配色，清新现代
- **游戏管理** - 收藏、评测、成就、消费记录一站式管理
- **图库系统** - 支持图片/视频上传与云同步
- **数据可视化** - 游戏时长、消费趋势等统计图表

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

## 部署 (GitHub Pages)

站点地址：<https://peiking0212.github.io/game-record/>

1. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
2. 在 **Settings → Secrets and variables → Actions** 添加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 推送到 `main` 后，工作流 `.github/workflows/deploy-github-pages.yml` 会执行 `GITHUB_PAGES=true` 静态构建并发布 `out/`。

本地模拟 GitHub Pages 构建（PowerShell）：

```powershell
$env:GITHUB_PAGES='true'; npm run build
# 生成 out/wishlist/index.html → 对应 /game-record/wishlist/
```

邮件里的 `APP_URL` 应设为 `https://peiking0212.github.io/game-record`（无末尾斜杠）。

## 部署 (Vercel)

连接本仓库后，框架预设选 **Next.js**，根目录为 `game_record_vibrant`（若 monorepo 则配置子目录）。

在 Vercel 项目环境变量中设置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 迁移进度

- [x] 全部主路由已迁移至 Next.js App Router（见 `docs/MIGRATION_STATUS.md`）
- [x] 旧版页面保留在 `legacy/`，仅作参考，不再作为入口
- [x] 全局背景图系统（图片 + B站视频）
- [x] 毛玻璃 UI 适配背景图
- [x] 紫色主题改为蓝色主题

## 验收

```bash
npm run test:e2e          # 前端：桌面 + mobile，正常流 + 边界流
npm run test:backend:acceptance  # 后端：需 SUPABASE_SERVICE_ROLE_KEY
```

详见 `docs/MIGRATION_STATUS.md`。
