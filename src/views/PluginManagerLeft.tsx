import { ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import PluginManagerPlugin from "../main";
import { store } from "../store";
import PluginManagerView from "./PluginManagerView";
import { t } from "../i18n";

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
		return t(store.getState().settings.language, "pluginManager");
	}
	updateHeaderText() {
		const title = t(store.getState().settings.language, "pluginManager");
		const leaf = this.leaf as unknown as {
			updateHeader?: () => void;
			tabHeaderEl?: HTMLElement;
			tabHeaderInnerTitleEl?: HTMLElement;
		};
		leaf.updateHeader?.();
		const innerTitle =
			leaf.tabHeaderInnerTitleEl ??
			leaf.tabHeaderEl?.querySelector(".workspace-tab-header-inner-title");
		if (innerTitle) {
			innerTitle.textContent = title;
		}
		if (leaf.tabHeaderEl) {
			leaf.tabHeaderEl.setAttribute("aria-label", title);
			leaf.tabHeaderEl.title = title;
		}
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
