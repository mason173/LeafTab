# Leaftab App Shell / Sync Runtime Composition Cleanup Plan

日期：2026-04-21

前置提示：从现在开始，如果按本文档继续推进重构，每完成一步都必须同步更新本文档，明确记录当前做到哪一步、改了什么、验证到什么程度，避免后续协作时丢失上下文。

## 文档目标

本文档基于 [$vercel-composition-patterns](/Users/matpool/.codex/skills/vercel-composition-patterns/SKILL.md) 的规则，为 `App.tsx` 当前剩余的两个结构性问题提供一份独立的收口方案：

- sync runtime 实现边界仍集中在 `App.tsx`
- root composition 仍通过超长内联 prop bag 在 `App.tsx` 组装

这份文档是上一份 shortcut composition 重构计划的后续阶段，但范围更窄，只处理 `App shell` 和 `sync runtime`，不重复打开已经完成的 `shortcuts provider / dialogs root / selection provider` 主线。

## 适用规则

本方案主要使用以下规则：

- `architecture-compound-components`
- `state-decouple-implementation`
- `state-context-interface`
- `state-lift-state`
- `patterns-explicit-variants`
- `patterns-children-over-render-props`

当前仓库使用的是 React `18.3.1`，因此本文档不采用 `react19-*` 相关建议。

## 当前问题

### 问题 1：`App.tsx` 仍然掌握完整 sync runtime 的实现细节

当前表现：

- WebDAV / Cloud sync 的 storage 读写仍在 `App.tsx`
- remote store / encrypted transport / scope key 构造仍在 `App.tsx`
- dangerous sync 恢复、自动同步调度、错误状态回写仍在 `App.tsx`
- 后续只要调整 provider、加密、重试、冲突恢复，仍然要回到主文件修改

对应 rule：

- `state-decouple-implementation`
- `state-context-interface`

目标：

- 让 `App.tsx` 不再知道 sync runtime 的实现拼装方式
- 把 sync domain 收口为 provider + controller + root 接口
- 让 UI 组合层只消费同步状态和动作接口，而不是持有具体 runtime 组装知识

### 问题 2：root composition 已存在，但 controller 尚未完全脱离 `App.tsx`

当前表现：

- `ShortcutExperienceRoot`
- `ShortcutAppDialogsRoot`
- `ShortcutSyncDialogsRoot`

这些 root 已经存在，但 `App.tsx` 仍然手工拼装它们的超长 props。

对应 rule：

- `architecture-compound-components`
- `patterns-children-over-render-props`
- `state-lift-state`

目标：

- 让 `App.tsx` 的职责更接近 app shell 声明
- 把 root 所需的 props 组装迁移到 controller / hook
- 让 root 的调用处只表达结构，而不是再承载大规模业务接线

### 问题 3：`shortcutApp` context 虽然建立了，但 `App.tsx` 仍然大量 explode context

当前表现：

- `App.tsx` 先读 `shortcutApp`
- 再把 `state/actions/meta` 大量拆回本地变量
- 再继续基于这些变量派生 handlers 和 root props

对应 rule：

- `state-context-interface`

目标：

- 减少 `App.tsx` 对 feature context 的直接展开
- 尽可能把 feature-specific prop derivation 收进对应 controller
- 让 `App.tsx` 停止充当 shortcut feature orchestrator

## 非目标

这轮不做的事情：

1. 不重写 sync 业务逻辑本身
2. 不变更现有 sync 行为、文案、冲突处理策略
3. 不重新设计 UI
4. 不把所有 app state 一次性塞进一个更大的 provider
5. 不为了减少行数而机械搬运函数

## 目标架构

目标是让 `App.tsx` 收口为更薄的 app shell：

```tsx
<AppShellProviders>
  <ShortcutAppProvider value={shortcutApp}>
    <LeafTabSyncProvider value={syncRuntime}>
      <ShortcutExperienceRoot {...experienceRootProps} />
      <ShortcutAppDialogsRoot {...appDialogsRootProps} />
      <ShortcutSyncDialogsRoot {...syncDialogsRootProps} />
      <WallpaperSettingsRoot {...wallpaperRootProps} />
    </LeafTabSyncProvider>
  </ShortcutAppProvider>
</AppShellProviders>
```

其中：

- `LeafTabSyncProvider` 负责隐藏 sync runtime 拼装细节
- `useShortcutExperienceRootProps` 负责组装 experience root 所需输入
- `useShortcutAppDialogsRootProps` 负责组装 dialog root 所需输入
- `useShortcutSyncDialogsRootProps` 负责组装 sync dialog root 所需输入
- `App.tsx` 只负责选择挂载哪些 root，而不是亲手给每个 root 接上所有业务线

## 建议文件边界

建议新增或演进如下文件：

```text
src/features/appShell/
  useShortcutExperienceRootProps.ts
  useShortcutAppDialogsRootProps.ts
  useShortcutSyncDialogsRootProps.ts

src/features/sync/app/
  LeafTabSyncContext.tsx
  useLeafTabSyncContextValue.ts
  useLeafTabSyncStatus.ts
  useLeafTabSyncRuntimeController.ts
  useLeafTabSyncAutoSchedule.ts
```

说明：

- 不强制一次性全部建齐
- 可以先用 controller hook 落地，再视情况补 provider
- 文件名可以调整，但要保持 `provider / controller / root props` 的职责清晰

## 分阶段方案

## Phase A：先把 `App.tsx` 中的 root props 组装抽走

目标：

- 先解决 `App.tsx` return 区域的超长内联 prop bag
- 用低风险方式快速让 `App.tsx` 变薄

建议步骤：

1. 提取 `useShortcutExperienceRootProps`
2. 提取 `useShortcutAppDialogsRootProps`
3. 提取 `useShortcutSyncDialogsRootProps`
4. `App.tsx` 改为只挂载：
   - `<ShortcutExperienceRoot {...experienceRootProps} />`
   - `<ShortcutAppDialogsRoot {...appDialogsRootProps} />`
   - `<ShortcutSyncDialogsRoot {...syncDialogsRootProps} />`

关键要求：

- 先只搬 props derivation，不改行为
- 不在这一步重构 sync 逻辑细节
- 如果某块 props 明显需要太多上下文，先让 hook 接收明确输入，不要反向扩大 `App.tsx` 的 context explode

完成标准：

- `App.tsx` return 区域不再存在三大块超长 root prop bag
- root 组件调用处接近“结构声明”而不是“业务接线中心”
- 类型检查与现有测试保持通过

## Phase B：把 sync runtime 组装从 `App.tsx` 收口到 controller

目标：

- 解决 sync 实现边界仍留在 `App.tsx` 的问题

建议步骤：

1. 提取 sync storage / transport / remote store / encryption scope 的组装逻辑
2. 提取 cloud / webdav 公共状态导出
3. 提取危险同步处理、错误状态写回、下一次自动同步调度
4. 形成 `useLeafTabSyncRuntimeController`

建议最小接口：

```ts
type LeafTabSyncRuntimeController = {
  state: {
    webdav: { ... }
    cloud: { ... }
    dialogs: { ... }
    dangerousSync: { ... }
  }
  actions: {
    webdav: { ... }
    cloud: { ... }
    dialogs: { ... }
    dangerousSync: { ... }
  }
  meta: {
    labels: { ... }
    transports: { ... }
    capabilities: { ... }
  }
}
```

关键要求：

- `App.tsx` 不再直接构造 remote store / encrypted transport
- `App.tsx` 不再直接负责自动同步调度
- `App.tsx` 不再直接负责危险同步恢复分支

完成标准：

- `src/App.tsx` 中的 sync runtime 逻辑明显减少
- sync 相关实现知识迁移到专门 controller 边界
- UI 层不再依赖 sync provider 的内部构造细节

## Phase C：决定是否需要 `LeafTabSyncProvider`

目标：

- 在 controller 抽离后，决定同步域是否需要进一步 provider 化

建议判断标准：

1. 是否已有多个 sibling root 同时消费 sync 状态
2. 是否已经出现跨组件重复传递 sync props
3. 是否需要在未来对 sync runtime 做替换或注入

如果答案大多为“是”，再推进 provider：

```tsx
<LeafTabSyncProvider value={syncController}>
  <ShortcutSyncDialogsRoot />
  <SyncCenterEntry />
  <SettingsSyncActions />
</LeafTabSyncProvider>
```

如果答案大多为“否”，则允许暂时停留在 controller hook 层，不强推 provider。

完成标准：

- 对是否 provider 化给出明确结论
- 不保留“应该 provider 化但暂时没人负责”的模糊状态

## 实施顺序建议

推荐顺序：

1. 先做 Phase A
2. 再做 Phase B
3. 最后做 Phase C

原因：

- Phase A 风险最低，能最快降低 `App.tsx` 的阅读负担
- Phase B 才是真正的实现边界收口
- Phase C 需要基于前两步结果决定，不宜先拍脑袋

## 风险与控制

### 风险 1：把代码挪出去，但没有建立真正边界

控制方式：

- 每次抽取都要回答“`App.tsx` 是否因此少知道了一类实现细节”
- 如果只是换了文件位置，但 `App.tsx` 仍要传入几乎所有内部状态，就不算完成

### 风险 2：过早做大 provider，反而让抽象变重

控制方式：

- 允许先停留在 `useXxxRootProps` / `useXxxController`
- 等消费面足够稳定后再决定 provider 化

### 风险 3：sync 行为回归难定位

控制方式：

- 每个阶段完成后都要跑：
  - `npm run typecheck`
  - `npm test`
- 对 sync 改动要重点手测：
  - 打开/关闭 sync center
  - WebDAV 配置与启用
  - Cloud 登录与同步入口
  - dangerous sync dialog 分支

## 验收标准

当以下条件同时满足时，可认为本计划完成：

1. `App.tsx` 不再内联组装三大 root 的超长 props
2. `App.tsx` 不再直接承担 sync runtime 的主要实现知识
3. `App.tsx` 对 `shortcutApp` context 的大规模 explode 明显下降
4. 现有类型检查与测试保持通过
5. 新增结构的命名与职责一致，不再保留明显的过渡命名

## 当前进度

当前状态：Phase A、Phase B、Phase C 已全部完成。当前同步域已经给出明确结论并完成 provider 化：`App.tsx` 仍保留少量 app shell 级别的开关与编排，但 `sync runtime` 的实现知识和跨 root 的 sync 依赖已通过 provider + controller 边界收口，不再处于“是否 provider 化待定”的模糊状态。

已完成：

- Step A.1：新增 `src/features/appShell/useShortcutExperienceRootProps.ts`，把 `ShortcutExperienceRoot` 的选择动作组装、surface base props 组装、folder dialog 开关桥接从 `App.tsx` 的 return 区域迁到独立 hook。
- Step A.2：新增 `src/features/appShell/useShortcutAppDialogsRootProps.ts`，把 `ShortcutAppDialogsRoot` 的 root props 组装迁到独立 hook。
- Step A.3：新增 `src/features/appShell/useShortcutSyncDialogsRootProps.ts`，把 `ShortcutSyncDialogsRoot` 的 root props 组装迁到独立 hook，并补齐 `ShortcutSyncDialogsRootProps` 的导出边界。
- Step A.4：`App.tsx` 已改为预先生成：
  - `shortcutExperienceRootProps`
  - `shortcutAppDialogsRootProps`
  - `shortcutSyncDialogsRootProps`
- Step A.4 的结果是：
  - `App.tsx` 的 return 区域不再内联组装三大 root 的超长 prop bag。
  - `ShortcutExperienceRoot`、`ShortcutAppDialogsRoot`、`ShortcutSyncDialogsRoot` 的调用处已收口成更薄的结构声明。
  - 这一步仍保持在 Phase A 范围内，只迁移 props derivation，没有重写 sync 业务逻辑。
- Step A.5：完成验证并收口 Phase A。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- Phase A 完成判断：
  - `App.tsx` return 区域已不再手工拼装三大 root 的超长 props。
  - 三条 root props controller 已建立并接入主文件。
  - 当前改动仍然停留在低风险的 composition 收口层，没有进入 sync runtime 业务重构。
- Step B.1：新增 `src/features/sync/app/useLeafTabSyncRuntimeController.ts`，把以下原本直接堆在 `App.tsx` 里的 sync runtime 实现知识收口到 `state / actions / meta` controller 边界：
  - WebDAV / Cloud storage 读取与状态回写
  - remote store / encrypted transport / scope key 组装
  - snapshot bridge / legacy compat / sync engine / runner 组合
  - dangerous sync 分支与恢复动作
  - auto sync 调度与登录后云同步触发
  - backup actions / sync center actions / encryption dialog actions
- Step B.2：`App.tsx` 已改为消费 `useLeafTabSyncRuntimeController`，并通过以下边界读取同步域能力：
  - `syncController.state`
  - `syncController.actions`
  - `syncController.meta`
- Step B.2 的结果是：
  - `onLoginSuccess` 不再直接操作 `cloudLoginSyncPendingUser`，而是改为 `queueCloudLoginSync(username)`。
  - `handleLogoutWithOptions` 不再直接依赖 `App.tsx` 内部的 cloud pre-sync 逻辑，而是改为调用 `syncActions.syncLocalToCloudBeforeLogout()`。
  - `ShortcutAppDialogsRoot`、`ShortcutSyncDialogsRoot`、顶部 sync status 与 backup dialog mount 判断都改为消费 controller 输出。
- Step B.3：删除 `App.tsx` 中原先那段 sync runtime monolith，包括以下实现细节：
  - cloud / webdav config version 状态
  - dangerous sync dialog 本地状态
  - sync encryption version 与 cloud login pending user 状态
  - `useLeafTabSyncEngine` / `useLeafTabSyncRunner` / `useLeafTabSyncEncryptionManager` / `useLeafTabBackupActions` / `useSyncCenterActions` / `useLeafTabWebdavAutoSync` 等具体接线实现
- Step B.4：清理 `App.tsx` 顶部 imports、辅助函数和重复 helper，避免出现“controller 已建立但主文件仍保留同一份实现知识”的半迁移状态。
- Step B.5：完成验证并收口 Phase B。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- Phase B 完成判断：
  - `App.tsx` 已不再直接构造 sync remote store / encrypted transport / auto sync 调度 / dangerous sync 恢复分支。
  - sync domain 的主要实现知识已迁移到 `useLeafTabSyncRuntimeController`。
  - 当前实现符合本文档在 Phase B 中约定的“先 controller hook 收口，不强推 provider”的策略。
- Step C.1：按文档的三个判断标准重新评估同步域是否需要 provider 化。
- Step C.1 结论：
  - 已有多个 sibling root 同时消费 sync 状态：`ShortcutAppDialogsRoot`、`ShortcutSyncDialogsRoot` 以及 app shell 顶部状态显示都依赖同一份 sync controller。
  - 已出现跨组件重复传递 sync props：`App.tsx` 需要手工把 backup / sync dialog / dangerous sync / encryption dialog / sync status 等能力分发给多个 root。
  - 后续仍有替换或注入 sync runtime 的潜在需求，因此保留 `state / actions / meta` 的 context 边界更符合 `state-context-interface`。
- Step C.2：新增 `src/features/sync/app/LeafTabSyncContext.tsx`，建立 `LeafTabSyncProvider` 与 `useLeafTabSyncContext`。
- Step C.3：`App.tsx` 已改为在 `ShortcutAppProvider` 之内挂载 `LeafTabSyncProvider`，把 `syncController` 作为同步域上下文值下发。
- Step C.4：`ShortcutSyncDialogsRoot` 改为直接消费 sync context，不再由 `App.tsx` 手工拼装整套：
  - `leafTabSyncDialogProps`
  - `leafTabSyncEncryptionDialogProps`
  - `dangerousSyncDialogProps`
- Step C.5：`useShortcutAppDialogsController` 改为直接消费 sync context，用于组装以下同步相关能力：
  - backup dialogs
  - WebDAV / Cloud config dialogs
  - settings modal 里的 sync 操作入口
- Step C.6：`App.tsx` 的 `ShortcutAppDialogsRoot` / `ShortcutSyncDialogsRoot` 调用已明显收口：
  - 不再继续把大块 sync state / actions / meta 拆成多个 prop bag 后传给 root
  - `App.tsx` 只保留少量 app shell 级别开关，例如 `leafTabSyncDialogOpen`、provider config open state、back target 等
- Step C.7：完成验证并收口 Phase C。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- Phase C 完成判断：
  - 本项目对“是否需要 `LeafTabSyncProvider`”已经给出明确答案：需要。
  - provider 已落地，不再保留“理论上应该 provider 化、但暂时没人负责”的过渡状态。
  - `App.tsx` 对 sync domain 的组合责任继续下降，`ShortcutAppDialogsRoot` 与 `ShortcutSyncDialogsRoot` 已开始通过 context 直接消费同步域能力。
