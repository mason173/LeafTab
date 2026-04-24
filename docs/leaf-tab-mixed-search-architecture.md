# LeafTab 混合搜索架构设计

日期：2026-04-24

## 1. 文档目标

这份文档不是产品愿景文档，也不是某一轮性能 review。

它要解决的是：

- LeafTab 的混合搜索应该如何分层设计
- 哪些职责应该放在哪一层
- 数据流应该怎么走，才能方便后续继续增强
- 第一版应该先做什么，避免把搜索系统做成一团逻辑

这份文档的核心判断是：

`混合搜索不是一个 suggestions hook 的增强版，而是一套小型搜索平台能力。`

所以它必须从一开始就有清晰的架构边界。

## 2. 架构目标

LeafTab 的混合搜索设计，需要同时满足 4 个目标。

### 2.1 搜得准

混合搜索不是简单把多个 source 扔到一个列表里，而是要让结果符合用户当下意图。

### 2.2 搜得快

搜索天然在输入热路径上，所以架构必须天然考虑：

- 并行 source
- worker 边界
- 索引生命周期
- 渲染隔离

### 2.3 能继续扩

后面一定会继续加：

- settings search
- 结果直接操作
- 个性化排序
- 工作流命令
- 自然语言 intent

如果架构一开始没分层，后面每加一个能力都会让系统更难维护。

### 2.4 能解释

混合搜索如果做完以后，连开发者都说不清：

- 为什么这个结果排前面
- 为什么另一个 source 没进前几名

那后续基本没法稳定迭代。

所以架构必须允许保留一定的排序解释能力。

## 3. 核心设计原则

### 3.1 Query 理解和结果融合分开

输入字符串不应该直接驱动所有搜索逻辑。

必须先把输入解析成统一的 query model，再交给 source 召回和融合层使用。

### 3.2 每个 source 独立召回

不同 source 的“好结果”标准不同：

- tab 更看当前窗口和最近激活
- bookmark 更看标题和稳定收藏关系
- history 更看最近访问和频次
- command 更看关键词和别名

所以 source 不应该一开始就被强行揉成同一种记录逻辑。

### 3.3 融合层只负责“混”，不负责“取”

source 召回层负责各自取候选项；
fusion 层负责：

- 判断当前意图
- 控制 source 配额
- 做多样性控制
- 做最终排序与截断

### 3.4 Action 层从一开始预留

LeafTab 搜索不应该只服务“打开”，后面还会服务：

- 关闭 tab
- pin tab
- 删除 bookmark
- 编辑 shortcut
- 修改 setting

所以统一结果模型必须预留 action 能力，而不是只存 label/value。

### 3.5 Render 层不参与排序决策

UI 层负责展示和交互，不负责决定：

- 哪个 source 优先
- 哪个结果排第 1
- 哪个意图被激活

否则每次调排序都要动 UI 组件，系统会很快失控。

## 4. 总体分层

建议把混合搜索拆成下面 5 层：

### 4.1 Query Model 层

职责：

- 解析原始输入
- 识别 command / filter / scope
- 判断 query intent
- 输出稳定的 query model

输出示意：

- `rawValue`
- `normalizedQuery`
- `mode`
- `intent`
- `sourceFilter`
- `isEmpty`
- `isCommandMode`

### 4.2 Source Retrieval 层

职责：

- 逐个 source 拉取候选结果
- 处理 source 自己的数据准备与缓存
- 输出 source-local top candidates

当前已有 source：

- tabs
- bookmarks
- browser history
- local history
- shortcuts
- builtin site shortcuts
- remote suggestions

后续可扩展 source：

- commands
- settings
- recent sessions
- workflow actions

### 4.3 Fusion Engine 层

职责：

- 接收多个 source 的候选结果
- 根据 query intent 决定 source 优先级和配额
- 做多样性控制
- 做统一截断
- 产出最终混排列表

这一层是混合搜索的核心。

### 4.4 Action Model 层

职责：

- 为统一结果附加动作语义
- 定义 primary action / secondary actions
- 管理权限要求与执行类型

例如：

- tab：focus / close / pin / copy link
- bookmark：open / delete / copy link
- shortcut：open / edit / remove

### 4.5 Render / Interaction 层

职责：

- 输入框
- suggestions panel
- 键盘导航
- hover / selected 状态
- action affordance

不负责：

- query intent 判断
- source 召回规则
- 融合排序规则

## 5. 数据流

推荐的数据流如下：

`Search Input`

-> `Search Session Model`

-> `Mixed Search Query Model`

-> `Source Retrieval`

-> `Fusion Engine`

-> `Action Model`

-> `Search Render`

也就是：

`Input -> Query Model -> Source Candidates -> Mixed Results -> Actions -> UI`

这个链条的好处是：

- 每一层都能单测
- 每一层都能单独优化
- 后续加 source 不会直接污染 UI 层

## 6. Query Model 设计

混合搜索不能只依赖“字符串命中”，必须先识别这次 query 更像哪种意图。

### 6.1 建议的 intent 分类

第一版建议至少有这些 intent：

- `empty`
  - 空输入恢复态
- `navigate`
  - 更像要切换或打开已有对象
- `command`
  - 更像命令、设置或动作入口
- `scoped-tabs`
  - `/tabs`
- `scoped-bookmarks`
  - `/bookmarks`
- `scoped-history`
  - `/history`
- `search`
  - 普通网页搜索兜底

### 6.2 第一版 intent 判断策略

第一版不要上复杂模型，先做规则判断：

- 没输入：`empty`
- slash command 激活：对应 scoped intent
- query 命中命令别名：`command`
- 短 query + 品牌/域名感强：`navigate`
- 其余默认：`search`

### 6.3 Query Model 的意义

Query Model 一旦稳定，后面再加：

- settings search
- workflow command
- 自然语言 intent

就不需要重写 fusion 层和 UI 层。

## 7. Source Contract 设计

每个 source 都应该通过统一 contract 向 fusion 层交付结果。

建议统一结构至少包含：

- `sourceId`
- `items`
- `status`
- `availability`
- `query`
- `meta`

其中每个候选项建议至少包含：

- `item`
- `sourceId`
- `sourceRank`
- `matchKind`
- `scoreHint`
- `reasons`

### 7.1 为什么不能直接丢 SearchSuggestionItem[]

因为 fusion 层后面不仅要知道“是什么 item”，还要知道：

- 它来自哪个 source
- 它在本 source 内排第几
- 它为什么进入候选
- 它是不是强命中

如果没有这些信息，混排会越来越难调。

## 8. Fusion Engine 设计

### 8.1 第一版不要直接拼原始分数

不同 source 的原始分数不适合直接比较。

例如：

- tab source 的分数分布
- bookmark source 的分数分布
- history source 的分数分布

它们并不天然处于同一个标尺上。

第一版更稳的做法是：

- source 内先排好自己的顺序
- fusion 层按 intent 做 source 优先级
- 再做 rank-based merge
- 最后加少量强规则修正

### 8.2 第一版推荐的融合策略

按 intent 决定 source plan。

例如：

#### `empty`

优先：

- local history
- browser history
- recent shortcuts

#### `navigate`

优先：

- tabs
- shortcuts
- bookmarks
- browser history
- remote suggestions

#### `command`

优先：

- commands
- settings
- shortcuts

#### `search`

优先：

- shortcuts
- builtin site shortcuts
- local history
- browser history
- remote suggestions

### 8.3 多样性控制

混排搜索不应该被单一 source 淹没。

所以 fusion 层要支持：

- source 配额
- source 最大占比
- 某些 source 只能兜底，不抢前位

例如第一版可采用：

- remote suggestion 不抢前 3
- history 在默认态前 5 最多占 2
- tab 强命中时必须进入前 3

### 8.4 排序解释

fusion 层建议保留解释字段，至少供开发调试使用。

例如：

- `intent:navigate`
- `source:tabs`
- `matched:title-prefix`
- `boost:current-window`
- `fallback:remote`

## 9. Action Model 设计

搜索结果统一模型从第一版就要预留 action 空间。

### 9.1 当前最小要求

当前统一结果至少要能区分：

- primary action
- permission requirement
- open behavior
- stable id

### 9.2 后续动作扩展示例

#### Tab

- focus
- close
- pin
- copy link

#### Bookmark

- open
- delete
- copy link

#### Shortcut

- open
- edit
- remove

#### Setting

- toggle
- set value

如果这层不预留，后面做“结果直接操作”会非常痛苦。

## 10. 性能边界

混合搜索必须在架构层面考虑性能，而不是最后再补优化。

### 10.1 Source 召回要独立

每个 source 的缓存、节流、权限、索引准备都应该局部控制，不要绑在一个大 effect 上。

### 10.2 Fusion 层应该是纯计算

fusion 层最好是纯函数，输入统一候选，输出统一结果。

这样才能：

- 放到 worker
- 做 memo
- 做单测

### 10.3 索引生命周期要可控

例如 shortcut index：

- 不应在非搜索交互中频繁重建
- 不应在每次输入时重复传大对象

### 10.4 Render 边界要隔离

输入壳层、建议面板、action affordance 最好是分层渲染边界。

## 11. 第一版实施建议

### Phase 1：搭骨架，不改大行为

目标：

- 先把现有搜索逻辑迁到 query/source/fusion 的分层结构
- 行为尽量保持接近当前版本
- 为后续扩展混排和直接操作留出明确入口

建议做法：

- 新建 mixed search query model
- 新建 source contract
- 新建 fusion engine
- 让现有默认搜索先走 fusion engine，而不是直接在旧 suggestion engine 里硬编码顺序

### Phase 2：做统一混排 v1

目标：

- 让默认态真正具备统一混排能力

建议做法：

- 接入 tabs / bookmarks 到默认态混排
- 引入基础 source 配额与优先级
- 调整空输入态为恢复型入口

### Phase 3：接动作模型

目标：

- 让混排结果不只是“打开”

建议做法：

- 先做 tab direct actions
- 再做 bookmark direct actions

### Phase 4：再做个性化与工作流

目标：

- 在架构稳定后做用户感知最强的差异化增强

## 12. 当前代码落地建议

结合当前仓库状态，我建议第一阶段直接落在这些位置：

- `src/utils/searchSessionModel.ts`
  - 继续负责 session 解析
- 新增 `src/utils/mixedSearchQueryModel.ts`
  - 负责 intent 与 source plan
- 新增 `src/utils/mixedSearchContracts.ts`
  - 统一 source candidate 结构
- 新增 `src/utils/mixedSearchFusion.ts`
  - 负责多 source 融合
- `src/utils/searchSuggestionsComputation.ts`
  - 从“直接拼接 suggestion 列表”升级为“构造 source bundles -> 交给 fusion”

这样改的好处是：

- 不需要一口气推翻现有搜索
- 可以一层一层迁移
- 风险可控

## 13. 一句话结论

LeafTab 的混合搜索要做得好，关键不是“做更多 source”，而是：

`先把 Query Model、Source Retrieval、Fusion、Action、Render 这五层边界设计清楚。`

只有这样，LeafTab 才能在不牺牲流畅度的前提下，把搜索真正做成一个 Browser-native Raycast。 
