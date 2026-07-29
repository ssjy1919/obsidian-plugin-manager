import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, PluginManagerSettings } from "./types";
import { PluginManagerSettingTab } from "./setting/settingTab";
import {
	PluginManagerLeft,
	VIEW_TYPE_PLUGIN_MANAGER,
} from "./views/PluginManagerLeft";
import { activateMiddleView, getAllPlugins, applyDeviceRules } from "./views/PMtools";
import { store, updataSettings } from "./store";

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
			getAllPlugins(this);
		});

		this.registerView(
			VIEW_TYPE_PLUGIN_MANAGER,
			(leaf) => new PluginManagerLeft(leaf, this)
		);

		this.addCommand({
			id: "pluginManagerCenterLeafView",
			name: "打开插件管理视图",
			callback: () => {
				activateMiddleView(this);
			},
		});

		this.addRibbonIcon("blocks", "插件管理", () => {
			activateMiddleView(this);
		});

		this.addSettingTab(new PluginManagerSettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_PLUGIN_MANAGER);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
}
