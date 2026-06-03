import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './MainMenu.css';

const categories = [
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

const games = [
  { path: '/pong', title: 'Pong', desc: 'Classic paddle vs AI', color: '#00e5ff', category: 'retro_arcade' },
  { path: '/tictactoe', title: 'Tic-Tac-Toe', desc: '3×3, play X vs AI', color: '#f06292', category: 'board_puzzle' },
  { path: '/rps', title: 'Rock Paper Scissors', desc: 'Animated showdown vs CPU', color: '#ffd740', category: 'retro_arcade' },
  { path: '/snake', title: 'Snake', desc: 'Classic single-player', color: '#69f0ae', category: 'retro_arcade' },
  { path: '/racing', title: '3D Racing', desc: 'Fast-paced 3D car racing', color: '#ff5252', category: 'sports_racing' },
  { path: '/templerunner', title: 'Temple Runner', desc: '3D endless runner adventure', color: '#ffd86b', category: 'sports_racing' },
  { path: '/stickfighter', title: 'Stickman Fighter', desc: 'Epic 3D stickman combat', color: '#e040fb', category: 'action_shooter' },
  { path: '/solitaire', title: 'Solitaire', desc: 'Classic card game', color: '#448aff', category: 'card_casual' },
  { path: '/flappybird', title: 'Flappy Bird', desc: 'Tap to flap and survive', color: '#F4D03F', category: 'retro_arcade' },
  { path: '/breakout', title: 'Breakout', desc: 'Break bricks with the ball', color: '#ff6e40', category: 'retro_arcade' },
  { path: '/chess', title: 'Chess', desc: 'AI or Online Multiplayer', color: '#ffd740', category: 'board_puzzle' },
  { path: '/teenpatti', title: 'Teen Patti', desc: '3-card Indian poker vs AI', color: '#e91e63', category: 'card_casual' },
  { path: '/rummy', title: 'Rummy', desc: 'Gin Rummy card game', color: '#4caf50', category: 'card_casual' },
  { path: '/gofish', title: 'Go Fish', desc: 'Classic card matching game', color: '#29b6f6', category: 'card_casual' },
  { path: '/checkers', title: 'Checkers', desc: 'Draughts vs smart AI', color: '#d32f2f', category: 'board_puzzle' },
  { path: '/minesweeper', title: 'Minesweeper', desc: 'Classic mine-sweeping puzzle', color: '#78909c', category: 'board_puzzle' },
  { path: '/2048', title: '2048', desc: 'Slide & merge number tiles', color: '#f9a825', category: 'board_puzzle' },
  { path: '/wordle', title: 'Wordle', desc: 'Guess the 5-letter word', color: '#66bb6a', category: 'board_puzzle' },
  { path: '/connectfour', title: 'Connect Four', desc: 'Drop discs, connect 4 to win', color: '#1565c0', category: 'board_puzzle' },
  { path: '/sudoku', title: 'Sudoku', desc: '9×9 number puzzle', color: '#90caf9', category: 'board_puzzle' },
  { path: '/memorymatch', title: 'Memory Match', desc: 'Flip & match emoji pairs', color: '#f48fb1', category: 'card_casual' },
  { path: '/tetris', title: 'Tetris', desc: 'Classic falling blocks', color: '#00e5ff', category: 'retro_arcade' },
  { path: '/spaceinvaders', title: 'Space Invaders', desc: 'Shoot waves of aliens', color: '#69f0ae', category: 'retro_arcade' },
  { path: '/hangman', title: 'Hangman', desc: 'Guess the hidden word', color: '#ffd740', category: 'board_puzzle' },
  { path: '/typingtest', title: 'Typing Test', desc: 'Test your typing speed', color: '#00e5ff', category: 'card_casual' },
  { path: '/whackamole', title: 'Whack-a-Mole', desc: 'Click the moles fast!', color: '#ff6e40', category: 'card_casual' },
  { path: '/simonsays', title: 'Simon Says', desc: 'Color sequence memory', color: '#ce93d8', category: 'card_casual' },
  { path: '/towerofhanoi', title: 'Tower of Hanoi', desc: 'Classic disk puzzle', color: '#ffd740', category: 'board_puzzle' },
  { path: '/reversi', title: 'Reversi', desc: 'Othello board game vs AI', color: '#69f0ae', category: 'board_puzzle' },
  { path: '/doodlejump', title: 'Doodle Jump', desc: 'Endless vertical platformer', color: '#b9f6ca', category: 'sports_racing' },
  { path: '/reactiontest', title: 'Reaction Time', desc: 'Test your reflexes', color: '#ffd740', category: 'card_casual' },
  { path: '/gravityguyrush', title: 'Gravity Guy Rush 2D', desc: 'Shared gravity runner', color: '#7dd3fc', category: 'sports_racing' },
  { path: '/pockettanks3d', title: 'Pocket Tanks 3D', desc: 'Turn-based tank battles', color: '#ffb74d', category: 'action_shooter' },
  { path: '/neontagarena', title: 'Neon Tag Arena', desc: 'Neon maze tag chase game', color: '#4dd0e1', category: 'action_shooter' },
  { path: '/crystalcometclash', title: 'Crystal Comet Clash', desc: 'Jetpack asteroid runner', color: '#f48fb1', category: 'card_casual' },
  { path: '/bombrelay3d', title: 'Bomb Relay 3D', desc: '4P hot potato blast', color: '#ff8a65', category: 'action_shooter' },
  { path: '/zonecontrol3d', title: 'Zone Control 3D', desc: '2P hex territory battle', color: '#80cbc4', category: 'card_casual' },
  { path: '/meteormayhem3d', title: 'Meteor Mayhem 3D', desc: 'Space cockpit shooter', color: '#b39ddb', category: 'action_shooter' },
  { path: '/quaddashcircuit', title: 'Quad Dash Circuit', desc: '4P tabletop slot racing', color: '#a5d6a7', category: 'sports_racing' },
  { path: '/laserlootarena', title: 'Laser Loot Arena', desc: 'Coop vault security heist', color: '#90caf9', category: 'action_shooter' },
  { path: '/crownrush3d', title: 'Crown Rush 3D', desc: '3D crown hold battle', color: '#ef9a9a', category: 'action_shooter' },
  { path: '/orbharvest3d', title: 'Orb Harvest 3D', desc: 'Roll and collect city orbs', color: '#81c784', category: 'card_casual' },
  { path: '/hoverbump3d', title: 'Hover Bump 3D', desc: '4P shrinking platform sumo', color: '#ffab91', category: 'sports_racing' },
  { path: '/pulsepit3d', title: 'Pulse Pit 3D', desc: 'Music rhythmic block runner', color: '#ce93d8', category: 'card_casual' },
  { path: '/turbototem3d', title: 'Turbo Totem 3D', desc: '1-2P dynamic totem stacker', color: '#ffe082', category: 'card_casual' },
  { path: '/vaultraid3d', title: 'Vault Raid 3D', desc: 'Top-down bank stealth raid', color: '#80deea', category: 'action_shooter' },
  { path: '/badminton', title: 'Badminton', desc: '1v1 local tennis physics', color: '#87CEEB', category: 'sports_racing' },
  { path: '/soccerheads', title: 'Soccer Heads', desc: '1v1 heads physics showdown', color: '#ff5252', category: 'sports_racing' },
  { path: '/racing4p', title: '2D Racer 4P', desc: 'Grand prix with CPU cars', color: '#00ffd4', category: 'sports_racing' },
  { path: '/fps3d', title: 'Cyber Elite FPS', desc: 'Tactical gun arena vs rival', color: '#ff3d00', category: 'action_shooter' },
  { path: '/snakes-ladders', title: 'Snakes and Ladders', desc: 'Classic board luck simulator', color: '#8c52ff', category: 'board_puzzle' },
  { path: '/revcdos', title: 'GTA Vice City', desc: 'Retro 80s open world port', color: '#f06292', category: 'action_shooter' }
];

export default function MainMenu() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState(null);

  // Drag-to-scroll state for main category row
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

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
        hue: Math.random() * 60 + 200, // custom blue/cyan/purple hues
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

      // Draw subtle connecting lines
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

  const handleWheel = (e) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY * 0.85;
    }
  };

  const handleMouseDown = (e) => {
    isDragging.current = true;
    startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeft.current = scrollContainerRef.current.scrollLeft;
    scrollContainerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  // Filter games inside selected folder
  const activeGames = activeCategory 
    ? games.filter(g => g.category === activeCategory.id) 
    : [];

  return (
    <div className="menu-root">
      <canvas ref={canvasRef} className="menu-particles" />
      <div className="menu-background-overlay" />
      
      <div className="menu-header">
        <h1 className="menu-title">
          <span className="title-glow">NEON ARCADE</span>
        </h1>
        <p className="menu-subtitle">Click a folder to view games • Drag canvas to slide</p>
      </div>

      {/* Categories Horizontal Slider */}
      <div 
        className="sliding-canvas-wrapper"
        ref={scrollContainerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: 'grab' }}
      >
        <div className="honeycomb-grid categories-grid">
          {categories.map((cat, idx) => {
            const count = games.filter(g => g.category === cat.id).length;
            return (
              <motion.div
                key={cat.id}
                className={`menu-card category-card honeycomb-item row-${(idx % 3) + 1}`}
                onClick={() => {
                  if (!isDragging.current) {
                    setActiveCategory(cat);
                  }
                }}
                style={{ '--card-color': cat.color }}
                whileHover={{ scale: 1.06, y: -5 }}
                transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              >
                <div className="card-image-container">
                  <img 
                    src={cat.image} 
                    alt={cat.title} 
                    className="card-image" 
                    loading="lazy" 
                  />
                  <div className="category-tag-badge" style={{ backgroundColor: cat.color }}>
                    {count} GAMES
                  </div>
                </div>
                <div className="card-details">
                  <h3>{cat.title}</h3>
                  <p>{cat.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Android OS Style Glassy Modal */}
      <AnimatePresence>
        {activeCategory && (
          <motion.div 
            className="android-folder-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveCategory(null)}
          >
            <motion.div 
              className="android-folder-modal"
              initial={{ scale: 0.85, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              style={{ '--folder-theme-color': activeCategory.color }}
            >
              {/* Folder Header */}
              <div className="folder-header">
                <div className="folder-title-wrap">
                  <span className="folder-title-indicator" style={{ backgroundColor: activeCategory.color }} />
                  <h2>{activeCategory.title}</h2>
                  <span className="folder-game-count">{activeGames.length} apps installed</span>
                </div>
                <button className="folder-close-btn" onClick={() => setActiveCategory(null)}>
                  ✕
                </button>
              </div>

              {/* Folder Apps Grid */}
              <div className="folder-apps-container">
                <div className="folder-apps-grid">
                  {activeGames.map((game) => (
                    <motion.div
                      key={game.path}
                      className="app-item"
                      onClick={() => navigate(game.path)}
                      whileHover={{ scale: 1.05, y: -4 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <div className="app-icon-container" style={{ borderColor: game.color }}>
                        {/* Cover Image using the category illustration cropped */}
                        <img 
                          src={activeCategory.image} 
                          alt={game.title} 
                          className="app-icon-image"
                        />
                        <div className="app-icon-overlay" style={{ background: `linear-gradient(135deg, transparent, ${game.color}55)` }} />
                        <span className="app-indicator-dot" style={{ backgroundColor: game.color }} />
                      </div>
                      <div className="app-info">
                        <span className="app-title">{game.title}</span>
                        <span className="app-desc">{game.desc}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
