import "./GroupView.css";
import { Language } from "../types";
import { t } from "../i18n";

interface GroupViewProps {
	language: Language;
	searchQuery: string;
	setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

const GroupView: React.FC<GroupViewProps> = ({ language, searchQuery = "", setSearchQuery }) => {
	return (
		<div className="GroupView">
			<input
				type="text"
				className="GroupView-search"
				placeholder={t(language, "search")}
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
			/>
		</div>
	);
};

export default GroupView;
