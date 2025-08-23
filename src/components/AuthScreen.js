import React from 'react';

const AuthScreen = ({ onLogin }) => {
  return (
    <div className="auth-screen">
      <div className="auth-container">
        <h2>🎮 Welcome to UNO!</h2>
        <p>Connect to play multiplayer UNO with friends</p>
        
        <div className="auth-buttons">
          <button 
            className="btn btn-primary"
            onClick={onLogin}
          >
            🎯 Login as Guest
          </button>
        </div>
        
        <div className="auth-info">
          <h3>How to Play:</h3>
          <ul>
            <li>🎯 Create a private match or find random opponents</li>
            <li>🃏 Match cards by color, number, or play action cards</li>
            <li>⏰ You have 10 seconds per turn</li>
            <li>🏆 First player to empty their hand wins!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
