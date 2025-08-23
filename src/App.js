import React from "react";
import "./App.css";
import UnoGame from "./components/UnoGame";

function App() {
	return (
		<div className="App">
			<header className="App-header">
				<h1>🎮 UNO Game</h1>
				<p>Multiplayer UNO with Nakama Backend</p>
			</header>
			<main>
				<UnoGame />
			</main>
		</div>
	);
}

export default App;
