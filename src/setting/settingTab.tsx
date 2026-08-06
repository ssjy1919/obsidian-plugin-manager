import { App, Notice, PluginSettingTab } from 'obsidian';
import * as ReactDOM from 'react-dom/client';
import PluginManagerPlugin from '../main';
import "./settingTab.css";
import { Switch } from '../components/Switch';
import * as React from 'react';
import { RootState, store, updataSettings } from '../store';
import { useDispatch, useSelector } from 'react-redux';
import { Provider } from 'react-redux';
import { Language } from '../types';
import { t } from '../i18n';

interface SettingComponentProps {
	plugin: PluginManagerPlugin;
}

const SettingComponent: React.FC<SettingComponentProps> = ({ plugin }) => {
	const storeSettings = useSelector((state: RootState) => state.settings);
	const pluginSettingNewWindow = useSelector((state: RootState) => state.settings.pluginSettingNewWindow);
	const language = useSelector((state: RootState) => state.settings.language);
	const debugLogs = useSelector((state: RootState) => state.settings.debugLogs);
	const dispatch = useDispatch();

	const handlePluginSettingNewWindowChange = async (value: boolean) => {
		const newSettings = { ...storeSettings, pluginSettingNewWindow: value };
		dispatch(updataSettings(newSettings));
		await plugin.saveData(newSettings);
		new Notice(t(language, value ? "newWindowEnabled" : "newWindowDisabled"), 3000);
	};

	const handleLanguageChange = async (value: Language) => {
		if (value === language) return;
		const newSettings = { ...storeSettings, language: value };
		dispatch(updataSettings(newSettings));
		await plugin.saveData(newSettings);
		plugin.updateUILanguage();
		new Notice(t(value, "languageChanged"), 3000);
	};

	const handleDebugLogsChange = async (value: boolean) => {
		const newSettings = { ...storeSettings, debugLogs: value };
		dispatch(updataSettings(newSettings));
		await plugin.saveData(newSettings);
		new Notice(t(language, value ? "debugLogsEnabled" : "debugLogsDisabled"), 3000);
	};

	return (
		<>
			<div className="plugin-manager-setting-container">
				<div className="setting-item">
					<div className="setting-item-info">
						<div className="setting-item-name">{t(language, "languageLabel")}</div>
						<div className="setting-item-description">{t(language, "languageDescription")}</div>
					</div>
					<div className="setting-item-control">
						<select
							className="dropdown"
							value={language}
							onChange={(e) => handleLanguageChange(e.target.value as Language)}
						>
							<option value="zh">{t(language, "chinese")}</option>
							<option value="en">{t(language, "english")}</option>
						</select>
					</div>
				</div>
				<div className="plugin-manager">
					<Switch
						label={t(language, "newWindowLabel")}
						description={t(language, "newWindowDescription")}
						value={pluginSettingNewWindow}
						onChange={handlePluginSettingNewWindowChange}
					/>
					<Switch
						label={t(language, "debugLogsLabel")}
						description={t(language, "debugLogsDescription")}
						value={debugLogs}
						onChange={handleDebugLogsChange}
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
