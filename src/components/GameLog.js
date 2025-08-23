import React, { useEffect, useRef } from 'react';

const GameLog = ({ logs }) => {
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogClass = (type) => {
    switch (type) {
      case 'error': return 'log-error';
      case 'warning': return 'log-warning';
      case 'success': return 'log-success';
      default: return 'log-info';
    }
  };

  return (
    <div className="game-log">
      <h3>📝 Game Log</h3>
      <div className="log-container">
        {logs.map((log, index) => (
          <div key={index} className={`log-entry ${getLogClass(log.type)}`}>
            <span className="log-timestamp">[{log.timestamp}]</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default GameLog;
