import React, { useState } from 'react';

const GameLobby = ({ onCreateMatch, onJoinMatch, onFindRandom, currentMatch }) => {
  const [matchId, setMatchId] = useState('');

  const handleJoinMatch = () => {
    if (matchId.trim()) {
      onJoinMatch(matchId.trim());
    }
  };

  return (
    <div className="game-lobby">
      <div className="lobby-container">
        <h2>🎮 Game Lobby</h2>
        
        {currentMatch ? (
          <div className="match-status">
            <h3>✅ Connected to Match</h3>
            <p><strong>Match ID:</strong> {currentMatch.match_id}</p>
            <p>Waiting for other players to join...</p>
          </div>
        ) : (
          <div className="lobby-options">
            <div className="option-section">
              <h3>🎯 Create Private Match</h3>
              <p>Create a match and share the ID with friends</p>
              <button 
                className="btn btn-primary"
                onClick={onCreateMatch}
              >
                Create Private Match
              </button>
            </div>

            <div className="option-section">
              <h3>🔍 Find Random Match</h3>
              <p>Get matched with random players</p>
              <button 
                className="btn btn-secondary"
                onClick={onFindRandom}
              >
                Find Random Match
              </button>
            </div>

            <div className="option-section">
              <h3>🔗 Join Match by ID</h3>
              <p>Enter a match ID to join a friend's game</p>
              <div className="join-match-form">
                <input
                  type="text"
                  placeholder="Enter Match ID"
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  className="match-id-input"
                />
                <button 
                  className="btn btn-accent"
                  onClick={handleJoinMatch}
                  disabled={!matchId.trim()}
                >
                  Join Match
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameLobby;
