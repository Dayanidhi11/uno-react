import { useState, useEffect } from "react";
import "./PrivateLobby.css";

const PrivateLobby = ({ socket, currentMatch, onLeaveMatch, user }) => {
	const [lobbyState, setLobbyState] = useState(null);
	const [isHost, setIsHost] = useState(false);

	useEffect(() => {
		if (!socket) {
			console.log("🔍 PrivateLobby: No socket available");
			return;
		}

		console.log(
			"🔍 PrivateLobby: Setting up socket listener for user:",
			user?.id
		);

		const handleMatchData = (matchData) => {
			try {
				console.log("🔍 PrivateLobby: Received match data:", matchData);

				if (matchData.op_code === 1) {
					// Match data
					const data = JSON.parse(matchData.data);
					console.log("🔍 PrivateLobby: Parsed data:", data);

					if (data.type === "lobby_state") {
						console.log("📋 Received lobby state:", data);
						setLobbyState(data);

						// Host is provided by server explicitly
						const hostId = data.hostId || null;
						const isUserHost = hostId === user?.id;
						console.log(
							"🎯 Host check - Host ID:",
							hostId,
							"User ID:",
							user?.id,
							"Is Host:",
							isUserHost
						);
						setIsHost(isUserHost);
					}
				}
			} catch (error) {
				console.error("Error parsing lobby message:", error);
			}
		};

		// Use Nakama's socket event handlers
		socket.onmatchdata = handleMatchData;

		return () => {
			if (socket.onmatchdata === handleMatchData) {
				socket.onmatchdata = null;
			}
		};
	}, [socket, user]);

	const handleAddBot = () => {
		console.log("🤖 Add bot functionality will be implemented");
		// Send add bot message to backend
		if (socket && currentMatch) {
			const message = {
				type: "add_bot",
			};
			socket.sendMatchState(currentMatch.match_id, 1, JSON.stringify(message));
		}
	};

	const handleRemoveBot = (botId) => {
		console.log(
			"🤖 Remove bot functionality will be implemented for bot:",
			botId
		);
		// Send remove bot message to backend
		if (socket && currentMatch) {
			const message = {
				type: "remove_bot",
				bot_id: botId,
			};
			socket.sendMatchState(currentMatch.match_id, 1, JSON.stringify(message));
		}
	};

	const handleStartEarly = () => {
		console.log("🚀 Start early functionality will be implemented");
		// Send start game message to backend
		if (socket && currentMatch) {
			const message = {
				type: "start_game",
			};
			socket.sendMatchState(currentMatch.match_id, 1, JSON.stringify(message));
		}
	};

	// Host/seat action helpers
	const sendAction = (action) => {
		if (!socket || !currentMatch) return;
		socket.sendMatchState(currentMatch.match_id, 1, JSON.stringify(action));
	};

	const approveToSeat = (userId, seatIndex) => {
		sendAction({
			type: "approve_seat",
			user_id: userId,
			seat_index: seatIndex,
		});
	};

	const denyJoin = (userId) => {
		sendAction({ type: "deny_join", user_id: userId });
	};

	const assignBotToSeat = (seatIndex) => {
		sendAction({ type: "assign_bot", seat_index: seatIndex });
	};

	const removeSeat = (seatIndex) => {
		sendAction({ type: "remove_seat", seat_index: seatIndex });
	};

	const setSeatTeam = (seatIndex, team) => {
		sendAction({ type: "set_seat_team", seat_index: seatIndex, team });
	};

	const copyMatchId = () => {
		navigator.clipboard.writeText(currentMatch?.match_id);
		// You could add a toast notification here
	};

	const requestSeat = (seatIndex) => {
		sendAction({ type: "request_seat", seat_index: seatIndex });
	};

	// Derived flags for current user will be set after displayLobbyState below

	// Create fallback lobby state if no data from backend yet
	const displayLobbyState = lobbyState || {
		matchType: "private",
		hostId: user?.id || null,
		gameMode: "2p",
		maxPlayers: 2,
		isTeamMode: false,
		players: {
			[user?.id]: {
				username: user?.username || "You",
				isBot: false,
				team: null,
			},
		},
		bots: {},
		seats: [
			{
				index: 0,
				type: "player",
				userId: user?.id,
				username: user?.username || "You",
				team: null,
			},
			{ index: 1, type: "empty", userId: null, username: null, team: null },
		],
		pending: {},
		canStart: false,
		waitingForPlayers: true,
	};

	const playerIds = Object.keys(displayLobbyState.players || {});
	const playerCount = playerIds.length;

	return (
		<div className="private-lobby">
			<div className="lobby-header">
				<h2>🎮 Private Lobby</h2>
				<div className="match-info">
					<div className="match-id-section">
						<span className="match-id-label">Match ID:</span>
						<span className="match-id">{currentMatch?.match_id}</span>
						<button
							className="copy-btn"
							onClick={copyMatchId}
							title="Copy Match ID"
						>
							📋
						</button>
					</div>
					<div className="game-mode-info">
						<span className="mode-label">Mode:</span>
						<span className="mode-value">
							{displayLobbyState.gameMode === "2p" && "2 Players"}
							{displayLobbyState.gameMode === "4p" && "4 Players"}
							{displayLobbyState.gameMode === "2v2" && "2v2 Team Battle"}
						</span>
					</div>
					<div className="player-count">
						<span>
							{playerCount}/{displayLobbyState.maxPlayers} Players
						</span>
					</div>
				</div>
			</div>

			<div className="lobby-content">
				<div className="players-section">
					<h3>👥 Lobby</h3>
					<div className="players-grid">
						{(displayLobbyState.seats || []).map((seat) => {
							const occupied = seat.type !== "empty";
							const isBot = seat.type === "bot";
							const teamLabel = displayLobbyState.isTeamMode
								? seat.team === "A"
									? "Team A (Top/Bottom)"
									: seat.team === "B"
									? "Team B (Left/Right)"
									: "Unassigned"
								: null;
							return (
								<div
									key={`seat-${seat.index}`}
									className={`player-seat ${
										occupied
											? isBot
												? "bot-player"
												: "human-player"
											: "empty-seat"
									}`}
								>
									<div className="player-info">
										<span className="player-name">
											{isBot ? "🤖 " : occupied ? "👤 " : ""}
											{occupied ? seat.username : "Empty seat"}
										</span>
										{teamLabel && (
											<span className={`team-badge ${seat.team}`}>
												{teamLabel}
											</span>
										)}
									</div>
									{isHost && (
										<div className="seat-controls">
											{occupied ? (
												<button
													className="remove-seat-btn"
													onClick={() => removeSeat(seat.index)}
													title="Remove from seat"
												>
													❌ Remove
												</button>
											) : (
												<button
													className="add-bot-btn"
													onClick={() => assignBotToSeat(seat.index)}
													title="Assign bot"
												>
													🤖 Add Bot
												</button>
											)}
											{displayLobbyState.isTeamMode && (
												<div className="team-switch">
													<span>Team:</span>
													<button
														onClick={() => setSeatTeam(seat.index, "A")}
														className={seat.team === "A" ? "active" : ""}
													>
														A (Top/Bottom)
													</button>
													<button
														onClick={() => setSeatTeam(seat.index, "B")}
														className={seat.team === "B" ? "active" : ""}
													>
														B (Left/Right)
													</button>
												</div>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>

				{isHost && Object.keys(displayLobbyState.pending || {}).length > 0 && (
					<div className="pending-section">
						<h3>🕒 Pending Joiners</h3>
						<div className="pending-list">
							{Object.entries(displayLobbyState.pending).map(([uid, info]) => (
								<div key={uid} className="pending-item">
									<span>{info.username || uid}</span>
									<div className="pending-actions">
										{/* Approve to first available empty seat */}
										<button
											onClick={() => {
												const empty = (displayLobbyState.seats || []).find(
													(s) => s.type === "empty"
												);
												if (empty) approveToSeat(uid, empty.index);
											}}
										>
											✅ Approve & Seat
										</button>
										<button onClick={() => denyJoin(uid)}>❌ Deny</button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				<div className="lobby-controls">
					{isHost && (
						<div className="host-controls">
							<h4>🎯 Host Controls</h4>
							<div className="control-buttons">
								<button
									className="btn btn-primary"
									onClick={handleStartEarly}
									disabled={!displayLobbyState.canStart}
									title={
										displayLobbyState.canStart
											? "Start game now"
											: "Need more players"
									}
								>
									🚀 Start Game Early
								</button>
								<button
									className="btn btn-secondary"
									onClick={handleAddBot}
									disabled={playerCount >= displayLobbyState.maxPlayers}
									title="Add a bot player"
								>
									🤖 Add Bot
								</button>
							</div>
						</div>
					)}

					<div className="lobby-actions">
						<button className="btn btn-danger" onClick={onLeaveMatch}>
							🚪 Leave Lobby
						</button>
					</div>
				</div>

				{isHost && !displayLobbyState.canStart && (
					<div className="host-instructions">
						<p>As the host, you can:</p>
						<ul>
							<li>Approve pending players to assign them to seats</li>
							<li>Assign bots to empty seats</li>
							<li>Remove players or bots from seats</li>
							{displayLobbyState.isTeamMode && (
								<li>
									Assign players/bots to Team A (Top/Bottom) or Team B
									(Left/Right)
								</li>
							)}
						</ul>
						<p>Game will start automatically when all seats are filled.</p>
					</div>
				)}

				<div className="lobby-status">
					{displayLobbyState.waitingForPlayers ? (
						<p className="status-waiting">
							⏳ Waiting for players to join... Share the Match ID with friends!
						</p>
					) : (
						<p className="status-ready">
							✅ Ready to start! Game will begin automatically when full.
						</p>
					)}
				</div>
			</div>
		</div>
	);
};

export default PrivateLobby;
