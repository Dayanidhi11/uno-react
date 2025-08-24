import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "./Card";

const GameBoard = ({
	gameData,
	playerHand,
	playableCards,
	onPlayCard,
	onDrawCard,
	onPassTurn,
	session,
	onCallUno,
	timerData,
	currentUserId,
}) => {
	const [selectedWildColor, setSelectedWildColor] = useState("red");
	const [selectedCard, setSelectedCard] = useState(null);

	// Debug logging for props
	// Only log when cards change
	if (playerHand?.length) {
		console.log(
			"🎮 HAND:",
			playerHand.length,
			"cards, playable:",
			playableCards
		);
	}

	// Move all hooks before any early returns
	const isMyTurn = gameData?.current_turn === currentUserId;
	const topCard = gameData?.top_card;
	const myPlayer = gameData?.players?.[currentUserId];
	const players = Object.entries(gameData?.players || {});
	const otherPlayers = players.filter(([id]) => id !== currentUserId);

	// Get timer value from server data
	const turnTimer = timerData?.time_remaining || 15;
	const currentTimerPlayer = timerData?.current_player;

	// Early return after all hooks
	if (!gameData) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
					background: "linear-gradient(135deg, #87CEEB 0%, #98FB98 100%)",
					fontSize: "24px",
					color: "#333",
				}}
			>
				🎮 Loading UNO Game...
			</div>
		);
	}

	// Game over screen
	if (gameData.game_phase === "finished") {
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
					background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
					fontSize: "24px",
					color: "#333",
					textAlign: "center",
					padding: "20px",
				}}
			>
				<div style={{ marginBottom: "30px" }}>
					<h1 style={{ fontSize: "48px", margin: "0 0 20px 0" }}>
						🏆 Game Over!
					</h1>

					{gameData.final_scores && (
						<div style={{ fontSize: "20px", lineHeight: "1.6" }}>
							<h2 style={{ margin: "20px 0" }}>Final Scores:</h2>
							{Object.values(gameData.final_scores).map((playerScore) => (
								<div
									key={playerScore.userId}
									style={{
										margin: "10px 0",
										padding: "10px 20px",
										background:
											playerScore.result === "winner" ? "#90EE90" : "#FFB6C1",
										borderRadius: "10px",
										display: "inline-block",
										minWidth: "300px",
									}}
								>
									{playerScore.result === "winner" ? "🏆" : "💔"}{" "}
									{playerScore.username}:{" "}
									{playerScore.score > 0
										? `+${playerScore.score}`
										: playerScore.score}{" "}
									points
									<br />
									<small>({playerScore.result})</small>
								</div>
							))}
						</div>
					)}
				</div>

				<button
					onClick={() => window.location.reload()}
					style={{
						padding: "15px 30px",
						fontSize: "18px",
						backgroundColor: "#4CAF50",
						color: "white",
						border: "none",
						borderRadius: "10px",
						cursor: "pointer",
						marginTop: "20px",
					}}
				>
					🔄 Play Again
				</button>
			</div>
		);
	}

	const canPlayCard = (card, cardIndex) => {
		if (!isMyTurn) return false;
		return playableCards && playableCards.includes(cardIndex);
	};

	const handleCardClick = (card, cardIndex) => {
		console.log("🖱️ CARD CLICKED:", card, "at index", cardIndex);
		console.log("🖱️ onPlayCard function:", typeof onPlayCard);

		if (!canPlayCard(card, cardIndex)) {
			console.log(
				"❌ INVALID PLAY: Cannot play this card",
				card,
				"at index",
				cardIndex
			);
			console.log("❌ Playable cards:", playableCards);
			console.log("❌ Is my turn:", isMyTurn);
			return;
		}

		console.log("🃏 PLAYING CARD:", card, "at index", cardIndex);
		console.log("🃏 About to call onPlayCard with:", card);
		setSelectedCard(card);

		// Handle wild cards - need to choose color
		if (card.type === "wild" || card.type === "wild_draw_four") {
			const cardWithColor = { ...card, chosen_color: selectedWildColor };
			console.log("🌈 WILD CARD: Chosen color:", selectedWildColor);
			console.log("🌈 Calling onPlayCard with wild card:", cardWithColor);
			onPlayCard(cardWithColor);
		} else {
			console.log("🎯 Calling onPlayCard with regular card:", card);
			onPlayCard(card);
		}
		console.log("✅ onPlayCard call completed");
	};

	// Get opponent player
	const opponent = otherPlayers[0]; // For 2-player game
	const opponentData = opponent ? opponent[1] : null;

	return (
		<div
			style={{
				width: "100vw",
				height: "100vh",
				background: "linear-gradient(135deg, #4A5568 0%, #2D3748 100%)",
				position: "relative",
				overflow: "hidden",
				fontFamily: "Arial, sans-serif",
				display: "flex",
				flexDirection: "column",
			}}
		>
			{/* Top Opponent Area */}
			{opponentData && (
				<div
					style={{
						height: "25%",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						background: "rgba(76, 175, 80, 0.1)",
						borderRadius: "0 0 20px 20px",
						margin: "0 20px",
					}}
				>
					{/* Opponent Name */}
					<div
						style={{
							position: "absolute",
							top: "20px",
							left: "50%",
							transform: "translateX(-50%)",
							background: "rgba(255,255,255,0.9)",
							padding: "8px 20px",
							borderRadius: "20px",
							fontSize: "16px",
							fontWeight: "bold",
							color: "#333",
						}}
					>
						{opponentData.username}
					</div>

					{/* Opponent Cards (Face Down, Horizontal) */}
					<div
						style={{
							display: "flex",
							justifyContent: "center",
							gap: "3px",
							marginTop: "40px",
						}}
					>
						{Array.from({
							length: Math.min(opponentData.hand_count || 0, 15),
						}).map((_, cardIndex) => (
							<Card
								key={cardIndex}
								card={null} // Face down cards
								style={{
									width: "45px",
									height: "65px",
									marginLeft: cardIndex > 0 ? "-20px" : "0",
									zIndex: cardIndex,
								}}
							/>
						))}
					</div>
				</div>
			)}

			{/* Center Game Area */}
			<div
				style={{
					height: "50%",
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					position: "relative",
				}}
			>
				{/* Left Side Cards (if 4 players) */}
				<div
					style={{
						position: "absolute",
						left: "20px",
						top: "50%",
						transform: "translateY(-50%)",
						display: "flex",
						flexDirection: "column",
						gap: "3px",
					}}
				>
					{/* For 2-player game, this area is empty */}
				</div>

				{/* Center Area - Deck, Current Turn, Discard Pile */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "60px",
					}}
				>
					{/* Deck Pile */}
					<motion.div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							cursor: isMyTurn ? "pointer" : "default",
						}}
						whileHover={isMyTurn ? { scale: 1.05 } : {}}
						whileTap={isMyTurn ? { scale: 0.95 } : {}}
						onClick={isMyTurn ? onDrawCard : undefined}
					>
						<div
							style={{
								color: "white",
								fontSize: "24px",
								fontWeight: "bold",
								marginBottom: "10px",
							}}
						>
							Deck
						</div>
						<Card card={null} style={{ width: "80px", height: "120px" }} />
					</motion.div>

					{/* Current Turn & Direction Indicator */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "20px",
						}}
					>
						{/* Current Turn */}
						<div
							style={{
								color: "white",
								fontSize: "18px",
								fontWeight: "bold",
								textAlign: "center",
							}}
						>
							Current Turn:
							<br />
							<span style={{ color: "#FFD700", fontSize: "20px" }}>
								{gameData.current_turn === currentUserId
									? myPlayer?.username || "You"
									: opponentData?.username || "Opponent"}
							</span>
						</div>

						{/* Timer Display */}
						{timerData && (
							<motion.div
								style={{
									background:
										turnTimer <= 3
											? "red"
											: currentTimerPlayer === currentUserId
											? "orange"
											: "gray",
									color: "white",
									padding: "10px 20px",
									borderRadius: "20px",
									fontSize: "18px",
									fontWeight: "bold",
									textAlign: "center",
									marginTop: "10px",
								}}
								animate={{ scale: turnTimer <= 3 ? [1, 1.1, 1] : 1 }}
								transition={{
									repeat: turnTimer <= 3 ? Infinity : 0,
									duration: 0.5,
								}}
							>
								{currentTimerPlayer === currentUserId
									? "🔥 YOUR TURN"
									: "⏳ OPPONENT'S TURN"}{" "}
								- ⏰ {turnTimer}s
							</motion.div>
						)}

						{/* UNO Logo */}
						<div
							style={{
								background:
									"linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FFEAA7)",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
								fontSize: "48px",
								fontWeight: "bold",
								textAlign: "center",
								textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
							}}
						>
							UNO
						</div>

						{/* Direction */}
						<div
							style={{
								color: "white",
								fontSize: "16px",
								fontWeight: "bold",
								textAlign: "center",
							}}
						>
							Direction:
							<br />
							<span style={{ color: "#FFD700" }}>
								{gameData.direction === 1 ? "CLOCKWISE" : "COUNTER CLOCKWISE"}
							</span>
						</div>
					</div>

					{/* Discard Pile */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
						}}
					>
						<div
							style={{
								color: "white",
								fontSize: "24px",
								fontWeight: "bold",
								marginBottom: "10px",
							}}
						>
							Pile
						</div>
						{topCard && (
							<motion.div
								initial={{ scale: 0, rotate: 180 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{ duration: 0.5 }}
							>
								<Card
									card={topCard}
									style={{ width: "80px", height: "120px" }}
								/>
							</motion.div>
						)}

						{/* Current Color Indicator */}
						{topCard && (
							<div
								style={{
									marginTop: "10px",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
								}}
							>
								<div
									style={{
										color: "white",
										fontSize: "14px",
										fontWeight: "bold",
										marginBottom: "5px",
									}}
								>
									Current Color
								</div>
								<div
									style={{
										width: "40px",
										height: "40px",
										backgroundColor: topCard.chosen_color || topCard.color,
										borderRadius: "8px",
										border: "2px solid white",
									}}
								/>
							</div>
						)}
					</div>
				</div>

				{/* Right Side Cards (if 4 players) */}
				<div
					style={{
						position: "absolute",
						right: "20px",
						top: "50%",
						transform: "translateY(-50%)",
						display: "flex",
						flexDirection: "column",
						gap: "3px",
					}}
				>
					{/* For 2-player game, this area is empty */}
				</div>
			</div>

			{/* Bottom Player Area */}
			<div
				style={{
					height: "25%",
					display: "flex",
					justifyContent: "center",
					alignItems: "flex-end",
					background: "rgba(76, 175, 80, 0.1)",
					borderRadius: "20px 20px 0 0",
					margin: "0 20px",
					paddingBottom: "20px",
				}}
			>
				{/* My Player Name */}
				<div
					style={{
						position: "absolute",
						bottom: "20px",
						left: "50%",
						transform: "translateX(-50%)",
						background: "rgba(255,255,255,0.9)",
						padding: "8px 20px",
						borderRadius: "20px",
						fontSize: "16px",
						fontWeight: "bold",
						color: "#333",
						zIndex: 10,
					}}
				>
					{myPlayer?.username || "You"}
				</div>

				{/* My Cards (Face Up, Horizontal) */}
				<motion.div
					style={{
						display: "flex",
						justifyContent: "center",
						gap: "5px",
						flexWrap: "wrap",
						maxWidth: "90vw",
						marginBottom: "60px",
					}}
					layout
				>
					<AnimatePresence>
						{playerHand.map((card, index) => {
							const playable = canPlayCard(card, index);
							return (
								<motion.div
									key={`${card.color}-${card.type}-${card.value}-${index}`}
									initial={{ y: 100, opacity: 0 }}
									animate={{ y: 0, opacity: 1 }}
									exit={{ y: -100, opacity: 0 }}
									transition={{ delay: index * 0.1 }}
									style={{ position: "relative" }}
								>
									<Card
										card={card}
										isPlayable={playable}
										onClick={() => handleCardClick(card, index)}
										style={{
											width: "60px",
											height: "90px",
											marginLeft: index > 0 ? "-25px" : "0",
											zIndex: index,
											transform: playable
												? "translateY(-15px)"
												: "translateY(0)",
											transition: "transform 0.3s ease",
											filter:
												!playable && isMyTurn
													? "grayscale(70%) brightness(0.7)"
													: "none",
										}}
									/>
								</motion.div>
							);
						})}
					</AnimatePresence>
				</motion.div>
			</div>

			{/* Wild Color Selector Modal */}
			{(selectedCard?.type === "wild" ||
				selectedCard?.type === "wild_draw_four") && (
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					style={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
						background: "white",
						padding: "20px",
						borderRadius: "15px",
						boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
						zIndex: 1000,
					}}
				>
					<h3 style={{ margin: "0 0 15px 0", textAlign: "center" }}>
						Choose Wild Color
					</h3>
					<div style={{ display: "flex", gap: "10px" }}>
						{["red", "yellow", "green", "blue"].map((color) => (
							<motion.button
								key={color}
								style={{
									width: "50px",
									height: "50px",
									borderRadius: "50%",
									backgroundColor: color,
									border:
										selectedWildColor === color
											? "4px solid black"
											: "2px solid white",
									cursor: "pointer",
								}}
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.9 }}
								onClick={() => {
									setSelectedWildColor(color);
									const cardWithColor = {
										...selectedCard,
										chosen_color: color,
									};
									console.log("🌈 WILD CARD: Chosen color:", color);
									onPlayCard(cardWithColor);
									setSelectedCard(null);
								}}
							/>
						))}
					</div>
				</motion.div>
			)}
		</div>
	);
};

export default GameBoard;
