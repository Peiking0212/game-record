# 项目目标

面向游戏记录与消费管理用户，提供舒适、清晰、可信赖的 Web 体验，帮助快速查看数据并持续使用。

# 技术栈

- 前端 · Next.js 14 (App Router)
- 样式 · Tailwind + shadcn/ui
- 后端 · Next.js API Routes
- 数据 · Supabase（含 Realtime）
- 部署 · Vercel
- 类型 · TypeScript strict

# 禁区（千万别做）

- ❌ 不引入 Redux/Zustand 等额外状态管理
- ❌ 单文件 > 200 行先停下问我

# 当前阶段

迁移收尾 + 上线准备：已迁移核心页面；E2E（Playwright 桌面/移动）与后端验收脚本可用；PJR 流水线 skill 已就绪（`.cursor/skills/pjr`）。

# 开发流水线（Superpowers）

1. `skill-using-superpowers` → 判定并加载 skill  
2. `skill-using-git-worktrees` → 非 trivial 任务在 worktree 开发  
3. 前后端 UI 任务 → `frontend-design` + `ui-ux-pro-max`  
4. `simplify` → 实现后代码精简审查  
5. **pjr** → lint / build / 后端验收 → `git merge` 回 `dev` → Playwright 全链路  
6. Playwright → 桌面 + 移动，逐按钮/逐流程人工级走查（非只看截图）  

Skill 路径见仓库根 `AGENTS.md`。