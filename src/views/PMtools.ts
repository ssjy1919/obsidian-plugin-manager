import PluginManagerPlugin from "../main";
import { VIEW_TYPE_PLUGIN_MANAGER } from "./PluginManagerLeft";
import { Notice, PluginManifest, WorkspaceLeaf } from "obsidian";
import { DeviceType, PluginManager } from "../types";
import { updataSettings, store } from "../store";

/**
 * 检测当前设备类型。
 */
export function getDeviceType(): DeviceType {
	// 优先使用 userAgentData（Chrome DevTools 模拟时更可靠）
	//@ts-ignore
	const uaData = navigator.userAgentData;
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
	//@ts-ignore
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
	const storeSettings = store.getState().settings;
	const isNewWindow =
		//@ts-ignore
		!plugin.app.isMobile && storeSettings.pluginSettingNewWindow;

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

/** 刷新所有插件信息 */
export function getAllPlugins(plugin: PluginManagerPlugin) {
	const storeSettings = store.getState().settings;

	// @ts-ignore
	const installedPluginIds = Object.keys(app.plugins.manifests);
	const updatadPlugins = installedPluginIds.map((id) => {
		// @ts-ignore
		const manifest = app.plugins.manifests[id] as PluginManifest;
		const storePlugin = storeSettings.pluginManager.find((p) => p.id === id);

		// @ts-ignore
		const isEnabled = Object.keys(app.plugins.plugins).includes(id);

		return {
			id,
			name: manifest.name || "",
			enabled: isEnabled,
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
			// 新插件：已启用→全部设备类型启用；未启用→全部设备类型禁用
			disabledDeviceTypes: storePlugin?.disabledDeviceTypes ?? (isEnabled ? [] : ["phone", "tablet", "desktop"]),
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
}

/** 彻底关闭插件 */
export async function disablePlugin(pluginId: string) {
	//@ts-ignore
	if (app.plugins.manifests[pluginId]) {
		//@ts-ignore
		await app.plugins.disablePluginAndSave(pluginId);
	}
}

/** 完全打开插件（持久化，重启后仍生效） */
export async function enablePlugin(pluginId: string) {
	//@ts-ignore
	if (app.plugins.manifests[pluginId]) {
		//@ts-ignore
		await app.plugins.enablePluginAndSave(pluginId);
	}
}

/** 临时打开插件（不持久化，重启后恢复） */
export async function tempEnablePlugin(pluginId: string) {
	//@ts-ignore
	if (app.plugins.manifests[pluginId]) {
		//@ts-ignore
		await app.plugins.enablePlugin(pluginId);
	}
}

/** 临时禁用插件（不持久化，重启后恢复） */
export async function tempDisablePlugin(pluginId: string) {
	//@ts-ignore
	if (app.plugins.manifests[pluginId]) {
		//@ts-ignore
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
	if (!iplugin.enabled) {
		new Notice("插件未开启", 5000);
		return;
	}
	//@ts-ignore
	if (!plugin.app.setting.pluginTabs.find((P: { id: string }) => P.id === iplugin.id)) {
		new Notice("此插件没有设置项", 5000);
	} else {
		//@ts-ignore
		plugin.app.setting.open();
		//@ts-ignore
		plugin.app.setting.openTabById(iplugin.id);
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

/**
 * 启动时应用设备类型规则。
 * 对所有插件评估，使用临时禁用（不持久化）。
 */
export async function applyDeviceRules(plugin: PluginManagerPlugin) {
	try {
		const storeSettings = store.getState().settings;
		const deviceType = getDeviceType();
		//@ts-ignore
		const uaMobile = navigator.userAgentData?.mobile;
		console.log("[PluginManager] 当前设备类型:", deviceType,
			"| userAgentData.mobile:", uaMobile,
			"| maxTouchPoints:", navigator.maxTouchPoints);

		const plugins = storeSettings.pluginManager || [];
		for (const p of plugins) {
			if (p.id === "obsidian-plugin-manager") continue;

			const rule = shouldPluginRun(p, deviceType);
			const hasPartialDisable = (p.disabledDeviceTypes || []).length > 0;

			if (rule === false) {
				// 当前设备类型被禁用 → 临时禁用（持久化禁用已在操作时完成）
				console.log(`[PluginManager] ${p.id}: 临时禁用 (设备类型 ${deviceType} 被禁)`);
				await tempDisablePlugin(p.id);
			} else if (hasPartialDisable) {
				// 部分禁用，但当前设备类型允许 → 需要临时启用（持久化状态是关闭的）
				//@ts-ignore
				if (deviceType !== "desktop" && p.isDesktopOnly) continue;
				if (p.delayStart > 0) {
					console.log(`[PluginManager] ${p.id}: 延时临时启用 (${p.delayStart}s)`);
					setTimeout(async () => {
						await tempEnablePlugin(p.id);
						getAllPlugins(plugin);
					}, p.delayStart * 1000);
				} else {
					console.log(`[PluginManager] ${p.id}: 临时启用 (部分禁用，当前设备允许)`);
					await tempEnablePlugin(p.id);
				}
			} else {
				// 全部设备类型启用 → 持久化启用状态，处理延时启动
				if (p.delayStart > 0) {
					//@ts-ignore
					if (deviceType !== "desktop" && p.isDesktopOnly) continue;
					console.log(`[PluginManager] ${p.id}: 延时启动 (${p.delayStart}s)`);
					setTimeout(async () => {
						await tempEnablePlugin(p.id);
						getAllPlugins(plugin);
					}, p.delayStart * 1000);
				}
			}
		}
	} catch (e) {
		console.error("[PluginManager] applyDeviceRules 失败:", e);
	}
}
