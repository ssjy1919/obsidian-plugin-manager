export type DeviceType = "phone" | "tablet" | "desktop";
export type Language = "zh" | "en";

/** 已安装的插件对象接口 */
export interface PluginManager {
	id: string;
	name: string;
	/** obsidian应用捕获的插件启用状态，不包括延时启动的插件 */
	enabled: boolean;
	/** 用户是否希望启用该插件（全局意图，跨设备保存） */
	startEnabled: boolean;
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
	startEnabled: false,
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

/** 兼容旧数据：根据设备规则推导全局启用意图。 */
export function normalizePluginEntry(
	plugin: Partial<PluginManager>
): PluginManager {
	const disabledDeviceTypes = plugin.disabledDeviceTypes ?? [];
	const startEnabled =
		plugin.startEnabled ??
		(disabledDeviceTypes.length >= 3
			? false
			: disabledDeviceTypes.length === 0
				? !!plugin.enabled
				: true);

	return {
		id: plugin.id ?? "",
		name: plugin.name ?? "",
		enabled: plugin.enabled ?? false,
		startEnabled,
		switchTime: plugin.switchTime ?? 0,
		comment: plugin.comment ?? "",
		delayStart: plugin.delayStart ?? 0,
		author: plugin.author ?? "",
		authorUrl: plugin.authorUrl ?? "",
		description: plugin.description ?? "",
		dir: plugin.dir ?? "",
		isDesktopOnly: plugin.isDesktopOnly ?? false,
		minAppVersion: plugin.minAppVersion ?? "",
		version: plugin.version ?? "",
		tags: plugin.tags ?? [],
		disabledDeviceTypes,
	};
}

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
	/** 插件首字母分组 */
	showPluginInitial: string;
	/** 插件的设置页面是否在新窗口打开 */
	pluginSettingNewWindow: boolean;
	/** 插件界面语言 */
	language: Language;
	/** 是否输出控制台日志 */
	debugLogs: boolean;
}

export const DEFAULT_SETTINGS: PluginManagerSettings = {
	pluginManager: [pluginManager],
	secondPluginManager: [pluginManager],
	showPluginInitial: "#",
	sortField: {
		field: "enabled",
		order: "desc",
	},
	pluginSettingNewWindow: true,
	language: "zh",
	debugLogs: false,
};
