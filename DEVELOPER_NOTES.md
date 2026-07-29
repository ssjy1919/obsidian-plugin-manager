# Plugin Manager 开发说明文档

> 本文档面向后续接手的开发人员，说明项目架构、当前实现和注意事项。

---

## 1. 项目背景

Plugin Manager 是一个 Obsidian 插件，用于管理本地已安装插件的启用状态、设备类型规则、延时启动和备注。

当前实现侧重于本地插件列表管理与 Obsidian 插件启用/禁用控制。不包含更新检查、批量更新或定时调度模块。

---

## 2. 项目结构

```
src/
├── main.ts                    # 插件入口
├── types.ts                   # 类型定义 + 默认设置
├── store.ts                   # Redux 状态管理（@reduxjs/toolkit）
├── types/
│   └── css.d.ts               # CSS 模块类型声明
├── views/                     # 视图层
│   ├── PluginManagerLeft.tsx   # ItemView 注册
│   ├── PluginManagerView.tsx   # 主视图（插件列表表格）
│   ├── PluginManagerView.css
│   ├── GroupView.tsx           # 搜索框（仅搜索，无标签管理）
│   ├── GroupView.css
│   ├── PluginCommentCell.tsx   # 备注单元格（Markdown 渲染 + 编辑）
│   └── PMtools.ts              # 工具函数（插件刷新、启停、设备类型检测）
├── components/                # 通用 UI 组件
│   ├── Switch.tsx              # 开关组件
│   └── Switch.css
└── setting/                   # 插件设置页面
    ├── settingTab.tsx          # PluginSettingTab（React 渲染）
    └── settingTab.css
```

---

## 3. 核心模块说明

### 3.1 main.ts — 插件入口

`PluginManagerPlugin extends Plugin` 是 Obsidian 插件的标准入口。

**生命周期：**
- `onload()`:
  1. 调用 `loadSettings()` 从 `data.json` 加载设置
  2. 注册视图、命令、ribbon 图标
  3. 在 `onLayoutReady` 中：将设置同步到 Redux；调用 `applyDeviceRules()`；刷新插件信息 `getAllPlugins()`
  4. 挂载设置页面
- `onunload()`：清理视图

### 3.2 types.ts — 类型定义

| 类型 | 用途 |
|------|------|
| `DeviceType` | `"phone" \| "tablet" \| "desktop"` |
| `PluginManager` | 单个插件信息，包括 id、名称、启用状态、延时启动、备注、`disabledDeviceTypes` 等 |
| `SortField` | 排序字段与顺序 |
| `PluginManagerSettings` | 插件持久化设置 |

**`PluginManagerSettings` 字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `pluginManager` | `PluginManager[]` | 当前插件管理页面的数据 |
| `secondPluginManager` | `PluginManager[]` | 备份配置，用于恢复插件状态 |
| `sortField` | `SortField` | 当前排序字段与顺序 |
| `pluginSettingNewWindow` | `boolean` | 是否在新窗口打开插件设置页面 |

> 原有的 `pluginGroups`、`showPluginGroups`、`showPluginInitial`、`currentDevice`、`knownDevices` 字段已随标签功能和设备 ID 系统一并移除。

### 3.3 store.ts — Redux 状态管理

使用 `@reduxjs/toolkit`，只有一个 slice：

**`settings` slice**：
- `updataSettings`：浅合并更新设置对象
- `updataPluginManager`：更新 `pluginManager` 数组
- `updataPluginGroups`：更新 `pluginGroups` 数组（保留但当前未使用）

**注意：** `updataSettings` 为浅合并，只有顶层字段会被覆盖。

### 3.4 views/ — 视图层

| 文件 | 职责 |
|------|------|
| `PluginManagerLeft.tsx` | 注册 `ItemView`，定义视图类型 `plugin-manager-left-view` |
| `PluginManagerView.tsx` | 主视图，展示插件列表，并提供搜索、排序、设备类型规则、延时启动、备注、保存/恢复功能 |
| `GroupView.tsx` | 仅搜索框，按插件名称或备注内容过滤 |
| `PluginCommentCell.tsx` | 备注单元格，使用 Obsidian `MarkdownRenderer` 渲染，点击进入编辑模式 |
| `PMtools.ts` | 插件状态刷新、启用/禁用控制、设备类型检测、视图激活等工具函数 |

### 3.5 PMtools.ts — 工具函数

| 函数 | 作用 |
|------|------|
| `activateMiddleView(plugin)` | 在中间区域或新窗口打开插件管理页面 |
| `getAllPlugins(plugin)` | 读取 Obsidian 插件清单并合并本地数据（保留已存储的 `disabledDeviceTypes`，新插件从启用状态推导） |
| `disablePlugin(pluginId)` | 持久化禁用插件（`disablePluginAndSave`） |
| `enablePlugin(pluginId)` | 持久化启用插件（`enablePluginAndSave`） |
| `tempEnablePlugin(pluginId)` | 临时启用插件（不持久化，重启后恢复） |
| `tempDisablePlugin(pluginId)` | 临时禁用插件（不持久化，重启后恢复） |
| `openPluginSettings(iplugin, plugin)` | 打开指定插件的设置页 |
| `getSwitchTimeByPluginId(pluginId)` | 查询插件最后修改时间 |
| `getDeviceType()` | 检测当前设备类型（phone/tablet/desktop），优先使用 `navigator.userAgentData.mobile` |
| `shouldPluginRun(plugin, currentDeviceType)` | 判断当前设备类型是否在禁用列表中 |
| `applyDeviceRules(plugin)` | 启动时应用设备规则，处理临时启用/禁用与延时启动 |

### 3.6 settingTab.tsx — 插件设置页面

`PluginManagerSettingTab` 使用 React 渲染，当前仅提供：
- `pluginSettingNewWindow`：桌面端是否在新窗口打开管理页面

### 3.7 PluginCommentCell.tsx — 备注单元格

- 非编辑模式：使用 Obsidian `MarkdownRenderer.render()` 渲染备注内容
- 点击非链接区域进入编辑模式（textarea）
- 内部链接（`a.internal-link`）：拦截点击，使用 `workspace.openLinkText` 打开
- `useEffect` 依赖 `[editing, value, placeholder, plugin]`（不含 `Iplugin` 以避免频繁重渲染）

---

## 4. 数据流

```text
Obsidian app.plugins.manifests
        │
        ▼
  PMtools.getAllPlugins()
        │
        ▼
  Redux store.settings
  ┌──────────────────────────┐
  │ pluginManager[]          │ ◄── 插件列表数据
  │ secondPluginManager[]    │ ◄── 备份配置
  │ sortField                │ ◄── 排序配置
  │ pluginSettingNewWindow   │ ◄── 新窗口选项
  └──────────────────────────┘
        │
        ▼
  PluginManagerView / GroupView / PluginCommentCell
        │
        ▼
  dispatch + plugin.saveData() → data.json 持久化
```

**数据持久化：** 只有 `data.json`，使用 Obsidian 内置 `loadData()` / `saveData()`。

---

## 5. 设备类型与延时启动

当前实现区分持久化启用状态与临时运行状态：
- `disablePlugin` / `enablePlugin`：持久化更改插件开启状态
- `tempDisablePlugin` / `tempEnablePlugin`：临时更改当前会话中的插件状态

`applyDeviceRules()` 启动时会根据当前设备类型决定是否临时禁用或启用插件。

`delayStart` 表示插件在可运行设备上启动的延迟秒数，若大于 0，则会通过 `setTimeout(..., delayStart * 1000)` 延迟启动。

### 5.1 `disabledDeviceTypes` 语义

`disabledDeviceTypes` 是**禁用列表**（deny-list）：
- `[]` → 所有设备类型均启用
- `["phone"]` → 仅手机端禁用，平板和电脑启用
- `["phone", "tablet", "desktop"]` → 所有设备类型均禁用

### 5.2 视觉状态

设备类型图标的视觉状态由 CSS class `checked` 控制：
- **无 `checked` class**（亮边框）→ 该设备类型**启用**（不在 `disabledDeviceTypes` 中）
- **有 `checked` class**（透明边框 + 30% 透明度）→ 该设备类型**禁用**（在 `disabledDeviceTypes` 中）

### 5.3 `getAllPlugins` 对 `disabledDeviceTypes` 的处理

`getAllPlugins` 在刷新插件列表时：
- **已存在的插件**：保留 store 中的 `disabledDeviceTypes`，不从 Obsidian 启用状态重新推导
- **新发现的插件**：根据 `isEnabled` 推导——已启用→`[]`，未启用→`["phone", "tablet", "desktop"]`

### 5.4 `getDeviceType()` 检测策略

设备类型检测优先级：
1. `navigator.userAgentData?.mobile`（Chrome DevTools 模拟时可靠）
2. `navigator.userAgent` 正则匹配（iPhone/iPod/iPad/Android）
3. `navigator.maxTouchPoints > 1`（区分 iPadOS 13+ 和 Mac 触控板）

### 5.5 `applyDeviceRules()` 策略

| 情况 | 持久化状态 | 启动时操作 |
|------|-----------|-----------|
| 当前设备类型被禁用 | 已持久化禁用 | `tempDisablePlugin` |
| 部分禁用，当前设备允许 | 已持久化禁用 | `tempEnablePlugin`（临时启用） |
| 全部启用 | 已持久化启用 | 仅处理延时启动 |

---

## 6. 备注与链接

备注单元格（`PluginCommentCell`）使用 Markdown 渲染。每个插件的备注占位符末尾自动附加一个链接：

| 插件 ID | 链接文字 | 链接地址 |
|---------|---------|---------|
| `obsidian-plugin-manager` | 仓库主页 | `https://github.com/ssjy1919/obsidian-plugin-manager/tree/main` |
| 其他插件 | 社区主页 | `obsidian://show-plugin?id={插件ID}` |

- `obsidian://show-plugin` 是 Obsidian 原生协议，点击后直接在应用内打开社区插件市场对应页面
- 进入编辑模式时，若备注为空，自动将描述+链接预填到 textarea 中供用户编辑

---

## 7. UI 布局

### 7.1 首字母索引（`.grouping`）

左侧 ABCD 首字母索引使用 `position: absolute` 相对于 `.workspace-leaf-content[data-type="plugin-manager-left-view"]` 定位，垂直居中靠左。不随表格滚动。

### 7.2 表格

表头和搜索栏（`.pluginManager-table-header`、`thead`）使用正常文档流，跟随表格滚动。

---

## 8. 命令列表

| 命令 ID | 名称 | 功能 |
|---------|------|------|
| `pluginManagerCenterLeafView` | 打开插件管理视图 | 在中间区域或新窗口打开管理页面 |

---

## 9. 构建与开发

```bash
npm install
npm run dev
npm run build
```

`npm run dev` 会运行 `node esbuild.config.mjs`，监听 `src/main.ts` 并输出 `main.js` 和 `styles.css`。

`npm run build` 会先执行 `tsc -noEmit -skipLibCheck`，再执行 `node esbuild.config.mjs production`。

---

## 10. 注意事项

- `applyDeviceRules()` 会跳过移动端不支持的 `isDesktopOnly` 插件
- `PluginManagerView` 中的"保存/恢复"按钮依赖 `secondPluginManager` 备份配置
- `handleChange`（主开关切换）会将 `disabledDeviceTypes` 重置为 `[]`（开）或全部禁用（关）
- `handleDeviceTypeToggle` 在部分禁用模式下采用"先持久化禁用，再临时启用"的策略
- 原有的设备 ID 系统（`DeviceInfo`、`currentDevice`、`knownDevices`、`deviceRules`）已全部移除，替换为基于 `DeviceType` 的设备类型控制
- 原有的标签功能（`MakeTagsView`、`constants.ts`）已删除
