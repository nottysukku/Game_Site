import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './MainMenu.css';

export const categories = [
  { id: 'all', title: 'All Games', color: '#ffffff' },
  { 
    id: 'action_shooter', 
    title: 'Action & Shooter', 
    desc: 'Thrilling action, tactical shooters & open worlds', 
    color: '#ff3d00', 
    image: '/assets/action_shooter.png' 
  },
  { 
    id: 'sports_racing', 
    title: 'Sports & Racing', 
    desc: 'High-speed circuits and athletic physics tests', 
    color: '#00ffd4', 
    image: '/assets/sports_racing.png' 
  },
  { 
    id: 'board_puzzle', 
    title: 'Board & Puzzle', 
    desc: 'Logic checkers, chess matches, and puzzle solvers', 
    color: '#ffd740', 
    image: '/assets/board_puzzle.png' 
  },
  { 
    id: 'card_casual', 
    title: 'Cards & Casual', 
    desc: 'Solitaire setups, Indian poker, and reflex tests', 
    color: '#e040fb', 
    image: '/assets/card_casual.png' 
  },
  { 
    id: 'retro_arcade', 
    title: 'Retro Arcade', 
    desc: 'Classic 2D retro cabinets, paddles, and invaders', 
    color: '#00e5ff', 
    image: '/assets/retro_arcade.png' 
  }
];

export const games = [
  { path: '/pong', title: 'Pong', desc: 'Classic paddle vs AI', color: '#00e5ff', category: 'retro_arcade', emoji: '🏓' },
  { path: '/tictactoe', title: 'Tic-Tac-Toe', desc: '3x3, play X vs AI', color: '#f06292', category: 'board_puzzle', emoji: '❌' },
  { path: '/rps', title: 'Rock Paper Scissors', desc: 'Animated showdown vs CPU', color: '#ffd740', category: 'retro_arcade', emoji: '✊' },
  { path: '/snake', title: 'Snake', desc: 'Classic single-player', color: '#69f0ae', category: 'retro_arcade', emoji: '🐍' },
  { path: '/racing', title: '3D Racing', desc: 'Fast-paced 3D car racing', color: '#ff5252', category: 'sports_racing', emoji: '🏎️' },
  { path: '/templerunner', title: 'Temple Runner', desc: '3D endless runner adventure', color: '#ffd86b', category: 'sports_racing', emoji: '🏃' },
  { path: '/stickfighter', title: 'Stickman Fighter', desc: 'Epic 3D stickman combat', color: '#e040fb', category: 'action_shooter', emoji: '🥊' },
  { path: '/solitaire', title: 'Solitaire', desc: 'Classic card game', color: '#448aff', category: 'card_casual', emoji: '♠️' },
  { path: '/flappybird', title: 'Flappy Bird', desc: 'Tap to flap and survive', color: '#F4D03F', category: 'retro_arcade', emoji: '🐦' },
  { path: '/breakout', title: 'Breakout', desc: 'Break bricks with the ball', color: '#ff6e40', category: 'retro_arcade', emoji: '🧱' },
  { path: '/chess', title: 'Chess', desc: 'AI or Online Multiplayer', color: '#ffd740', category: 'board_puzzle', emoji: '👑' },
  { path: '/teenpatti', title: 'Teen Patti', desc: '3-card Indian poker vs AI', color: '#e91e63', category: 'card_casual', emoji: '🃏' },
  { path: '/rummy', title: 'Rummy', desc: 'Gin Rummy card game', color: '#4caf50', category: 'card_casual', emoji: '🎴' },
  { path: '/gofish', title: 'Go Fish', desc: 'Classic card matching game', color: '#29b6f6', category: 'card_casual', emoji: '🐟' },
  { path: '/checkers', title: 'Checkers', desc: 'Draughts vs smart AI', color: '#d32f2f', category: 'board_puzzle', emoji: '🔴' },
  { path: '/minesweeper', title: 'Minesweeper', desc: 'Classic mine-sweeping puzzle', color: '#78909c', category: 'board_puzzle', emoji: '💣' },
  { path: '/2048', title: '2048', desc: 'Slide & merge number tiles', color: '#f9a825', category: 'board_puzzle', emoji: '🔢' },
  { path: '/wordle', title: 'Wordle', desc: 'Guess the 5-letter word', color: '#66bb6a', category: 'board_puzzle', emoji: '📝' },
  { path: '/connectfour', title: 'Connect Four', desc: 'Drop discs, connect 4 to win', color: '#1565c0', category: 'board_puzzle', emoji: '🔵' },
  { path: '/sudoku', title: 'Sudoku', desc: '9x9 number puzzle', color: '#90caf9', category: 'board_puzzle', emoji: '🧩' },
  { path: '/memorymatch', title: 'Memory Match', desc: 'Flip & match emoji pairs', color: '#f48fb1', category: 'card_casual', emoji: '🧠' },
  { path: '/tetris', title: 'Tetris', desc: 'Classic falling blocks', color: '#00e5ff', category: 'retro_arcade', emoji: '👾' },
  { path: '/spaceinvaders', title: 'Space Invaders', desc: 'Shoot waves of aliens', color: '#69f0ae', category: 'retro_arcade', emoji: '🛸' },
  { path: '/hangman', title: 'Hangman', desc: 'Guess the hidden word', color: '#ffd740', category: 'board_puzzle', emoji: '💀' },
  { path: '/typingtest', title: 'Typing Test', desc: 'Test your typing speed', color: '#00e5ff', category: 'card_casual', emoji: '⌨️' },
  { path: '/whackamole', title: 'Whack-a-Mole', desc: 'Click the moles fast!', color: '#ff6e40', category: 'card_casual', emoji: '🔨' },
  { path: '/simonsays', title: 'Simon Says', desc: 'Color sequence memory', color: '#ce93d8', category: 'card_casual', emoji: '🎨' },
  { path: '/towerofhanoi', title: 'Tower of Hanoi', desc: 'Classic disk puzzle', color: '#ffd740', category: 'board_puzzle', emoji: '🗼' },
  { path: '/reversi', title: 'Reversi', desc: 'Othello board game vs AI', color: '#69f0ae', category: 'board_puzzle', emoji: '⚪' },
  { path: '/doodlejump', title: 'Doodle Jump', desc: 'Endless vertical platformer', color: '#b9f6ca', category: 'sports_racing', emoji: '🧗' },
  { path: '/reactiontest', title: 'Reaction Time', desc: 'Test your reflexes', color: '#ffd740', category: 'card_casual', emoji: '⚡' },
  { path: '/motocross', title: 'Motocross', desc: 'Physics 2D motorcycle platformer', color: '#ff7043', category: 'sports_racing', emoji: '🏍️' },
  { path: '/gravityshooter', title: 'Gravity Shooter', desc: 'Up to 4P low-gravity arena', color: '#7c4dff', category: 'action_shooter', emoji: '🌌' },
  { path: '/supermario', title: 'Super Mario', desc: 'Classic platformer adventure', color: '#e53935', category: 'retro_arcade', emoji: '🍄' },
  { path: '/pool', title: '8-Ball Pool', desc: 'Billiards vs AI or 2P', color: '#1b5e20', category: 'sports_racing', emoji: '🎱' },
  { path: '/pacman', title: 'Pac-Man', desc: 'Eat dots, avoid ghosts', color: '#fdd835', category: 'retro_arcade', emoji: '👻' },
  { path: '/fruitninja', title: 'Fruit Ninja', desc: 'Slice fruit, dodge bombs', color: '#e91e63', category: 'card_casual', emoji: '🍉' },
  { path: '/bomberman', title: 'Bomberman', desc: 'Bomb your way through', color: '#ff6f00', category: 'action_shooter', emoji: '🧨' },
  { path: '/geometrydash', title: 'Geometry Dash', desc: 'Rhythm platform runner', color: '#00e5ff', category: 'retro_arcade', emoji: '🔺' },
  { path: '/candycrush', title: 'Candy Crush', desc: 'Match-3 puzzle game', color: '#ce93d8', category: 'board_puzzle', emoji: '🍬' },
  { path: '/agario', title: 'Agar.io', desc: 'Eat cells, grow bigger', color: '#80deea', category: 'action_shooter', emoji: '🧫' },
  { path: '/gravityguyrush', title: 'Gravity Guy Rush 2D', desc: 'Shared gravity runner', color: '#7dd3fc', category: 'sports_racing', emoji: '🏃‍♂️' },
  { path: '/pockettanks3d', title: 'Pocket Tanks 3D', desc: 'Turn-based tank battles', color: '#ffb74d', category: 'action_shooter', emoji: '🚀' },
  { path: '/neontagarena', title: 'Neon Tag Arena', desc: 'Neon maze tag chase game', color: '#4dd0e1', category: 'action_shooter', emoji: '🏃‍♀️' },
  { path: '/crystalcometclash', title: 'Crystal Comet Clash', desc: 'Jetpack asteroid runner', color: '#f48fb1', category: 'card_casual', emoji: '☄️' },
  { path: '/bombrelay3d', title: 'Bomb Relay 3D', desc: '4P hot potato blast', color: '#ff8a65', category: 'action_shooter', emoji: '💣' },
  { path: '/zonecontrol3d', title: 'Zone Control 3D', desc: '2P hex territory battle', color: '#80cbc4', category: 'card_casual', emoji: '🗺️' },
  { path: '/meteormayhem3d', title: 'Meteor Mayhem 3D', desc: 'Space cockpit shooter', color: '#b39ddb', category: 'action_shooter', emoji: '🛸' },
  { path: '/quaddashcircuit', title: 'Quad Dash Circuit', desc: '4P tabletop slot racing', color: '#a5d6a7', category: 'sports_racing', emoji: '🏁' },
  { path: '/laserlootarena', title: 'Laser Loot Arena', desc: 'Coop vault security heist', color: '#90caf9', category: 'action_shooter', emoji: '💎' },
  { path: '/crownrush3d', title: 'Crown Rush 3D', desc: '3D crown hold battle', color: '#ef9a9a', category: 'action_shooter', emoji: '👑' },
  { path: '/orbharvest3d', title: 'Orb Harvest 3D', desc: 'Roll and collect city orbs', color: '#81c784', category: 'card_casual', emoji: '🔮' },
  { path: '/hoverbump3d', title: 'Hover Bump 3D', desc: '4P shrinking platform sumo', color: '#ffab91', category: 'sports_racing', emoji: '🛞' },
  { path: '/pulsepit3d', title: 'Pulse Pit 3D', desc: 'Music rhythmic block runner', color: '#ce93d8', category: 'card_casual', emoji: '🎵' },
  { path: '/turbototem3d', title: 'Turbo Totem 3D', desc: '1-2P dynamic totem stacker', color: '#ffe082', category: 'card_casual', emoji: '🗿' },
  { path: '/vaultraid3d', title: 'Vault Raid 3D', desc: 'Top-down bank stealth raid', color: '#80deea', category: 'action_shooter', emoji: '🏦' },
  { path: '/badminton', title: 'Badminton', desc: '1v1 local tennis physics', color: '#87CEEB', category: 'sports_racing', emoji: '🏸' },
  { path: '/soccerheads', title: 'Soccer Heads', desc: '1v1 heads physics showdown', color: '#ff5252', category: 'sports_racing', emoji: '⚽' },
  { path: '/racing4p', title: '2D Racer 4P', desc: 'Grand prix with CPU cars', color: '#00ffd4', category: 'sports_racing', emoji: '🏎️' },
  { path: '/fps3d', title: 'Cyber Elite FPS', desc: 'Tactical gun arena vs rival', color: '#ff3d00', category: 'action_shooter', emoji: '🔫' },
  { path: '/snakes-ladders', title: 'Snakes and Ladders', desc: 'Classic board luck simulator', color: '#8c52ff', category: 'board_puzzle', emoji: '🎲' },
  { path: '/revcdos', title: 'GTA Vice City', desc: 'Retro 80s open world port', color: '#f06292', category: 'action_shooter', emoji: '🌴' }
];

function getCodeLink(gamePath) {
  let filename = '';
  if (gamePath === '/templerunner') filename = 'TempleRunner2.jsx';
  else if (gamePath === '/2048') filename = 'Game2048.jsx';
  else if (gamePath === '/fps3d') filename = 'FpsShooter3D.jsx';
  else if (gamePath === '/snakes-ladders') filename = 'SnakesAndLadders.jsx';
  else {
    const mappings = {
      '/pong': 'Pong.jsx',
      '/tictactoe': 'TicTacToe.jsx',
      '/rps': 'RPS.jsx',
      '/snake': 'Snake.jsx',
      '/racing': 'Racing.jsx',
      '/stickfighter': 'StickFighter.jsx',
      '/solitaire': 'Solitaire.jsx',
      '/flappybird': 'FlappyBird.jsx',
      '/breakout': 'Breakout.jsx',
      '/chess': 'Chess.jsx',
      '/teenpatti': 'TeenPatti.jsx',
      '/rummy': 'Rummy.jsx',
      '/gofish': 'GoFish.jsx',
      '/checkers': 'Checkers.jsx',
      '/minesweeper': 'Minesweeper.jsx',
      '/wordle': 'Wordle.jsx',
      '/connectfour': 'ConnectFour.jsx',
      '/sudoku': 'Sudoku.jsx',
      '/memorymatch': 'MemoryMatch.jsx',
      '/tetris': 'Tetris.jsx',
      '/spaceinvaders': 'SpaceInvaders.jsx',
      '/hangman': 'Hangman.jsx',
      '/typingtest': 'TypingTest.jsx',
      '/whackamole': 'WhackAMole.jsx',
      '/simonsays': 'SimonSays.jsx',
      '/towerofhanoi': 'TowerOfHanoi.jsx',
      '/reversi': 'Reversi.jsx',
      '/doodlejump': 'DoodleJump.jsx',
      '/reactiontest': 'ReactionTest.jsx',
      '/motocross': 'Motocross.jsx',
      '/gravityshooter': 'GravityShooter.jsx',
      '/supermario': 'SuperMario.jsx',
      '/pool': 'Pool.jsx',
      '/pacman': 'PacMan.jsx',
      '/fruitninja': 'FruitNinja.jsx',
      '/bomberman': 'Bomberman.jsx',
      '/geometrydash': 'GeometryDash.jsx',
      '/candycrush': 'CandyCrush.jsx',
      '/agario': 'AgarIO.jsx',
      '/gravityguyrush': 'GravityGuyRush.jsx',
      '/pockettanks3d': 'PocketTanks3D.jsx',
      '/neontagarena': 'NeonTagArena.jsx',
      '/crystalcometclash': 'CrystalCometClash.jsx',
      '/bombrelay3d': 'BombRelay3D.jsx',
      '/zonecontrol3d': 'ZoneControl3D.jsx',
      '/meteormayhem3d': 'MeteorMayhem3D.jsx',
      '/quaddashcircuit': 'QuadDashCircuit.jsx',
      '/laserlootarena': 'LaserLootArena.jsx',
      '/crownrush3d': 'CrownRush3D.jsx',
      '/orbharvest3d': 'OrbHarvest3D.jsx',
      '/hoverbump3d': 'HoverBump3D.jsx',
      '/pulsepit3d': 'PulsePit3D.jsx',
      '/turbototem3d': 'TurboTotem3D.jsx',
      '/vaultraid3d': 'VaultRaid3D.jsx',
      '/badminton': 'Badminton.jsx',
      '/soccerheads': 'SoccerHeads.jsx',
      '/racing4p': 'Racing4P.jsx',
      '/revcdos': 'ReVCDOS.jsx',
    };
    filename = mappings[gamePath] || (gamePath.slice(1).charAt(0).toUpperCase() + gamePath.slice(2) + '.jsx');
  }
  return `https://github.com/sukritchopra03/arcade/blob/main/src/pages/${filename}`;
}

export default function MainMenu() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    // Canvas animation background
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 4 + 1,
        dx: (Math.random() - 0.5) * 0.5,
        dy: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        hue: Math.random() * 60 + 200,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 85%, 60%, ${p.alpha})`;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 229, 255, ${0.08 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Filter games based on search and category
  const filteredGames = games.filter((game) => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          game.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || game.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="menu-root">
      <canvas ref={canvasRef} className="menu-particles" />
      <div className="menu-background-overlay" />
      
      <div className="menu-header">
        <h1 className="menu-title">
          <span className="title-glow">NEON ARCADE</span>
        </h1>
        <p className="menu-subtitle">Explore 50+ WebAssembly & HTML5 Classics</p>
      </div>

      {/* Cyber Search & Filter Controls */}
      <div className="menu-controls">
        <div className="search-box-container">
          <input
            type="text"
            className="search-input"
            placeholder="SEARCH GAME DIRECTORY..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-cyber-lines" />
        </div>

        <div className="filter-tabs-container">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`filter-tab-btn ${selectedCategory === cat.id ? 'active-tab' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
              style={{ '--tab-color': cat.color }}
            >
              {cat.title.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Game Cards Flat Grid */}
      <div className="games-grid-container">
        <motion.div className="flat-games-grid" layout>
          <AnimatePresence mode="popLayout">
            {filteredGames.map((game) => {
              const catObj = categories.find((c) => c.id === game.category);
              const coverImg = catObj ? catObj.image : '';

              return (
                <motion.div
                  key={game.path}
                  className="game-card"
                  style={{ '--game-color': game.color }}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                >
                  {/* Card Upper Image Area */}
                  <div className="card-image-wrapper">
                    {coverImg && (
                      <img
                        src={coverImg}
                        alt={game.title}
                        className="card-bg-image"
                        loading="lazy"
                      />
                    )}
                    <div className="card-color-overlay" style={{ background: `linear-gradient(to bottom, transparent, ${game.color}66)` }} />
                    <div className="card-floating-emoji">{game.emoji}</div>
                    <span className="card-category-indicator" style={{ backgroundColor: game.color }} />
                  </div>

                  {/* Card Info Area */}
                  <div className="card-body">
                    <h3 className="card-game-title">{game.title}</h3>
                    <p className="card-game-desc">{game.desc}</p>
                  </div>

                  {/* Card Actions Play & Code */}
                  <div className="card-actions-row">
                    <button
                      className="card-action-btn btn-play-game"
                      onClick={() => navigate(`/gateway/${game.path.slice(1)}`)}
                      style={{ '--glow-color': game.color }}
                    >
                      PLAY
                    </button>
                    <a
                      className="card-action-btn btn-view-code"
                      href={getCodeLink(game.path)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      CODE
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {filteredGames.length === 0 && (
          <motion.div 
            className="no-results-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="no-results-emoji">👾</span>
            <h3>NO ALIEN SECTOR DETECTED</h3>
            <p>Your search query did not return any matching operational cabinet files.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
