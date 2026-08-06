import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, PluginManager, PluginManagerSettings, normalizePluginEntry } from "./types";
import { PluginManagerSettingTab } from "./setting/settingTab";
import {
	PluginManagerLeft,
	VIEW_TYPE_PLUGIN_MANAGER,
} from "./views/PluginManagerLeft";
import { activateMiddleView, getAllPlugins, applyDeviceRules, clearAllDelayedStarts } from "./views/PMtools";
import { store, updataSettings } from "./store";
import { t } from "./i18n";

export default class PluginManagerPlugin extends Plugin {
	public settings!: PluginManagerSettings;

	async onload() {
		await this.loadSettings();

		this.app.workspace.onLayoutReady(async () => {
			try {
				store.dispatch(updataSettings(this.settings));
			} catch (e) {
				console.error("[PluginManager] 初始化失败:", e);
				store.dispatch(updataSettings(this.settings));
			}

			await applyDeviceRules(this);
			await getAllPlugins(this, true);
		});

		this.registerView(
			VIEW_TYPE_PLUGIN_MANAGER,
			(leaf) => new PluginManagerLeft(leaf, this)
		);

		this.addCommand({
			id: "pluginManagerCenterLeafView",
			name: t(this.settings.language, "openPluginManager"),
			callback: () => {
				activateMiddleView(this);
			},
		});

		this.addRibbonIcon("blocks", t(this.settings.language, "pluginManager"), () => {
			activateMiddleView(this);
		});

		this.addSettingTab(new PluginManagerSettingTab(this.app, this));
	}

	onunload() {
		clearAllDelayedStarts();
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_PLUGIN_MANAGER);
	}

	async loadSettings() {
		const loaded = ((await this.loadData()) ?? {}) as Record<string, unknown>;
		delete loaded.pluginGroups;
		delete loaded.showPluginGroups;
		if (Array.isArray(loaded.pluginManager)) {
			loaded.pluginManager = (loaded.pluginManager as Partial<PluginManager>[]).map(normalizePluginEntry);
		}
		if (Array.isArray(loaded.secondPluginManager)) {
			loaded.secondPluginManager = (loaded.secondPluginManager as Partial<PluginManager>[]).map(normalizePluginEntry);
		}
		if (loaded.language !== "zh" && loaded.language !== "en") {
			loaded.language = "zh";
		}
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded) as PluginManagerSettings;
	}
}
