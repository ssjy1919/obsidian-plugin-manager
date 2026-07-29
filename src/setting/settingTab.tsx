import { App, PluginSettingTab } from 'obsidian';
import * as ReactDOM from 'react-dom/client';
import PluginManagerPlugin from '../main';
import "./settingTab.css";
import { Switch } from '../components/Switch';
import * as React from 'react';
import { RootState, store, updataSettings } from '../store';
import { useDispatch, useSelector } from 'react-redux';
import { Provider } from 'react-redux';

interface SettingComponentProps {
	plugin: PluginManagerPlugin;
}

const SettingComponent: React.FC<SettingComponentProps> = ({ plugin }) => {
	const storeSettings = useSelector((state: RootState) => state.settings);
	const pluginSettingNewWindow = useSelector((state: RootState) => state.settings.pluginSettingNewWindow);
	const dispatch = useDispatch();

	const handlePluginSettingNewWindowChange = async (value: boolean) => {
		const newSettings = { ...storeSettings, pluginSettingNewWindow: value };
		dispatch(updataSettings(newSettings));
		await plugin.saveData(newSettings);
	};

	return (
		<>
			<div className="plugin-manager-setting-container">
				<div className="plugin-manager">
					<Switch
						label="插件管理页面在新窗口打开"
						description="开启时，插件管理的页面在新窗口打开。(只有桌面端有效)"
						value={pluginSettingNewWindow}
						onChange={handlePluginSettingNewWindowChange}
					/>
				</div>
			</div>
		</>
	);
};

export class PluginManagerSettingTab extends PluginSettingTab {
	plugin: PluginManagerPlugin;
	root: ReactDOM.Root | null = null;

	constructor(app: App, plugin: PluginManagerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		if (!this.root) {
			this.root = ReactDOM.createRoot(containerEl);
		}

		this.root.render(
			<React.StrictMode>
				<Provider store={store}>
					<SettingComponent plugin={this.plugin} />
				</Provider>
			</React.StrictMode>
		);
	}
}
