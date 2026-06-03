import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './MainMenu.css';

const games = [
  { path: '/pong', icon: '🏓', title: 'Pong', desc: 'Classic paddle vs AI', color: '#00e5ff' },
  { path: '/tictactoe', icon: '❌', title: 'Tic-Tac-Toe', desc: '3×3, play X vs AI', color: '#f06292' },
  { path: '/rps', icon: '✊', title: 'Rock Paper Scissors', desc: 'Animated showdown vs CPU', color: '#ffd740' },
  { path: '/snake', icon: '🐍', title: 'Snake', desc: 'Classic single-player', color: '#69f0ae' },
  { path: '/racing', icon: '🏎️', title: '3D Racing', desc: 'Fast-paced 3D car racing', color: '#ff5252' },
  { path: '/templerunner', icon: '🏃', title: 'Temple Runner', desc: '3D endless runner adventure', color: '#ffd86b' },
  { path: '/stickfighter', icon: '🥊', title: 'Stickman Fighter', desc: 'Epic stickman combat', color: '#e040fb' },
  { path: '/solitaire', icon: '♠️', title: 'Solitaire', desc: 'Classic card game', color: '#448aff' },
  { path: '/flappybird', icon: '🐦', title: 'Flappy Bird', desc: 'Tap to flap and survive', color: '#F4D03F' },
  { path: '/breakout', icon: '🧱', title: 'Breakout', desc: 'Break bricks with the ball', color: '#ff6e40' },
  { path: '/chess', icon: '♟️', title: 'Chess', desc: 'AI or Online Multiplayer', color: '#ffd740' },
  { path: '/teenpatti', icon: '🃏', title: 'Teen Patti', desc: '3-card Indian poker vs AI', color: '#e91e63' },
  { path: '/rummy', icon: '🂡', title: 'Rummy', desc: 'Gin Rummy card game', color: '#4caf50' },
  { path: '/gofish', icon: '🐟', title: 'Go Fish', desc: 'Classic card matching game', color: '#29b6f6' },
  { path: '/checkers', icon: '⚫', title: 'Checkers', desc: 'Draughts vs smart AI', color: '#d32f2f' },
  { path: '/minesweeper', icon: '💣', title: 'Minesweeper', desc: 'Classic mine-sweeping puzzle', color: '#78909c' },
  { path: '/2048', icon: '🔢', title: '2048', desc: 'Slide & merge number tiles', color: '#f9a825' },
  { path: '/wordle', icon: '📝', title: 'Wordle', desc: 'Guess the 5-letter word', color: '#66bb6a' },
  { path: '/connectfour', icon: '🔴', title: 'Connect Four', desc: 'Drop discs, connect 4 to win', color: '#1565c0' },
  { path: '/sudoku', icon: '🔢', title: 'Sudoku', desc: '9×9 number puzzle', color: '#90caf9' },
  { path: '/memorymatch', icon: '🧠', title: 'Memory Match', desc: 'Flip & match emoji pairs', color: '#f48fb1' },
  { path: '/tetris', icon: '🧩', title: 'Tetris', desc: 'Classic falling blocks', color: '#00e5ff' },
  { path: '/spaceinvaders', icon: '👾', title: 'Space Invaders', desc: 'Shoot waves of aliens', color: '#69f0ae' },
  { path: '/hangman', icon: '🪢', title: 'Hangman', desc: 'Guess the hidden word', color: '#ffd740' },
  { path: '/typingtest', icon: '⌨️', title: 'Typing Test', desc: 'Test your typing speed', color: '#00e5ff' },
  { path: '/whackamole', icon: '🔨', title: 'Whack-a-Mole', desc: 'Click the moles fast!', color: '#ff6e40' },
  { path: '/simonsays', icon: '🔴', title: 'Simon Says', desc: 'Color sequence memory', color: '#ce93d8' },
  { path: '/towerofhanoi', icon: '🗼', title: 'Tower of Hanoi', desc: 'Classic disk puzzle', color: '#ffd740' },
  { path: '/reversi', icon: '⚫', title: 'Reversi', desc: 'Othello board game vs AI', color: '#69f0ae' },
  { path: '/doodlejump', icon: '🦘', title: 'Doodle Jump', desc: 'Endless vertical platformer', color: '#b9f6ca' },
  { path: '/reactiontest', icon: '⚡', title: 'Reaction Time', desc: 'Test your reflexes', color: '#ffd740' },
  { path: '/gravityguyrush', icon: '🧲', title: 'Gravity Guy Rush 2D', desc: 'Shared-path elimination gravity run', color: '#7dd3fc' },
  { path: '/pockettanks3d', icon: '💥', title: 'Pocket Tanks 3D', desc: '3-4P turn-based artillery', color: '#ffb74d' },
  { path: '/neontagarena', icon: '👑', title: 'Neon Tag Arena', desc: '4P neon maze tag chase', color: '#4dd0e1' },
  { path: '/crystalcometclash', icon: '💎', title: 'Crystal Comet Clash', desc: 'Solo jetpack comet runner', color: '#f48fb1' },
  { path: '/bombrelay3d', icon: '💣', title: 'Bomb Relay 3D', desc: '4P destructible hot potato', color: '#ff8a65' },
  { path: '/zonecontrol3d', icon: '⭕', title: 'Zone Control 3D', desc: '2P hex territory tactics', color: '#80cbc4' },
  { path: '/meteormayhem3d', icon: '☄️', title: 'Meteor Mayhem 3D', desc: 'Cockpit asteroid shooter', color: '#b39ddb' },
  { path: '/quaddashcircuit', icon: '🏁', title: 'Quad Dash Circuit', desc: '4P tabletop toy racing', color: '#a5d6a7' },
  { path: '/laserlootarena', icon: '🔋', title: 'Laser Loot Arena', desc: '2P vault platform heist', color: '#90caf9' },
  { path: '/crownrush3d', icon: '🛡️', title: 'Crown Rush 3D', desc: 'WebRTC crown hold FPS', color: '#ef9a9a' },
  { path: '/orbharvest3d', icon: '🟢', title: 'Orb Harvest 3D', desc: 'Katamari-style city harvest', color: '#81c784' },
  { path: '/hoverbump3d', icon: '🚧', title: 'Hover Bump 3D', desc: '4P shrinking-platform sumo', color: '#ffab91' },
  { path: '/pulsepit3d', icon: '⚙️', title: 'Pulse Pit 3D', desc: 'Beat-timed pit runner', color: '#ce93d8' },
  { path: '/turbototem3d', icon: '🗿', title: 'Turbo Totem 3D', desc: '1-2P swinging block stacker', color: '#ffe082' },
  { path: '/vaultraid3d', icon: '🏦', title: 'Vault Raid 3D', desc: 'Top-down stealth vault raid', color: '#80deea' },
  { path: '/badminton', icon: '🏸', title: 'Badminton', desc: '1v1 Stickman local multiplayer', color: '#87CEEB' },
  { path: '/soccerheads', icon: '⚽', title: 'Soccer Heads', desc: '1v1 physics with superpowers', color: '#ff5252' },
  { path: '/racing4p', icon: '🏎️', title: '2D Racer 4P', desc: '4P Top-down grand prix with CPU drivers', color: '#00ffd4' },
  { path: '/fps3d', icon: '🔫', title: 'Cyber Elite FPS', desc: '1v1 WebRTC tactical shooter with guns and grenades', color: '#ff3d00' }
];

const FuturisticCarouselContainer = ({ children }) => {
  return (
    <div className="relative w-full max-w-6xl mx-auto my-8">
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-800 to-red-800 rounded-3xl opacity-50"
        animate={{
          scale: [1.05, 1.0, 1.05],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative rounded-3xl overflow-hidden border-4 border-blue-200 bg-gray-900 bg-opacity-70 p-6 backdrop-blur-sm">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-red-400 to-blue-500 opacity-20 pointer-events-none"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function MainMenu() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // Pagination for Carousel
  const itemsPerPage = 8;
  const totalPages = Math.ceil(games.length / itemsPerPage);
  const [page, setPage] = useState(() => {
    const saved = sessionStorage.getItem('arcade-carousel-page');
    return saved ? Math.min(parseInt(saved, 10), totalPages - 1) : 0;
  });

  const nextPage = () => setPage(p => (p + 1) % totalPages);
  const prevPage = () => setPage(p => (p - 1 + totalPages) % totalPages);

  const displayedGames = games.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  // Persist carousel page so returning from a game restores position
  useEffect(() => {
    sessionStorage.setItem('arcade-carousel-page', String(page));
  }, [page]);

  useEffect(() => {
    // Keep the particle background
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

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 80 + 0.5,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.2,
        hue: Math.random() * 180 + 180,
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
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.alpha})`;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,229,255,${0.15 * (1 - dist / 120)})`;
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

  return (
    <div className="menu-root">
      <canvas ref={canvasRef} className="menu-particles" />
      
      <div className="menu-content flex flex-col items-center justify-center w-full min-h-screen z-10 p-4">
        <h1 className="menu-title mb-4">
          <span className="title-glow">ARCADE</span>
        </h1>
        <p className="menu-subtitle text-gray-300 mb-8 text-xl">Choose a game to play</p>
        
        <FuturisticCarouselContainer>
          <div className="flex items-center justify-between w-full">
            <button onClick={prevPage} className="p-3 text-white bg-white/10 hover:bg-white/30 rounded-full backdrop-blur-md transition-all shadow-lg z-20">
              <ChevronLeft size={32} />
            </button>
            
            <div className="flex-grow overflow-hidden px-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full"
                >
                  {displayedGames.map(g => (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      key={g.path}
                      className="menu-card relative bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center overflow-hidden group shadow-xl hover:shadow-2xl transition-all"
                      style={{ '--card-color': g.color }}
                      onClick={() => navigate(g.path)}
                    >
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300" 
                        style={{ backgroundColor: g.color }} 
                      />
                      <span className="card-icon text-5xl mb-3 block transform group-hover:scale-110 transition-transform duration-300">{g.icon}</span>
                      <h3 className="text-white font-bold text-lg mb-2 relative z-10">{g.title}</h3>
                      <p className="text-gray-300 text-sm relative z-10">{g.desc}</p>
                    </motion.button>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
            
            <button onClick={nextPage} className="p-3 text-white bg-white/10 hover:bg-white/30 rounded-full backdrop-blur-md transition-all shadow-lg z-20">
              <ChevronRight size={32} />
            </button>
          </div>
          
          <div className="flex justify-center mt-6 space-x-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-3 h-3 rounded-full transition-all ${i === page ? 'bg-cyan-400 scale-125' : 'bg-gray-500 hover:bg-gray-400'}`}
              />
            ))}
          </div>
        </FuturisticCarouselContainer>
      </div>
    </div>
  );
}
