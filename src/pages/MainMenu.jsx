import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './MainMenu.css';

const games = [
  { path: '/pong', title: 'Pong', desc: 'Classic paddle vs AI', color: '#00e5ff', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=480&q=80' },
  { path: '/tictactoe', title: 'Tic-Tac-Toe', desc: '3×3, play X vs AI', color: '#f06292', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=480&q=80' },
  { path: '/rps', title: 'Rock Paper Scissors', desc: 'Animated showdown vs CPU', color: '#ffd740', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=480&q=80' },
  { path: '/snake', title: 'Snake', desc: 'Classic single-player', color: '#69f0ae', image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=480&q=80' },
  { path: '/racing', title: '3D Racing', desc: 'Fast-paced 3D car racing', color: '#ff5252', image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=480&q=80' },
  { path: '/templerunner', title: 'Temple Runner', desc: '3D endless runner adventure', color: '#ffd86b', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=480&q=80' },
  { path: '/stickfighter', title: 'Stickman Fighter', desc: 'Epic 3D stickman combat', color: '#e040fb', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=480&q=80' },
  { path: '/solitaire', title: 'Solitaire', desc: 'Classic card game', color: '#448aff', image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=480&q=80' },
  { path: '/flappybird', title: 'Flappy Bird', desc: 'Tap to flap and survive', color: '#F4D03F', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=480&q=80' },
  { path: '/breakout', title: 'Breakout', desc: 'Break bricks with the ball', color: '#ff6e40', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=480&q=80' },
  { path: '/chess', title: 'Chess', desc: 'AI or Online Multiplayer', color: '#ffd740', image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=480&q=80' },
  { path: '/teenpatti', title: 'Teen Patti', desc: '3-card Indian poker vs AI', color: '#e91e63', image: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=480&q=80' },
  { path: '/rummy', title: 'Rummy', desc: 'Gin Rummy card game', color: '#4caf50', image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=480&q=80' },
  { path: '/gofish', title: 'Go Fish', desc: 'Classic card matching game', color: '#29b6f6', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=480&q=80' },
  { path: '/checkers', title: 'Checkers', desc: 'Draughts vs smart AI', color: '#d32f2f', image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=480&q=80' },
  { path: '/minesweeper', title: 'Minesweeper', desc: 'Classic mine-sweeping puzzle', color: '#78909c', image: 'https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?auto=format&fit=crop&w=480&q=80' },
  { path: '/2048', title: '2048', desc: 'Slide & merge number tiles', color: '#f9a825', image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=480&q=80' },
  { path: '/wordle', title: 'Wordle', desc: 'Guess the 5-letter word', color: '#66bb6a', image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=480&q=80' },
  { path: '/connectfour', title: 'Connect Four', desc: 'Drop discs, connect 4 to win', color: '#1565c0', image: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&w=480&q=80' },
  { path: '/sudoku', title: 'Sudoku', desc: '9×9 number puzzle', color: '#90caf9', image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=480&q=80' },
  { path: '/memorymatch', title: 'Memory Match', desc: 'Flip & match emoji pairs', color: '#f48fb1', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=480&q=80' },
  { path: '/tetris', title: 'Tetris', desc: 'Classic falling blocks', color: '#00e5ff', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=480&q=80' },
  { path: '/spaceinvaders', title: 'Space Invaders', desc: 'Shoot waves of aliens', color: '#69f0ae', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=480&q=80' },
  { path: '/hangman', title: 'Hangman', desc: 'Guess the hidden word', color: '#ffd740', image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=480&q=80' },
  { path: '/typingtest', title: 'Typing Test', desc: 'Test your typing speed', color: '#00e5ff', image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=480&q=80' },
  { path: '/whackamole', title: 'Whack-a-Mole', desc: 'Click the moles fast!', color: '#ff6e40', image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=480&q=80' },
  { path: '/simonsays', title: 'Simon Says', desc: 'Color sequence memory', color: '#ce93d8', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=480&q=80' },
  { path: '/towerofhanoi', title: 'Tower of Hanoi', desc: 'Classic disk puzzle', color: '#ffd740', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=480&q=80' },
  { path: '/reversi', title: 'Reversi', desc: 'Othello board game vs AI', color: '#69f0ae', image: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&w=480&q=80' },
  { path: '/doodlejump', title: 'Doodle Jump', desc: 'Endless vertical platformer', color: '#b9f6ca', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=480&q=80' },
  { path: '/reactiontest', title: 'Reaction Time', desc: 'Test your reflexes', color: '#ffd740', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=480&q=80' },
  { path: '/gravityguyrush', title: 'Gravity Guy Rush 2D', desc: 'Shared gravity runner', color: '#7dd3fc', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=480&q=80' },
  { path: '/pockettanks3d', title: 'Pocket Tanks 3D', desc: 'Turn-based tank battles', color: '#ffb74d', image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=480&q=80' },
  { path: '/neontagarena', title: 'Neon Tag Arena', desc: 'Neon maze tag chase game', color: '#4dd0e1', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=480&q=80' },
  { path: '/crystalcometclash', title: 'Crystal Comet Clash', desc: 'Jetpack asteroid runner', color: '#f48fb1', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=480&q=80' },
  { path: '/bombrelay3d', title: 'Bomb Relay 3D', desc: '4P hot potato blast', color: '#ff8a65', image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=480&q=80' },
  { path: '/zonecontrol3d', title: 'Zone Control 3D', desc: '2P hex territory battle', color: '#80cbc4', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=480&q=80' },
  { path: '/meteormayhem3d', title: 'Meteor Mayhem 3D', desc: 'Space cockpit shooter', color: '#b39ddb', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=480&q=80' },
  { path: '/quaddashcircuit', title: 'Quad Dash Circuit', desc: '4P tabletop slot racing', color: '#a5d6a7', image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=480&q=80' },
  { path: '/laserlootarena', title: 'Laser Loot Arena', desc: 'Coop vault security heist', color: '#90caf9', image: 'https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?auto=format&fit=crop&w=480&q=80' },
  { path: '/crownrush3d', title: 'Crown Rush 3D', desc: '3D crown hold battle', color: '#ef9a9a', image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=480&q=80' },
  { path: '/orbharvest3d', title: 'Orb Harvest 3D', desc: 'Roll and collect city orbs', color: '#81c784', image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=480&q=80' },
  { path: '/hoverbump3d', title: 'Hover Bump 3D', desc: '4P shrinking platform sumo', color: '#ffab91', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=480&q=80' },
  { path: '/pulsepit3d', title: 'Pulse Pit 3D', desc: 'Music rhythmic block runner', color: '#ce93d8', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=480&q=80' },
  { path: '/turbototem3d', title: 'Turbo Totem 3D', desc: '1-2P dynamic totem stacker', color: '#ffe082', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=480&q=80' },
  { path: '/vaultraid3d', title: 'Vault Raid 3D', desc: 'Top-down bank stealth raid', color: '#80deea', image: 'https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?auto=format&fit=crop&w=480&q=80' },
  { path: '/badminton', title: 'Badminton', desc: '1v1 local tennis physics', color: '#87CEEB', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=480&q=80' },
  { path: '/soccerheads', title: 'Soccer Heads', desc: '1v1 heads physics showdown', color: '#ff5252', image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=480&q=80' },
  { path: '/racing4p', title: '2D Racer 4P', desc: 'Grand prix with CPU cars', color: '#00ffd4', image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=480&q=80' },
  { path: '/fps3d', title: 'Cyber Elite FPS', desc: 'Tactical gun arena vs rival', color: '#ff3d00', image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=480&q=80' },
  { path: '/snakes-ladders', title: 'Snakes and Ladders', desc: 'Classic board luck simulator', color: '#8c52ff', image: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=480&q=80' },
  { path: '/revcdos', title: 'GTA Vice City', desc: 'Retro 80s open world port', color: '#f06292', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=480&q=80' }
];

export default function MainMenu() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Drag-to-scroll state
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

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

  // Handle horizontal mouse wheel scrolling
  const handleWheel = (e) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY * 0.85;
    }
  };

  // Drag-to-scroll handlers
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
    const walk = (x - startX.current) * 1.5; // multiplier for drag speed
    scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  return (
    <div className="menu-root">
      <canvas ref={canvasRef} className="menu-particles" />
      
      <div className="menu-header">
        <h1 className="menu-title">
          <span className="title-glow">ARCADE</span>
        </h1>
        <p className="menu-subtitle">Drag to slide the canvas & select a game</p>
      </div>

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
        <div className="honeycomb-grid">
          {games.map((g, idx) => (
            <motion.div
              key={g.path}
              className={`menu-card honeycomb-item row-${(idx % 3) + 1}`}
              onClick={() => {
                if (!isDragging.current) {
                  navigate(g.path);
                }
              }}
              style={{ '--card-color': g.color }}
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="card-image-container">
                <img 
                  src={g.image} 
                  alt={g.title} 
                  className="card-image" 
                  loading="lazy" 
                />
              </div>
              <div className="card-details">
                <h3>{g.title}</h3>
                <p>{g.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
