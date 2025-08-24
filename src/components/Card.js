import React from "react";
import { motion } from "framer-motion";

const Card = ({ card, isPlayable, onClick, isSelected, style, className }) => {
	// Function to get card text display
	const getCardText = () => {
		if (!card) return "BACK";

		// Capitalize first letter of color
		const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

		// Handle different card types
		if (card.type === "number") {
			return `${capitalize(card.color)} ${card.value}`;
		} else if (card.type === "skip") {
			return `${capitalize(card.color)} Skip`;
		} else if (card.type === "reverse") {
			return `${capitalize(card.color)} Reverse`;
		} else if (card.type === "draw_two") {
			return `${capitalize(card.color)} +2`;
		} else if (card.type === "wild") {
			return "Wild";
		} else if (card.type === "wild_draw_four") {
			return "Wild +4";
		}

		return "Card";
	};

	// Function to get card background color
	const getCardBackgroundColor = () => {
		if (!card) return "#1a1a1a"; // Dark gray for back of card

		// Map colors to actual CSS colors
		const colorMap = {
			red: "#ff4d4d",
			yellow: "#ffeb3b",
			green: "#4caf50",
			blue: "#2196f3",
			wild: "#9c27b0", // Purple for wild cards
		};

		return colorMap[card.color] || "#ffffff";
	};

	// Function to get text color based on background
	const getTextColor = () => {
		if (!card) return "white";

		// Use white text for dark backgrounds, black for light
		const darkBackgrounds = ["red", "blue", "wild"];
		return darkBackgrounds.includes(card.color) ? "white" : "black";
	};

	const cardVariants = {
		hover: {
			scale: 1.1,
			y: -10,
			transition: { duration: 0.2 },
		},
		tap: {
			scale: 0.95,
			transition: { duration: 0.1 },
		},
		playable: {
			boxShadow: "0 0 20px #00ff00",
			transition: { duration: 0.3 },
		},
	};

	return (
		<motion.div
			className={`uno-card ${isPlayable ? "playable" : ""} ${
				isSelected ? "selected" : ""
			} ${className || ""}`}
			style={{
				position: "relative",
				cursor: isPlayable ? "pointer" : "default",
				width: "80px",
				height: "120px",
				...style,
			}}
			variants={cardVariants}
			whileHover={isPlayable ? "hover" : {}}
			whileTap={isPlayable ? "tap" : {}}
			animate={isPlayable ? "playable" : {}}
			onClick={
				isPlayable
					? () => {
							console.log(
								"🎯 CARD CLICKED:",
								card.color,
								card.type,
								card.value
							);
							onClick && onClick();
					  }
					: undefined
			}
			layout
		>
			{/* Text-based card display */}
			<div
				style={{
					width: "100%",
					height: "100%",
					backgroundColor: getCardBackgroundColor(),
					borderRadius: "8px",
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					padding: "5px",
					boxSizing: "border-box",
					border: "1px solid #333",
					filter: isPlayable ? "brightness(1.1)" : "brightness(0.8)",
					transition: "filter 0.3s ease",
				}}
			>
				<span
					style={{
						fontSize: card?.type === "number" ? "24px" : "14px",
						fontWeight: "bold",
						textAlign: "center",
						color: getTextColor(),
						textShadow:
							card?.color === "yellow" ? "1px 1px 1px rgba(0,0,0,0.5)" : "none",
					}}
				>
					{getCardText()}
				</span>
			</div>

			{/* Playable indicator */}
			{isPlayable && (
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					style={{
						position: "absolute",
						top: "-5px",
						right: "-5px",
						width: "20px",
						height: "20px",
						backgroundColor: "#00ff00",
						borderRadius: "50%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "12px",
						fontWeight: "bold",
						color: "black",
						border: "2px solid white",
					}}
				>
					✓
				</motion.div>
			)}

			{/* Selected indicator */}
			{isSelected && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						border: "3px solid #ffff00",
						borderRadius: "8px",
						pointerEvents: "none",
					}}
				/>
			)}
		</motion.div>
	);
};

export default Card;
