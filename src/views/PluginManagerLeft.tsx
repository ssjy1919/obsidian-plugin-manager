import { ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import PluginManagerPlugin from "../main";
import { store } from "../store";
import PluginManagerView from "./PluginManagerView";

export const VIEW_TYPE_PLUGIN_MANAGER = 'plugin-manager-left-view';

export class PluginManagerLeft extends ItemView {
	root: Root | null = null;
	plugin: PluginManagerPlugin;
	constructor(leaf: WorkspaceLeaf, plugin: PluginManagerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}
	getIcon() {
		return 'blocks';
	}
	getViewType() {
		return VIEW_TYPE_PLUGIN_MANAGER;
	}
	getDisplayText() {
		return '插件管理';
	}
	onOpen() {
		this.root = createRoot(this.containerEl.children[1]);
		this.root.render(
			<Provider store={store}>
				<PluginManagerView plugin={this.plugin} />
			</Provider>
		);
		return Promise.resolve();
	}
	onClose() {
		this.root?.unmount();
		return Promise.resolve();
	}
}
