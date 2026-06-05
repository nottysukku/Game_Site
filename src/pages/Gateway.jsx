import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { games } from './MainMenu';
import './Gateway.css';

export default function Gateway() {
  const { gameKey } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);

  useEffect(() => {
    // Find game matching the key (e.g. 'pacman' matches path '/pacman')
    const targetPath = '/' + gameKey;
    const foundGame = games.find((g) => g.path === targetPath);
    if (foundGame) {
      setGame(foundGame);
    } else {
      // Fallback or redirect if game not found
      navigate('/');
    }
  }, [gameKey, navigate]);

  if (!game) {
    return (
      <div className="gateway-loading">
        <div className="neon-spinner" />
        <p>INITIALIZING GATEWAY...</p>
      </div>
    );
  }

  return (
    <div className="gateway-root" style={{ '--theme-color': game.color }}>
      {/* Cyber Grid Background */}
      <div className="gateway-grid-bg" />
      <div className="gateway-scanlines" />
      <div className="gateway-vignette" />

      {/* Central Neon Board */}
      <motion.div 
        className="gateway-board-container"
        initial={{ opacity: 0, scale: 0.8, rotateX: 30 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      >
        {/* Retro Header Decals */}
        <div className="gateway-header-bar">
          <span className="decal-dot status-active" />
          <span className="decal-text">ARCADE SYSTEM v2.0 // DIRECT_BRIDGE_ESTABLISHED</span>
          <span className="decal-dot status-active" />
        </div>

        {/* Outer Glowing Cabinet Border */}
        <div className="gateway-board-card">
          <div className="gateway-glow-border" />
          
          <div className="gateway-content-inner">
            {/* Thematic Icon / Category Badge */}
            <div className="gateway-badge-wrap">
              <span className="gateway-category-badge">
                {game.category.toUpperCase().replace('_', ' ')}
              </span>
            </div>

            {/* Glowing Game Title */}
            <h1 className="gateway-title" style={{ textShadow: `0 0 10px ${game.color}, 0 0 30px ${game.color}` }}>
              {game.title}
            </h1>

            {/* Terminal Status / Description */}
            <div className="gateway-description-panel">
              <div className="desc-header">SYSTEM_READOUT:</div>
              <p className="gateway-desc">{game.desc}</p>
              <div className="desc-footer">
                <span className="flicker-fast">SPEED: NORMAL</span>
                <span> // </span>
                <span>PLAYERS: 1P/CPU</span>
              </div>
            </div>

            {/* Neon Command Prompt Buttons */}
            <div className="gateway-actions">
              <motion.button
                className="gateway-btn btn-play"
                onClick={() => navigate(game.path)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ '--btn-shadow': game.color }}
              >
                <span className="btn-glitch-text">LAUNCH GAME</span>
                <span className="btn-subtext">EXECUTE_BINARY</span>
              </motion.button>

              <motion.button
                className="gateway-btn btn-abort"
                onClick={() => navigate('/')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>RETURN TO LOBBY</span>
                <span className="btn-subtext">ABORT_MISSION</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Retro Cabinet Bottom Feet */}
        <div className="gateway-feet-bar">
          <div className="gateway-foot" />
          <div className="gateway-foot" />
        </div>
      </motion.div>
    </div>
  );
}
