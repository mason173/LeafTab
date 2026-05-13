# LeafTab Sync Runtime Light Shell Plan

日期：2026-05-13

## 背景

当前新标签页首屏会静态进入同步运行时链路：

- `src/App.tsx` 直接调用 `useLeafTabSyncRuntimeController`
- `LeafTabSyncProvider` 的类型与 value 以完整 runtime controller 为中心
- `useLeafTabSyncRuntimeController` 又继续引用 WebDAV、Cloud、加密、snapshot、backup、legacy migration、auto sync 等模块

结果是：即使用户没有打开同步面板、没有开启同步，新标签页也会把相当多同步相关代码放进首屏 JS 图谱。构建里 `index` 主包仍在 730KB 左右，稳定内存仍偏高，这条线是继续降内存的主要候选。

## 目标

把同步系统拆成两层：

1. **Sync Light Shell**：首屏常驻，极轻，只提供状态摘要、配置摘要、按钮状态和动作代理。
2. **Sync Runtime Host**：按需加载，负责真正的同步、加密、冲突处理、导入导出、自动同步调度。

期望收益：

- 没有启用同步的用户，新标签页不加载同步 runtime 重逻辑。
- 打开同步中心、启用 WebDAV/Cloud、触发同步、登录后需要自动同步时，再加载 runtime。
- 顶栏同步图标仍可显示 `idle/error/conflict/syncing` 的基础状态，但不需要完整 runtime 常驻。
- 后续继续拆 `pinyin-pro`、搜索索引时，首屏性能边界更清楚。

## 非目标

本计划第一阶段不改变：

- 同步协议和远端文件格式
- WebDAV / Cloud 的加密模型
- 旧版同步迁移策略
- 同步中心 UI 视觉
- 用户可见的同步行为

也不追求一次性删除所有 sync 相关首屏代码。第一目标是把重 runtime 从默认首屏路径移出去。

## 当前主要耦合点

### 1. Provider value 绑定完整 runtime

当前 `LeafTabSyncProvider` 接收完整 `LeafTabSyncRuntimeController`，并从里面切出：

- status state
- dialog state
- config state
- actions
- meta

这使得任何消费者想拿一个轻量状态，也必须等待完整 controller 在 `App.tsx` 创建。

### 2. actions 是真实实现，不是代理

例如：

- `handleCloudSyncNowFromCenter`
- `handleLeafTabSyncNowFromCenter`
- `handleDisableWebdavSync`
- `syncLocalToCloudBeforeLogout`
- `resolveLegacyCloudMigrationPrompt`

这些 action 现在直接来自 runtime controller。要想懒加载 runtime，需要先让 action 变成“代理”：调用时先 `ensureRuntimeLoaded()`，再转发给真实 runtime。

### 3. 自动同步调度在 runtime 内部

`useLeafTabWebdavAutoSync` 和 Cloud auto sync 定时器现在跟 runtime 一起挂载。轻壳需要先判断是否真的需要挂载 runtime：

- WebDAV sync 已启用
- Cloud sync 已启用且用户已登录
- 存在登录后待同步任务
- 同步中心/同步设置已打开
- 正在执行导入、导出、危险修复、legacy migration

### 4. App composition 依赖 runtime state

`App.tsx` 用 `syncState` 和 `syncActions` 组装顶栏、设置弹窗、同步弹窗、登出前同步等流程。需要让 `App.tsx` 面向轻壳接口，而不是完整 controller。

## 目标架构

```text
App.tsx
  |
  |-- useLeafTabSyncLightShell()
  |     - 读取轻量配置摘要
  |     - 暴露 topNavSyncStatus
  |     - 暴露 proxy actions
  |     - 判断 runtimeNeeded
  |
  |-- LeafTabSyncProvider value={lightShellFacade}
  |
  |-- <Suspense fallback={null}>
        {runtimeNeeded ? (
          <LazyLeafTabSyncRuntimeHost
            shellBridge={...}
            appDeps={...}
          />
        ) : null}
      </Suspense>
```

### Light Shell 常驻职责

轻壳只做这些：

- 从 `localStorage` 读取 WebDAV / Cloud 是否配置、是否启用、最近状态摘要。
- 提供顶栏需要的 `topNavSyncStatus`。
- 提供同步入口 action，例如 `openSyncCenter`、`requestSyncNow`。
- 维护 `runtimeRequested` 状态。
- 在 action 被调用时触发 runtime 加载。
- 在 runtime 未加载时返回保守状态，例如 `idle`、`not-ready`、`unknown`。

轻壳不做这些：

- 不 import `@/sync/leaftab/runtime`
- 不 import snapshot codec / encryption runtime / backup runtime
- 不创建同步引擎
- 不注册 WebDAV/Cloud auto sync 定时器
- 不跑冲突分析
- 不读写远端

### Runtime Host 职责

Runtime Host 继续拥有现有重逻辑：

- `useLeafTabSyncRuntimeController`
- WebDAV auto sync
- Cloud auto sync
- encryption manager
- sync engine
- backup actions
- dangerous repair
- legacy migration

它加载完成后，通过 bridge 把真实 state/actions 回填给 shell provider。

## 建议新增文件

### `src/features/sync/app/LeafTabSyncContracts.ts`

定义稳定接口，避免 `LeafTabSyncContext.tsx` 再从 `useLeafTabSyncRuntimeController` 推导类型。

建议包含：

- `LeafTabSyncStatusState`
- `LeafTabSyncDialogState`
- `LeafTabSyncConfigState`
- `LeafTabSyncActions`
- `LeafTabSyncMeta`
- `LeafTabSyncFacade`

注意：这里应该是显式接口，不要 `ReturnType<typeof useLeafTabSyncRuntimeController>`。

### `src/features/sync/app/useLeafTabSyncLightShell.ts`

首屏轻量 hook。

职责：

- 读取轻量配置。
- 管理 `runtimeRequested`。
- 管理 runtime 回填的 facade。
- 生成 fallback state/actions。
- 暴露 `requestRuntime(reason)`。

### `src/features/sync/app/LeafTabSyncRuntimeHost.tsx`

重 runtime host。

职责：

- 调用现有 `useLeafTabSyncRuntimeController`。
- 将 controller 转成 `LeafTabSyncFacade`。
- 通过 `onRuntimeReady(facade)` 回填 shell。
- unmount 时清理 runtime facade。

### `src/lazy/syncRuntimeHost.ts`

懒加载 Runtime Host：

```ts
export const LazyLeafTabSyncRuntimeHost = lazyWithPageReload(
  () => import('@/features/sync/app/LeafTabSyncRuntimeHost'),
  'LeafTabSyncRuntimeHost',
);
```

具体签名按现有 `lazyWithPageReload` API 调整。

## 分阶段执行计划

## Phase 0：建立基线

目标：确认当前收益口径，避免只凭体感改。

记录：

- `npm run build:community` 后的 `index-*.js`、`vendor-misc-*.js`、sync 相关 chunk 大小。
- Chrome 扩展页面 Task Manager 中：
  - 空白新标签页首屏内存
  - 不开动态壁纸 CPU
  - 开动态壁纸 + 秒显 + 时间动画 CPU
- Performance 面板的首屏 JS parse/compile 时间。

完成标准：

- 在本文档“进度追踪”记录基线数字。

## Phase 1：抽出显式 sync contract

状态：已实现，待实测。

目标：先改类型边界，不改运行时行为。

步骤：

1. 新增 `LeafTabSyncContracts.ts`。
2. 把 `LeafTabSyncContext.tsx` 中基于 `LeafTabSyncRuntimeController` 的类型改成显式 contract。
3. `useLeafTabSyncRuntimeController` 的返回值显式满足 `LeafTabSyncFacade`。
4. 运行类型检查和构建。

完成标准：

- `App.tsx` 仍然直接使用 runtime controller。
- 行为无变化。
- `LeafTabSyncContext.tsx` 不再 runtime/type 依赖 controller 文件。

风险：

- action 类型漏字段。
- dialog/config state 字段同步不完整。

验证：

- `npm run typecheck`
- `PATH=/opt/homebrew/bin:$PATH npm run build:community`
- 打开同步中心，无控制台 error。

## Phase 2：实现 Light Shell，但暂不懒加载 runtime

目标：让 `App.tsx` 面向轻壳 facade。

步骤：

1. 新增 `useLeafTabSyncLightShell`。
2. 它先内部直接创建 runtime controller，并返回同样 facade。
3. `App.tsx` 改为使用 `syncFacade`，不直接知道 controller。
4. `LeafTabSyncProvider` 接收 `LeafTabSyncFacade`。

完成标准：

- 行为仍无变化。
- 但 `App.tsx` 已经不直接 import `useLeafTabSyncRuntimeController`。

风险：

- 这是结构迁移，容易漏掉 `syncState` / `syncActions` 某个引用。

验证：

- 所有同步入口都能打开。
- 登录、登出、WebDAV 设置、同步中心按钮仍工作。

## Phase 3：把 Runtime Host 组件化

目标：为真正懒加载做准备。

步骤：

1. 新增 `LeafTabSyncRuntimeHost.tsx`。
2. 把 `useLeafTabSyncRuntimeController` 调用从 `useLeafTabSyncLightShell` 移到 Runtime Host。
3. Light Shell 通过 `onRuntimeReady` 接收 runtime facade。
4. Phase 3 仍然默认 `runtimeNeeded = true`，确保行为不变。

完成标准：

- Runtime Host 独立承载所有重逻辑。
- Light Shell 只负责桥接和 fallback。

验证：

- 与 Phase 2 相同。
- React strict mode 下不应出现重复同步或重复定时器。

## Phase 4：启用按需加载

目标：没有同步需求时，不挂载 Runtime Host。

第一版 `runtimeNeeded` 条件：

- `leafTabSyncDialogOpen === true`
- `webdavDialogOpen === true`
- `cloudSyncConfigOpen === true`
- `user && cloudSyncEnabled`
- `leafTabWebdavEnabled`
- `pendingWebdavEnableScopeKey != null`
- `runtimeRequested === true`
- `cloudLoginSyncPendingUser != null`
- 有 legacy migration 待处理

步骤：

1. Runtime Host 改成 lazy import。
2. Light Shell action 在需要真实 runtime 时调用 `requestRuntime(reason)`。
3. 对需要返回 Promise 的 action，采用队列：
   - runtime 未加载：先 request runtime
   - runtime ready 后执行真实 action
   - runtime 加载失败：返回失败或显示 toast

完成标准：

- 未启用同步、未打开同步 UI 时，构建主包不包含 sync runtime 重模块。
- 打开同步中心后 runtime chunk 才加载。
- 已启用自动同步的用户仍会按需加载 runtime 并继续自动同步。

风险：

- 顶栏同步状态在 runtime 未加载时不够准确。
- 登出前同步必须等待 runtime ready，否则可能跳过同步。
- runtime 加载中用户连续点击同步按钮，需要去重。

## Phase 5：迁移消费者到轻量 context

目标：减少无关组件因为 sync runtime state 变化重渲染。

优先顺序：

1. 顶栏只订阅 `LeafTabSyncStatusContext`。
2. 设置页同步卡片只订阅 config summary，不订阅完整 actions。
3. 同步弹窗打开后再订阅 dialog/config/actions。
4. `ShortcutAppDialogsRoot` 避免首屏订阅 dialog 重状态。

完成标准：

- 首页正常浏览时，同步 runtime state 更新不引发大范围重渲染。
- 打开同步中心后功能完整。

验证：

- React Profiler 对比 sync state 更新时的 commit 范围。

## Phase 6：收尾和进一步拆包

目标：继续降低默认首屏内存。

候选：

- 把 legacy migration 逻辑从 controller 再拆成 runtime 子 chunk。
- 把 backup import/export runtime 独立懒加载。
- 把 encryption dialog 相关运行时只在需要口令时加载。
- 检查 `pinyin-pro` 是否仍被首屏 chunk 吸入，必要时做搜索索引 runtime 拆分。

## Action 代理设计

Light Shell 的 action 不应该直接抛“runtime 未加载”。建议统一封装：

```ts
type RuntimeActionName = keyof LeafTabSyncActions;

async function runRuntimeAction<T>(
  name: RuntimeActionName,
  call: (actions: LeafTabSyncActions) => Promise<T> | T,
): Promise<T> {
  const runtime = await ensureRuntimeReady(name);
  return call(runtime.actions);
}
```

对于 UI 打开类 action：

- 可以先打开轻量 UI。
- 同时后台加载 runtime。
- runtime ready 后填充真实状态。

对于必须同步执行的 action：

- 例如 `syncLocalToCloudBeforeLogout`
- 必须 `await ensureRuntimeReady('logout-pre-sync')`
- 需要最大等待时间，超过则走当前已有的“保留本地 dirty”兜底策略。

## Light Shell fallback state 建议

在 runtime 未加载时：

- `topNavSyncStatus`: 根据最近持久化状态返回 `idle | error`，没有记录则 `idle`
- `leafTabSyncHasConfig`: 从 WebDAV config storage 轻量读取
- `cloudLeafTabSyncHasConfig`: 从 Cloud config storage 轻量读取
- `leafTabWebdavEnabled`: 从 WebDAV config storage 轻量读取
- `cloudSyncEnabled`: 从 Cloud config storage 轻量读取
- `lastSyncLabel`: 允许显示持久化时间，不能显示则为空
- `nextSyncLabel`: runtime 未加载时可为空，runtime 加载后再显示

不要在 fallback 里做：

- 远端探测
- 加密校验
- snapshot normalize
- bookmark scope 深分析

## 触发 runtime 加载的推荐理由枚举

建议统一记录 reason，方便调试和性能分析：

```ts
type SyncRuntimeLoadReason =
  | 'sync-center-open'
  | 'webdav-config-open'
  | 'cloud-config-open'
  | 'manual-sync'
  | 'auto-sync-enabled'
  | 'login-sync-pending'
  | 'logout-pre-sync'
  | 'legacy-migration'
  | 'import-export'
  | 'dangerous-repair';
```

## 测量指标

每个阶段至少记录：

- `build/assets/index-*.js`
- `build/assets/vendor-misc-*.js`
- 新增 sync runtime chunk 大小
- HTML modulepreload 列表
- 新标签页首屏 Chrome Task Manager 内存
- 静态壁纸 CPU
- 动态壁纸 + 秒显 + 时间动画 CPU
- 打开同步中心后的首次加载耗时

## 验证清单

基础：

- `npm run typecheck`
- `PATH=/opt/homebrew/bin:$PATH npm run build:community`
- 本地新标签页 smoke，无控制台 error

同步功能：

- 未登录用户打开同步中心
- 登录用户打开同步中心
- Cloud sync now
- WebDAV sync now
- WebDAV 配置保存后启用
- 加密口令设置 / 验证
- dangerous sync repair 三个选择
- 导出备份
- 导入备份
- 登出前同步
- 旧版 Cloud migration prompt

性能：

- 同步未启用时，首屏 network 不应加载 runtime chunk。
- 打开同步中心时，runtime chunk 应加载一次。
- 关闭同步中心后，不要求卸载 runtime；第一版可以 keep warm，避免重复加载。

## 进度追踪

- [ ] Phase 0：建立基线
- [ ] Phase 1：抽出显式 sync contract
- [ ] Phase 2：实现 Light Shell，但暂不懒加载 runtime
- [ ] Phase 3：把 Runtime Host 组件化
- [ ] Phase 4：启用按需加载
- [ ] Phase 5：迁移消费者到轻量 context
- [ ] Phase 6：收尾和进一步拆包

## 更新日志

- 2026-05-13：创建计划文档，明确 Sync Light Shell / Runtime Host 的分层方案、迁移阶段和验证标准。
