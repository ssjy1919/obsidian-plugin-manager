import PluginManagerPlugin from "../main";
import { Switch } from "../components/Switch";
import "./PluginManagerView.css"
import { useDispatch } from "react-redux";
import { RootState, updataSettings, updataPluginManager } from "../store";
import { useSelector } from "react-redux";
import { DeviceType, PluginManager } from "../types";
import { disablePlugin, enablePlugin, tempEnablePlugin, getAllPlugins, getDeviceType, getSwitchTimeByPluginId, openPluginSettings } from "./PMtools";
import { useMemo, useState } from "react";
import GroupView from "./GroupView";
import { Notice } from "obsidian";
import PluginCommentCell from "./PluginCommentCell";

const DEVICE_TYPE_ICONS: Record<DeviceType, string> = {
	phone: "📱",
	tablet: "📋",
	desktop: "💻",
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
		//@ts-ignore
		if (plugin.app.isMobile && iPlugin.isDesktopOnly) {
			new Notice("该插件不支持移动端使用");
			return;
		}

		const turningOn = !iPlugin.enabled;
		const updatadPlugins = pluginManager.map(p => {
			if (p.id === iPlugin.id) {
				return {
					...p,
					enabled: turningOn,
					switchTime: new Date().getTime(),
					// 开启 → 全部设备类型启用；关闭 → 全部设备类型禁用
					disabledDeviceTypes: turningOn ? [] : (["phone", "tablet", "desktop"] as DeviceType[]),
				};
			}
			return p;
		});

		if (turningOn) {
			// 全部设备类型启用 → 持久化启用（重启后自动加载）
			await enablePlugin(iPlugin.id);
		} else {
			// 全部设备类型禁用 → 持久化禁用（重启后不加载）
			await disablePlugin(iPlugin.id);
		}

		const newSettings = { ...storeSettings, pluginManager: updatadPlugins };
		await plugin.saveData(newSettings);
		dispatch(updataPluginManager(updatadPlugins));
		getAllPlugins(plugin);
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
		if (iPlugin.enabled)
			if (newDelayStart > 0) {
				await disablePlugin(iPlugin.id);
				//@ts-ignore
				await app.plugins.enablePlugin(iPlugin.id);
			} else if (newDelayStart === 0) {
				await enablePlugin(iPlugin.id);
			}
		const newSettings = { ...storeSettings, pluginManager: updatadPlugins };
		dispatch(updataPluginManager(updatadPlugins));
		await plugin.saveData(newSettings);
		getAllPlugins(plugin);
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
		const newSettings = { ...storeSettings, secondPluginManager: storeSettings.pluginManager };
		dispatch(updataSettings(newSettings));
		await plugin.saveData(newSettings);
		getAllPlugins(plugin);
		new Notice('插件配置保存成功', 3000);
	}
	const restoreConfig = async () => {
		try {
			new Notice('插件状态恢复中...', 2000);
			const promises = storeSettings.secondPluginManager.map(async (p) => {
				//@ts-ignore
				if (plugin.app.isMobile && p.isDesktopOnly) return;
				if (p.delayStart > 0) {
					p.enabled
						//@ts-ignore
						? await plugin.app.plugins.enablePlugin(p.id)
						//@ts-ignore
						: await plugin.app.plugins.disablePlugin(p.id);
				} else {
					p.enabled ? await enablePlugin(p.id) : await disablePlugin(p.id);
				}
			});
			await Promise.all(promises);

			const newSettings = { ...storeSettings, pluginManager: storeSettings.secondPluginManager };
			dispatch(updataSettings(newSettings));
			await plugin.saveData(newSettings);
			getAllPlugins(plugin);
			new Notice('插件状态恢复完成', 5000);
		} catch (error) {
			console.error('恢复插件配置失败:', error);
			new Notice('恢复插件配置失败', 5000);
		}
	};

	const handleDeviceTypeToggle = async (iPlugin: PluginManager, type: DeviceType) => {
		const currentDeviceType = getDeviceType();

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
				? { ...p, disabledDeviceTypes: list, enabled: newEnabled, switchTime: new Date().getTime() }
				: p
		);

		// 先更新 UI 和持久化设置
		dispatch(updataPluginManager(updated));
		const newSettings = { ...storeSettings, pluginManager: updated };
		await plugin.saveData(newSettings);

		// 再执行实际的启用/禁用操作（await 完成后插件状态才真正改变）
		if (allEnabled) {
			await enablePlugin(iPlugin.id);
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
						searchQuery={searchQuery}
						setSearchQuery={setSearchQuery}
					/>
					<div className="header-actions">
						<button title="恢复所有插件开关状态" onClick={() => restoreConfig()}>恢复</button>
						<button title="保存所有插件开关状态" onClick={() => saveConfig()}>保存</button>
					</div>
				</div>
				<table>
					<thead>
						<tr>
							<th onClick={() => handleHeaderClick('name')} >
								一共{pluginManager.length}个插件，开启{getEnabledPlugins}关闭{getDisabledPlugins}{" "}
								{storeField === "name" && storeOrder === "asc" && "↑"}
								{storeField === "name" && storeOrder === "desc" && "↓"}
							</th>
							<th onClick={() => handleHeaderClick('enabled')} >
								状态{" "}
								{storeField === "enabled" && storeOrder === "asc" && "↑"}
								{storeField === "enabled" && storeOrder === "desc" && "↓"}
							</th>
							<th onClick={() => handleHeaderClick('delayStart')} >
								延时启动(秒)
								{storeField === "delayStart" && storeOrder === "asc" && "↑"}
								{storeField === "delayStart" && storeOrder === "desc" && "↓"}
							</th>
							<th>启停设备类型</th>
							<th onClick={() => handleHeaderClick('switchTime')} >
								更改时间{" "}
								{storeField === "switchTime" && storeOrder === "asc" && "↑"}
								{storeField === "switchTime" && storeOrder === "desc" && "↓"}
							</th>
							<th onClick={() => handleHeaderClick('comment')} >
								备注{" "}
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
											{/* @ts-ignore */}
											<div className={`plugin-name ${plugin.app.isMobile && Iplugin.isDesktopOnly ? "isDesktopOnly" : ""}`}>
												<div>{Iplugin.name}</div>
												{/* @ts-ignore */}
												<div className="plugin-setting">{Iplugin.enabled && plugin.app.setting.pluginTabs.find((P: { id: string }) => P.id === Iplugin.id) ? "  ⚙️" : "   "}<div className="version">{Iplugin.version}</div></div>
											</div>
										</td>
										<td>
											{Iplugin.id != "obsidian-plugin-manager" ? (
												<Switch
													label=""
													description=""
													value={Iplugin.enabled}
													onChange={() => { handleChange(Iplugin) }}
												/>
											) : "⚪"}
										</td>
										<td>
											{Iplugin.id != "obsidian-plugin-manager" ?
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
													const isSelf = Iplugin.id === "obsidian-plugin-manager";
													const isChecked = !isSelf && (Iplugin.disabledDeviceTypes || []).includes(type);
													return (
														<label key={type} className={`device-type-cb ${isChecked ? "checked" : ""}`} title={isSelf ? "插件管理器始终启用" : isChecked ? `在${type === "phone" ? "手机" : type === "tablet" ? "iPad" : "电脑"}启用` : `在${type === "phone" ? "手机" : type === "tablet" ? "iPad" : "电脑"}上禁用`}>
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
												placeholder={`${Iplugin.description || ""}\n[${Iplugin.id === "obsidian-plugin-manager" ? "仓库主页" : "社区主页"}](${Iplugin.id === "obsidian-plugin-manager" ? "https://github.com/ssjy1919/obsidian-plugin-manager/tree/main" : `obsidian://show-plugin?id=${Iplugin.id}`})`}
												onChange={v => handleCommentChange(Iplugin, v)}
												onEdit={() => {
													if (!Iplugin.comment && Iplugin.description) {
														const link = Iplugin.id === "obsidian-plugin-manager"
															? "https://github.com/ssjy1919/obsidian-plugin-manager/tree/main"
															: `obsidian://show-plugin?id=${Iplugin.id}`;
														const label = Iplugin.id === "obsidian-plugin-manager" ? "仓库主页" : "社区主页";
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
