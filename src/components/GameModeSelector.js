import React, { useState } from "react";
import "./GameModeSelector.css";

const GameModeSelector = ({ onModeSelect, onCancel, matchType = "random" }) => {
	const [selectedMode, setSelectedMode] = useState(null);

	const gameModes = [
		{
			id: "2p",
			name: "2 Players",
			description: "Classic 1v1 UNO match",
			playerCount: 2,
			icon: "👥",
			isTeamMode: false,
		},
		{
			id: "4p",
			name: "4 Players",
			description: "Free-for-all with 4 players",
			playerCount: 4,
			icon: "👥👥",
			isTeamMode: false,
		},
		{
			id: "2v2",
			name: "2v2 Team Battle",
			description: "Team-based UNO match",
			playerCount: 4,
			icon: "🔴🔵",
			isTeamMode: true,
		},
	];

	const handleModeSelect = (mode) => {
		setSelectedMode(mode);
	};

	const handleConfirm = () => {
		if (selectedMode) {
			const gameConfig = {
				gameMode: selectedMode.id,
				playerCount: selectedMode.playerCount,
				isTeamMode: selectedMode.isTeamMode,
				botSettings: {
					allowBots: true,
					botTimeout: 5,
				},
			};
			onModeSelect(gameConfig);
		}
	};

	return (
		<div className="game-mode-selector-overlay">
			<div className="game-mode-selector">
				<div className="selector-header">
					<h2>🎮 Select Game Mode</h2>
					<p>
						Choose your preferred game mode for{" "}
						{matchType === "private" ? "Private Match" : "Random Match"}
					</p>
				</div>

				<div className="mode-options">
					{gameModes.map((mode) => (
						<div
							key={mode.id}
							className={`mode-option ${
								selectedMode?.id === mode.id ? "selected" : ""
							}`}
							onClick={() => handleModeSelect(mode)}
						>
							<div className="mode-icon">{mode.icon}</div>
							<div className="mode-info">
								<h3>{mode.name}</h3>
								<p>{mode.description}</p>
								<div className="mode-details">
									<span className="player-count">
										{mode.playerCount} Players
									</span>
									{mode.isTeamMode && (
										<span className="team-badge">Team Mode</span>
									)}
								</div>
							</div>
						</div>
					))}
				</div>

				<div className="selector-actions">
					<button className="btn btn-secondary" onClick={onCancel}>
						Cancel
					</button>
					<button
						className="btn btn-primary"
						onClick={handleConfirm}
						disabled={!selectedMode}
					>
						{matchType === "private"
							? "Create Private Match"
							: "Find Random Match"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default GameModeSelector;
