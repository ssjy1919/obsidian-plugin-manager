# Control Center 开发说明文档

> 本文档面向后续接手的开发人员，说明项目架构、当前实现和注意事项。

---

## 1. 项目背景

Control Center 是一个 Obsidian 插件，用于管理本地已安装插件的启用状态、设备类型规则、延时启动和备注。

当前实现侧重于本地插件列表管理与 Obsidian 插件启用/禁用控制，不包含更新检查、批量更新或定时调度模块。

---

## 2. 项目结构

```
src/
├── main.ts                    # 插件入口、设置加载与旧数据迁移
├── types.ts                   # 类型定义、默认设置、normalizePluginEntry
├── i18n.ts                    # 中英文翻译与 t() 工具函数
├── store.ts                   # Redux 状态管理（@reduxjs/toolkit）
├── types/
│   └── css.d.ts               # CSS 模块类型声明
├── views/
│   ├── PluginManagerLeft.tsx  # ItemView 注册
│   ├── PluginManagerView.tsx  # 主视图（插件列表表格）
│   ├── PluginManagerView.css
│   ├── GroupView.tsx          # 搜索框
│   ├── GroupView.css
│   ├── PluginCommentCell.tsx  # 备注单元格
│   └── PMtools.ts             # 插件刷新、启停、设备规则、延时定时器
├── components/
│   ├── Switch.tsx             # 开关组件
│   └── Switch.css
└── setting/
    ├── settingTab.tsx         # PluginSettingTab（React 渲染）
    └── settingTab.css
scripts/
└── check-release.mjs          # 发布一致性检查
version-bump.mjs               # 版本号同步脚本
```

---

## 3. 核心模块说明

### 3.1 main.ts — 插件入口

`PluginManagerPlugin extends Plugin` 是 Obsidian 插件的标准入口。

**生命周期：**
- `onload()`:
  1. 调用 `loadSettings()` 加载并迁移 `data.json`
  2. 注册视图、命令、ribbon 图标
  3. 在 `onLayoutReady` 中：将设置同步到 Redux；调用 `applyDeviceRules()`；调用 `await getAllPlugins(this, true)` 刷新并落盘插件列表
  4. 挂载设置页面
- `onunload()`:
  1. 调用 `clearAllDelayedStarts()` 清理延时定时器
  2. `detachLeavesOfType()` 关闭管理视图

`loadSettings()` 会删除已废弃的 `pluginGroups`、`showPluginGroups` 字段，并通过 `normalizePluginEntry()` 为旧数据补充 `startEnabled`。

### 3.2 types.ts — 类型定义

**`PluginManager` 关键字段：**

| 字段 | 说明 |
|------|------|
| `enabled` | 当前设备上的实际运行状态（显示用） |
| `startEnabled` | 用户是否希望启用该插件（全局意图，跨设备保存） |
| `disabledDeviceTypes` | 禁用列表（deny-list） |
| `delayStart` | 延时启动秒数 |
| `switchTime` | 最后更改时间 |
| `comment` | 用户备注 |

`normalizePluginEntry()` 用于兼容旧数据：
- `disabledDeviceTypes` 包含全部三种设备 → `startEnabled = false`
- 空列表 → `startEnabled = enabled`
- 部分禁用 → `startEnabled = true`

**`PluginManagerSettings` 字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `pluginManager` | `PluginManager[]` | 当前插件管理页面的数据 |
| `secondPluginManager` | `PluginManager[]` | 备份配置，用于恢复 |
| `sortField` | `SortField` | 当前排序字段与顺序 |
| `showPluginInitial` | `string` | 当前首字母筛选 |
| `pluginSettingNewWindow` | `boolean` | 是否在新窗口打开管理页面 |
| `language` | `Language` | 插件界面语言（`zh` / `en`） |
| `debugLogs` | `boolean` | 是否输出控制台日志，默认关闭 |

`Language = "zh" | "en"`，默认 `zh`。`loadSettings()` 会把未知值归一化为 `zh`。

### 3.3.2 logger.ts — 控制台日志

- `debugLog()` / `debugError()` 只有在 `settings.debugLogs` 为 `true` 时才输出
- 默认关闭，设置页的“控制台日志”开关可开启
- 所有 `console.log` / `console.error` 都应通过这两个函数输出

### 3.3.1 i18n.ts — 翻译层

- `translations`：`zh` / `en` 两套文案
- `t(language, key, params?)`：按当前语言取文案并替换 `{placeholder}`
- 所有用户可见文案都应通过 `t()`，不要直接写死中文字符串
- 设置页切换语言后会调用 `plugin.updateUILanguage()`，即时刷新命令名、ribbon 图标提示和已打开视图的标题

### 3.3 store.ts — Redux 状态管理

只有一个 `settings` slice：

- `updataSettings`：浅合并更新设置对象
- `updataPluginManager`：更新 `pluginManager` 数组

注意：`updataSettings` 是浅合并，只有顶层字段会被覆盖。

### 3.4 views/ — 视图层

| 文件 | 职责 |
|------|------|
| `PluginManagerLeft.tsx` | 注册 `ItemView`，定义视图类型 `plugin-manager-left-view` |
| `PluginManagerView.tsx` | 主视图：搜索、排序、设备规则、延时、备注、保存/恢复 |
| `GroupView.tsx` | 仅搜索框 |
| `PluginCommentCell.tsx` | Markdown 备注渲染与编辑 |
| `PMtools.ts` | 插件状态刷新、启停、设备检测、延时定时器 |

### 3.5 PMtools.ts — 工具函数

**内部类型封装：**

- `InternalApp` / `InternalPlugins`：为 Obsidian 未公开的 `app.plugins`、`app.setting`、`isMobile` 提供类型
- `getApp()`：带类型地访问全局 `app`
- `getUserAgentData()`：封装 `navigator.userAgentData`

**延时定时器：**

| 函数 | 作用 |
|------|------|
| `scheduleDelayedEnable(pluginId, delaySeconds, plugin)` | 安排延时临时启用，同一插件先取消旧定时器 |
| `clearDelayedStart(pluginId)` | 取消单个插件定时器 |
| `clearAllDelayedStarts()` | 取消全部定时器，插件卸载时调用 |

**插件状态函数：**

| 函数 | 作用 |
|------|------|
| `getAllPlugins(plugin, save = false)` | 读取 Obsidian 插件清单并合并本地数据；首次启动传 `true` 落盘 |
| `disablePlugin(pluginId)` | 持久化禁用（`disablePluginAndSave`） |
| `enablePlugin(pluginId)` | 持久化启用（`enablePluginAndSave`） |
| `tempEnablePlugin(pluginId)` | 当前会话启用，不持久化 |
| `tempDisablePlugin(pluginId)` | 当前会话禁用，不持久化 |
| `applyDeviceRules(plugin)` | 启动时应用设备规则与延时启动 |

### 3.6 settingTab.tsx — 插件设置页面

提供两个设置项：

- `language`：界面语言（中文 / English）
- `pluginSettingNewWindow`：桌面端是否在新窗口打开管理页面

### 3.7 PluginCommentCell.tsx — 备注单元格

- 非编辑模式：使用 Obsidian `MarkdownRenderer.render()` 渲染
- 点击非链接区域进入编辑模式
- 内部链接使用 `workspace.openLinkText` 打开

---

## 4. 数据流

```text
Obsidian app.plugins.manifests
        │
        ▼
  PMtools.getAllPlugins(plugin, save?)
        │
        ▼
  Redux store.settings
  ┌──────────────────────────┐
  │ pluginManager[]          │ ◄── 列表数据（enabled + startEnabled）
  │ secondPluginManager[]    │ ◄── 备份配置
  │ sortField                │ ◄── 排序配置
  │ pluginSettingNewWindow   │ ◄── 新窗口选项
  └──────────────────────────┘
        │
        ▼
  PluginManagerView / GroupView / PluginCommentCell
        │
        ▼
  dispatch + plugin.saveData() → data.json
```

启动时 `getAllPlugins(this, true)` 会直接保存，保证全新安装也有可用的 `data.json`。

---

## 5. 状态模型

### 5.1 `enabled` 与 `startEnabled`

- `enabled`：当前设备上是否实际运行，随设备类型和 Obsidian 实际状态变化
- `startEnabled`：用户是否希望启用该插件，作为跨设备持久化的意图

`applyDeviceRules()` 使用 `startEnabled` 判断是否应该临时启用或安排延时；`getAllPlugins()` 使用 `startEnabled` 保留意图，用 `enabled` 刷新显示状态。

### 5.2 `disabledDeviceTypes` 语义

`disabledDeviceTypes` 是禁用列表（deny-list）：

- `[]` → 所有设备类型均启用
- `["phone"]` → 仅手机端禁用
- `["phone", "tablet", "desktop"]` → 所有设备类型均禁用

### 5.3 旧数据迁移

`loadSettings()` 对 `pluginManager` 和 `secondPluginManager` 统一执行 `normalizePluginEntry()`，因此旧版 `data.json` 不需要手工补字段。

---

## 6. 延时启动

### 当前会话

给已启用插件设置延时时，会先 `disablePluginAndSave` 持久化禁用，再立即 `tempEnablePlugin` 恢复运行。当前会话不等待。

### 下次启动

`applyDeviceRules()` 在启动时读取 `delayStart > 0` 的插件：

1. 先持久化禁用，确保 Obsidian 不会提前加载
2. 通过 `scheduleDelayedEnable()` 在 N 秒后临时启用
3. 定时器触发后调用 `getAllPlugins()` 刷新列表

### 定时器管理

- 每个插件只保留一个定时器，重复设置会先取消旧定时器
- 切换开关、修改延时、切换设备规则时都会取消对应定时器
- 插件卸载时 `clearAllDelayedStarts()` 清理全部定时器

### 平台限制

Obsidian 在 `onLayoutReady` 之前就会加载持久化启用的插件。由本插件写入的配置可以保证下次启动不提前加载；如果用户在 Obsidian 原生设置里直接启用插件，Control Center 只能事后卸载再延时，无法做到真正的“启动前不加载”。

---

## 7. 设备类型规则

`getDeviceType()` 检测优先级：

1. `navigator.userAgentData?.mobile`
2. `navigator.userAgent` 正则匹配
3. `navigator.maxTouchPoints > 1`

`applyDeviceRules()` 策略：

| 情况 | 操作 |
|------|------|
| 当前设备类型被禁用 | `tempDisablePlugin`，并取消延时定时器 |
| 部分禁用且当前设备允许，`delayStart = 0` | `tempEnablePlugin` |
| 部分禁用且当前设备允许，`delayStart > 0` | 持久化禁用 + 延时临时启用 |
| 全部启用且 `delayStart > 0` | 持久化禁用 + 延时临时启用 |
| `startEnabled = false` | 不启用，并取消该插件延时定时器 |

---

## 8. 备注与链接

每个插件的备注占位符末尾自动附加一个链接：

| 插件 ID | 链接文字 | 链接地址 |
|---------|---------|---------|
| `plugins-control` | 仓库主页 | `https://github.com/ssjy1919/plugins-control/tree/main` |
| 其他插件 | 社区主页 | `obsidian://show-plugin?id={插件ID}` |

---

## 9. 命令列表

| 命令 ID | 名称 | 功能 |
|---------|------|------|
| `pluginManagerCenterLeafView` | 打开插件管理视图 | 在中间区域或新窗口打开管理页面 |

---

## 10. 构建、测试与发布

```bash
npm install
npm run dev
npm run build
npm test
```

`npm run build` 会先执行 `tsc -noEmit -skipLibCheck`，再执行 `node esbuild.config.mjs production`。

`npm test` 会运行 `scripts/check-release.mjs`，检查：

- `package.json` 没有 `"type": "module"`
- package 版本与 manifest 版本一致
- `versions.json` 包含当前版本
- `version-bump.mjs` 存在

发布版本：

```bash
npm version patch
```

`npm version` 会触发 `version-bump.mjs`，同步更新 `manifest.json` 和 `versions.json`。

---

## 11. 注意事项

- `applyDeviceRules()` 会跳过移动端不支持的 `isDesktopOnly` 插件
- `saveConfig()` 会深拷贝 `tags` 和 `disabledDeviceTypes`，避免备份与当前列表共享引用
- `restoreConfig()` 会跳过 Control Center 自身，并在恢复后重新执行 `applyDeviceRules()`
- `handleChange` 会同步更新 `startEnabled` 和 `disabledDeviceTypes`
- `handleDeviceTypeToggle` 在部分禁用模式下采用“先持久化禁用，再临时启用”的策略
- 设备图标 tooltip 中 `checked` 表示“该设备类型禁用”
- 内部 API 统一通过 `InternalApp` 类型访问，项目中不使用 `@ts-ignore`
