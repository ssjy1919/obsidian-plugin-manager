# Obsidian Plugin Manager

Obsidian 插件管理器 —— 集中管理所有已安装插件的启用状态、分组、延时启动、更新检查等功能。

## 功能

- **插件列表管理**：以表格形式展示所有已安装插件，支持按名称、状态、延时启动时间、标签、更改时间、备注排序
- **启用/禁用切换**：一键切换插件的启用状态，自动记录更改时间
- **延时启动**：为指定插件设置延时启动时间（秒），避免 Obsidian 启动时同时加载过多插件
- **分组标签**：为插件创建自定义分组标签，快速筛选和管理
- **首字母索引**：通过首字母快速定位插件
- **搜索过滤**：按插件名称或备注内容搜索
- **备注功能**：为每个插件添加 Markdown 格式的备注，支持内部链接
- **配置备份/恢复**：保存和恢复所有插件的启用状态配置
- **更新检查**：检查所有插件是否有新版本可用
- **批量更新**：一键更新所有可更新的插件
- **定时任务**：可选启用定时调度器，自动检查插件更新

## 安装

### 手动安装

1. 克隆或下载本仓库到 Obsidian 的插件目录：
   ```
   <你的仓库路径>/.obsidian/plugins/obsidian-plugin-manager/
   ```
2. 在插件目录下运行：
   ```bash
   npm install
   npm run build
   ```
3. 在 Obsidian 中启用插件：**设置 → 第三方插件 → Plugin Manager**

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化自动编译）
npm run dev

# 生产构建
npm run build
```

## 项目结构

```
src/
├── main.ts                  # 插件入口
├── types.ts                 # 类型定义
├── store.ts                 # Redux 状态管理
├── constants.ts             # 常量定义
├── views/                   # 视图组件
│   ├── PluginManagerView    # 主视图（插件列表表格）
│   ├── PluginManagerLeft    # ItemView 注册
│   ├── GroupView            # 分组筛选栏
│   ├── MakeTagsView         # 标签管理
│   ├── PluginCommentCell    # 备注单元格
│   └── PMtools              # 工具函数
├── components/              # 通用 UI 组件
│   └── Switch               # 开关组件
├── services/                # 服务层
│   ├── pluginFetcher        # 从 GitHub 获取插件版本信息
│   ├── pluginInstaller      # 插件安装服务
│   └── taskScheduler        # 定时任务调度器
├── scheduler/               # 调度器导出
└── setting/                 # 插件设置页面
    └── settingTab
```

## 说明

本插件从 [Watchtower](https://github.com/ssjy1919/Watchtower) 项目中拆分而来，作为独立插件运行。

## 许可证

MIT
