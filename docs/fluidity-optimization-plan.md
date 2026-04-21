# Leaftab Fluidity Optimization Plan

日期：2026-04-21

前置约定：从本文件创建开始，后续每完成一个任务，都必须同步更新本文档的“进度追踪”和“更新日志”两部分，避免优化上下文丢失。

## 文档目标

本文档聚焦“用户体感流畅度”优化，而不是纯粹的代码行数压缩或目录整理。

优化目标是让用户在以下高频交互中明显感到更轻盈、更稳定：

- 搜索输入与搜索建议展开
- 快捷方式拖拽、排序、选择
- 文件夹展开与收起
- 设置/同步弹窗打开与关闭
- 动态壁纸、时间动画存在时的页面操作

本文档将作为这条优化线的唯一执行文档。后续若有架构重构、性能优化、渲染边界调整，都应优先更新本文档，而不是只停留在对话上下文里。

## 依据

本方案主要依据以下 skill 与审查结论：

- `vercel-react-best-practices`
- `vercel-composition-patterns`

本轮与体感流畅度最相关的审查结论有：

1. `shortcuts` provider 过粗，导致无关 app shell 状态也会惊动首页互动区域
2. root grid 路径对全量快捷方式做布局、派生与同步测量，缺少 viewport-bounded 优化
3. `App.tsx` 仍然是顶层订阅与 prop-assembly 中心，小状态变化会放大为整页工作
4. `sync` runtime 仍是第二个粗粒度全局 provider，会扩大状态变更影响面
5. browser target 分叉会放大后续性能修复的维护成本

## 非目标

这轮不以以下事项为第一目标：

1. 不以“尽快减少总代码行数”为主要成功标准
2. 不优先进行纯目录搬家
3. 不先重写 UI 视觉设计
4. 不先重构低频功能，只处理会影响高频交互体感的部分
5. 不在没有验证收益前，直接重写 grid 系统

## 成功标准

如果本计划执行有效，应至少满足以下结果中的大部分：

- 搜索输入时不再明显牵动快捷方式区与背景层重渲染
- 快捷方式拖拽和文件夹展开时掉帧感下降
- 打开设置/同步弹窗时首页更“安静”，背景与快捷方式区更少抖动
- 交互高峰期主线程同步测量和整树重算次数下降
- 根组件 `App.tsx` 不再是高频状态的主要订阅者

## 当前优先级

按“用户最容易体感到流畅提升”的顺序，当前优先级如下：

1. 拆 `shortcuts` provider 粒度，降低首页互动区域的无关重渲染
2. 优化 root grid 的全量布局与同步测量路径
3. 下放 `App.tsx` 的顶层动态状态订阅，减少整页 churn
4. 拆 `sync` runtime 的粗粒度 provider
5. 收口 browser target 分叉，降低性能修复双写成本

## 进度追踪

当前 focus：文件夹打开场景里的 overlay / grid 局部提交压力已继续收紧；下一步最值得处理的是搜索输入导致的整块首页 surface 跟随重渲染，暂不直接进入 Phase 4。

- [x] Phase 0 Step 1. 创建体感流畅优化文档并收敛任务优先级。
- [x] Phase 0 Step 2. 补充当前基线数据与验证口径。
- [x] Phase 1 Step 1. 拆分 `shortcuts` provider，建立更窄的订阅边界。
- [x] Phase 1 Step 2. 把 `App.tsx` 中 shortcuts 相关动态读取下放到 feature root。
- [x] Phase 2 Step 1. 评估 root grid 当前全量派生/测量路径，确认最重链路。
- [x] Phase 2 Step 2. 为 root grid 引入 viewport-bounded 优化方案。
- [x] Phase 3 Step 1. 拆分 `sync` runtime 的 provider 粒度。
- [x] Phase 3 Step 2. 稳定首页互动根 props，并为 shortcuts home surface 建立 memo 边界。
- [x] Phase 3 Step 3. 建立首页互动面 render profiling 采样，并用自动交互刷新热点排序。
- [x] Phase 3 Step 4. 把文件夹过渡的高频动画状态从 `App` / 首页主树中剥离出去。
- [x] Phase 3 Step 5. 收紧文件夹 overlay / grid 自己的局部提交压力。
- [ ] Phase 4 Step 1. 收口 browser target 分叉的共享基础实现。

## 验证口径

每个任务完成后，至少更新以下验证结果中的一部分：

- `npm run typecheck`
- `npm test`
- React DevTools Profiler 对比
- 手工交互验证：
  - 搜索输入
  - 快捷方式拖拽
  - 文件夹展开/收起
  - 设置/同步弹窗开关

如果某一步没有做 profiler 或没有跑测试，也必须在更新日志里明确写出来。

## Phase 0：建立基线

### Step 1. 创建执行文档

目标：

- 把当前体感流畅优化目标、优先级、验证方式固定下来
- 让后续任务更新有唯一落点

状态：已完成

### Step 2. 建立基线数据

目标：

- 明确当前最容易感知“重”的交互场景
- 为后续优化提供前后对比标准

建议记录：

- 搜索输入时首页是否有明显背景/快捷方式区连带更新
- 快捷方式拖拽时是否存在明显掉帧
- 文件夹展开时是否有布局抖动
- 设置/同步弹窗打开时主页是否有明显整体重绘感

建议补充的技术验证：

- React Profiler：
  - 搜索输入一次
  - 打开设置一次
  - 拖拽一个快捷方式一次
- 如果需要，记录一次 Performance 面板中的主线程热点

状态：已完成

当前基线快照：

- 自动化验证：
  - `npm run typecheck` 通过
  - `npm test` 通过
  - 当前单测覆盖为 `9` 个测试文件、`33` 个测试用例
  - 当前仓库仅有 `1` 个 e2e spec：`tests/e2e/shortcut-workspace.spec.js`（未在本阶段执行）
- 当前源码规模快照：
  - `src`: `72,197` 行
  - `packages`: `13,765` 行
  - `server`: `5,298` 行
  - `tests`: `88` 行
- 当前与体感流畅最相关的高风险热点文件：
  - `src/App.tsx`: `2,424` 行
  - `src/features/sync/app/useLeafTabSyncRuntimeController.ts`: `1,947` 行
  - `packages/grid-react/src/RootShortcutGrid.tsx`: `366` 行
  - `src/features/shortcuts/app/useShortcutAppContextValue.ts`: `98` 行
- 当前高频交互场景的基线判断：
  - 搜索输入：
    - 搜索建议链路已经使用 worker 和 `startTransition`
    - 但首页互动区仍可能因为粗粒度 shortcuts provider 和 `App.tsx` 顶层订阅产生额外 churn
  - 快捷方式拖拽 / 文件夹展开：
    - root grid 当前仍会走全量 item normalization、派生状态计算和同步测量
    - 随快捷方式数量增长，这条链路最可能直接影响体感顺滑度
  - 设置 / 同步弹窗开关：
    - `App.tsx` 仍是顶层订阅与 prop assembly 中心
    - 弹窗开关有较大概率放大为整页工作
  - sync 状态变化：
    - `sync` runtime 仍是粗粒度 provider
    - 同步相关状态切换可能连带影响更多 UI

补充说明：

- 本阶段基线已足够支持后续 Phase 1 开工。
- 本阶段尚未建立 React DevTools Profiler 的自动化采样基线，也未记录浏览器 Performance trace。
- 后续进入 Phase 1 或 Phase 2 时，如果改动触及首页交互热路径，应补一次 profiler 对比。

## Phase 1：降低首页互动区域的无关重渲染

### Step 1. 拆分 `shortcuts` provider

问题：

- 当前 `useShortcutAppContextValue()` 构建了一个大的 `state/actions/meta` 对象
- `App.tsx` 顶层读取了大量 shortcut 状态
- 无关状态变化会扩大到整个首页互动区域

目标：

- 建立更窄的订阅边界
- 让首页互动区域只订阅必要状态

首批涉及文件：

- `src/features/shortcuts/app/useShortcutAppContextValue.ts`
- `src/features/shortcuts/app/ShortcutAppContext.tsx`
- `src/App.tsx`

建议拆法：

- 至少拆成：
  - `domain`
  - `ui`
  - `persistence`
- 如果中途发现 selection 也是热路径，再补拆一层 `selection`

完成标准：

- `App.tsx` 不再一次性订阅大块 shortcut state
- 无关 app shell 状态变化时，shortcut experience subtree 的工作量下降

状态：已完成

本轮结果：

- `ShortcutAppProvider` 已从单一大 value 改为多个 memoized slice provider：
  - `domain`
  - `ui`
  - `persistence`
  - `shortcut feature actions`
  - `meta`
- `ShortcutExperienceRoot` 与 `useShortcutAppDialogsController` 已切换为按需消费窄 context，而不是依赖整个 `shortcutApp` 大对象。
- `useShortcutAppContextValue.ts` 已退化为 `useShortcuts()` 的轻量 controller 入口，不再负责拼装巨型 `state/actions/meta` 图。

### Step 2. 下放 shortcuts 相关状态读取

问题：

- 即使 provider 拆分后，若 `App.tsx` 仍提前读取大量动态状态，根组件仍会放大全页工作

目标：

- 把 shortcuts 相关动态状态尽量下放到对应 feature root 内消费

首批涉及文件：

- `src/App.tsx`
- `src/features/appShell/useShortcutExperienceRootProps.ts`
- `src/features/shortcuts/app/ShortcutExperienceRoot.tsx`

完成标准：

- `App.tsx` 更接近 shell，而不是 shortcuts orchestrator

状态：已完成

本轮结果：

- `ShortcutExperienceRoot` 内部接管了：
  - context menu 位置修正
  - context menu 外部点击关闭
  - 创建快捷方式入口
  - 根层单项删除入口
- `ShortcutAppDialogsRoot` 内部接管了 shortcuts 相关 dialog open 状态的 keep-mounted 判定。
- `App.tsx` 不再直接持有 shortcuts context menu 的 effect，也不再为 shortcuts dialogs 读取一组额外的 open 状态。
- `useShortcutExperienceRootProps.ts` 已缩小为只组装真正需要从 `App.tsx` 传入的交互回调和视觉层 props。

## Phase 2：优化 root grid 热路径

### Step 1. 审计全量派生与同步测量链路

问题：

- root grid 当前会对全量快捷方式执行 item normalization、packed layout、reorder state、projection state 计算
- 同时存在 layout effect 中的同步测量
- 缺少 viewport-bounded 优化

目标：

- 找出最重的同步路径
- 明确哪些计算是“始终全量”，哪些只需在交互中发生

首批涉及文件：

- `src/features/shortcuts/components/RootShortcutGrid.tsx`
- `packages/grid-react/src/RootShortcutGrid.tsx`
- `packages/grid-react/src/rootShortcutGridHelpers.ts`
- `packages/grid-react/src/rootResolution/useRootShortcutGridDerivedState.ts`

完成标准：

- 输出一版 grid 热路径说明
- 明确首轮优化点，不盲目重写

状态：已完成

本轮审计结论：

- 热路径仍然集中在 `packages/grid-react/src/RootShortcutGrid.tsx` 这一整条链：
  - `buildRootShortcutGridItems()` 会对全量 shortcuts 做 item normalization
  - `useRootShortcutGridDerivedState()` 会继续走 packed layout、reorder slot、projection state 的整链派生
  - `RootShortcutGrid` 的 layout effect 会进入同步 DOM measurement 路径
- 即使没有所有格子都在屏幕内，之前的 root grid surface 仍然会把所有 item body 全量挂到 DOM 上，导致：
  - 不可见格子也参与渲染和样式/布局工作
  - measurement 路径会覆盖更多 DOM 节点
  - 拖拽、文件夹动画和整页滚动时更容易与这些离屏格子竞争主线程
- 结论上，这一阶段最值得先做的不是重写 grid 算法，而是先把 DOM 工作量收敛到可见区域附近。

### Step 2. 引入 viewport-bounded 优化

候选方向：

- item-level `content-visibility: auto`
- 更严格的 DOM measurement gating
- 可见区域裁剪或轻量 windowing
- 降低拖拽期间无关计算频率

目标：

- grid 规模增长时，交互流畅度退化变缓

状态：已完成

本轮落地方案：

- 在 `packages/grid-react/src/rootView/renderSurface.tsx` 为 root grid 引入基于可视行范围的 item body culling。
- 默认只保留可视区域附近的格子为完整渲染，离屏格子退化为轻量占位。
- 正在拖拽、正在 hover、存在 projection offset、存在 layout shift offset 的格子会强制保持完整渲染，避免破坏交互和动画连续性。
- 完整渲染格子追加了：
  - `content-visibility: auto`
  - `contain: layout paint style`
  - `contain-intrinsic-size`

这轮方案的预期收益：

- 离屏格子不再持续贡献完整 React 子树和样式/布局成本
- measurement 路径只会命中当前可视区附近真正挂载的 item element
- 快捷方式数量增长时，拖拽和滚动的体感退化速度会更慢

回归修复说明：

- 在实际交互中，这版 `renderSurface` 的 item body culling 与 `content-visibility/contain` 组合引入了明显回归：
  - 图标合并成组时，目标图标描边圆角异常
  - 部分快捷方式标题显示异常
  - 文件夹打开/关闭位移动画丢失
- 为了先恢复交互正确性，已临时回撤 `packages/grid-react/src/rootView/renderSurface.tsx` 中这部分裁剪与 containment 改动。
- 这意味着 Phase 2 的优化方向仍然成立，但下一轮需要换更保守的落地方式，优先考虑不移除真实 item 子树的 measurement gating 或只读型可视区优化。

Phase 2 修订版落地：

- 在不裁掉真实 grid item DOM 的前提下，已改为优先优化“拖拽测量数据层”：
  - `packages/grid-react/src/rootGeometry/measurement.ts`
  - `packages/grid-react/src/rootRuntime/useRootShortcutGridControllerBundle.ts`
  - `packages/grid-react/src/rootRuntime/hoverSync.ts`
- 当前 drag session 内，measurement controller 会优先复用 `dragLayoutSnapshot`，避免 pointer move / auto-scroll 链路反复重新量整组 item。
- 正常拖拽 hover 现在默认只使用“视口附近 + overscan + active item 保留”的 measured snapshot 参与命中和 hover 解析，而不是每次都把全量 measured items 送进热路径。
- auto-scroll 仍然保留显式 measured override 通道，避免边界滚动场景丢失正确性。

这轮修订版的预期收益：

- 拖拽期间 `getBoundingClientRect()` 热点压力下降
- hover / merge / folder-target 命中计算只处理当前交互真正相关的一小部分 measured item
- 保留真实卡片、标题和文件夹过渡动画节点，避免再次触发上一轮的 UI 回归

Phase 2 第二刀落地：

- 在上述安全版 measurement 优化基础上，进一步把 root grid 的重派生从常驻路径里剥离：
  - `packages/grid-react/src/rootShortcutGridHelpers.ts`
  - `packages/grid-react/src/rootResolution/projection.ts`
  - `packages/grid-react/src/RootShortcutGrid.tsx`
- 现在没有 `activeDragId` 时，不再启用 projected root reorder slot 这条链路。
- 现在没有 active drag 和 settle preview 时，`projection` 直接返回空状态，不再继续构造：
  - `projectionLayoutSnapshot`
  - `projectionOffsets`
  - `projectedDropPreview`
- `computeProjectionOffsetsForIntent()` 现在也会在没有 active drag / projection intent / layout snapshot 时直接短路为空。
- `RootShortcutGrid` 中那段 layout-shift 逻辑，现在会在“拖拽中且没有 pending source rects”时直接跳过全量 `measureDragItemRects()`，避免进入“先测量，再被 skip”的无效工作。

这轮第二刀的预期收益：

- 首页静止态下，grid 不再维持一套无用的 projection / reorder 准备状态
- 拖拽过程中，无效的 layout-shift DOM measurement 会减少
- 相比第一刀，这一刀更有机会跨过“用户能感觉到”的阈值

## Phase 3：拆分 `sync` runtime 影响面

### Step 1. 降低 sync provider 粒度

问题：

- `useLeafTabSyncRuntimeController()` 依赖面太宽
- 返回一个大的 `state/actions/meta` 对象
- sync 状态变化会扩大影响到更多 UI

目标：

- 让 sync dialog、调度、加密、导入导出、provider 配置彼此的订阅边界更清楚

首批涉及文件：

- `src/features/sync/app/useLeafTabSyncRuntimeController.ts`
- `src/features/sync/app/LeafTabSyncContext.tsx`
- `src/features/shortcuts/app/ShortcutSyncDialogsRoot.tsx`

状态：未开始

状态：已完成

本轮结果：

- `LeafTabSyncProvider` 已从单一粗粒度 provider 拆为多个 memoized slice provider：
  - `status`
  - `dialogs`
  - `config`
  - `actions`
  - `meta`
- `ShortcutSyncDialogsRoot` 与 `useShortcutAppDialogsController` 已切换为按需消费窄 sync hooks，而不是依赖整个 `sync` controller。
- `useLeafTabSyncRuntimeController()` 的返回值也已按 `state / actions / meta` 进行 memo 化，减少每次 render 都重新创建整棵对象图的压力。

本轮额外下放：

- `ShortcutSyncDialogsRoot` 内部接管了：
  - sync center keep-mounted 判定
  - encryption dialog keep-mounted 判定
- `ShortcutAppDialogsRoot` 内部接管了 sync 备份/导入相关 dialog open 状态的挂载判定。
- `useShortcutAppDialogsController` 不再通过 `App.tsx` 中转一组 sync settings actions，而是直接消费窄 sync action/context slice。
- `App.tsx` 不再为 sync dialogs 的挂载与 settings 转发读取一组额外 sync dialog 状态。

### Step 2. 继续压缩 `App.tsx` 到首页互动面的无关惊动

问题：

- 即使 provider 已拆窄，`App.tsx` 仍会在每次 render 时重新组装 `shortcutExperienceRootProps`
- `useShortcutExperienceRootProps()` 之前依赖整个 `params` 对象，等于每次都返回新对象
- `ShortcutExperienceRoot` 及其首页交互子树没有有效 memo 边界，容易跟着无关 app-shell 状态一起 rerender

目标：

- 让首页互动面只在真正相关的 props 或 shortcuts context 更新时重渲染
- 降低设置、弹窗、壁纸、同步等 app-shell 更新对首页互动层的连带影响

首批涉及文件：

- `src/App.tsx`
- `src/features/appShell/useShortcutExperienceRootProps.ts`
- `src/features/shortcuts/app/ShortcutExperienceRoot.tsx`

状态：已完成

本轮结果：

- `useShortcutExperienceRootProps()` 已从“依赖整个 `params` 对象”的失效 memo，改为基于显式依赖稳定返回值。
- `App.tsx` 里原本每次 render 都会新建的几类首页交互 props 已稳定下来：
  - `compactFolderOverlayProps`
  - `openingSourceSnapshot`
  - folder opening / closing layout callbacks
- `ShortcutExperienceRoot` 已加上 `memo` 边界。
- `ShortcutExperienceSurface`、`ShortcutExperienceCompactOverlay`、`ShortcutExperienceFolderNameDialog` 也已加上独立 `memo` 边界，避免 shortcuts 内部局部状态更新时整棵交互树一起重跑。

这轮预期收益：

- 设置、同步、壁纸、弹窗等无关 app-shell 更新，不再默认惊动首页快捷方式交互面。
- context menu、文件夹 overlay、文件夹命名弹窗这些局部变化，更容易被局部消费而不是带着整个 surface 一起重算。
- 这属于“降低无关 rerender 噪音”的优化，通常会让首页交互更稳、更安静，但是否达到“明显可感”的阈值，仍建议用 profiler 和手工拖拽/开关弹窗复核。

### Step 3. 建立交互热点 profiling 基线

问题：

- 经过多轮 provider / root grid / root props 收口后，下一刀如果继续只靠静态阅读，很容易把时间花在“看起来重”而不是“体感最重”的链路上。
- 现有仓库没有可复用的 render profiler 采样脚本，也没有稳定的性能交互入口。

目标：

- 提供一套默认关闭、显式开启的 render profiling 采样能力。
- 用自动交互而不是主观感觉，刷新“体感优先”的下一步排序。

首批涉及文件：

- `src/dev/renderProfiler.tsx`
- `src/features/shortcuts/app/ShortcutExperienceRoot.tsx`
- `src/components/home/HomeInteractiveSurface.tsx`
- `src/features/shortcuts/components/RootShortcutGrid.tsx`
- `src/components/search/SearchExperience.tsx`
- `src/features/shortcuts/app/ShortcutAppDialogsRoot.tsx`
- `src/components/TopNavBar.tsx`
- `src/components/search/SearchField.tsx`
- `src/components/SettingsModal.tsx`
- `scripts/profile-fluidity.mjs`
- `package.json`

状态：已完成

本轮结果：

- 已新增显式开关式 render profiler：
  - 通过 `localStorage['leaftab_render_profiler'] = '1'` 或 query 参数打开
  - 默认关闭，不影响正常运行
- 已为以下热点组件接入 profiling boundary：
  - `ShortcutExperienceRoot`
  - `HomeInteractiveSurface`
  - `RootShortcutGrid`
  - `SearchExperience`
  - `ShortcutAppDialogsRoot`
- 已补稳定采样入口：
  - `top-nav-settings-button`
  - `home-search-input`
  - `settings-modal`
- 已新增自动采样脚本：
  - `npm run profile:fluidity`
  - 支持通过 `PLAYWRIGHT_APP_URL` 指向当前 dev server

本轮测得热点结论：

- `folder-open` 是目前最重的已采样交互：
  - `ShortcutExperienceRoot`: `201` commits / `116.4ms`
  - `HomeInteractiveSurface`: `187` commits / `72.7ms`
  - `RootShortcutGrid`: `221` commits / `58.3ms`
- `settings-open` 已明显轻于文件夹打开，但首页互动面仍被惊动：
  - `ShortcutAppDialogsRoot`: `13` commits / `20.6ms`
  - `ShortcutExperienceRoot`: `83` commits / `11.6ms`
  - `HomeInteractiveSurface`: `83` commits / `10.7ms`
- `search-type` 的主要问题不是 search 自己重，而是整块首页 surface 跟着一起提交：
  - `ShortcutExperienceRoot`: `130` commits / `26.7ms`
  - `HomeInteractiveSurface`: `130` commits / `26.4ms`
  - `SearchExperience`: `59` commits / `15.1ms`

按体感优先刷新后的下一步排序：

1. 优先压缩文件夹打开/关闭链路中的 transition progress / overlay state 对整个首页互动面的惊动。
2. 第二优先是把搜索输入相关状态进一步从 `HomeInteractiveSurface` / `HomeMainContent` 中隔离出来，避免输入时整块首页一起 rerender。
3. 设置弹窗链路目前仍有噪音，但已不是第一优先级。
4. `Phase 4` 的 browser target 分叉仍然不是当前最值得先做的体感优化。

### Step 4. 剥离文件夹过渡动画的高频状态订阅

问题：

- `useFolderTransitionController()` 之前直接在 `App.tsx` 内部 `setState` 驱动动画进度。
- 文件夹打开/关闭期间，`transition.phase`、`transition.progress`、`sourceSnapshot` 会每帧穿过：
  - `App.tsx`
  - `useShortcutExperienceRootProps()`
  - `ShortcutExperienceRoot`
  - `HomeInteractiveSurface`
- 这会把本应局部处理的 overlay 动画放大成首页互动面整棵子树的高频提交。

目标：

- 把文件夹动画状态从 `App.tsx` 和首页主树里摘出去。
- 让 `App` 只订阅低频的 `activeFolderId` / `overlayFolderId`，而让真正需要高频动画进度的部分单独订阅。

首批涉及文件：

- `src/components/folderTransition/useFolderTransitionController.ts`
- `src/components/folderTransition/FolderTransitionDocumentEffects.tsx`
- `src/App.tsx`
- `src/features/appShell/useShortcutExperienceRootProps.ts`
- `src/features/shortcuts/app/ShortcutExperienceRoot.tsx`

状态：已完成

本轮结果：

- `useFolderTransitionController()` 已从“直接让 `App` 跟着动画 state rerender”的模式，改为稳定 controller + `useSyncExternalStore` 订阅模式。
- `App.tsx` 现在只订阅：
  - `activeFolderId`
  - `overlayFolderId`
- 文件夹动画期间更新 document data attributes 和 immersive CSS variables 的逻辑，已下放到独立的：
  - `FolderTransitionDocumentEffects`
- `ShortcutExperienceRoot` 不再经由 props 接收：
  - `folderTransitionPhase`
  - `folderTransitionProgress`
  - `openingSourceSnapshot`
  - opening / closing layout ready callbacks
- 这些高频动画字段现在只由 compact overlay 自己通过 transition controller 订阅和消费。

本轮 profiling 对比结果：

- `folder-open`：
  - `HomeInteractiveSurface`: `187` commits / `72.7ms` -> `128` commits / `25.1ms`
  - `RootShortcutGrid`: `221` commits / `58.3ms` -> `215` commits / `33.3ms`
  - `ShortcutExperienceRoot` profiler 边界总时长：`116.4ms` -> `69.8ms`
- `settings-open`：
  - `HomeInteractiveSurface`: `83` commits / `10.7ms` -> `60` commits / `11.4ms`
  - `RootShortcutGrid`: `74` commits / `5.0ms` -> `50` commits / `4.8ms`
- `search-type`：
  - `HomeInteractiveSurface`: `130` commits / `26.4ms` -> `112` commits / `21.4ms`
  - `SearchExperience`: `59` commits / `15.1ms` -> `41` commits / `10.5ms`

这轮结论：

- 这次优化方向是有效的，尤其是文件夹打开链路中，首页互动面被高频动画状态惊动的问题已经明显缓解。
- 但 `folder-open` 仍然是当前最重热点，剩余成本更多集中在 overlay / grid 本身，而不是 `App` 级联惊动。
- 因此下一步若继续按体感优先走，应优先继续拆解文件夹 overlay / grid 的局部提交压力，然后再回头做搜索输入链路。

### Step 5. 收紧文件夹 overlay / grid 的局部提交压力

问题：

- 在完成 Step 4 之后，文件夹动画的“整页惊动”已经明显下降，但 `folder-open` 依旧是最重热点。
- 剩余成本主要集中在 compact overlay 自己：
  - `ShortcutFolderCompactOverlay` 每个动画 tick 仍会带着隐藏测量层和已稳定展示层一起重进
  - `FolderShortcutSurface` 内部虽然已是局部 surface，但仍会被 overlay 父级的重复 render 拖着一起进入提交路径
- 这类压力不一定会继续表现成整页抖动，但会让文件夹打开过程里的局部主线程竞争更高。

目标：

- 让文件夹打开/关闭期间，真正高频变化的只剩动画层。
- 把隐藏测量层和稳定展示层从 transition tick 的热路径中隔离出来。

首批涉及文件：

- `src/components/ShortcutFolderCompactOverlay.tsx`
- `src/features/shortcuts/components/FolderShortcutSurface.tsx`

状态：已完成

本轮结果：

- `FolderShortcutSurface` 已继续收紧为更稳定的局部 surface：
  - `React.memo`
  - 稳定的 context menu / card render / drag preview 回调
  - 独立 profiling boundary
- `ShortcutFolderCompactOverlay` 已把“静态但昂贵”的两层显式拆开：
  - `HiddenMeasurementLayer`
  - `SettledFolderLayer`
- 隐藏测量层现在只会在真正需要测量的阶段挂载：
  - `opening-measure`
  - `open`
  - `closing-measure`
- 在 `opening-animate` / `closing-animate` 期间，overlay 不再保留那层隐藏 grid surface，动画层可以单独运行。
- 伴随这次拆层，也顺手修正了隐藏测量层卸载时的 scroll listener 清理方式，避免因为 ref 变空导致监听遗留。

本轮 profiling 对比结果：

- 相对 Step 4 完成后的上一轮 baseline，`folder-open` 进一步下降：
  - `ShortcutExperienceRoot`: `144` commits / `51.2ms` -> `118` commits / `49.2ms`
  - `HomeInteractiveSurface`: `74` commits / `21.3ms` -> `51` commits / `21.5ms`
  - `RootShortcutGrid`: `107` commits / `17.2ms` -> `56` commits / `14.9ms`
  - `FolderShortcutSurface`: `40` commits / `6.7ms` -> `10` commits / `6.6ms`
- 这说明这刀的收益主要集中在“文件夹局部链路更安静”，而不是再次带来 Step 4 那种整页级别的大幅下降。
- `settings-open` 和 `search-type` 的采样没有呈现同样稳定的一致收益，因此不把它们视为这轮优化的主要收获。

这轮结论：

- 这一步是值得做的，但性质更偏“局部热路径精修”而不是“用户一眼就会感到明显变轻”。
- 文件夹打开链路里，overlay / grid 自己的重复提交已经被继续压下去；下一刀若仍按体感优先，就应该转向搜索输入链路，把 `HomeInteractiveSurface` / `HomeMainContent` 从输入过程里继续隔离出来。

## Phase 4：降低性能修复的双写成本

### Step 1. 收口 browser target 分叉

问题：

- Chromium / Firefox 分叉实现会让一项性能修复需要改两份组件

目标：

- 提炼 shared base 实现
- 让 target 文件只保留少量 capability/workaround 差异

优先试点：

- `SearchSuggestionsPanel`
- `QuickAccessDrawer`

状态：未开始

## 更新日志

### 2026-04-21

- 创建 `docs/fluidity-optimization-plan.md`。
- 收敛当前“以体感流畅为目标”的优化优先级，确定先做：
  1. `shortcuts` provider 粒度
  2. root grid 热路径
  3. `App.tsx` 顶层订阅下放
  4. `sync` runtime 粒度
- 当前尚未开始执行具体优化任务。
- 本次仅创建与初始化计划文档，未运行新的测试或 profiler。

- 完成 Phase 0 Step 2，补充体感流畅基线数据。
- 记录了当前源码规模快照、当前最关键的体感热点文件，以及四类高频交互场景的风险判断。
- 完成基础健康检查：
  - `npm run typecheck`
  - `npm test`
- 当前测试基线：
  - `9` 个测试文件
  - `33` 个测试用例
- 当前未执行 e2e，也未建立 React Profiler 自动化基线；这被记录为后续阶段的补充项，而不是阻塞 Phase 0 完成的前置条件。

- 完成 Phase 1 Step 1 与 Step 2，目标是缩小 shortcuts 首页互动区的订阅边界，并把 shortcut-only 的动态读取从 `App.tsx` 下放到 feature root。
- 本轮核心改动：
  - `src/features/shortcuts/app/ShortcutAppContext.tsx`
  - `src/features/shortcuts/app/useShortcutAppContextValue.ts`
  - `src/features/shortcuts/app/ShortcutExperienceRoot.tsx`
  - `src/features/shortcuts/app/useShortcutAppDialogsController.ts`
  - `src/features/shortcuts/app/ShortcutAppDialogsRoot.tsx`
  - `src/features/appShell/useShortcutExperienceRootProps.ts`
  - `src/App.tsx`
- 本轮结构性收益：
  - shortcuts provider 已切成多个 memoized slice，首页互动层和 dialogs 层不再被单一大对象一起失效。
  - shortcuts context menu 的边界修正和外部点击关闭已移入 `ShortcutExperienceRoot`，不再挂在根组件。
  - `App.tsx` 不再为 shortcuts dialogs 的 keep-mounted 逻辑读取一组额外 UI open 状态，root shell 职责进一步收窄。
- 自动化验证：
  - `npm run typecheck` 通过
  - `npm test` 通过
  - 当前单测仍为 `9` 个测试文件、`33` 个测试用例
- 本轮未完成项：
  - 未补 React DevTools Profiler 对比
  - 未执行手工交互验证
  - 未执行 e2e
- 下一阶段 focus 调整为 Phase 2：root grid 全量派生与同步测量链路审计。

- 完成 Phase 2 Step 1 与 Step 2，目标是先审清 root grid 热路径，再用低风险的 viewport-bounded 方案减少离屏格子的 DOM 和测量成本。
- 本轮核心改动：
  - `packages/grid-react/src/rootView/renderSurface.tsx`
  - `docs/fluidity-optimization-plan.md`
- 本轮审计结论：
  - root grid 的重链路仍是“全量 item normalization -> packed layout / reorder / projection 派生 -> 同步 measurement”。
  - 其中最容易先拿到体感收益的部分，是把离屏格子从“完整 DOM + 可测量节点”降为“轻量占位”。
- 本轮结构性收益：
  - root grid surface 现在会基于滚动视口只渲染可视行附近的完整卡片内容。
  - 离屏格子会保留网格占位，但不会持续挂载完整内容子树。
  - 正在拖拽、hover、投影或 layout shift 中的格子会继续保持完整渲染，降低交互回归风险。
  - 完整格子额外启用了 `content-visibility` 与 containment，进一步压缩渲染影响面。
- 自动化验证：
  - `npm run typecheck` 通过
  - `npm test` 通过
  - 当前单测仍为 `9` 个测试文件、`33` 个测试用例
- 本轮未完成项：
  - 未补 React DevTools Profiler 对比
  - 未执行手工交互验证
  - 未执行 e2e
- 下一阶段 focus 调整为 Phase 3：拆分 `sync` runtime 的 provider 粒度。

- 修复了 Phase 2 首版 root grid viewport culling 带来的交互回归。
- 本轮核心改动：
  - `packages/grid-react/src/rootView/renderSurface.tsx`
  - `docs/fluidity-optimization-plan.md`
- 本轮修复内容：
  - 回撤了 `renderSurface` 中离屏 item body 占位替代逻辑
  - 回撤了 `content-visibility: auto`、`contain: layout paint style`、`contain-intrinsic-size`
  - 恢复所有 grid item 始终渲染真实子树，优先确保合并描边、标题显示和文件夹过渡动画正确
- 自动化验证：
  - `npm run typecheck` 通过
  - `npm test` 通过
- 本轮结论：
  - Phase 2 的优化方向没有错，但当前这版实现风险过高，不适合作为长期方案
  - 后续如果继续做 grid 流畅度优化，应转向更保守的 measurement gating / derived-state 降载方案

- 完成了 Phase 2 的修订版优化，目标是在不触碰真实 grid item 渲染的前提下，降低拖拽态同步测量和 hover 命中计算的成本。
- 本轮核心改动：
  - `packages/grid-react/src/rootGeometry/measurement.ts`
  - `packages/grid-react/src/rootRuntime/useRootShortcutGridControllerBundle.ts`
  - `packages/grid-react/src/rootRuntime/hoverSync.ts`
  - `docs/fluidity-optimization-plan.md`
- 本轮结构性收益：
  - drag session 内优先复用 `dragLayoutSnapshot` 作为测量基线，减少 pointer move / auto-scroll 链路重复量整组 DOM。
  - 正常拖拽 hover 默认只消费“视口附近 + overscan + active item 保留”的 measured snapshot，缩小热路径数据规模。
  - auto-scroll 和 release 等需要更高保真度的链路仍保留 measured override 能力，避免正确性回退。
- 自动化验证：
  - `npm run typecheck` 通过
  - `npm test` 通过
- 本轮未完成项：
  - 未补 React DevTools Profiler 对比
  - 未执行手工拖拽/文件夹/成组交互验证
  - 未执行 e2e

- 完成了 Phase 2 第二刀，目标是把 root grid 的 projection / reorder 重派生从静止态和非必要路径里剥掉，并直接拦住拖拽中的无效 layout-shift 测量。
- 本轮核心改动：
  - `packages/grid-react/src/rootShortcutGridHelpers.ts`
  - `packages/grid-react/src/rootResolution/projection.ts`
  - `packages/grid-react/src/RootShortcutGrid.tsx`
  - `docs/fluidity-optimization-plan.md`
- 本轮结构性收益：
  - 无 active drag 时，不再启用 projected root reorder slot 相关派生。
  - 无 active drag / settle preview 时，projection controller 直接返回空状态，避免继续构造 projection snapshot / offsets / drop preview。
  - 拖拽中如果没有 pending layout shift source rects，直接跳过 `measureDragItemRects()` 这类会被后续 skip 掉的同步测量。
- 自动化验证：
  - `npm run typecheck` 通过
  - `npm test` 通过
- 本轮未完成项：
  - 未补 React DevTools Profiler 对比
  - 未执行手工拖拽/文件夹/成组交互验证
  - 未执行 e2e

- 完成 Phase 3 Step 1，目标是缩小 sync runtime 的订阅边界，并把 sync-only 的 dialog 挂载与 action 中转从 `App.tsx` 下放到 feature root。
- 本轮核心改动：
  - `src/features/sync/app/LeafTabSyncContext.tsx`
  - `src/features/sync/app/useLeafTabSyncRuntimeController.ts`
  - `src/features/shortcuts/app/ShortcutSyncDialogsRoot.tsx`
  - `src/features/shortcuts/app/ShortcutAppDialogsRoot.tsx`
  - `src/features/shortcuts/app/useShortcutAppDialogsController.ts`
  - `src/App.tsx`
- 本轮结构性收益：
  - sync provider 已切成多个 memoized slice，sync center、加密弹窗、备份导入弹窗和配置状态不再共享一个粗粒度上下文失效面。
  - `ShortcutSyncDialogsRoot` 只订阅 sync center / encryption / dangerous sync 需要的那部分状态。
  - `ShortcutAppDialogsRoot` 只订阅 backup / import / confirm import 所需的 sync dialog 状态。
  - `App.tsx` 不再为 sync dialogs 的 keep-mounted 和部分 settings sync action 做额外 prop assembly，中枢压力进一步下降。
  - `useLeafTabSyncRuntimeController()` 不再每次 render 都重新拼装新的大 `state/actions/meta` 返回对象图。
- 自动化验证：
  - `npm run typecheck` 通过
  - `npm test` 通过
  - 当前单测仍为 `9` 个测试文件、`33` 个测试用例
- 本轮未完成项：
  - 未补 React DevTools Profiler 对比
  - 未执行手工交互验证
  - 未执行 e2e
- 下一阶段 focus 调整为 Phase 4：browser target 分叉收口。

- 完成 Phase 3 Step 2，目标是继续压缩 `App.tsx` 到首页互动面的无关 prop churn，并给 shortcuts 首页交互树建立有效 memo 边界。
- 本轮核心改动：
  - `src/App.tsx`
  - `src/features/appShell/useShortcutExperienceRootProps.ts`
  - `src/features/shortcuts/app/ShortcutExperienceRoot.tsx`
- 本轮结构性收益：
  - `useShortcutExperienceRootProps()` 不再因为依赖整个 `params` 对象而在每次 `App` render 时失效。
  - `App.tsx` 不再为 compact folder overlay props 和 folder layout ready callbacks 每次生成新的引用，首页交互根 props 稳定性明显提高。
  - `ShortcutExperienceRoot` 及其 surface / compact overlay / folder name dialog 子树都有了独立 `memo` 边界，能够挡住一部分无关 app-shell churn。
- 自动化验证：
  - `npm run typecheck` 通过
  - `npm test` 通过
  - 当前单测为 `10` 个测试文件、`35` 个测试用例
- 本轮未完成项：
  - 未补 React DevTools Profiler 对比
  - 未执行手工搜索/拖拽/文件夹开关/弹窗开关体感复核
  - 未执行 e2e
- 下一阶段 focus 暂不进入 Phase 4；应先用 profiler 和手工体感重新确认剩余最重 hot path。

- 完成 Phase 3 Step 3，目标是建立一个可重复执行的 render profiling 基线，并用自动交互刷新“体感优先”的热点排序。
- 本轮核心改动：
  - `src/dev/renderProfiler.tsx`
  - `src/features/shortcuts/app/ShortcutExperienceRoot.tsx`
  - `src/components/home/HomeInteractiveSurface.tsx`
  - `src/features/shortcuts/components/RootShortcutGrid.tsx`
  - `src/components/search/SearchExperience.tsx`
  - `src/features/shortcuts/app/ShortcutAppDialogsRoot.tsx`
  - `src/components/TopNavBar.tsx`
  - `src/components/search/SearchField.tsx`
  - `src/components/SettingsModal.tsx`
  - `scripts/profile-fluidity.mjs`
  - `package.json`
- 本轮结构性收益：
  - 项目现在有了默认关闭、可显式开启的 render profiling 工具，不需要每次手动开 DevTools 才能比较热点。
  - 采样脚本可直接对 `folder-open`、`settings-open`、`search-type` 做基线刷新。
  - 这让后续优化能围绕“文件夹打开链路”和“搜索输入链路”的真实提交压力，而不是继续凭直觉排序。
- 自动化验证：
  - `npm run typecheck` 通过
  - `npm test` 通过
  - `PLAYWRIGHT_APP_URL='http://127.0.0.1:4173/' npm run profile:fluidity` 通过
  - 当前 profiling 结果显示：
    - `folder-open` 为最重交互热点
    - `search-type` 为第二优先热点
    - `settings-open` 已下降到次一级
- 本轮未完成项：
  - 尚未把拖拽交互接入自动 profiling
  - 尚未做 React DevTools Profiler 的人工对照采样
  - 尚未执行 e2e 的拖拽/成组专项验证
- 下一阶段 focus 调整为：优先压缩文件夹打开/关闭的整面提交，再处理搜索输入导致的整块首页重渲染。

- 完成 Phase 3 Step 4，目标是把文件夹过渡动画的高频状态从 `App` 和首页主树中剥离出去，只让真正需要这些状态的 overlay / document effects 单独订阅。
- 本轮核心改动：
  - `src/components/folderTransition/useFolderTransitionController.ts`
  - `src/components/folderTransition/FolderTransitionDocumentEffects.tsx`
  - `src/App.tsx`
  - `src/features/appShell/useShortcutExperienceRootProps.ts`
  - `src/features/shortcuts/app/ShortcutExperienceRoot.tsx`
- 本轮结构性收益：
  - `App.tsx` 不再跟着文件夹动画进度每帧 rerender。
  - 首页交互主树不再通过 props 接收 `transition.progress / phase / sourceSnapshot` 这类高频字段。
  - document CSS vars 与 body transition dataset 已下放到独立 effects 组件，不再由 `App` 自己承担动画驱动。
  - compact folder overlay 改为直接消费 transition controller，因此文件夹动画的高频订阅影响面被压缩到更小范围。
- 自动化验证：
  - `npm run typecheck` 通过
  - `npm test` 通过
  - `PLAYWRIGHT_APP_URL='http://127.0.0.1:4173/' npm run profile:fluidity` 通过
- 本轮 profiling 结果相对上一轮基线：
  - `folder-open`：
    - `HomeInteractiveSurface`: `187` commits / `72.7ms` -> `128` commits / `25.1ms`
    - `RootShortcutGrid`: `221` commits / `58.3ms` -> `215` commits / `33.3ms`
    - `ShortcutExperienceRoot` profiler 边界总时长：`116.4ms` -> `69.8ms`
  - `search-type`：
    - `HomeInteractiveSurface`: `130` commits / `26.4ms` -> `112` commits / `21.4ms`
    - `SearchExperience`: `59` commits / `15.1ms` -> `41` commits / `10.5ms`
  - `settings-open`：
    - `HomeInteractiveSurface`: `83` commits / `10.7ms` -> `60` commits / `11.4ms`
- 本轮未完成项：
  - 尚未把拖拽交互接入自动 profiling
  - 尚未把 compact overlay / folder surface 单独拆成更细的 profiling 边界
  - 尚未执行手工文件夹开关与拖拽体感复核
- 下一阶段 focus 调整为：继续收紧文件夹 overlay / grid 的局部提交压力，之后再处理搜索输入链路。

- 完成 Phase 3 Step 5，目标是继续压缩文件夹 overlay / grid 自己的局部提交压力，让 transition tick 只惊动真正需要动画的那层。
- 本轮核心改动：
  - `src/components/ShortcutFolderCompactOverlay.tsx`
  - `src/features/shortcuts/components/FolderShortcutSurface.tsx`
- 本轮结构性收益：
  - compact overlay 里的隐藏测量层和稳定展示层已拆成独立 memo 子树，不再和动画层绑定成一整个 render 面。
  - 隐藏测量层只在 `opening-measure / open / closing-measure` 阶段挂载，动画阶段不再额外挂着一套不可见 folder grid。
  - `FolderShortcutSurface` 的回调与渲染器引用已稳定下来，父级 overlay rerender 不再轻易带着内部 grid 一起重复提交。
  - 修正了测量层 scroll listener 的清理逻辑，避免阶段切换时残留事件监听。
- 自动化验证：
  - `npm run typecheck` 通过
  - `npm test` 通过
  - `PLAYWRIGHT_APP_URL='http://127.0.0.1:4173/' npm run profile:fluidity` 通过
  - 当前单测仍为 `10` 个测试文件、`35` 个测试用例
- 本轮 profiling 结果相对上一轮 baseline：
  - `folder-open`：
    - `ShortcutExperienceRoot`: `144` commits / `51.2ms` -> `118` commits / `49.2ms`
    - `HomeInteractiveSurface`: `74` commits / `21.3ms` -> `51` commits / `21.5ms`
    - `RootShortcutGrid`: `107` commits / `17.2ms` -> `56` commits / `14.9ms`
    - `FolderShortcutSurface`: `40` commits / `6.7ms` -> `10` commits / `6.6ms`
  - `settings-open` 与 `search-type` 未表现出同等稳定收益，因此不视为这轮的主要优化成果。
- 本轮未完成项：
  - 尚未把拖拽交互接入自动 profiling
  - 尚未执行手工文件夹开关与拖拽体感复核
  - 尚未开始搜索输入链路的局部订阅下放
- 下一阶段 focus 调整为：优先处理搜索输入导致的 `HomeInteractiveSurface` / `HomeMainContent` 整块跟随 rerender，暂不进入 Phase 4。
