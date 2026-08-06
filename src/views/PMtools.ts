import PluginManagerPlugin from "../main";
import { VIEW_TYPE_PLUGIN_MANAGER } from "./PluginManagerLeft";
import { App, Notice, PluginManifest, WorkspaceLeaf } from "obsidian";
import { DeviceType, PluginManager, normalizePluginEntry } from "../types";
import { updataSettings, store } from "../store";
import { t } from "../i18n";
import { debugError, debugLog } from "../logger";

interface InternalPlugins {
	manifests: Record<string, PluginManifest>;
	plugins: Record<string, unknown>;
	enablePlugin(pluginId: string): Promise<void>;
	disablePlugin(pluginId: string): Promise<void>;
	enablePluginAndSave(pluginId: string): Promise<void>;
	disablePluginAndSave(pluginId: string): Promise<void>;
}

export interface InternalApp extends App {
	plugins: InternalPlugins;
	setting: {
		pluginTabs: { id: string }[];
		open(): void;
		openTabById(tabId: string): void;
	};
	isMobile?: boolean;
}

function getApp(): InternalApp {
	return (globalThis as unknown as { app: InternalApp }).app;
}

function getUserAgentData(): { mobile?: boolean; platform?: string } | undefined {
	return (navigator as Navigator & { userAgentData?: { mobile?: boolean; platform?: string } })
		.userAgentData;
}

const delayedStartTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** 取消某个插件的延时启动定时器。 */
export function clearDelayedStart(pluginId: string): void {
	const timer = delayedStartTimers.get(pluginId);
	if (timer !== undefined) {
		clearTimeout(timer);
		delayedStartTimers.delete(pluginId);
	}
}

/** 取消全部延时启动定时器，插件卸载时应调用。 */
export function clearAllDelayedStarts(): void {
	for (const timer of delayedStartTimers.values()) {
		clearTimeout(timer);
	}
	delayedStartTimers.clear();
}

/** 安排插件在指定秒数后临时启用；调用前应确保插件已被持久化禁用。 */
export function scheduleDelayedEnable(
	pluginId: string,
	delaySeconds: number,
	plugin: PluginManagerPlugin
): void {
	clearDelayedStart(pluginId);
	const timer = setTimeout(async () => {
		delayedStartTimers.delete(pluginId);
		try {
			await tempEnablePlugin(pluginId);
		} catch (e) {
			debugError(`延时启用 ${pluginId} 失败:`, e);
		} finally {
			getAllPlugins(plugin);
		}
	}, delaySeconds * 1000);
	delayedStartTimers.set(pluginId, timer);
}

/**
 * 检测当前设备类型。
 */
export function getDeviceType(): DeviceType {
	// 优先使用 userAgentData（Chrome DevTools 模拟时更可靠）
	const uaData = getUserAgentData();
	const isMobileByData = uaData?.mobile;

	const ua = navigator.userAgent || "";
	const isMobileByUA = /iPhone|iPod|iPad|Android|Mobile/i.test(ua);

	// 任一来源判定为移动端即为移动端
	const isMobile = isMobileByData === true || (isMobileByData === undefined && isMobileByUA);

	if (!isMobile) return "desktop";

	// 区分手机和平板
	if (/iPhone|iPod/i.test(ua)) return "phone";
	if (/iPad/i.test(ua)) return "tablet";
	if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "tablet";
	if (/Android/i.test(ua)) {
		return /Mobile/i.test(ua) ? "phone" : "tablet";
	}
	// 移动端但 UA 无明确标识，根据 userAgentData 平台判断
	if (uaData?.platform === "iOS") return "phone";
	return "phone";
}

/**
 * 激活中间区域的视图。
 * 在中间区域左右分屏打开标签页。
 * 如果已有相同类型的视图打开，则直接激活该视图。
 */
export async function activateMiddleView(plugin: PluginManagerPlugin) {
	const { workspace } = plugin.app;
	const app = plugin.app as InternalApp;
	const storeSettings = store.getState().settings;
	const isNewWindow =
		!app.isMobile && storeSettings.pluginSettingNewWindow;

	let existingLeaf: WorkspaceLeaf | undefined;

	workspace.iterateAllLeaves((leaf) => {
		if (leaf.view.getViewType() === VIEW_TYPE_PLUGIN_MANAGER) {
			if (isNewWindow) {
				existingLeaf = leaf;
			}
			if (!existingLeaf) existingLeaf = leaf;
		}
	});

	if (existingLeaf) {
		workspace.setActiveLeaf(existingLeaf);
		return;
	}
	if (isNewWindow) {
		const newLeaf = plugin.app.workspace.getLeaf("window");
		await newLeaf.setViewState({
			type: VIEW_TYPE_PLUGIN_MANAGER,
			active: true,
		});
		return;
	}

	const rightLeaf = workspace.getLeaf("split", "vertical");
	await rightLeaf.setViewState({
		type: VIEW_TYPE_PLUGIN_MANAGER,
		active: true,
	});
}

/** 刷新所有插件信息；首次启动时可传入 save=true 落盘。 */
export async function getAllPlugins(
	plugin: PluginManagerPlugin,
	save = false
) {
	const storeSettings = store.getState().settings;
	const currentDevice = getDeviceType();
	const app = getApp();

	const installedPluginIds = Object.keys(app.plugins.manifests);
	const updatadPlugins = installedPluginIds.map((id) => {
		const manifest = app.plugins.manifests[id];
		const storePlugin = storeSettings.pluginManager.find((p) => p.id === id);

		const isEnabled = Object.keys(app.plugins.plugins).includes(id);

		let disabledDeviceTypes: DeviceType[];
		if (storePlugin) {
			// 保留用户设置的设备类型配置，不从启用状态重新推导
			disabledDeviceTypes = storePlugin.disabledDeviceTypes ?? [];
		} else {
			// 新插件：已启用→全部设备类型启用；未启用→全部设备类型禁用
			disabledDeviceTypes = isEnabled ? [] : (["phone", "tablet", "desktop"] as DeviceType[]);
		}

		// enabled 反映当前设备上是否应该运行：实际启用 且 当前设备类型未被禁用
		const enabled = isEnabled && !disabledDeviceTypes.includes(currentDevice);
		const startEnabled = storePlugin
			? normalizePluginEntry(storePlugin).startEnabled
			: isEnabled;

		return {
			id,
			name: manifest.name || "",
			enabled,
			startEnabled,
			switchTime: storePlugin?.switchTime || 0,
			tags: storePlugin?.tags || [],
			comment: storePlugin?.comment || "",
			delayStart: storePlugin?.delayStart || 0,
			author: manifest.author || "",
			authorUrl: manifest.authorUrl || "",
			description: manifest.description || "",
			dir: manifest.dir || "",
			isDesktopOnly: manifest.isDesktopOnly || false,
			minAppVersion: manifest.minAppVersion || "",
			version: manifest.version || "",
			disabledDeviceTypes,
		};
	}) as PluginManager[];

	const finalPlugins = updatadPlugins.filter((p) =>
		installedPluginIds.includes(p.id)
	);

	const newSettings = {
		...storeSettings,
		pluginManager: finalPlugins,
	};
	store.dispatch(updataSettings(newSettings));
	if (save) {
		await plugin.saveData(newSettings);
	}
}

/** 彻底关闭插件 */
export async function disablePlugin(pluginId: string) {
	const app = getApp();
	if (app.plugins.manifests[pluginId]) {
		await app.plugins.disablePluginAndSave(pluginId);
	}
}

/** 完全打开插件（持久化，重启后仍生效） */
export async function enablePlugin(pluginId: string) {
	const app = getApp();
	if (app.plugins.manifests[pluginId]) {
		await app.plugins.enablePluginAndSave(pluginId);
	}
}

/** 临时打开插件（不持久化，重启后恢复） */
export async function tempEnablePlugin(pluginId: string) {
	const app = getApp();
	if (app.plugins.manifests[pluginId]) {
		await app.plugins.enablePlugin(pluginId);
	}
}

/** 临时禁用插件（不持久化，重启后恢复） */
export async function tempDisablePlugin(pluginId: string) {
	const app = getApp();
	if (app.plugins.manifests[pluginId]) {
		await app.plugins.disablePlugin(pluginId);
	}
}

/**
 * 根据插件 id 打开对应插件的设置页面
 */
export function openPluginSettings(
	iplugin: PluginManager,
	plugin: PluginManagerPlugin
) {
	const app = plugin.app as InternalApp;
	const language = store.getState().settings.language;
	if (!iplugin.enabled) {
		new Notice(t(language, "pluginNotEnabled"), 5000);
		return;
	}
	if (!app.setting.pluginTabs.find((P: { id: string }) => P.id === iplugin.id)) {
		new Notice(t(language, "pluginNoSettings"), 5000);
	} else {
		app.setting.open();
		app.setting.openTabById(iplugin.id);
	}
}

/**
 * 根据插件 id 查询 switchTime
 */
export function getSwitchTimeByPluginId(pluginId: string): number {
	const pluginEntry = store
		.getState()
		.settings.pluginManager.find((pm) => pm.id === pluginId);
	return pluginEntry ? pluginEntry.switchTime : 0;
}

/**
 * 评估插件在当前设备类型是否应该运行。
 * 返回 false = 不应该运行, null = 无限制（保持默认）
 */
export function shouldPluginRun(
	plugin: PluginManager,
	currentDeviceType: DeviceType
): boolean | null {
	if ((plugin.disabledDeviceTypes || []).includes(currentDeviceType)) {
		return false;
	}
	return null;
}

/** 插件是否已在当前会话中加载运行 */
function isPluginLoaded(pluginId: string): boolean {
	return Object.keys(getApp().plugins.plugins).includes(pluginId);
}

/**
 * 启动时应用设备类型规则。
 * 对所有插件评估，使用临时禁用（不持久化）。
 */
export async function applyDeviceRules(plugin: PluginManagerPlugin) {
	try {
		clearAllDelayedStarts();
		const storeSettings = store.getState().settings;
		const deviceType = getDeviceType();
		const uaMobile = getUserAgentData()?.mobile;
		debugLog("当前设备类型:", deviceType,
			"| userAgentData.mobile:", uaMobile,
			"| maxTouchPoints:", navigator.maxTouchPoints);

		const plugins = storeSettings.pluginManager || [];
		for (const p of plugins) {
			if (p.id === "plugins-control") continue;

			const rule = shouldPluginRun(p, deviceType);
			const hasPartialDisable = (p.disabledDeviceTypes || []).length > 0;
			const startEnabled = normalizePluginEntry(p).startEnabled;

			if (rule === false) {
				// 当前设备类型被禁用 → 临时禁用（持久化禁用已在操作时完成）
				clearDelayedStart(p.id);
				debugLog(`${p.id}: 临时禁用 (设备类型 ${deviceType} 被禁)`);
				await tempDisablePlugin(p.id);
			} else if (!startEnabled) {
				// 用户没有启用该插件，避免延时定时器把它重新拉起。
				clearDelayedStart(p.id);
			} else if (hasPartialDisable) {
				// 部分禁用，但当前设备类型允许 → 需要临时启用（持久化状态是关闭的）
				if (deviceType !== "desktop" && p.isDesktopOnly) continue;
				if (p.delayStart > 0) {
					debugLog(`${p.id}: 延时临时启用 (${p.delayStart}s)`);
					await disablePlugin(p.id);
					scheduleDelayedEnable(p.id, p.delayStart, plugin);
				} else {
					debugLog(`${p.id}: 临时启用 (部分禁用，当前设备允许)`);
					await tempEnablePlugin(p.id);
				}
			} else {
				// Obsidian 在 layout ready 前已加载持久化启用的插件；
				// 这里先持久化禁用，确保下次启动不提前加载。
				if (p.delayStart > 0) {
					if (deviceType !== "desktop" && p.isDesktopOnly) continue;
					debugLog(`${p.id}: 延时启动 (${p.delayStart}s)`);
					await disablePlugin(p.id);
					scheduleDelayedEnable(p.id, p.delayStart, plugin);
				}
			}
		}
	} catch (e) {
		debugError("applyDeviceRules 失败:", e);
	}
}
