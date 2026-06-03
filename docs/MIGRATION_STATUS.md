# 迁移整合状态（Next.js）

最后更新：按当前仓库实装整理。

## 页面迁移矩阵

| 路由 | 状态 | 说明 |
|------|------|------|
| `/` | ✅ | 首页 + 统计概览（localStorage） |
| `/auth` | ✅ | Supabase 登录/注册 |
| `/games` | ✅ | 列表、筛选、增删改、Steam 同步入口 |
| `/games/[id]` | ✅ | 详情聚合（评测/成就/媒体/消费/资讯） |
| `/gallery` | ✅ | 本机/云端媒体、筛选、灯箱、图片编辑 |
| `/wishlist` | ✅ | 本地 CRUD + 折扣规则 + 刷新折扣/资讯 |
| `/reviews` | ✅ | 本地 CRUD、标签、筛选排序 |
| `/profile` | ✅ | 资料编辑、头像、标签、最爱游戏 |
| `/spending` | ✅ | 消费记录、图表区、年度总结弹窗 |
| `/stats` | ✅ | 筛选、统计面板、导出 PNG |
| `/achievements` | ✅ | 成就 CRUD、时间线、详情弹窗 |
| `/report` | ✅ | 年度报告幻灯片 |

## 验收矩阵

### 前端 E2E（Playwright）

命令：`npm run test:e2e`

| 场景 | 桌面 | 移动 | 说明 |
|------|------|------|------|
| 全站路由可达 | ✅ | ✅ | `tests/e2e/navigation.spec.ts` |
| 主业务链路（增删查） | ✅ | ✅ | `tests/e2e/user-flows.spec.ts` |
| 边界拦截 | ✅ | ✅ | 金额/必填/年份校验 |

### 后端验收

命令：`npm run test:backend:acceptance`

| 类型 | 状态 | 说明 |
|------|------|------|
| 非 AI 接口异常拦截 | ⏸️ | 需 `SUPABASE_SERVICE_ROLE_KEY` |
| AI 复杂场景 | ⏸️ | 需 `SUPABASE_SERVICE_ROLE_KEY` |
| 用户态接口 | ⏸️ | 需 `TEST_USER_ACCESS_TOKEN` 或 `TEST_USER_REFRESH_TOKEN`（`access_token` 约 1h 过期，看 `expires_at` 不是 `expires_in`） |

当前 `.env.local` 仅有 publishable key，无法跑完整后端验收。

## 仍待增强（可选下一批）

- [x] 愿望单：添加时 Supabase `games` 表名称联想
- [x] 愿望单：Steam 搜索入库 UI（`LookupGameModal` + 卡片入库按钮）
- [x] 愿望单：云端目录全量 fallback + 别名 enrich（`lib/wishlist-catalog.ts`）
- [x] E2E：`auth.spec` / `gallery.spec` / `wishlist.spec`（需 `.env` 测试账号）
- [ ] 个性化 feed 登录后写入 `site_data` 全链路验收
- [x] 价格提醒 `upsert-alert` + 目标价 UI + 站内提醒面板

## 本地运行清单

```bash
npm install
npm run dev
npm run build
npm run test:e2e
# 配置 SUPABASE_SERVICE_ROLE_KEY 后：
npm run test:backend:acceptance
```
