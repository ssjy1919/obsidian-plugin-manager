import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PluginManagerPlugin from "../main";
import { RootState, updataSettings, updataPluginManager } from "../store";
import { PluginManager } from "../types";
import "./MakeTagsView.css";

interface MakeTagsViewProps {
	Iplugin: PluginManager;
	plugin: PluginManagerPlugin;
}

const MakeTagsView: React.FC<MakeTagsViewProps> = ({ Iplugin, plugin }) => {
	const [isDropdownVisible, setDropdownVisible] = useState(false);

	const storeSettings = useSelector((state: RootState) => state.settings);
	const pluginGroups = useSelector((state: RootState) => state.settings.pluginGroups);
	const dispatch = useDispatch();

	const currentTags = Iplugin.tags || [];

	const handleTagChange = async (value: string) => {
		if (value && !currentTags.includes(value)) {
			const updatadTags = [...currentTags, value];

			const updatadPlugin = {
				...Iplugin,
				tags: updatadTags,
				switchTime: new Date().getTime(),
			};

			const newPluginManager = storeSettings.pluginManager.map((p) =>
				p.id === Iplugin.id ? updatadPlugin : p
			);
			dispatch(updataPluginManager(newPluginManager));
			const newSettings = {
				...storeSettings,
				pluginManager: newPluginManager,
			};
			await plugin.saveData(newSettings);
		}
		setDropdownVisible(false);
	};

	const handleDeleteTagClick = async (tag: string) => {
		const updatadTags = currentTags.filter((item) => item !== tag);
		const updatadPlugin = {
			...Iplugin,
			tags: updatadTags,
			switchTime: new Date().getTime(),
		};

		const newPluginManager = storeSettings.pluginManager.map((p) =>
			p.id === Iplugin.id ? updatadPlugin : p
		);
		dispatch(updataPluginManager(newPluginManager));
		const newSettings = {
			...storeSettings,
			pluginManager: storeSettings.pluginManager.map((p) =>
				p.id === Iplugin.id ? updatadPlugin : p
			),
		};
		await plugin.saveData(newSettings);
	};

	const handleShowTagClick = async (tag: string) => {
		const newSettings = {
			...storeSettings,
			showPluginGroups: tag,
			showPluginInitial: "#",
		};
		dispatch(updataSettings(newSettings));
		await plugin.saveData(newSettings);
	};

	return (
		<div className="MakeTagsView">
			{currentTags.map((tag, index) => (
				<div key={index} className={`MakeTagsView-tag ${storeSettings.showPluginGroups === tag ? "GroupView-active" : ""
					}`} onClick={() => handleShowTagClick(tag)}>
					{tag}
					{isDropdownVisible && (
						<span
							className="MakeTagsView-delete"
							onClick={(e) => {
								e.stopPropagation();
								handleDeleteTagClick(tag);
							}}
						>
							×
						</span>
					)}
				</div>
			))}
			<div className="MakeTagsView-container">
				{isDropdownVisible && (
					<select
						value={""}
						onChange={(e) => handleTagChange(e.target.value)}
					>
						<option value="" disabled>
							选择分组
						</option>
						{pluginGroups
							.filter((option) => !currentTags.includes(option))
							.map((option, index) => (
								<option key={index} value={option}>
									{option}
								</option>
							))}
					</select>
				)}
				<div className="MakeTagsView-enter">
					{isDropdownVisible && (
						<>
							<span onClick={() => setDropdownVisible(false)}>取消</span>
						</>
					)}
				</div>
			</div>

			<div className="MakeTagsView-setting">
				{!isDropdownVisible && (
					<span onClick={() => setDropdownVisible(true)}>+</span>
				)}
			</div>
		</div>
	);
};

export default MakeTagsView;
