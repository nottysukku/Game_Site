import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Carousel.css';

export const gamesList = [
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
  { path: '/gravityguyrush', icon: '🧲', title: 'Gravity Guy Rush 2D', desc: '1-4P side-view gravity flip race', color: '#7dd3fc' },
  { path: '/pockettanks3d', icon: '💥', title: 'Pocket Tanks 3D', desc: '3-4P turn-based artillery', color: '#ffb74d' },
  { path: '/neontagarena', icon: '👑', title: 'Neon Tag Arena', desc: '3-4P crown tag battle', color: '#4dd0e1' },
  { path: '/crystalcometclash', icon: '💎', title: 'Crystal Comet Clash', desc: '3-4P crystal collection brawl', color: '#f48fb1' },
  { path: '/bombrelay3d', icon: '💣', title: 'Bomb Relay 3D', desc: '3-4P hot-potato bomb relay', color: '#ff8a65' },
  { path: '/zonecontrol3d', icon: '⭕', title: 'Zone Control 3D', desc: '3-4P moving capture zone', color: '#80cbc4' },
  { path: '/meteormayhem3d', icon: '☄️', title: 'Meteor Mayhem 3D', desc: '3-4P survival storm', color: '#b39ddb' },
  { path: '/quaddashcircuit', icon: '🏁', title: 'Quad Dash Circuit', desc: '3-4P checkpoint race', color: '#a5d6a7' },
  { path: '/laserlootarena', icon: '🔋', title: 'Laser Loot Arena', desc: '3-4P core loot arena', color: '#90caf9' },
  { path: '/crownrush3d', icon: '🛡️', title: 'Crown Rush 3D', desc: '3-4P high-speed tag', color: '#ef9a9a' },
  { path: '/orbharvest3d', icon: '🟢', title: 'Orb Harvest 3D', desc: '3-4P orb farming duel', color: '#81c784' },
  { path: '/hoverbump3d', icon: '🚧', title: 'Hover Bump 3D', desc: '3-4P bump-and-hold arena', color: '#ffab91' },
  { path: '/pulsepit3d', icon: '⚙️', title: 'Pulse Pit 3D', desc: '3-4P pulse bomb chaos', color: '#ce93d8' },
  { path: '/turbototem3d', icon: '🗿', title: 'Turbo Totem 3D', desc: '3-4P totem checkpoint sprint', color: '#ffe082' },
  { path: '/vaultraid3d', icon: '🏦', title: 'Vault Raid 3D', desc: '3-4P high-value orb raid', color: '#80deea' },
  { path: '/badminton', icon: '🏸', title: 'Badminton', desc: '1v1 Stickman local multiplayer', color: '#87CEEB' },
  { path: '/soccerheads', icon: '⚽', title: 'Soccer Heads', desc: '1v1 physics with superpowers', color: '#ff5252' },
  { path: '/racing4p', icon: '🏎️', title: '2D Racer 4P', desc: '4P Top-down grand prix with CPU drivers', color: '#00ffd4' }
];

export default function Carousel() {
  const navigate = useNavigate();
  const itemsPerPage = 6;
  const totalPages = Math.ceil(gamesList.length / itemsPerPage);
  const [page, setPage] = useState(0);

  const nextPage = () => setPage(p => (p + 1) % totalPages);
  const prevPage = () => setPage(p => (p - 1 + totalPages) % totalPages);

  const displayedGames = gamesList.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <div className="w-full flex flex-col items-center py-6 z-20">
      <div className="flex items-center w-full justify-between gap-2 sm:gap-6">
        
        {/* Left Arrow button */}
        <button
          onClick={prevPage}
          className="relative group p-3.5 md:p-4 text-cyan-400 bg-black/55 hover:text-white border border-cyan-500/20 hover:border-cyan-400 rounded-full transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] z-20 hover:scale-110"
        >
          <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
        </button>
        
        {/* Games display container */}
        <div className="flex-grow overflow-hidden px-2 md:px-6 max-w-7xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 md:gap-6"
            >
              {displayedGames.map((g, idx) => (
                <motion.div
                  whileHover={{ scale: 1.06, y: -8 }}
                  whileTap={{ scale: 0.96 }}
                  key={g.path}
                  onClick={() => navigate(g.path)}
                  className="relative cursor-pointer bg-[#0c0d1b]/60 backdrop-blur-md rounded-2xl p-5 flex flex-col items-center text-center shadow-[0_0_20px_rgba(0,0,0,0.6)] transition-all overflow-hidden group min-h-[240px] border border-cyan-500/10"
                  style={{
                    '--hover-glow': g.color
                  }}
                >
                  {/* Subtle Glowing Radial Background Highlight */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-[0.18] transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at center, ${g.color} 0%, transparent 70%)`
                    }}
                  />

                  {/* Corner bracket styling */}
                  <div className="absolute top-2 left-2 text-[8px] text-cyan-400/30 font-mono tracking-widest pointer-events-none group-hover:text-cyan-400/60 transition-colors">
                    +
                  </div>
                  <div className="absolute top-2 right-2 text-[8px] text-cyan-400/30 font-mono tracking-widest pointer-events-none group-hover:text-cyan-400/60 transition-colors">
                    +
                  </div>

                  {/* Active Neon Border Highlight on Hover */}
                  <div
                    className="absolute inset-0 border border-transparent rounded-2xl group-hover:border-current transition-colors duration-300 pointer-events-none"
                    style={{ color: g.color }}
                  />

                  {/* High Tech Reticle around Emoji Icon */}
                  <div className="relative mb-4 mt-2">
                    <div
                      className="absolute inset-0 rounded-full border border-cyan-500/10 group-hover:border-current group-hover:animate-spin duration-1000 pointer-events-none scale-125"
                      style={{ color: g.color, animationDuration: '4s' }}
                    />
                    <span className="relative z-10 text-5xl transform group-hover:scale-110 transition-transform duration-300 block">
                      {g.icon}
                    </span>
                  </div>

                  {/* Game Text */}
                  <h3 className="text-white font-bold text-lg mb-2 relative z-10 font-sans tracking-wide group-hover:text-cyan-200 transition-colors">
                    {g.title}
                  </h3>
                  <p className="text-gray-400 text-xs leading-tight relative z-10 flex-grow font-medium">
                    {g.desc}
                  </p>

                  {/* System Tag at Bottom */}
                  <div className="font-mono text-[8px] text-gray-500/60 mt-4 tracking-widest group-hover:text-white/40 transition-colors">
                    [ SEC_S.{page * itemsPerPage + idx + 1} / READY ]
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Arrow button */}
        <button
          onClick={nextPage}
          className="relative group p-3.5 md:p-4 text-cyan-400 bg-black/55 hover:text-white border border-cyan-500/20 hover:border-cyan-400 rounded-full transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] z-20 hover:scale-110"
        >
          <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
        </button>
      </div>
      
      {/* Paging Indicators */}
      <div className="flex justify-center mt-10 space-x-3">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            className={`transition-all duration-300 rounded-full h-2.5 ${
              i === page 
                ? 'bg-cyan-400 w-8 shadow-[0_0_10px_rgba(6,182,212,0.8)]' 
                : 'bg-gray-700 w-2.5 hover:bg-cyan-500/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
