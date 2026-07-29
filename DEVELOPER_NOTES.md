# Plugin Manager 开发说明文档

> 本文档面向后续接手的开发人员，说明项目架构、关键模块和注意事项。

---

## 1. 项目背景

Plugin Manager 是一个 Obsidian 插件，提供**插件列表管理、分组标签、延时启动、更新检查与安装**等功能。

本项目于 2026-07 从 [Watchtower](https://github.com/ssjy1919/Watchtower) 插件中拆分而来，作为独立插件运行。拆分后 Watchtower 仅保留文件监控功能，插件管理功能完全由本项目承担。

---

## 2. 项目结构

```
src/
├── main.ts                    # 插件入口（Plugin 子类）
├── types.ts                   # 类型定义 + 默认值
├── store.ts                   # Redux 状态管理（@reduxjs/toolkit）
├── constants.ts               # 调度器常量
├── types/
│   └── css.d.ts               # CSS 模块类型声明
├── views/                     # 视图层
│   ├── PluginManagerLeft.tsx   # ItemView 注册（侧边栏 leaf）
│   ├── PluginManagerView.tsx   # 主视图（插件列表表格）
│   ├── PluginManagerView.css
│   ├── GroupView.tsx           # 分组筛选栏 + 搜索框
│   ├── GroupView.css
│   ├── MakeTagsView.tsx        # 单插件标签管理
│   ├── MakeTagsView.css
│   ├── PluginCommentCell.tsx   # 备注单元格（支持 Markdown 渲染）
│   └── PMtools.ts             # 工具函数（视图激活、插件刷新、启用/禁用）
├── components/                # 通用 UI 组件
│   ├── Switch.tsx              # 开关组件
│   └── Switch.css
├── services/                  # 服务层
│   ├── pluginFetcher.ts        # 从 GitHub API 获取插件版本信息
│   ├── pluginInstaller.ts      # 从 GitHub Release 下载并安装插件
│   └── taskScheduler.ts        # 定时任务调度器（检查更新）
├── scheduler/
│   └── index.ts               # 调度器模块导出
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
  1. 调用 `loadSettings()` 从 data.json 加载设置
  2. 将设置同步到 Redux store
  3. 注册更新检查/安装命令
  4. 在 `onLayoutReady` 中：刷新所有插件信息、初始化定时调度器
  5. 注册视图（`PluginManagerLeft`）、命令、ribbon 图标
  6. 处理延时启动的插件（通过 `setTimeout` 延迟启用）
  7. 挂载设置页面
- `onunload()` → 清理视图、销毁调度器

**注意：** `settings` 和 `taskScheduler` 使用 `!` 断言，在 `onload()` 中异步初始化。

### 3.2 types.ts — 类型定义

| 类型 | 用途 |
|------|------|
| `PluginManager` | 单个插件的完整信息（id、名称、启用状态、备注、延时启动、标签等 15 个字段） |
| `SortField` | 排序配置（排序字段 + 升降序） |
| `IScheduledTask` | 定时任务定义（id、关联插件、类型、间隔、是否启用） |
| `ISchedulerConfig` | 调度器全局配置 |
| `PluginManagerSettings` | 插件设置（存储在 data.json） |

**PluginManagerSettings 字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `pluginManager` | `PluginManager[]` | 所有已安装插件的状态列表 |
| `secondPluginManager` | `PluginManager[]` | 配置备份（用于恢复） |
| `sortField` | `SortField` | 当前排序配置 |
| `pluginGroups` | `string[]` | 用户自定义的分组名称 |
| `showPluginGroups` | `string` | 当前选中的分组过滤 |
| `showPluginInitial` | `string` | 当前选中的首字母过滤 |
| `pluginSettingNewWindow` | `boolean` | 是否在新窗口打开管理页面 |
| `enableScheduler` | `boolean` | 是否启用定时更新检查 |
| `scheduledTasks` | `IScheduledTask[]` | 定时任务列表 |

### 3.3 store.ts — Redux 状态管理

使用 `@reduxjs/toolkit`，只有一个 slice：

**`settings` slice**（初始值 = `DEFAULT_SETTINGS`）：

| Reducer | 作用 |
|---------|------|
| `updataSettings` | 浅合并更新整个设置对象 |
| `updataPluginManager` | 仅更新 `pluginManager` 数组 |
| `updataPluginGroups` | 仅更新 `pluginGroups` 数组 |

**注意：** `updataSettings` 是浅合并（`{ ...state, ...action.payload }`），顶层字段直接覆盖。

### 3.4 views/ — 视图层

| 文件 | 职责 |
|------|------|
| `PluginManagerLeft.tsx` | Obsidian `ItemView` 子类，注册视图类型 `plugin-manager-left-view`，图标 `blocks` |
| `PluginManagerView.tsx` | **核心视图**，以表格展示所有插件。包含：排序、过滤、搜索、启用/禁用切换、延时启动设置、备注编辑、配置备份/恢复 |
| `GroupView.tsx` | 顶部分组筛选栏 + 搜索框 + 分组管理（添加/删除分组） |
| `MakeTagsView.tsx` | 单个插件的标签管理（添加/删除标签、按标签筛选） |
| `PluginCommentCell.tsx` | 备注单元格，非编辑态使用 `MarkdownRenderer` 渲染，支持 Obsidian 内部链接 |
| `PMtools.ts` | 工具函数集合（见下方详解） |

### 3.5 PMtools.ts — 工具函数

| 函数 | 作用 |
|------|------|
| `activateMiddleView(plugin)` | 在中间区域打开插件管理视图（支持新窗口/分屏） |
| `getAllPlugins(plugin)` | 扫描所有已安装插件，合并 store 中的自定义数据（备注、标签、延时启动），更新 Redux |
| `disablePlugin(pluginId)` | 通过 Obsidian API 禁用并保存插件 |
| `enablePlugin(pluginId)` | 通过 Obsidian API 启用并保存插件 |
| `openPluginSettings(iplugin, plugin)` | 打开指定插件的设置页面 |
| `getSwitchTimeByPluginId(pluginId)` | 从 store 中查询插件的最后更改时间 |

### 3.6 services/ — 服务层

| 文件 | 职责 |
|------|------|
| `pluginFetcher.ts` | 通过 GitHub API 获取插件最新版本。`getLatestVersion(id)` 查询 `/repos/{id}/releases/latest`；`getReleaseInfo(url)` 获取完整 Release 信息包括下载链接 |
| `pluginInstaller.ts` | 从 GitHub Release 下载 main.js 并安装到插件目录。自动调用 `loadManifests()` 和 `enablePluginAndSave()` |
| `taskScheduler.ts` | 定时任务调度器。基于 `window.setInterval` 实现，支持添加/删除/更新任务，任务类型包括 `check`（检查更新）和 `update`（自动更新） |


---

## 4. 数据流

```md

Obsidian app.plugins.manifests
        │
        ▼
  PMtools.getAllPlugins()
        │
        ▼
  Redux store.settings
  ┌──────────────────────────┐
  │ pluginManager[]          │ ◄── 所有插件状态
  │ pluginGroups[]           │ ◄── 分组标签
  │ sortField                │ ◄── 排序配置
  │ showPluginGroups/Initial │ ◄── 当前过滤条件
  │ secondPluginManager[]    │ ◄── 配置备份
  └──────────────────────────┘
        │
        ▼
  PluginManagerView / GroupView / MakeTagsView（UI 渲染）
        │
        │ 用户操作
        ▼
  dispatch + plugin.saveData() ──▶ data.json 持久化
```

**数据持久化：** 只有 `data.json`（通过 Obsidian 内置的 `loadData()`/`saveData()`），没有额外的自定义 JSON 文件。

---

## 5. 延时启动机制

延时启动是本插件的核心功能之一。实现方式：

1. 用户在 UI 中为插件设置 `delayStart`（秒数）
2. 设置立即保存到 data.json
3. 在 `onload()` 的 `onLayoutReady` 回调中，遍历所有设置了延时的插件
4. 通过 `setTimeout(fn, delayStart * 1000)` 延迟调用 `app.plugins.enablePlugin(id)`
5. 移动端自动跳过 `isDesktopOnly` 的插件

**注意：** 延时启动依赖 `setTimeout`，Obsidian 不会等待这些定时器。如果用户在延时期间手动操作了插件状态，行为可能不一致。

---

## 6. 命令列表

| 命令 ID | 名称 | 功能 |
|---------|------|------|
| `pluginManagerCenterLeafView` | 打开插件管理视图 | 在中间区域打开管理页面 |
| `check-updates` | 检查所有插件更新 | 通过 GitHub API 对比版本，显示 Notification |
| `update-plugin` | 更新指定插件 | 检查并安装所有可更新的插件 |
| `batch-update` | 批量更新所有可更新插件 | 同上，带进度提示 |

---

## 7. 构建与开发

```bash
# 安装依赖
npm install

# 开发模式（监听变化自动编译）
npm run dev

# 生产构建（类型检查 + 编译 + 压缩）
npm run build
```

**构建工具链：**
- **TypeScript** 4.7.4 — 类型检查（`tsc -noEmit -skipLibCheck`）
- **esbuild** 0.17.3 — JS 打包（src/main.ts → main.js）+ CSS 打包（main.css → styles.css）
- **React 19** + **react-dom/client** — UI 渲染

**CSS 构建：** `main.css` 通过 `@import` 引用各组件的 CSS 文件，esbuild 打包为 `styles.css`。

---

## 8. 注意事项

### 8.1 全局 app 对象

大量代码通过 `@ts-ignore` 访问全局 `app` 对象来操作插件系统：
- `app.plugins.manifests` — 所有已安装插件的 manifest
- `app.plugins.plugins` — 当前已加载的插件实例
- `app.plugins.enablePlugin(id)` / `disablePluginAndSave(id)` — 启用/禁用插件
- `app.plugins.installPlugin()` — 安装插件
- `app.setting.openTabById(id)` — 打开插件设置页面
- `app.isMobile` — 判断是否为移动端

这些 API 不在 Obsidian 的公开类型声明中，因此需要 `@ts-ignore`。Obsidian 版本更新可能导致 API 变更。

### 8.2 GitHub API 限制

`PluginFetcher` 使用 GitHub REST API（`api.github.com/repos/{owner}/{repo}/releases/latest`）。未认证的请求有 **60 次/小时** 的速率限制。批量检查大量插件时可能触发限流。

### 8.3 视图打开方式

`activateMiddleView` 支持三种打开方式：
1. **已有视图** — 直接激活已打开的 leaf
2. **新窗口** — `workspace.getLeaf("window")`（仅桌面端，由 `pluginSettingNewWindow` 控制）
3. **分屏** — `workspace.getLeaf("split", "vertical")`（默认方式）

### 8.4 配置备份与恢复

UI 中的"保存"按钮将当前 `pluginManager` 数组复制到 `secondPluginManager`。"恢复"按钮将 `secondPluginManager` 的状态应用回所有插件（包括启用/禁用操作）。恢复操作会逐个调用 `enablePlugin`/`disablePlugin`，对于有延时启动的插件会走不同的启用路径。

### 8.5 自身保护

视图中的开关和延时启动输入框对 `obsidian-plugin-manager`（本插件自身）做了特殊处理，显示为 `⚪` 和 `0`，防止用户禁用自己的管理插件。

### 8.6 数据迁移

本项目从 Watchtower 拆分而来。如果用户之前使用 Watchtower 的插件管理功能，其数据存储在 Watchtower 的 data.json 中。切换到本插件后，需要使用默认设置重新开始，旧数据不会自动迁移。

---

## 9. 已知技术债

1. **拼写不一致** — `updataSettings` 应为 `updateSettings`，修改时需全局搜索替换
2. **PluginManager 命名冲突** — 类型名 `PluginManager`（接口，描述单个插件）与插件名 `PluginManagerPlugin` 容易混淆，建议将接口重命名为 `PluginInfo` 或 `InstalledPlugin`
3. **getAllPlugins 的 plugin 参数** — 原项目中 `getAllPlugins()` 无参数（通过全局 store 访问），拆分后改为接收 `plugin` 参数，但函数签名变更可能导致遗漏
4. **延时启动的 setTimeout** — 没有取消机制。如果插件在延时期间被 unload，定时器仍会执行
5. **CSS 重复** — `Switch.css` 和 `PluginManagerView.css` 中都定义了开关按钮样式，存在重复定义
6. **缺少错误处理** — `PluginFetcher` 和 `PluginInstaller` 的网络请求错误处理较简单，仅 `console.error` + 返回 `null`/`false`
