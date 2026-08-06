import PluginManagerPlugin from "../main";
import { Switch } from "../components/Switch";
import "./PluginManagerView.css"
import { useDispatch } from "react-redux";
import { RootState, store, updataSettings, updataPluginManager } from "../store";
import { useSelector } from "react-redux";
import { DeviceType, PluginManager, normalizePluginEntry } from "../types";
import { applyDeviceRules, clearAllDelayedStarts, clearDelayedStart, disablePlugin, enablePlugin, getAllPlugins, getDeviceType, getSwitchTimeByPluginId, InternalApp, openPluginSettings, tempEnablePlugin } from "./PMtools";
import { useMemo, useState } from "react";
import GroupView from "./GroupView";
import { Notice } from "obsidian";
import PluginCommentCell from "./PluginCommentCell";
import { t, TranslationKey } from "../i18n";
import { debugError } from "../logger";

const DEVICE_TYPE_ICONS: Record<DeviceType, string> = {
	phone: "📱",
	tablet: "📋",
	desktop: "💻",
};

const DEVICE_TYPE_KEYS: Record<DeviceType, TranslationKey> = {
	phone: "devicePhone",
	tablet: "deviceTablet",
	desktop: "deviceDesktop",
};

interface PluginManagerViewProps {
	plugin: PluginManagerPlugin;
}

const PluginManagerView: React.FC<PluginManagerViewProps> = ({ plugin }) => {
	const storeSettings = useSelector((state: RootState) => state.settings);
	const pluginManager = useSelector((state: RootState) => state.settings.pluginManager);
	const storeField = useSelector((state: RootState) => state.settings.sortField.field);
	const storeOrder = useSelector((state: RootState) => state.settings.sortField.order);
	const showPluginInitial = useSelector((state: RootState) => state.settings.showPluginInitial);
	const language = useSelector((state: RootState) => state.settings.language);
	const [pluginNote, setPluginNote] = useState<{ [id: string]: boolean }>({});
	const dispatch = useDispatch();
	const [searchQuery, setSearchQuery] = useState<string>("");

	const filteredPlugins = pluginManager.filter(Iplugin => {
		const searchLower = searchQuery.trim().toLowerCase();
		return !searchQuery
			|| Iplugin.name.toLowerCase().includes(searchLower)
			|| (Iplugin.comment.toLowerCase() || Iplugin.description.toLowerCase()).includes(searchLower);
	});

	const [getEnabledPlugins, getDisabledPlugins] = useMemo(() => [
		pluginManager.filter(p => p.enabled).length,
		pluginManager.filter(p => !p.enabled).length
	], [pluginManager]);

	const handleChange = async (iPlugin: PluginManager) => {
		if ((plugin.app as InternalApp).isMobile && iPlugin.isDesktopOnly) {
			new Notice(t(language, "unsupportedOnMobile"));
			return;
		}

		clearDelayedStart(iPlugin.id);
		const turningOn = !iPlugin.enabled;
		const updatadPlugins = pluginManager.map(p => {
			if (p.id === iPlugin.id) {
				return {
					...p,
					enabled: turningOn,
					startEnabled: turningOn,
					switchTime: new Date().getTime(),
					// 开启 → 全部设备类型启用；关闭 → 全部设备类型禁用
					disabledDeviceTypes: turningOn ? [] : (["phone", "tablet", "desktop"] as DeviceType[]),
				};
			}
			return p;
		});

		if (turningOn) {
			// 全部设备类型启用；若配置了延时，先持久化禁用，再立即恢复当前会话运行。
			if (iPlugin.delayStart > 0) {
				await disablePlugin(iPlugin.id);
				await tempEnablePlugin(iPlugin.id);
			} else {
				await enablePlugin(iPlugin.id);
			}
		} else {
			// 全部设备类型禁用 → 持久化禁用（重启后不加载）
			await disablePlugin(iPlugin.id);
		}

		const newSettings = { ...storeSettings, pluginManager: updatadPlugins };
		await plugin.saveData(newSettings);
		dispatch(updataPluginManager(updatadPlugins));
		getAllPlugins(plugin);
		new Notice(t(language, turningOn ? "enabled" : "disabled", { name: iPlugin.name }), 3000);
	}

	const handleDelayStartChange = async (iPlugin: PluginManager, newDelayStart: number) => {
		if (iPlugin.delayStart === newDelayStart || newDelayStart < 0) return;
		const updatadPlugins = pluginManager.map(p => {
			if (p.id === iPlugin.id) {
				return {
					...p,
					delayStart: newDelayStart,
					switchTime: new Date().getTime(),
				};
			}
			return p
		});

		clearDelayedStart(iPlugin.id);
		if (newDelayStart > 0) {
			if (iPlugin.enabled) {
				// 持久化禁用，当前会话立即恢复；下次启动时按新延时生效。
				await disablePlugin(iPlugin.id);
				await tempEnablePlugin(iPlugin.id);
			}
		} else if (iPlugin.enabled) {
			await enablePlugin(iPlugin.id);
		}
		const newSettings = { ...storeSettings, pluginManager: updatadPlugins };
		dispatch(updataPluginManager(updatadPlugins));
		await plugin.saveData(newSettings);
		getAllPlugins(plugin);
		new Notice(
			newDelayStart > 0
				? iPlugin.enabled
					? t(language, "delaySetNextStart", { seconds: newDelayStart })
					: t(language, "delaySaved", { seconds: newDelayStart })
				: t(language, "delayCancelled"),
			3000
		);
	}

	const handleCommentChange = async (iPlugin: PluginManager, newComment: string) => {
		const updatadPlugins = pluginManager.map(p => {
			if (p.id === iPlugin.id) {
				return {
					...p,
					comment: newComment,
					switchTime: new Date().getTime(),
				};
			}
			return p;
		});
		const newSettings = { ...storeSettings, pluginManager: updatadPlugins };
		dispatch(updataSettings(newSettings));
		await plugin.saveData(newSettings);
		getAllPlugins(plugin);
	}

	const handleSettingClick = async (Iplugin: PluginManager) => {
		openPluginSettings(Iplugin, plugin);
		if (!Iplugin.enabled) return;
		const updatadPlugins = pluginManager.map(p => {
			if (p.id === Iplugin.id) {
				return {
					...p,
					switchTime: new Date().getTime(),
				};
			}
			return p;
		});
		const newSettings = { ...storeSettings, pluginManager: updatadPlugins };
		dispatch(updataSettings(newSettings));
		await plugin.saveData(newSettings);
		getAllPlugins(plugin);
	}

	const handleSortChange = async (field: keyof PluginManager, order: "asc" | "desc") => {
		const newSortField = { field, order };
		const updatadSettings = { ...storeSettings, sortField: newSortField };
		dispatch(updataSettings(updatadSettings));
		await plugin.saveData(updatadSettings);
		getAllPlugins(plugin);
	};

	const handleHeaderClick = (field: keyof PluginManager) => {
		let newOrder: "asc" | "desc" | "" = "";
		if (storeField !== field) {
			newOrder = "asc";
		} else {
			newOrder = storeOrder === "asc" ? "desc" : "asc";
		}
		handleSortChange(field, newOrder);
	};

	const sortedPlugins = (storeField && storeOrder)
		? (() => {
			const arr = [...filteredPlugins];
			const field = storeField;
			arr.sort((a, b) => {
				let aVal: any = a[field] ?? "";
				let bVal: any = b[field] ?? "";

				if (field === "enabled") {
					aVal = a.enabled ? 1 : 0;
					bVal = b.enabled ? 1 : 0;
				}

				// 备注为空时用描述作为排序依据
				if (field === "comment") {
					if (!aVal) aVal = a.description ?? "";
					if (!bVal) bVal = b.description ?? "";
				}

				if (typeof aVal === "string" && typeof bVal === "string") {
					const cmp = aVal.localeCompare(bVal);
					if (cmp !== 0) return storeOrder === "asc" ? cmp : -cmp;
				} else {
					if (aVal > bVal) return storeOrder === "asc" ? 1 : -1;
					if (aVal < bVal) return storeOrder === "asc" ? -1 : 1;
				}

				return a.name.localeCompare(b.name);
			});
			return arr;
		})()
		: filteredPlugins;

	const uniqueLetters = Array.from(new Set(
		sortedPlugins
			.map(p => p.name[0])
	))
		.filter(Boolean)
		.sort((a, b) => {
			const strA = String(a || '');
			const strB = String(b || '');
			const isAUpper = /[A-Z]/.test(strA);
			const isBUpper = /[A-Z]/.test(strB);
			if (isAUpper && !isBUpper) return 1;
			if (!isAUpper && isBUpper) return -1;
			if (strA < strB) return -1;
			if (strA > strB) return 1;
			return 0;
		});

	const handleLetterClick = async (initial: string | undefined) => {
		if (initial) {
			const newSettings = { ...storeSettings, showPluginInitial: initial };
			dispatch(updataSettings(newSettings));
			await plugin.saveData(newSettings);
			getAllPlugins(plugin);
		}
	}
	const saveConfig = async () => {
		const currentSettings = store.getState().settings;
		const snapshot = currentSettings.pluginManager.map(p => ({
			...p,
			tags: [...(p.tags || [])],
			disabledDeviceTypes: [...(p.disabledDeviceTypes || [])],
		}));
		const newSettings = { ...currentSettings, secondPluginManager: snapshot };
		dispatch(updataSettings(newSettings));
		await plugin.saveData(newSettings);
		getAllPlugins(plugin);
		new Notice(t(language, "configSaved"), 3000);
	}
	const restoreConfig = async () => {
		try {
			new Notice(t(language, "restoring"), 2000);
			clearAllDelayedStarts();

			const currentSettings = store.getState().settings;
			const currentDeviceType = getDeviceType();
			const backup = currentSettings.secondPluginManager;

			const promises = backup
				.filter(p => p.id && p.id !== "plugins-control")
				.map(async (p) => {
					if ((plugin.app as InternalApp).isMobile && p.isDesktopOnly) return;
					const disabledDeviceTypes = p.disabledDeviceTypes || [];
					const disabledForCurrent = disabledDeviceTypes.includes(currentDeviceType);
					const startEnabled = normalizePluginEntry(p).startEnabled;
					const shouldBeEnabled = startEnabled && !disabledForCurrent;
					const keepPersistentEnabled =
						shouldBeEnabled && disabledDeviceTypes.length === 0 && p.delayStart === 0;

					if (keepPersistentEnabled) {
						await enablePlugin(p.id);
					} else {
						await disablePlugin(p.id);
					}
				});
			await Promise.all(promises);

			const restoredPlugins = backup
				.filter(p => p.id)
				.map(p => ({
					...p,
					startEnabled: normalizePluginEntry(p).startEnabled,
					enabled: normalizePluginEntry(p).startEnabled && !(p.disabledDeviceTypes || []).includes(currentDeviceType),
					tags: [...(p.tags || [])],
					disabledDeviceTypes: [...(p.disabledDeviceTypes || [])],
				}));

			const newSettings = { ...currentSettings, pluginManager: restoredPlugins };
			dispatch(updataSettings(newSettings));
			await plugin.saveData(newSettings);

			await applyDeviceRules(plugin);
			getAllPlugins(plugin);
			await plugin.saveData(store.getState().settings);
			new Notice(t(language, "restored"), 5000);
		} catch (error) {
			debugError('恢复插件配置失败:', error);
			new Notice(t(language, "restoreFailed"), 5000);
		}
	};

	const handleDeviceTypeToggle = async (iPlugin: PluginManager, type: DeviceType) => {
		const currentDeviceType = getDeviceType();
		clearDelayedStart(iPlugin.id);

		const list = [...(iPlugin.disabledDeviceTypes || [])];
		const idx = list.indexOf(type);
		if (idx >= 0) {
			list.splice(idx, 1);
		} else {
			list.push(type);
		}

		const allEnabled = list.length === 0;
		const allDisabled = list.length === 3;
		const currentTypeAllowed = !list.includes(currentDeviceType);
		const newEnabled = allEnabled ? true : allDisabled ? false : currentTypeAllowed;

		const updated = pluginManager.map(p =>
			p.id === iPlugin.id
				? {
					...p,
					startEnabled: allEnabled ? true : allDisabled ? false : true,
					disabledDeviceTypes: list,
					enabled: newEnabled,
					switchTime: new Date().getTime(),
				}
				: p
		);

		// 先更新 UI 和持久化设置
		dispatch(updataPluginManager(updated));
		const newSettings = { ...storeSettings, pluginManager: updated };
		await plugin.saveData(newSettings);

		// 再执行实际的启用/禁用操作（await 完成后插件状态才真正改变）
		if (allEnabled) {
			if (iPlugin.delayStart > 0) {
				await disablePlugin(iPlugin.id);
				await tempEnablePlugin(iPlugin.id);
			} else {
				await enablePlugin(iPlugin.id);
			}
		} else if (allDisabled) {
			await disablePlugin(iPlugin.id);
		} else {
			await disablePlugin(iPlugin.id);
			if (currentTypeAllowed) {
				await tempEnablePlugin(iPlugin.id);
			}
		}

		// 最后刷新插件列表（此时 app.plugins.plugins 已是最新状态）
		getAllPlugins(plugin);
		new Notice(
			t(
				language,
				list.includes(type) ? "deviceDisabled" : "deviceEnabled",
				{
					name: iPlugin.name,
					type: t(language, DEVICE_TYPE_KEYS[type]),
				}
			),
			3000
		);
	};

	return (
		<div className="PluginManagerView">
			<div className="grouping">
				<div className="tag-container">
					<span className={`initial-tag ${showPluginInitial === "#" ? "active-initial" : ""}`} onClick={() => handleLetterClick("#")}>✲</span>
					{uniqueLetters.map((initial, index) => (
						<span
							key={index}
							className={`initial-tag ${showPluginInitial === initial ? "active-initial" : ""}`}
							onClick={() => handleLetterClick(initial)}
						>
							{initial}
						</span>
					))}
				</div>
			</div>
			<div className="pluginManager-table">
				<div className="pluginManager-table-header">
					<GroupView
						language={language}
						searchQuery={searchQuery}
						setSearchQuery={setSearchQuery}
					/>
					<div className="header-actions">
						<button title={t(language, "restoreAllTitle")} onClick={() => restoreConfig()}>{t(language, "restore")}</button>
						<button title={t(language, "saveAllTitle")} onClick={() => saveConfig()}>{t(language, "save")}</button>
					</div>
				</div>
				<table>
					<thead>
						<tr>
							<th onClick={() => handleHeaderClick('name')} >
								{t(language, "pluginCount", {
									count: pluginManager.length,
									enabled: getEnabledPlugins,
									disabled: getDisabledPlugins,
								})}{" "}
								{storeField === "name" && storeOrder === "asc" && "↑"}
								{storeField === "name" && storeOrder === "desc" && "↓"}
							</th>
							<th onClick={() => handleHeaderClick('enabled')} >
								{t(language, "status")}{" "}
								{storeField === "enabled" && storeOrder === "asc" && "↑"}
								{storeField === "enabled" && storeOrder === "desc" && "↓"}
							</th>
							<th onClick={() => handleHeaderClick('delayStart')} >
								{t(language, "delayStart")}
								{storeField === "delayStart" && storeOrder === "asc" && "↑"}
								{storeField === "delayStart" && storeOrder === "desc" && "↓"}
							</th>
							<th>{t(language, "deviceTypes")}</th>
							<th onClick={() => handleHeaderClick('switchTime')} >
								{t(language, "modifiedTime")}{" "}
								{storeField === "switchTime" && storeOrder === "asc" && "↑"}
								{storeField === "switchTime" && storeOrder === "desc" && "↓"}
							</th>
							<th onClick={() => handleHeaderClick('comment')} >
								{t(language, "notes")}{" "}
								{storeField === "comment" && storeOrder === "asc" && "↑"}
								{storeField === "comment" && storeOrder === "desc" && "↓"}
							</th>
						</tr>
					</thead>
					<tbody>
						{sortedPlugins
							.filter(Iplugin => showPluginInitial == "#" || showPluginInitial == Iplugin.name[0])
							.map((Iplugin) => {
								return (
									<tr key={Iplugin.id}>
										<td className={Iplugin.enabled ? "enabled" : "disable"} onClick={() => { handleSettingClick(Iplugin) }}>
											<div className={`plugin-name ${(plugin.app as InternalApp).isMobile && Iplugin.isDesktopOnly ? "isDesktopOnly" : ""}`}>
												<div>{Iplugin.name}</div>
												<div className="plugin-setting">{Iplugin.enabled && (plugin.app as InternalApp).setting.pluginTabs.find((P: { id: string }) => P.id === Iplugin.id) ? "  ⚙️" : "   "}<div className="version">{Iplugin.version}</div></div>
											</div>
										</td>
										<td>
											{Iplugin.id != "plugins-control" ? (
												<Switch
													label=""
													description=""
													value={Iplugin.enabled}
													onChange={() => { handleChange(Iplugin) }}
												/>
											) : "⚪"}
										</td>
										<td>
											{Iplugin.id != "plugins-control" ?
												<input
													type="number"
													min="0"
													max="999"
													placeholder="0"
													defaultValue={Iplugin.delayStart || ""}
													onBlur={(e) => {
														const value = parseInt(e.currentTarget.value);
														handleDelayStartChange(Iplugin, isNaN(value) ? 0 : value);
													}}
												/> : "0"}
										</td>
										<td>
											<div className="device-type-checkboxes">
												{(["phone", "tablet", "desktop"] as DeviceType[]).map(type => {
													const isSelf = Iplugin.id === "plugins-control";
													const isChecked = !isSelf && (Iplugin.disabledDeviceTypes || []).includes(type);
													return (
														<label key={type} className={`device-type-cb ${isChecked ? "checked" : ""}`} title={isSelf ? t(language, "alwaysEnabled") : t(language, isChecked ? "disabledOn" : "enabledOn", { type: t(language, DEVICE_TYPE_KEYS[type]) })}>
															<input
																type="checkbox"
																checked={isChecked}
																disabled={isSelf}
																onChange={() => handleDeviceTypeToggle(Iplugin, type)}
															/>
															<span>{DEVICE_TYPE_ICONS[type]}</span>
														</label>
													);
												})}
											</div>
										</td>
										<td>
											{getSwitchTimeByPluginId(Iplugin.id) === 0
												? 0
												: new Date(getSwitchTimeByPluginId(Iplugin.id)).toLocaleString()}
										</td>
										<td>
											<PluginCommentCell
												plugin={plugin}
												Iplugin={Iplugin}
												editing={!!pluginNote[Iplugin.id]}
												value={Iplugin.comment}
												placeholder={`${Iplugin.description || ""}\n[${t(language, Iplugin.id === "plugins-control" ? "repoHome" : "communityHome")}](${Iplugin.id === "plugins-control" ? "https://github.com/ssjy1919/plugins-control/tree/main" : `obsidian://show-plugin?id=${Iplugin.id}`})`}
												onChange={v => handleCommentChange(Iplugin, v)}
												onEdit={() => {
													if (!Iplugin.comment && Iplugin.description) {
														const link = Iplugin.id === "plugins-control"
															? "https://github.com/ssjy1919/plugins-control/tree/main"
															: `obsidian://show-plugin?id=${Iplugin.id}`;
														const label = t(language, Iplugin.id === "plugins-control" ? "repoHome" : "communityHome");
														handleCommentChange(Iplugin, `${Iplugin.description}\n[${label}](${link})`);
													}
													setPluginNote({ ...pluginNote, [Iplugin.id]: true });
												}}
												onBlur={() => setPluginNote({ ...pluginNote, [Iplugin.id]: false })}
											/>
										</td>
									</tr>
								);
							})}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default PluginManagerView;
