import PluginManagerPlugin from "../main";
import "./GroupView.css";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, updataSettings, updataPluginGroups } from "../store";

interface GroupViewProps {
	plugin: PluginManagerPlugin;
	searchQuery: string;
	setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

const GroupView: React.FC<GroupViewProps> = ({ plugin, searchQuery = "",
	setSearchQuery }) => {
	const [isInputVisible, setInputVisible] = useState(false);
	const [pluginGroup, setPluginGroup] = useState("");
	const storeSettings = useSelector((state: RootState) => state.settings);
	const storePluginGroups = useSelector((state: RootState) => state.settings.pluginGroups);
	const dispatch = useDispatch();

	const handleAddItemClik = () => {
		if (pluginGroup && !storePluginGroups.includes(pluginGroup)) {
			dispatch(updataPluginGroups([...storePluginGroups, pluginGroup]));
			const newSettings = {
				...storeSettings,
				pluginGroups: [...storePluginGroups, pluginGroup],
			};
			plugin.saveData(newSettings);
		}
		setPluginGroup("");
		setInputVisible(!isInputVisible);
	};
	const handleCancelClik = () => {
		setPluginGroup("");
		setInputVisible(!isInputVisible);
	};
	const handleDelayStartChange = (value: string) => {
		if (value.trim()) {
			setPluginGroup(value.trim());
		}
	};

	const handleDeleteItemClick = (group: string) => {
		const updatadGroups = storePluginGroups.filter((item) => item !== group);
		const newSettings = {
			...storeSettings,
			pluginGroups: updatadGroups,
			pluginManager: storeSettings.pluginManager.map((plugin) => ({
				...plugin,
				tags: plugin.tags.filter((tag) => tag !== group),
			})),
		};
		plugin.saveData(newSettings);
		dispatch(updataSettings(newSettings));
	};

	const handleShowGroupClick = (group: string) => {
		const newSettings = {
			...storeSettings,
			showPluginGroups: group,
			showPluginInitial: "#",
		};
		plugin.saveData(newSettings);
		dispatch(updataSettings(newSettings));
	};
	return (
		<div className="GroupView">
			<input
				type="text"
				className="GroupView-search"
				placeholder="搜: 名字/备注"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
			/>
			<div
				className={`GroupView-title GroupView-group ${storeSettings.showPluginGroups === "" ? "GroupView-active" : ""
					}`}
				onClick={() => handleShowGroupClick("")}
			>
				全部
			</div>
			{storePluginGroups.map((group, index) => (
				<div
					key={index}
					className={`GroupView-group ${storeSettings.showPluginGroups === group ? "GroupView-active" : ""
						}`}
					onClick={() => handleShowGroupClick(group)}
				>
					{group}
					{isInputVisible && (
						<span
							className="GroupView-delete"
							onClick={(e) => {
								e.stopPropagation();
								handleDeleteItemClick(group);
							}}
						>
							×
						</span>
					)}
				</div>
			))}
			<div className="GroupView-container">
				{isInputVisible && (
					<input
						type="text"
						placeholder="分组名字"
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleDelayStartChange(e.currentTarget.value.trim());
							}
						}}
						onBlur={(e) => handleDelayStartChange(e.target.value.trim())}
					/>
				)}
				<div className="GroupView-setting">
					<button onClick={handleAddItemClik}>
						{isInputVisible ? "添加" : `➕`}
					</button>
					<button onClick={handleCancelClik} style={{ display: isInputVisible ? "inline-flex" : "none" }}>
						{isInputVisible ? "取消" : ``}
					</button>
				</div>
			</div>
		</div>
	);
};

export default GroupView;
