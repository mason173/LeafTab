# Leaftab 基于 Vercel Composition Patterns 的重构方案

日期：2026-04-21

前置提示：从现在开始，每完成一步重构，都必须同步更新本文档，明确记录当前做到哪一步、改了什么、验证到什么程度，避免后续协作时丢失上下文。

## 文档目标

本文档基于 [$vercel-composition-patterns](/Users/matpool/.codex/skills/vercel-composition-patterns/SKILL.md) 的规则，为当前快捷方式应用层重构提供一份可执行的方案。

本文不是再次罗列 review finding，而是把这些 finding 转换成：

- 明确的目标架构
- 分阶段改造顺序
- 建议新增的文件边界
- 每一阶段的完成标准
- 回归验证要求

## 适用规则

本方案主要使用以下规则：

- `architecture-avoid-boolean-props`
- `architecture-compound-components`
- `state-decouple-implementation`
- `state-context-interface`
- `state-lift-state`
- `patterns-explicit-variants`
- `patterns-children-over-render-props`

当前仓库使用的是 React `18.3.1`，因此本方案不采用 `react19-no-forwardref` 相关建议。

## 当前进度

当前状态：Phase 5 已完成，已推进到可关闭状态。当前 shortcut feature 的 provider / controller / root 主结构已稳定，后续如继续，优先级将转为 `App.tsx` 的非阻塞减重与长期整理。

已完成：

- Step 0.1：为文档补充“每完成一步都要更新进度”的前置提示。
- Step 0.2：收口 shortcut 编辑弹窗的 reset/open 规则，避免 `currentInsertIndex` 与标题、URL、选中项分散在不同文件里重置。
- Step 0.3：移除 `ShortcutSelectionShell` 中单独的 `showLargeFolderToggle` 布尔能力开关，改为根据 `onSetFolderDisplayMode` capability 是否存在来决定菜单项是否出现。
- Step 0.4：完成首轮验证，确认 Phase 0 的收口改动通过类型检查与现有测试。
- Step 1.1：新增 `ShortcutAppContext`、`ShortcutAppProvider` 和 `useShortcutAppContextValue`，建立 provider + context 的基础设施。
- Step 1.2：`App.tsx` 改为使用 context value，并把 `ShortcutAppDialogsLayer` 的 shortcut dialog 状态改为从 context 消费，减少一块真实的 prop drilling。
- Step 1.3：把 selection state 从 `ShortcutExperienceLayer` 的 render prop 迁到 `ShortcutSelectionProvider` + context 消费。
- Step 1.4：提取 `useShortcutSelectionController`，把 `ShortcutSelectionShell` 内部的选择态流程从渲染层中抽离。
- Step 2.3：继续把 utility / consent / shortcut icon settings 相关 dialog 入口从 `ShortcutAppDialogsLayer` 的内联组装迁到 dialog controller。

## 当前问题与目标映射

### 问题 1：`useShortcutAppFacade` 只是镜像层，不是真正的 provider 边界

当前问题：

- `useShortcutAppFacade` 只是把 `useShortcuts` 的返回值重新分组
- `App.tsx` 仍然要把分组后的内容重新拆开
- UI 仍然直接依赖具体实现，不具备 provider 注入能力

目标：

- 用真正的 `ShortcutAppProvider` 替代镜像 facade
- 由 provider 持有具体 hook 组合逻辑
- UI 通过 context 消费通用接口，而不是知道 `useShortcuts` 的实现细节

### 问题 2：`ShortcutAppDialogsLayer` 把 prop drilling 集中起来，但没有消除它

当前问题：

- 一个组件接收八大组 props 再拼装成 `LazyAppDialogs`
- 对话框关闭后的 reset 逻辑分散在多个文件
- dialog 的 API 仍然以“大 prop bag”形式扩张

目标：

- 把 dialog 状态提升到专门 provider / controller
- 用显式 dialog 变体组件替代大型聚合层
- 让“打开、关闭、重置”规则只在一个地方定义

### 问题 3：`showLargeFolderToggle` 暴露无效布尔状态

当前问题：

- `showLargeFolderToggle` 和 `onSetFolderDisplayMode` 分开传递
- 类型层面允许“显示开关但没有动作”的无效组合

目标：

- 用显式 capability 或显式 action 组件替代布尔能力开关
- 由 handler 是否存在决定行为是否可用
- 避免“一个 boolean 决定一个局部 UI 模式”的 API 继续扩散

### 问题 4：选择状态仍通过 render prop 透传

当前问题：

- `ShortcutSelectionShell` 通过 render prop 把选择态传给 `HomeInteractiveSurface`
- 只要下游再增加一个消费者，render prop 签名就会继续膨胀

目标：

- 把选择态提升为 provider
- 由多个子组件直接通过 context 读取选择状态
- 让 `ShortcutExperienceLayer` 只负责组合结构，不负责传递局部状态

## 设计原则

### 1. Provider 只暴露接口，不暴露实现

必须遵循 `state-context-interface` 和 `state-decouple-implementation`：

- provider 是唯一知道 `useShortcuts`、`useShortcutStore`、`useShortcutPersistenceSync` 如何拼装的地方
- UI 只读取统一接口
- 后续即使要继续拆 store、workspace、sync，也不需要改动消费侧 UI 结构

### 2. 显式变体优于 boolean 模式

必须遵循 `architecture-avoid-boolean-props` 和 `patterns-explicit-variants`：

- 不再增加类似 `showX`、`enableX`、`allowX` 这类决定组件模式的布尔 props
- 如果某个能力代表的是一种独立交互模式，应优先建成显式变体或显式 action

### 3. children/context 优于 render prop 透传

必须遵循 `patterns-children-over-render-props`：

- render prop 只在父组件必须向子树注入计算结果时使用
- 对于可共享的局部状态，优先用 provider/context

### 4. Composition layer 只负责结构，不负责业务状态重置

任何组合层都应该：

- 负责声明“有哪些部分被组装到一起”
- 不负责散落的业务 reset 逻辑
- 不负责维护多个互相关联 state 的关闭一致性

## 目标架构

## 一、应用根边界

目标是在 `shortcut app` 范围内形成一个真正的 provider 根边界：

```tsx
<ShortcutAppProvider value={...concrete implementation...}>
  <ShortcutExperienceRoot />
  <ShortcutDialogsRoot />
  <ShortcutSyncDialogsRoot />
</ShortcutAppProvider>
```

其中：

- `ShortcutAppProvider` 负责组装现有 `useShortcuts`、workspace、sync、dialog controller
- `ShortcutExperienceRoot` 负责首页快捷方式体验区的结构组合
- `ShortcutDialogsRoot` 负责常规 dialogs 的结构组合
- `ShortcutSyncDialogsRoot` 负责同步相关 dialogs 的结构组合

`App.tsx` 的职责应该收缩为：

- 组装顶层页面壳子
- 连接 wallpaper / auth / sync runtime 等真正的 app-level concern
- 挂载 provider 和几个根级组合组件

而不是继续持有大量 shortcut feature 的局部交互状态。

## 二、统一的 context 接口

建议新增一个明确的 context contract：

```ts
type ShortcutAppContextValue = {
  state: {
    domain: { ... }
    ui: { ... }
    dialogs: { ... }
    selection: { ... }
  }
  actions: {
    shortcuts: { ... }
    dialogs: { ... }
    selection: { ... }
    sync: { ... }
  }
  meta: {
    refs: { ... }
    capabilities: { ... }
  }
}
```

这里的关键不是字段名，而是结构原则：

- `state` 放当前可读状态
- `actions` 放行为入口
- `meta` 放 ref、capability、非业务展示信息

这样做的价值：

- UI 不需要知道状态来自哪个 hook
- 组合层可以只消费它需要的那一部分接口
- 可以逐步从单 context 过渡到多个子 context，而不打破消费模型

## 三、三类独立 provider

建议最终形成以下三个局部 provider：

### 1. `ShortcutAppProvider`

职责：

- 聚合 domain state、workspace state、sync state
- 暴露统一 context
- 托管当前 `useShortcutAppFacade` 的职责

### 2. `ShortcutDialogsProvider`

职责：

- 统一管理 shortcut/scenario/auth/settings/backup/consent 对话框开关
- 定义所有 dialog 的 reset 规则
- 暴露显式动作，例如 `openCreateShortcutDialog()`、`closeShortcutDialog()`

### 3. `ShortcutSelectionProvider`

职责：

- 管理多选状态
- 提供选择、清空、批量删除前置状态
- 为 context menu、grid、toolbar 等多个消费者提供同一份选择态

## 分阶段重构方案

## Phase 0：收敛接口，先立约束再搬代码

目标：

- 停止继续扩大当前 facade / prop bag / boolean API
- 为后续 provider 化改造建立边界

实施项：

1. 冻结 `useShortcutAppFacade` 的继续扩展
2. 冻结 `ShortcutAppDialogsLayerProps` 的继续扩展
3. 禁止在 `ShortcutSelectionShell` 新增新的 `showX` / `enableX` 类 props
4. 在文档和 code review 中约定：新增局部交互优先进入 provider/action，而不是继续往 `App.tsx` 和 prop bag 里塞

完成标准：

- 新功能不再往 facade 和大 prop 对象里继续追加字段
- 新增 capability 不再通过独立 boolean prop 暴露

## Phase 1：把 `useShortcutAppFacade` 升级为真正 provider

目标：

- 解决 Finding 1
- 建立 `state / actions / meta` 合同

建议新增文件：

- `src/features/shortcuts/app/ShortcutAppContext.tsx`
- `src/features/shortcuts/app/ShortcutAppProvider.tsx`
- `src/features/shortcuts/app/useShortcutAppContext.ts`

建议迁移方式：

1. 保留现有 `useShortcuts`，但只允许 provider 内部使用
2. 在 provider 内部把 `useShortcuts`、`useShortcutWorkspaceController`、必要的 folder transition 相关入口整理为统一 context value
3. `App.tsx` 不再直接拆解 `shortcutApp.shortcutDomain` 等 slice
4. 先让 `ShortcutExperienceLayer`、`ShortcutAppDialogsLayer`、`ShortcutSyncDialogsLayer` 改为从 context 读取数据
5. 等消费侧完成迁移后，再删除 `useShortcutAppFacade`

这一阶段不要做的事：

- 不要同时重写业务逻辑
- 不要同时大规模改名
- 不要一次性把所有 context 再拆成很多小 provider

完成标准：

- `App.tsx` 不再直接依赖 `useShortcutAppFacade`
- `useShortcutAppFacade.ts` 删除或只保留过渡包装
- `ShortcutExperienceLayer` 和 dialog root 从 context 消费，而不是从 `App.tsx` 接收大包 props

## Phase 2：把 dialog 聚合层拆成 controller + 显式 root

目标：

- 解决 Finding 2
- 消除 dialog prop bag

建议新增文件：

- `src/features/shortcuts/dialogs/ShortcutDialogsContext.tsx`
- `src/features/shortcuts/dialogs/ShortcutDialogsProvider.tsx`
- `src/features/shortcuts/dialogs/ShortcutDialogsRoot.tsx`
- `src/features/shortcuts/dialogs/useShortcutDialogsController.ts`

建议结构：

```tsx
<ShortcutDialogsProvider>
  <ShortcutDialogsRoot />
</ShortcutDialogsProvider>
```

其中：

- provider 管理 open/close/reset
- controller 定义显式动作
- root 只负责声明渲染哪些 dialog

建议显式动作示例：

- `openCreateShortcutDialog(insertIndex)`
- `openEditShortcutDialog(shortcut, options?)`
- `closeShortcutDialog()`
- `openDeleteShortcutDialog(shortcutRef)`
- `openScenarioCreateDialog()`
- `openScenarioEditDialog(mode)`

关键要求：

- `currentInsertIndex` 的生命周期必须和 shortcut dialog 一起收口
- “关闭 shortcut dialog 时需要 reset 哪些字段”只能在一个地方定义
- `ShortcutAppDialogsLayer` 最终应删除，或退化为非常薄的 root 组件

完成标准：

- 不再存在八大组 dialog props 的跨层透传
- dialog reset 规则只在 controller/provider 内部定义
- `App.tsx` 不再负责拼装 `LazyAppDialogs` 的业务参数

## Phase 3：把 `ShortcutSelectionShell` 改成 provider + 显式 action 组合

目标：

- 解决 Finding 3 和 Finding 4
- 消除 render prop 与无效布尔状态

建议新增文件：

- `src/features/shortcuts/selection/ShortcutSelectionContext.tsx`
- `src/features/shortcuts/selection/ShortcutSelectionProvider.tsx`
- `src/features/shortcuts/selection/useShortcutSelection.ts`
- `src/features/shortcuts/selection/ShortcutSelectionActions.tsx`

建议重构方向：

### 1. render prop 改为 provider

从：

```tsx
<ShortcutSelectionShell>
  {({ selectionMode, selectedShortcutIndexes, onToggleShortcutSelection }) => ...}
</ShortcutSelectionShell>
```

改为：

```tsx
<ShortcutSelectionProvider>
  <ShortcutSelectionShell>
    <ShortcutHomeSurface />
    <ShortcutContextMenu />
    <ShortcutBulkDeleteDialog />
  </ShortcutSelectionShell>
</ShortcutSelectionProvider>
```

### 2. `showLargeFolderToggle` 改为 capability 推导

从：

- `showLargeFolderToggle?: boolean`
- `onSetFolderDisplayMode?: (...) => void`

改为两种更安全的方式之一：

方案 A：

- 只保留 `setFolderDisplayMode` action
- 由 `Boolean(action)` 决定菜单项是否出现

方案 B：

- 抽成独立 action 组件，例如 `FolderDisplayModeMenuItem`
- 仅在能力存在时组装进去

推荐方案 B，因为它更符合 compound/composition 思路。

### 3. 把上下文菜单动作拆成显式 action 组装

建议把当前 `ShortcutSelectionShell` 内部的大量菜单逻辑拆成：

- `ShortcutContextMenu`
- `ShortcutContextMenu.ShortcutActions`
- `ShortcutContextMenu.FolderActions`
- `ShortcutContextMenu.MultiSelectActions`

这样做的价值：

- 不同模式的菜单能力通过显式组合表达
- 不需要继续增加条件分支
- 后续在别的 surface 复用选择能力时，不必再搬整个 shell

完成标准：

- `ShortcutExperienceLayer` 不再依赖 render prop 拿选择态
- `showLargeFolderToggle` 被移除
- `ShortcutSelectionShell` 不再同时承担状态管理、菜单渲染、确认弹窗三类职责

## Phase 4：把 experience layer 调整成真正的 compound composition root

目标：

- 让 `ShortcutExperienceLayer` 变成“结构组合层”，而不是“透传层”

建议方向：

- `ShortcutExperienceLayer` 改名为 `ShortcutExperienceRoot`
- 它只负责声明结构，例如：

```tsx
<ShortcutSelectionProvider>
  <ShortcutSurfaceFrame>
    <HomeInteractiveSurface />
    <ShortcutFolderOverlay />
    <FolderNameDialog />
  </ShortcutSurfaceFrame>
</ShortcutSelectionProvider>
```

这里每个子组件都从 context 读取自己的数据，而不是通过 `ShortcutExperienceLayerProps` 接收大包参数。

完成标准：

- `ShortcutExperienceLayerProps` 大幅收缩或消失
- `HomeInteractiveSurface` 只接收真正属于展示层的 props
- selection、folder overlay、folder name dialog 不再由中间层转发状态

## Phase 5：收尾与 API 清理

目标：

- 删除过渡层
- 缩小公共接口
- 把新结构固定下来

建议清理项：

1. 删除 `useShortcutAppFacade`
2. 删除 `ShortcutAppDialogsLayer`
3. 删除 `ShortcutExperienceLayer` 中仅用于转发的 prop 类型
4. 复审 `RootShortcutGrid`、`HomeInteractiveSurface`、`HomeMainContent`，把仍然是“模式控制”的 boolean props 继续压缩成显式变体或 capability

完成标准：

- `App.tsx` 的 shortcut feature 组装逻辑显著减少
- 组合层名称与职责一致
- 新增交互时，默认路径是“扩展 provider / action / explicit composition”，而不是“再加一层 props”

## 建议的目标文件布局

```text
src/features/shortcuts/
  app/
    ShortcutAppContext.tsx
    ShortcutAppProvider.tsx
    useShortcutAppContext.ts
    ShortcutExperienceRoot.tsx
    ShortcutSyncDialogsRoot.tsx
  dialogs/
    ShortcutDialogsContext.tsx
    ShortcutDialogsProvider.tsx
    ShortcutDialogsRoot.tsx
    useShortcutDialogsController.ts
  selection/
    ShortcutSelectionContext.tsx
    ShortcutSelectionProvider.tsx
    useShortcutSelection.ts
    ShortcutContextMenu.tsx
    ShortcutSelectionActions.tsx
```

这不是强制文件名，但建议遵守两个原则：

- `Provider` 负责 state ownership
- `Root` 负责结构组合
- `Context` / `useXxxContext` 负责读取接口

## 实施顺序建议

推荐按以下顺序推进，而不是并行大改：

1. 先做 Phase 1，把 provider 边界立起来
2. 再做 Phase 2，收口 dialog 生命周期
3. 再做 Phase 3，收口 selection 生命周期
4. 最后做 Phase 4 和 Phase 5，删掉过渡层并清理 API

原因：

- provider 边界是后面所有改造的前置条件
- dialog 和 selection 都是局部状态中心，适合在 provider 之后拆
- 体验层重构应该放在状态边界稳定之后，否则容易反复改接口

## 风险与控制

### 风险 1：一次性重写太多，行为回归难定位

控制方式：

- 每个 phase 独立提交
- 每个 phase 只解决一类结构问题
- 先迁移消费方式，再删除旧层

### 风险 2：provider 过早拆得太细，反而增加复杂度

控制方式：

- 先从一个主 `ShortcutAppProvider` 起步
- 等消费边界稳定后，再判断是否需要继续拆子 provider

### 风险 3：把组合重构做成“上下文滥用”

控制方式：

- 仅把真正共享的 feature state 放进 context
- 纯展示型 props 继续留在组件边界
- 不要把所有局部 UI 细节都塞进同一个 context

## 验收标准

当以下条件满足时，可以认为这轮重构达标：

- `App.tsx` 不再直接拼装 shortcut feature 的大部分状态与动作
- `useShortcutAppFacade` 被 provider 替代
- `ShortcutAppDialogsLayer` 被 controller/root 结构替代
- `ShortcutSelectionShell` 不再通过 render prop 输出选择态
- `showLargeFolderToggle` 这类 capability boolean 被移除或显著减少
- 新增一个 shortcut 交互动作时，默认实现路径不需要再扩展 `App.tsx` 的大 prop bag

## 验证建议

每个 phase 完成后至少执行：

- `npm run typecheck`
- `npm test`

涉及快捷方式交互、文件夹、对话框生命周期时，额外建议验证：

- 新建快捷方式
- 编辑快捷方式
- 删除快捷方式
- 新建文件夹
- 文件夹重命名
- 多选、批量删除、移动到情景模式
- 打开与关闭各类对话框后的状态 reset 是否一致

## 推荐落地方式

最适合这轮工作的推进方式不是“大重写”，而是“小步 provider 化”：

1. 先把状态读取统一到 context
2. 再让组合层从 context 读取
3. 再删掉中间 prop bag
4. 最后清理 boolean 和 render prop

这样做可以最大限度复用当前已经完成的 extraction 成果，同时真正向 `vercel-composition-patterns` 的目标架构靠拢，而不是只把复杂度从一个文件搬到另一个文件。

## 进度日志

### 2026-04-21

- 完成 Step 0.1。
- 在文档顶部增加前置提示，明确要求后续每完成一步重构都必须同步更新本文档，记录进度与验证状态。

- 完成 Step 0.2。
- 新增 `src/features/shortcuts/app/shortcutEditorState.ts`，把 shortcut 编辑弹窗的共享 reset/open 规则抽成 helper。
- `ShortcutAppDialogsLayer` 关闭 shortcut 编辑弹窗时，改为复用统一 reset helper，并补上 `currentInsertIndex` 的同步重置。
- `App.tsx` 打开“新建快捷方式”弹窗时，改为复用统一 open helper，避免继续复制 editor 初始化逻辑。
- 这一步的目标是先收口最容易漂移的状态生命周期，为后续 dialog provider 化做准备。

- 完成 Step 0.3。
- `ShortcutSelectionShell` 删除 `showLargeFolderToggle` 布尔 prop。
- 文件夹显示模式菜单项改为由 `onSetFolderDisplayMode` capability 是否存在决定是否渲染，避免公共 API 暴露“有开关但没动作”的无效状态。
- `App.tsx` 同步移除对应的布尔传参。

- 完成 Step 0.4。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- 这一轮完成后，Phase 0 的首批收口已经落地，下一步进入 Phase 1，开始建立 `ShortcutAppProvider` / context 基础设施。

- 完成 Step 1.1。
- 新增 `src/features/shortcuts/app/ShortcutAppContext.tsx`。
- 新增 `src/features/shortcuts/app/useShortcutAppContextValue.ts`。
- 这一轮先采用“context value hook + provider”方式建立基础设施：`App.tsx` 先统一生产 `state / actions / meta` 结构，再通过 `ShortcutAppProvider` 往下提供，作为从 facade 过渡到真正 provider ownership 的中间步骤。

- 完成 Step 1.2。
- `App.tsx` 已从 `useShortcutAppFacade` 切换到 `useShortcutAppContextValue`。
- `App.tsx` 现在会用 `ShortcutAppProvider` 包裹 shortcut 相关渲染树，provider 已接入真实消费路径，而不是只停留在文件层面。
- `ShortcutAppDialogsLayer` 已删除 `shortcutDialogs` 这一大组外部 prop，改为直接从 `ShortcutAppContext` 读取 shortcut 编辑/删除弹窗状态、动作和 reset 规则。
- 这一步的结果是：
  - `App.tsx` 少了一大块 shortcut dialog prop drilling。
  - shortcut feature 已经有了统一的 `state / actions / meta` 合同。
  - 后续可以继续把 `ShortcutExperienceLayer`、`ShortcutSyncDialogsLayer` 逐步迁到同一个 context 上。

- 完成 Step 1.3。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- 下一步建议：
  - 优先继续迁移 `ShortcutExperienceLayer`，把 selection/context menu 相关状态从 render prop + prop bag 进一步移到 provider / context 消费。

- 完成 Step 1.4。
- 新增 `src/features/shortcuts/selection/ShortcutSelectionContext.tsx`。
- `ShortcutSelectionShell` 不再使用 `children({ ... })` render prop 透传选择态，而是改成在组件内部提供 `ShortcutSelectionProvider`。
- `ShortcutExperienceLayer` 新增 context 消费节点，改为通过 `useShortcutSelection()` 读取：
  - `selectionMode`
  - `selectedShortcutIndexes`
  - `onToggleShortcutSelection`
- 这一步的结果是：
  - 选择态已经脱离 render prop 签名。
  - `ShortcutSelectionShell` 开始具备 provider 边界。
  - `ShortcutExperienceLayer` 更接近真正的组合层，而不是状态透传层。

- 完成 Step 1.5。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- 下一步建议：
  - 继续把 `ShortcutSelectionShell` 内部的 context menu / bulk actions 拆成更显式的 selection action 组合，或者把 `ShortcutExperienceLayer` 继续迁到 `ShortcutAppContext`，进一步缩小 `selectionShellProps` 这类大包接口。

- 完成 Step 1.6。
- 新增 `src/features/shortcuts/selection/useShortcutSelectionController.ts`。
- `ShortcutSelectionShell` 内部原本混在组件里的内容，已经有一部分迁移到 controller：
  - 选择态 state
  - 派生数据
  - bulk delete 流程
  - pin / move / create folder 等动作
  - copy-link 复用逻辑
- 这一步的结果是：
  - `ShortcutSelectionShell` 更接近渲染层。
  - selection 相关流程已经开始从“大组件”迁向“controller + provider + UI”的结构。
  - 后续继续拆 `ShortcutContextMenu`、`ShortcutSelectionToolbar` 时不必再从 UI 中反向剥离状态逻辑。

- 完成 Step 1.7。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- 下一步建议：
  - 优先把 `ShortcutSelectionShell` 里的 context menu 和 toolbar 各自抽成显式组件，让 shell 从“controller + 大量 UI”继续收缩成“provider + 结构组合”。

- 完成 Step 1.8。
- 新增 `src/features/shortcuts/selection/ShortcutSelectionContextMenu.tsx`。
- 新增 `src/features/shortcuts/selection/ShortcutSelectionToolbar.tsx`。
- `ShortcutSelectionShell` 现在只负责三件事：
  - 调用 `useShortcutSelectionController` 取得状态与动作。
  - 提供 `ShortcutSelectionProvider`。
  - 组合 `children`、`ShortcutSelectionContextMenu`、`ShortcutSelectionToolbar` 与删除确认弹窗。
- 这一步的结果是：
  - context menu 与多选工具栏从 shell 中拆成了显式 UI 组件。
  - `ShortcutSelectionShell` 更贴近 `vercel-composition-patterns` 里的 compound/composition root。
  - 后续如果要继续拆 action 变体，不需要再从一个超长组件里剥离。

- 完成 Step 1.9。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- 下一步建议：
  - 继续把 `ShortcutSelectionShell` 里剩余的 bulk delete 确认弹窗抽成显式 selection action 组件，进一步收紧 shell 的职责边界。

- 完成 Step 1.10。
- 新增 `src/features/shortcuts/selection/ShortcutSelectionBulkDeleteDialog.tsx`。
- `ShortcutSelectionShell` 不再直接内联 `ConfirmDialog`，而是改为组合 `ShortcutSelectionBulkDeleteDialog`。
- 这一步的结果是：
  - shell 又去掉了一块具体对话框实现。
  - selection 的“显式 action 组件”边界更清晰。
  - 后续如果要继续把多选相关交互拆成独立 action 组装，改动点会更集中。

- 完成 Step 1.11。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。

- 完成 Step 1.12。
- 新增 `src/features/shortcuts/selection/ShortcutSelectionContextMenuContent.tsx`。
- `ShortcutSelectionContextMenu` 不再自己持有一整块巨大的条件分支，而是改成组合三个显式菜单变体：
  - `ShortcutContextMenuContent`
  - `FolderShortcutContextMenuContent`
  - `GridContextMenuContent`
- 这一步的结果是：
  - context menu 已经从“一个组件承载全部模式”向“显式变体组件组合”推进。
  - 更符合 `patterns-explicit-variants` 和 `architecture-compound-components` 的目标。
  - 后续继续拆菜单动作时，可以在具体变体上演进，而不是继续往一个大分支里塞条件。

- 完成 Step 1.13。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- 下一步建议：
  - 继续把 `ShortcutSelectionToolbar` 里的 move/folder/pin 等多选动作拆成更细的显式 action 组件，或者开始收缩 `ShortcutExperienceLayer` 的 prop 组合边界，向 `ShortcutExperienceRoot` 过渡。

- 完成 Step 1.14。
- 新增 `src/features/shortcuts/selection/ShortcutSelectionToolbarActions.tsx`。
- `ShortcutSelectionToolbar` 里的多选能力拆成了显式 action 组件：
  - `ShortcutSelectionScenarioMoveAction`
  - `ShortcutSelectionFolderMoveAction`
  - `ShortcutSelectionCreateFolderAction`
  - `ShortcutSelectionPinAction`
  - `ShortcutSelectionDeleteAction`
  - `ShortcutSelectionCancelAction`
- 这一步的结果是：
  - 多选工具栏从“一个组件承载全部按钮与弹层”继续向“显式 action 组合”推进。
  - move / folder / pin / delete / cancel 这些能力已经有了更清晰的边界。
  - 后续如果要替换某个 action 的交互或抽成独立入口，可以只改对应 action 组件。

- 完成 Step 1.15。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。

- 完成 Step 1.16。
- `ShortcutSelectionShell` 不再把 `shortcutMultiSelectMode` 作为布尔模式 prop 传给 `ShortcutSelectionToolbar`。
- 现在改为由 shell 在多选模式开启时显式挂载 `ShortcutSelectionToolbar`，工具栏组件自身只表示一个明确的“多选工具栏”变体。
- 这一步的结果是：
  - 又去掉了一处“用布尔值切换组件模式”的接口。
  - shell 与 toolbar 的组合关系更接近 `patterns-explicit-variants` 推荐的写法。
  - `ShortcutSelectionToolbar` 的组件语义更明确，不再承担“渲染或不渲染”的额外模式判断。

- 完成 Step 1.17。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- 下一步建议：
  - 开始收缩 `ShortcutExperienceLayer` 的 prop 组合边界，优先把 overlay / dialog 等固定消费者继续拆成更显式的 root 结构，向 `ShortcutExperienceRoot` 过渡。

- 完成 Step 1.18。
- 新增 `src/features/shortcuts/app/ShortcutExperienceRoot.tsx`。
- `App.tsx` 已从 `ShortcutExperienceLayer` 切到 `ShortcutExperienceRoot`。
- `ShortcutExperienceRoot` 现在把 experience 区域拆成更明确的固定组合节点：
  - `ShortcutExperienceSurface`
  - `ShortcutExperienceCompactOverlay`
  - `ShortcutExperienceFolderNameDialog`
- `src/features/shortcuts/app/ShortcutExperienceLayer.tsx` 退化为兼容导出层，避免一次性打断现有引用路径。
- 这一步的结果是：
  - experience 区域的命名开始和职责对齐，从“layer”向“root”收口。
  - `App.tsx` 已经在使用更符合 composition patterns 语义的根组件。
  - overlay / folder dialog 不再只是 `ShortcutExperienceLayer` 内部的条件块，而是显式的固定消费者节点。

- 完成 Step 1.19。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- 下一步建议：
  - 继续缩小 `ShortcutExperienceRootProps`，优先把 `selectionShellProps` / `homeInteractiveSurfaceBaseProps` 这种大包接口进一步收口，或者把过渡用的 `ShortcutExperienceLayer` shim 删除掉。

- 完成 Step 1.20。
- `ShortcutExperienceRoot` 已开始直接消费 `ShortcutAppContext`。
- `selectionShellProps` 被收缩为 `selectionActions`，以下 selection feature state / meta / 既有动作不再由 `App.tsx` 手动透传：
  - `contextMenu`
  - `setContextMenu`
  - `contextMenuRef`
  - `shortcuts`
  - `scenarioModes`
  - `selectedScenarioId`
  - `handleConfirmDeleteShortcuts`
- 这一步的结果是：
  - `App.tsx` 对 selection feature 内部状态的了解又少了一层。
  - `ShortcutExperienceRoot` 更接近真正的 feature composition root，而不是只负责转发大包 props。
  - `state-decouple-implementation` 和 `state-context-interface` 在 experience 入口开始落到真实消费路径上。

- 完成 Step 1.21。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- 下一步建议：
  - 继续收口 `homeInteractiveSurfaceBaseProps`，优先判断哪些字段也可以由 root 或 context 自己获取；如果这一层已经足够稳定，再删除 `ShortcutExperienceLayer` 的兼容导出文件。

- 完成 Step 1.22。
- 删除 `src/features/shortcuts/app/ShortcutExperienceLayer.tsx`。
- 当前仓库已不再保留 `ShortcutExperienceLayer` 这一兼容导出层，`ShortcutExperienceRoot` 成为 shortcut experience 区域的唯一入口。
- 这一步的结果是：
  - `layer` 这一过渡命名从真实代码路径中移除。
  - experience 入口的结构边界更清晰，后续重构不会再被旧命名和旧别名干扰。
  - 这也意味着 Phase 4 的命名与结构调整已经开始真正落地，而不只是并行保留两套入口。

- 完成 Step 1.23。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- 下一步建议：
  - 继续审视 `homeInteractiveSurfaceBaseProps` 是否还能拆成更显式的 surface sections；如果短期内不适合再拆，就可以把注意力切回 `ShortcutAppDialogsLayer`，推进 Phase 2 的 dialog root/provider 收口。

- 完成 Step 2.1。
- 新增 `src/features/shortcuts/app/useShortcutAppDialogsController.ts`。
- `ShortcutAppDialogsLayer` 现在会通过 controller 统一读取 shortcut/scenario 这两组 dialog 所需的 context 状态、动作和派生值。
- `App.tsx` 已移除 `scenarioDialogs` 这一整组 prop 透传，以下内容不再由页面层手动拼装后传给 dialogs layer：
  - `scenarioCreateOpen`
  - `setScenarioCreateOpen`
  - `scenarioEditOpen`
  - `setScenarioEditOpen`
  - `handleCreateScenarioMode`
  - `handleUpdateScenarioMode`
  - `scenarioEditMode`
- 这一步的结果是：
  - `ShortcutAppDialogsLayer` 真正少了一组大 prop bag。
  - scenario dialog 的状态所有权开始回到 shortcut feature 自己的 context/controller 边界里。
  - Phase 2 已经从“文档计划”进入实际代码路径。

- 完成 Step 2.2。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- 下一步建议：
  - 继续用同样方式收口 `authDialog` 或 `settingsDialogs` 之外更小的一组，例如 utility / consent / shortcut icon settings 相关入口；优先挑已经有明确 context 所有权或关闭 reset 规则比较集中的那一组。

- 完成 Step 2.3。
- `useShortcutAppDialogsController` 现在会统一派生 `search settings`、`shortcut guide`、`shortcut icon settings`、`admin`、`about` 以及 `disable consent` 这几组 dialog props。
- `ShortcutAppDialogsLayer` 内部已不再手工拼装上述 utility / consent dialog 的大部分业务参数，而是转为消费 controller 产出的显式 props。
- `App.tsx` 这一步同步收口了 `shortcut icon settings` 相关的细粒度保存逻辑，不再把这组保存回调和展示参数整包往 utility dialog 层透传。
- 这一步的结果是：
  - utility / consent 相关 dialog 的关闭、保存和回写规则进一步集中到 controller 边界。
  - `ShortcutAppDialogsLayer` 继续变薄，更接近真正的 dialog root，而不是继续堆积业务装配细节。
  - Phase 2 的“controller 化”已经从 scenario dialogs 扩展到了第二组真实 dialog 入口。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。

- 完成 Step 2.4。
- `useShortcutAppDialogsController` 现在会统一派生 `authModalProps`。
- `ShortcutAppDialogsLayer` 已不再手工拼装 auth modal 的业务参数，而是转为消费 controller 产出的显式 props。
- 这一步被收进 controller 的 auth 规则包括：
  - `onGoogleLinkSuccess` 之后把 modal mode 复位为 `login`
  - API server / custom API 配置透传
  - 登录成功回调与 `linkedUsername` 透传
- 这一步的结果是：
  - auth dialog 的装配逻辑开始从 `ShortcutAppDialogsLayer` 中抽离。
  - dialogs layer 继续朝“结构 root”靠拢，而不是继续堆积业务拼装细节。
  - Phase 2 已经覆盖到第三组真实 dialog 入口。

- 完成 Step 2.5。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- 下一步建议：
  - 继续优先收口 `backupDialogs`，因为它比 `settingsDialogs` 更集中、比 `syncProviderDialogs` 更少副作用，适合作为 Phase 2 的下一块真实 prop bag 减法。

- 完成 Step 2.6。
- `useShortcutAppDialogsController` 已进一步收口 `settings / backup / sync provider / consent` 相关 dialog props 的业务装配。
- `ShortcutAppDialogsLayer` 现在只保留两类职责：
  - 根据 `shouldMountAppDialogs` 控制是否挂载
  - 渲染 `LazyAppDialogs`
- 以下 dialog props 已统一由 controller 派生：
  - `shortcutModalProps`
  - `shortcutDeleteDialogProps`
  - `scenarioCreateDialogProps`
  - `scenarioEditDialogProps`
  - `authModalProps`
  - `settingsModalProps`
  - `searchSettingsModalProps`
  - `shortcutGuideDialogProps`
  - `shortcutIconSettingsDialogProps`
  - `adminModalProps`
  - `aboutModalProps`
  - `exportBackupDialogProps`
  - `importBackupDialogProps`
  - `webdavConfigDialogProps`
  - `cloudSyncConfigDialogProps`
  - `confirmSyncDialog`
  - `importConfirmDialog`
  - `disableConsentDialog`
- 这一步的结果是：
  - `ShortcutAppDialogsLayer` 已不再承担大部分业务装配细节。
  - dialog 的关闭、保存、默认值、回写与二次动作规则已经集中到一个 controller 边界。
  - 从“layer + 大量业务拼装”到“薄 root + controller”的目标已经落地，Phase 2 可视为完成。

- 完成 Step 2.7。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- Phase 2 完成判断：
  - `ShortcutAppDialogsLayer` 已成为薄 root。
  - dialog 装配规则已集中在 `useShortcutAppDialogsController`。
  - shortcut/scenario/auth/utility/backup/sync provider/consent 相关 dialog 都已进入统一 controller 路径。
- 下一步建议：
  - 回到 `App.tsx` 的主文件减重目标，优先推进 `settings` / `sync` / `app shell` 的整块 extraction，而不是继续在 dialog layer 内部做细粒度微调。

- 完成 Step 5.1。
- `HomeInteractiveSurface` 不再接收 `visible` 布尔模式 prop。
- `HomeMainContent` 也不再接收 `visible` 布尔模式 prop。
- `ShortcutExperienceRoot` 现在改为通过 `homeInteractiveSurfaceVisible` 显式决定是否挂载 `ShortcutExperienceSurface`，而不是把“是否显示”继续作为 surface / content 组件内部的模式开关。
- 这一步的结果是：
  - `HomeInteractiveSurface` 与 `HomeMainContent` 的组件语义更接近显式变体，而不是“永远挂载 + 传 boolean 决定自己要不要显示”。
  - `patterns-explicit-variants` 和 `architecture-avoid-boolean-props` 在 experience surface 这一层有了新的真实落地。
  - `ShortcutExperienceRoot` 更像真正的 compound composition root，而不是继续把显示模式透传给子组件自己判断。

- 完成 Step 5.2。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- 下一步建议：
  - 继续按照 Phase 5 的“API 清理”方向，优先复审 `HomeInteractiveSurface`、`HomeMainContent`、`RootShortcutGrid` 里剩余是否仍有“用 boolean 决定组件模式”的接口；如果没有明显低风险项，再回到 `App.tsx` 做下一块按 root/controller 边界抽取。

- 完成 Step 5.3。
- 删除 `RootShortcutGrid` 中已经没有调用方的 `forceReorderOnly` 布尔模式 prop，组件只保留显式的 `interactionProfile` 作为交互模式入口。
- 这一步的结果是：
  - `RootShortcutGrid` 不再保留“boolean 决定交互模式”的过渡 API。
  - root grid 的公开接口更贴近 `patterns-explicit-variants`，也减少了未来继续误用旧模式开关的可能。

- 完成 Step 5.4。
- 删除 `src/features/shortcuts/app/useShortcutAppFacade.ts`。
- 这一步的结果是：
  - 旧 facade 镜像层已正式退出代码路径，不再留下“已经 provider 化，但仓库里还保留一份旧入口”的双轨状态。
  - `ShortcutAppProvider` + `useShortcutAppContextValue` 成为 shortcut app 的唯一主边界，实现上更符合 `state-decouple-implementation`。

- 完成 Step 5.5。
- 将薄组合层正式更名为 root：
  - `ShortcutAppDialogsLayer` -> `ShortcutAppDialogsRoot`
  - `ShortcutSyncDialogsLayer` -> `ShortcutSyncDialogsRoot`
- `App.tsx` 已改为挂载新的 root 组件命名。
- 这一步的结果是：
  - 组合层名称和职责重新对齐，不再出现“实际上已经是 root，但文件和组件仍叫 layer”的过渡状态。
  - Phase 2 留下的薄 root 结构在命名层面也完成收口。

- 完成 Step 5.6。
- 运行验证：
  - `npm run typecheck`
  - `npm test`
- 验证结果：
  - TypeScript 类型检查通过。
  - Vitest 现有 9 个测试文件、33 个测试全部通过。
- Phase 5 完成判断：
  - `useShortcutAppFacade` 已删除。
  - dialog layer 已收口为 `ShortcutAppDialogsRoot` / `ShortcutSyncDialogsRoot`。
  - `ShortcutExperienceLayer` 已删除，experience 结构由 `ShortcutExperienceRoot` 承担。
  - `RootShortcutGrid` 已继续清理一处实际无调用方的布尔模式 API。
  - 当前 shortcut feature 已推进到可关闭状态。
