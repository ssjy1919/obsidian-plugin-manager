import "./GroupView.css";

interface GroupViewProps {
	searchQuery: string;
	setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

const GroupView: React.FC<GroupViewProps> = ({ searchQuery = "", setSearchQuery }) => {
	return (
		<div className="GroupView">
			<input
				type="text"
				className="GroupView-search"
				placeholder="搜索"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
			/>
		</div>
	);
};

export default GroupView;
