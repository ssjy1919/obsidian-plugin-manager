# Plugin Manager 开发说明文档

> 本文档面向后续接手的开发人员，说明项目架构、当前实现和注意事项。

---

## 1. 项目背景

Plugin Manager 是一个 Obsidian 插件，用于管理本地已安装插件的启用状态、分组标签、延时启动、设备类型规则和备注。

当前实现侧重于本地插件列表管理与 Obsidian 插件启用/禁用控制。

---

## 2. 项目结构

```
src/
├── main.ts                    # 插件入口
├── types.ts                   # 类型定义 + 默认设置
├── store.ts                   # Redux 状态管理（@reduxjs/toolkit）
├── constants.ts               # 常量定义
├── types/
│   └── css.d.ts               # CSS 模块类型声明
├── views/                     # 视图层
│   ├── PluginManagerLeft.tsx   # ItemView 注册
│   ├── PluginManagerView.tsx   # 主视图（插件列表表格）
│   ├── PluginManagerView.css
│   ├── GroupView.tsx           # 分组筛选栏 + 搜索框
│   ├── GroupView.css
│   ├── MakeTagsView.tsx        # 插件标签管理
│   ├── MakeTagsView.css
│   ├── PluginCommentCell.tsx   # 备注单元格
│   └── PMtools.ts              # 工具函数（插件刷新、启停、设备规则）
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
| `PluginManager` | 单个插件信息，包括 id、名称、启用状态、延时启动、备注、标签、设备规则等 |
| `SortField` | 排序字段与顺序 |
| `PluginManagerSettings` | 插件持久化设置 |

**`PluginManagerSettings` 字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `pluginManager` | `PluginManager[]` | 当前插件管理页面的数据 |
| `secondPluginManager` | `PluginManager[]` | 备份配置，用于恢复插件状态 |
| `sortField` | `SortField` | 当前排序字段与顺序 |
| `pluginGroups` | `string[]` | 用户自定义分组标签 |
| `showPluginGroups` | `string` | 当前选中的分组过滤条件 |
| `showPluginInitial` | `string` | 当前选中的首字母过滤条件 |
| `pluginSettingNewWindow` | `boolean` | 是否在新窗口打开插件设置页面 |

### 3.3 store.ts — Redux 状态管理

使用 `@reduxjs/toolkit`，只有一个 slice：

**`settings` slice**：
- `updataSettings`：浅合并更新设置对象
- `updataPluginManager`：更新 `pluginManager` 数组
- `updataPluginGroups`：更新 `pluginGroups` 数组

**注意：** `updataSettings` 为浅合并，只有顶层字段会被覆盖。

### 3.4 views/ — 视图层

| 文件 | 职责 |
|------|------|
| `PluginManagerLeft.tsx` | 注册 `ItemView`，定义视图类型 `plugin-manager-left-view` |
| `PluginManagerView.tsx` | 主视图，展示插件列表，并提供筛选、排序、搜索、设备规则、延时启动、备注、保存/恢复功能 |
| `GroupView.tsx` | 分组筛选与搜索框，支持新增/删除分组 |
| `MakeTagsView.tsx` | 插件标签增删与展示 |
| `PluginCommentCell.tsx` | 备注单元格，支持 Markdown 渲染与编辑 |
| `PMtools.ts` | 插件状态刷新、启用/禁用控制、设备规则、视图激活等工具函数 |

### 3.5 PMtools.ts — 工具函数

| 函数 | 作用 |
|------|------|
| `activateMiddleView(plugin)` | 在中间区域或新窗口打开插件管理页面 |
| `getAllPlugins(plugin)` | 读取 Obsidian 插件清单并合并本地自定义数据 |
| `disablePlugin(pluginId)` | 持久化禁用插件 |
| `enablePlugin(pluginId)` | 持久化启用插件 |
| `tempEnablePlugin(pluginId)` | 临时启用插件（不持久化） |
| `tempDisablePlugin(pluginId)` | 临时禁用插件（不持久化） |
| `openPluginSettings(iplugin, plugin)` | 打开指定插件的设置页 |
| `getSwitchTimeByPluginId(pluginId)` | 查询插件最后修改时间 |
| `getDeviceType()` | 检测当前设备类型（phone/tablet/desktop） |
| `shouldPluginRun(plugin, currentDeviceType)` | 判断当前设备是否允许插件运行 |
| `applyDeviceRules(plugin)` | 启动时应用设备规则，处理临时启用/禁用与延时启动 |

### 3.6 settingTab.tsx — 插件设置页面

`PluginManagerSettingTab` 使用 React 渲染，当前仅提供：
- `pluginSettingNewWindow`：桌面端是否在新窗口打开管理页面

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
  │ pluginGroups[]           │ ◄── 分组标签
  │ sortField                │ ◄── 排序配置
  │ showPluginGroups/Initial │ ◄── 过滤条件
  │ pluginSettingNewWindow   │ ◄── 新窗口选项
  └──────────────────────────┘
        │
        ▼
  PluginManagerView / GroupView / MakeTagsView
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

**注意：** 设备规则与延时启动主要影响当前会话的临时运行状态，不一定改变插件重启后的持久化状态。

---

## 6. 命令列表

| 命令 ID | 名称 | 功能 |
|---------|------|------|
| `pluginManagerCenterLeafView` | 打开插件管理视图 | 在中间区域或新窗口打开管理页面 |

---

## 7. 构建与开发

```bash
npm install
npm run dev
npm run build
```

`npm run dev` 会运行 `node esbuild.config.mjs`，监听 `src/main.ts` 并输出 `main.js` 和 `styles.css`。

`npm run build` 会先执行 `tsc -noEmit -skipLibCheck`，再执行 `node esbuild.config.mjs production`。

---

## 8. 注意事项

- 当前代码不包含更新检查、GitHub Release 安装或定时调度相关模块
- `PluginManagerSettings` 中未定义调度任务字段
- `applyDeviceRules()` 会跳过移动端不支持的 `isDesktopOnly` 插件
- `PluginManagerView` 中的“保存/恢复”按钮依赖 `secondPluginManager` 备份配置
