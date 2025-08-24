import React, { useState, useEffect, useCallback } from "react";
import { Client } from "@heroiclabs/nakama-js";
import AuthScreen from "./AuthScreen";
import GameLobby from "./GameLobby";
import GameBoard from "./GameBoard";
import GameLog from "./GameLog";
import "./UnoGame.css";

const UnoGame = () => {
	// Game state
	const [gameState, setGameState] = useState("auth"); // 'auth', 'lobby', 'playing'
	const [client, setClient] = useState(null);
	const [session, setSession] = useState(null);
	const [socket, setSocket] = useState(null);
	const [currentMatch, setCurrentMatch] = useState(null);
	const [playerHand, setPlayerHand] = useState([]);
	const [playableCards, setPlayableCards] = useState([]);
	const [gameData, setGameData] = useState(null);
	const [logs, setLogs] = useState([]);
	const [timerData, setTimerData] = useState(null);
	const [currentUserId, setCurrentUserId] = useState(() => {
		// Initialize from localStorage if available
		return localStorage.getItem("uno_current_user_id") || null;
	});

	// Initialize Nakama client
	useEffect(() => {
		const initClient = () => {
			try {
				// Try the same configuration that worked in vanilla JS
				const nakamaClient = new Client("defaultkey", "localhost", "7350");
				nakamaClient.ssl = false;
				setClient(nakamaClient);
				addLog("✅ Nakama client initialized");
			} catch (error) {
				addLog(`❌ Failed to initialize client: ${error.message}`, "error");
			}
		};

		initClient();
	}, []);

	// Utility function to add logs with throttling
	const addLog = useCallback((message, type = "info", skipUI = false) => {
		const timestamp = new Date().toLocaleTimeString();
		console.log(`[UNO] ${message}`);

		// Skip UI updates for frequent/debug messages to prevent flickering
		if (!skipUI) {
			setLogs((prev) => {
				// Limit logs to last 50 entries to prevent memory issues
				const newLogs = [...prev, { timestamp, message, type }];
				return newLogs.slice(-50);
			});
		}
	}, []);

	// Authentication functions
	const loginAsGuest = async () => {
		try {
			addLog("Logging in as guest...");

			if (!client) {
				addLog("❌ Client not initialized", "error");
				return;
			}

			addLog("🔑 Attempting device authentication...");

			// Get or create a persistent device ID for this browser
			let deviceId = localStorage.getItem("uno_device_id");
			if (!deviceId) {
				// Generate a device ID that's at least 10 characters (10-128 bytes required)
				deviceId =
					"device_" +
					Math.random().toString(36).substring(2) +
					"_" +
					Date.now();
				localStorage.setItem("uno_device_id", deviceId);
				addLog(`📱 Generated new Device ID: ${deviceId}`);
			} else {
				addLog(`📱 Using stored Device ID: ${deviceId}`);
			}

			// Use the correct parameters as per official documentation
			// Generate a unique username or let Nakama auto-generate one
			const username =
				"UnoPlayer_" + Math.random().toString(36).substring(2, 8);
			const authResult = await client.authenticateDevice(
				deviceId,
				true,
				username
			);
			addLog(`🎮 Username: ${username}`);
			console.log("🔍 AUTH RESULT:", authResult);
			console.log("🔍 AUTH RESULT KEYS:", Object.keys(authResult));
			console.log("🔍 AUTH RESULT user_id:", authResult.user_id);
			console.log("🔍 AUTH RESULT userId:", authResult.userId);
			setSession(authResult);
			setCurrentUserId(authResult.user_id);
			// Store user ID in localStorage for persistence
			localStorage.setItem("uno_current_user_id", authResult.user_id);
			console.log("🔍 SESSION SET TO:", authResult);
			console.log("🔍 USER ID SET TO:", authResult.user_id);
			addLog(
				`✅ Logged in! User ID: ${authResult.user_id || authResult.userId}`
			);

			// Create socket connection
			addLog("🔌 Creating socket connection...");
			const newSocket = client.createSocket();
			await newSocket.connect(authResult);
			setSocket(newSocket);
			addLog("✅ Connected to server");

			// Set up socket event handlers now that we have the user ID
			setupSocketHandlers(newSocket);

			setGameState("lobby");
		} catch (error) {
			addLog(`❌ Login failed: ${error.message || "Unknown error"}`, "error");
			console.error("Login error details:", error);

			// Try to get more error details
			if (error.json) {
				try {
					const errorDetails = await error.json();
					addLog(`❌ Error details: ${JSON.stringify(errorDetails)}`, "error");
				} catch (e) {
					addLog(`❌ Could not parse error details`, "error");
				}
			}

			// If authentication fails with stored device ID, clear it and suggest retry
			if (localStorage.getItem("uno_device_id")) {
				addLog(
					"🔄 Clearing stored device ID. Please try logging in again.",
					"info"
				);
				localStorage.removeItem("uno_device_id");
			}
		}
	};

	// Socket event handlers
	const setupSocketHandlers = (socket) => {
		console.log("🔌 Setting up socket handlers...");
		socket.onmatchdata = (matchData) => {
			try {
				console.log("📨 RAW MATCH DATA RECEIVED:", matchData);

				// Use the proper Nakama client method to decode binary data
				const decoder = new TextDecoder();
				let dataString;

				if (matchData.data instanceof Uint8Array) {
					// Direct Uint8Array
					dataString = decoder.decode(matchData.data);
					console.log("🔄 DECODED FROM UINT8ARRAY:", dataString);
				} else if (
					typeof matchData.data === "object" &&
					matchData.data !== null
				) {
					// Object with numeric keys (serialized Uint8Array)
					const bytes = Object.values(matchData.data);
					const uint8Array = new Uint8Array(bytes);
					dataString = decoder.decode(uint8Array);
					console.log("🔄 DECODED FROM OBJECT:", dataString);
				} else if (typeof matchData.data === "string") {
					// Already a string
					dataString = matchData.data;
					console.log("📝 STRING DATA:", dataString);
				} else {
					addLog(`❌ Unexpected data type: ${typeof matchData.data}`, "error");
					console.error(
						"❌ UNEXPECTED DATA TYPE:",
						typeof matchData.data,
						matchData.data
					);
					return;
				}

				const data = JSON.parse(dataString);
				console.log("✅ PARSED MATCH DATA:", data);

				// Get current user ID from localStorage to avoid closure issues
				const storedUserId = localStorage.getItem("uno_current_user_id");
				console.log("🔍 STORED USER ID:", storedUserId);

				// Handle match data directly with stored user ID
				handleMatchDataWithUserId(data, storedUserId);
			} catch (error) {
				addLog(`❌ Error processing match data: ${error.message}`, "error");
				console.error("❌ MATCH DATA ERROR:", error, matchData);
			}
		};

		socket.onmatchpresence = (matchPresence) => {
			addLog(
				`👥 Players in match: ${matchPresence.joins?.length || 0} joined, ${
					matchPresence.leaves?.length || 0
				} left`
			);
		};

		// Matchmaker event handlers
		socket.onmatchmakerticket = (ticket) => {
			console.log("🎫 Matchmaker ticket received:", ticket);
			addLog(`🎫 Matchmaking ticket: ${ticket.ticket}`);
			addLog("⏳ Waiting for opponents...");
		};

		socket.onmatchmakermatched = async (matched) => {
			console.log("🎯 Matchmaker matched:", matched);
			addLog("🎯 Match found! Joining...");

			try {
				// Join the match that was created by the matchmaker
				const match = await socket.joinMatch(matched.match_id);
				setCurrentMatch(match);
				addLog("✅ Joined random match successfully!");
			} catch (error) {
				addLog(`❌ Failed to join matched game: ${error.message}`, "error");
				console.error("Failed to join matched game:", error);
			}
		};

		socket.ondisconnect = () => {
			addLog("❌ Disconnected from server", "error");
		};
	};

	// Handle match data from server with explicit user ID (avoids closure issues)
	const handleMatchDataWithUserId = (data, userId) => {
		// Skip UI logging for frequent timer updates to prevent flickering
		const skipUI = data.type === "timer_update";
		addLog(`📨 Received match data: ${data.type}`, "info", skipUI);
		console.log("🔍 HANDLING MATCH DATA WITH USER ID:", userId);

		switch (data.type) {
			case "player_hand":
				// Handle individual player hand message
				console.log("🔍 PLAYER_HAND MESSAGE RECEIVED:");
				console.log("  - Player ID in message:", data.player_id);
				console.log("  - My user ID:", userId);
				console.log("  - IDs match:", data.player_id === userId);
				console.log("  - Hand data:", data.hand);
				console.log("  - Hand length:", data.hand?.length);

				if (data.player_id === userId) {
					console.log("✅ THIS IS MY HAND!");
					console.log("🃏 RECEIVED MY HAND:", data.hand);
					setPlayerHand(data.hand);
					setPlayableCards(data.playable_cards || []);
					addLog(`🃏 Player hand updated: ${data.hand.length} cards`, "info");
					// Log each card for debugging
					data.hand.forEach((card, index) => {
						console.log(`Card ${index + 1}:`, card);
					});
				} else {
					console.log("❌ NOT MY HAND - this is for another player");
				}
				break;

			case "game_state":
				addLog(
					`🎯 Game state update - Phase: ${data.state?.game_phase}`,
					"info"
				);
				console.log("🔍 FULL GAME STATE DATA:", data);
				setGameData(data.state);

				// Handle new player_hands structure
				console.log("🔍 CHECKING PLAYER HANDS:");
				console.log("  - data.player_hands exists:", !!data.player_hands);
				console.log("  - data.player_hands value:", data.player_hands);
				console.log("  - userId:", userId);
				console.log(
					"  - player_hands keys:",
					data.player_hands ? Object.keys(data.player_hands) : "none"
				);

				console.log("🔍 CONDITION CHECK:");
				console.log("  - data.player_hands truthy:", !!data.player_hands);
				console.log("  - userId truthy:", !!userId);
				console.log(
					"  - Both conditions met:",
					!!(data.player_hands && userId)
				);

				if (data.player_hands && userId) {
					console.log("🔍 LOOKING FOR MY HAND:");
					console.log("  - My user ID:", userId);
					console.log(
						"  - Available player IDs:",
						Object.keys(data.player_hands)
					);

					const myHand = data.player_hands[userId];
					console.log("  - My hand found:", !!myHand);
					console.log("  - My hand data:", myHand);

					if (myHand) {
						console.log("✅ FOUND MY HAND! Setting playerHand state...");
						console.log("🃏 RECEIVED MY HAND:", myHand);
						setPlayerHand(myHand);
						addLog(`🃏 Player hand updated: ${myHand.length} cards`, "info");
						// Log each card for debugging
						myHand.forEach((card, index) => {
							console.log(`Card ${index + 1}:`, card);
						});
					} else {
						console.log("❌ MY HAND NOT FOUND IN PLAYER_HANDS");
						console.log(
							"❌ Available hands for:",
							Object.keys(data.player_hands)
						);
						addLog("❌ My hand not found in game state", "error");
					}
				} else {
					console.log("❌ NO PLAYER HAND DATA IN GAME STATE");
					console.log("❌ Conditions failed:");
					console.log("  - data.player_hands:", !!data.player_hands);
					console.log("  - userId:", !!userId);
					addLog("❌ No player hand data received", "error");
				}

				if (data.state.game_phase === "playing" && gameState !== "playing") {
					setGameState("playing");
					addLog("🎮 Game started!");
				}
				break;
			case "game_started":
				addLog(`🎮 ${data.message}`);
				console.log("🎮 GAME STARTED - waiting for game_state message...");
				break;
			case "player_joined":
				addLog(
					`👤 ${data.player_name} joined (${data.player_count}/2 players)`
				);
				break;
			case "game_over":
				addLog(`🏆 Game Over! Winner: ${data.winner_id}`);
				break;
			case "card_played":
				addLog(`🃏 ${data.player_id} played a card`);
				break;
			case "card_drawn":
				addLog(`📥 ${data.player_id} drew a card`);
				break;
			case "timer_update":
				// Update timer data for GameBoard component
				setTimerData(data);
				console.log(
					`⏰ Timer: ${data.time_remaining}s for ${data.current_player}`
				);
				break;
			case "auto_play":
				addLog(`🤖 ${data.player_id} auto-played a card (timer expired)`);
				break;
			case "auto_draw":
				addLog(`🤖 ${data.player_id} auto-drew a card (timer expired)`);
				break;
			case "game_ended":
				console.log("🏆 GAME ENDED:", data);
				addLog(`🏆 Game ended: ${data.reason}`, "info");

				if (data.final_scores) {
					console.log("🏆 Final scores:", data.final_scores);

					// Display final scores
					Object.values(data.final_scores).forEach((playerScore) => {
						const resultIcon = playerScore.result === "winner" ? "🏆" : "💔";
						const scoreText =
							playerScore.score > 0
								? `+${playerScore.score}`
								: playerScore.score;
						addLog(
							`${resultIcon} ${playerScore.username}: ${scoreText} points (${playerScore.result})`,
							"info"
						);
					});

					// Show winner message
					if (data.winner) {
						const winnerScore = data.final_scores[data.winner];
						if (winnerScore) {
							addLog(`🎉 ${winnerScore.username} wins the game!`, "success");
						}
					}
				}

				// Set game as finished
				setGameData((prev) => ({
					...prev,
					game_phase: "finished",
					final_scores: data.final_scores,
				}));
				break;
			case "player_left":
				addLog(`👋 Player ${data.player_id} left the game`);
				break;
			case "play_card_error":
				console.log("❌ PLAY CARD ERROR:", data);
				addLog(`❌ ${data.message}`, "error");

				// Show more specific error details
				if (data.error === "card_not_owned") {
					addLog(
						"💡 Make sure you're selecting a card from your hand",
						"warning"
					);
				} else if (data.error === "invalid_play") {
					addLog(
						`💡 You can only play cards that match the color (${data.top_card?.color}) or type (${data.top_card?.type}) of the top card`,
						"warning"
					);
				}
				break;
			default:
				addLog(`❓ Unknown match data: ${data.type}`, "info");
				console.log("Full unknown match data:", data);
		}
	};

	// Handle match data from server (legacy - keeping for compatibility)
	const handleMatchData = useCallback(
		(data) => {
			addLog(`📨 Received match data: ${data.type}`, "info");
			console.log("🔍 CURRENT SESSION STATE:", session);
			console.log("🔍 CURRENT USER ID:", currentUserId);

			switch (data.type) {
				case "player_hand":
					// Handle individual player hand message
					console.log("🔍 PLAYER_HAND MESSAGE RECEIVED:");
					console.log("  - Player ID in message:", data.player_id);
					console.log("  - My current user ID:", currentUserId);
					console.log("  - IDs match:", data.player_id === currentUserId);
					console.log("  - Hand data:", data.hand);
					console.log("  - Hand length:", data.hand?.length);

					if (data.player_id === currentUserId) {
						console.log("✅ THIS IS MY HAND!");
						console.log("🃏 RECEIVED MY HAND (NEW FORMAT):", data.hand);
						console.log("🎯 PLAYABLE CARDS:", data.playable_cards);
						setPlayerHand(data.hand);
						setPlayableCards(data.playable_cards || []);
						addLog(`🃏 Player hand updated: ${data.hand.length} cards`, "info");
						// Log each card for debugging
						data.hand.forEach((card, index) => {
							console.log(`Card ${index + 1}:`, card);
						});
					} else {
						console.log("❌ NOT MY HAND - this is for another player");
					}
					break;

				case "game_state":
					addLog(
						`🎯 Game state update - Phase: ${data.state?.game_phase}`,
						"info"
					);
					console.log("🔍 FULL GAME STATE DATA:", data);
					setGameData(data.state);

					// Handle new player_hands structure
					console.log("🔍 CHECKING PLAYER HANDS:");
					console.log("  - data.player_hands exists:", !!data.player_hands);
					console.log("  - data.player_hands value:", data.player_hands);
					console.log("  - currentUserId:", currentUserId);
					console.log(
						"  - player_hands keys:",
						data.player_hands ? Object.keys(data.player_hands) : "none"
					);

					console.log("🔍 CONDITION CHECK:");
					console.log("  - data.player_hands truthy:", !!data.player_hands);
					console.log("  - currentUserId truthy:", !!currentUserId);
					console.log(
						"  - Both conditions met:",
						!!(data.player_hands && currentUserId)
					);

					if (data.player_hands && currentUserId) {
						console.log("🔍 LOOKING FOR MY HAND:");
						console.log("  - My user ID:", currentUserId);
						console.log(
							"  - Available player IDs:",
							Object.keys(data.player_hands)
						);

						const myHand = data.player_hands[currentUserId];
						console.log("  - My hand found:", !!myHand);
						console.log("  - My hand data:", myHand);

						if (myHand) {
							console.log("✅ FOUND MY HAND! Setting playerHand state...");
							console.log("🃏 RECEIVED MY HAND:", myHand);
							setPlayerHand(myHand);
							addLog(`🃏 Player hand updated: ${myHand.length} cards`, "info");
							// Log each card for debugging
							myHand.forEach((card, index) => {
								console.log(`Card ${index + 1}:`, card);
							});
						} else {
							console.log("❌ MY HAND NOT FOUND IN PLAYER_HANDS");
							console.log(
								"❌ Available hands for:",
								Object.keys(data.player_hands)
							);
							addLog("❌ My hand not found in game state", "error");
						}
					} else if (data.player_hand) {
						// Fallback for old structure
						console.log(
							"🃏 RECEIVED PLAYER HAND (OLD FORMAT):",
							data.player_hand
						);
						setPlayerHand(data.player_hand);
						addLog(
							`🃏 Player hand updated: ${data.player_hand.length} cards`,
							"info"
						);
					} else {
						console.log("❌ NO PLAYER HAND DATA IN GAME STATE");
						console.log("❌ Conditions failed:");
						console.log("  - data.player_hands:", !!data.player_hands);
						console.log("  - currentUserId:", !!currentUserId);
						addLog("❌ No player hand data received", "error");
					}

					if (data.state.game_phase === "playing" && gameState !== "playing") {
						setGameState("playing");
						addLog("🎮 Game started!");
					}
					break;
				case "game_started":
					addLog(`🎮 ${data.message}`);
					console.log("🎮 GAME STARTED - waiting for game_state message...");
					break;
				case "player_joined":
					addLog(
						`👤 ${data.player_name} joined (${data.player_count}/2 players)`
					);
					break;
				case "game_over":
					addLog(`🏆 Game Over! Winner: ${data.winner_id}`);
					break;
				case "card_played":
					addLog(`🃏 ${data.player_id} played a card`);
					break;
				case "card_drawn":
					addLog(`📥 ${data.player_id} drew a card`);
					break;
				case "timer_update":
					// Update timer data for GameBoard component
					setTimerData(data);
					console.log(
						`⏰ Timer: ${data.time_remaining}s for ${data.current_player}`
					);
					break;
				case "auto_play":
					addLog(`🤖 ${data.player_id} auto-played a card (timer expired)`);
					break;
				case "auto_draw":
					addLog(`🤖 ${data.player_id} auto-drew a card (timer expired)`);
					break;
				default:
					addLog(`❓ Unknown match data: ${data.type}`, "info");
					console.log("Full unknown match data:", data);
			}
		},
		[
			session,
			currentUserId,
			gameState,
			addLog,
			setPlayerHand,
			setPlayableCards,
			setGameData,
			setGameState,
			setTimerData,
		]
	);

	// Game actions
	const createPrivateMatch = async () => {
		try {
			addLog("Creating private match...");
			const response = await client.rpc(session, "create_uno_match", "{}");

			// Debug the response structure
			addLog(`Debug: Full response: ${JSON.stringify(response)}`, "info");

			// The payload is already an object, not a JSON string
			const result = response.payload;
			addLog(`Debug: Parsed result: ${JSON.stringify(result)}`, "info");

			if (result.success) {
				addLog(`✅ Match created! ID: ${result.match_id}`);
				await joinMatchById(result.match_id);
			} else {
				addLog(`❌ Failed to create match: ${result.error}`, "error");
			}
		} catch (error) {
			addLog(`❌ Error creating match: ${error.message}`, "error");
			console.error("Full error:", error);
		}
	};

	const joinMatchById = async (matchId) => {
		try {
			addLog(`Joining match: ${matchId}`);
			const match = await socket.joinMatch(matchId);
			setCurrentMatch(match);
			addLog("✅ Joined match successfully!");
		} catch (error) {
			addLog(`❌ Failed to join match: ${error.message}`, "error");
		}
	};

	const findRandomMatch = async () => {
		try {
			addLog("Looking for random match...");
			console.log("🔍 Starting matchmaker with query '*', min: 2, max: 2");

			const ticket = await socket.addMatchmaker("*", 2, 2);
			console.log("🎫 Received matchmaker ticket:", ticket);
			addLog("🔍 Searching for opponents...");

			// The onmatchmakermatched handler will take care of joining the match
			// when opponents are found
		} catch (error) {
			addLog(`❌ Matchmaking failed: ${error.message}`, "error");
			console.error("Matchmaking error:", error);
		}
	};

	const playCard = async (card) => {
		if (!currentMatch) return;

		try {
			const message = {
				type: "play_card",
				card: card,
			};
			console.log("🎮 SENDING PLAY CARD:", message);
			await socket.sendMatchState(
				currentMatch.match_id,
				1,
				JSON.stringify(message)
			);
			addLog(`🃏 Played: ${card.color} ${card.type} ${card.value || ""}`);
			console.log("✅ PLAY CARD SENT SUCCESSFULLY");
		} catch (error) {
			addLog(`❌ Failed to play card: ${error.message}`, "error");
			console.error("❌ PLAY CARD ERROR:", error);
		}
	};

	const drawCard = async () => {
		if (!currentMatch) return;

		try {
			const message = { type: "draw_card" };
			console.log("🎮 SENDING DRAW CARD:", message);
			await socket.sendMatchState(
				currentMatch.match_id,
				1,
				JSON.stringify(message)
			);
			addLog("📥 Drew a card");
			console.log("✅ DRAW CARD SENT SUCCESSFULLY");
		} catch (error) {
			addLog(`❌ Failed to draw card: ${error.message}`, "error");
			console.error("❌ DRAW CARD ERROR:", error);
		}
	};

	const passTurn = async () => {
		if (!currentMatch) return;

		try {
			const message = { type: "pass_turn" };
			console.log("🎮 SENDING PASS TURN:", message);
			await socket.sendMatchState(
				currentMatch.match_id,
				1,
				JSON.stringify(message)
			);
			addLog("⏭️ Passed turn");
			console.log("✅ PASS TURN SENT SUCCESSFULLY");
		} catch (error) {
			addLog(`❌ Failed to pass turn: ${error.message}`, "error");
			console.error("❌ PASS TURN ERROR:", error);
		}
	};

	const callUno = async () => {
		if (!currentMatch) return;

		try {
			const message = { type: "call_uno" };
			console.log("🎮 SENDING CALL UNO:", message);
			await socket.sendMatchState(
				currentMatch.match_id,
				1,
				JSON.stringify(message)
			);
			addLog("🎯 Called UNO!");
			console.log("✅ CALL UNO SENT SUCCESSFULLY");
		} catch (error) {
			addLog(`❌ Failed to call UNO: ${error.message}`, "error");
			console.error("❌ CALL UNO ERROR:", error);
		}
	};

	// Render different screens based on game state
	const renderCurrentScreen = () => {
		switch (gameState) {
			case "auth":
				return <AuthScreen onLogin={loginAsGuest} />;
			case "lobby":
				return (
					<GameLobby
						onCreateMatch={createPrivateMatch}
						onJoinMatch={joinMatchById}
						onFindRandom={findRandomMatch}
						currentMatch={currentMatch}
					/>
				);
			case "playing":
				console.log("🎮 RENDERING GAMEBOARD WITH:");
				console.log("  - playerHand:", playerHand);
				console.log("  - playerHand length:", playerHand?.length);
				console.log("  - playableCards:", playableCards);
				console.log("  - gameData:", gameData);
				return (
					<GameBoard
						gameData={gameData}
						playerHand={playerHand}
						playableCards={playableCards}
						onPlayCard={playCard}
						onDrawCard={drawCard}
						onPassTurn={passTurn}
						onCallUno={callUno}
						session={session}
						currentUserId={currentUserId}
						timerData={timerData}
					/>
				);
			default:
				return <div>Loading...</div>;
		}
	};

	return (
		<div className="uno-game">
			<div className="game-content">{renderCurrentScreen()}</div>
			<div className="game-sidebar">
				<GameLog logs={logs} />
			</div>
		</div>
	);
};

export default UnoGame;
