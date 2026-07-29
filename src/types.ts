export type DeviceType = "phone" | "tablet" | "desktop";

/** 已安装的插件对象接口 */
export interface PluginManager {
	id: string;
	name: string;
	/** obsidian应用捕获的插件启用状态，不包括延时启动的插件 */
	enabled: boolean;
	/** 最后更改时间 */
	switchTime: number;
	/** 用户备注 */
	comment: string;
	/** 插件延时启动 */
	delayStart: number;
	/** 作者 */
	author: string;
	/** 仓库地址 */
	authorUrl: string;
	/** 插件描述 */
	description: string;
	/** 插件路径 */
	dir: string;
	/** 是否仅桌面端可用 */
	isDesktopOnly: boolean;
	/** 最低obsidian版本 */
	minAppVersion: string;
	/** 插件版本 */
	version: string;
	/** 分组 */
	tags: string[];
	/** 在指定设备类型上禁用此插件 */
	disabledDeviceTypes: DeviceType[];
}

export const pluginManager: PluginManager = {
	id: "",
	name: "",
	enabled: false,
	switchTime: 0,
	comment: "",
	delayStart: 0,
	author: "",
	authorUrl: "",
	description: "",
	dir: "",
	isDesktopOnly: false,
	minAppVersion: "",
	version: "",
	tags: [],
	disabledDeviceTypes: [],
};

export interface SortField {
	/** 排序字段 */
	field: keyof PluginManager;
	/** 排序顺序 */
	order: "asc" | "desc";
}

export interface PluginManagerSettings {
	/** 插件配置信息 */
	pluginManager: PluginManager[];
	/** 保存第二套插件配置信息 */
	secondPluginManager: PluginManager[];
	/** 插件管理页面的排序字段 */
	sortField: SortField;
	/** 插件分组标签 */
	pluginGroups: string[];
	/** 显示插件分组标签 */
	showPluginGroups: string;
	/** 插件首字母分组 */
	showPluginInitial: string;
	/** 插件的设置页面是否在新窗口打开 */
	pluginSettingNewWindow: boolean;
}

export const DEFAULT_SETTINGS: PluginManagerSettings = {
	pluginManager: [pluginManager],
	secondPluginManager: [pluginManager],
	pluginGroups: [],
	showPluginGroups: "",
	showPluginInitial: "#",
	sortField: {
		field: "enabled",
		order: "desc",
	},
	pluginSettingNewWindow: true,
};
