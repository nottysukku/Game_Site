import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './Racing4P.css';

const PLAYER_COLORS = ['#34d399', '#60a5fa', '#f472b6', '#f59e0b', '#a855f7', '#06b6d4'];
const PLAYER_LABELS = ['P1 (Green)', 'P2 (Blue)', 'P3 (Pink)', 'P4 (Yellow)', 'CPU 1', 'CPU 2'];

const CONTROL_SETS = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', label: 'P1: WASD' },
  { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', label: 'P2: IJKL' },
  { up: 'KeyT', down: 'KeyG', left: 'KeyF', right: 'KeyH', label: 'P3: TFGH' },
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', label: 'P4: Arrows' }
];

// 8 Waypoints forming a beautiful oval racetrack
const WAYPOINTS = [
  { x: 180, y: 150 },
  { x: 500, y: 100 },
  { x: 820, y: 150 },
  { x: 900, y: 300 },
  { x: 820, y: 450 },
  { x: 500, y: 500 },
  { x: 180, y: 450 },
  { x: 100, y: 300 }
];

// Distance projection from Point to Segment AB
function distToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function getDistanceToTrack(p) {
  let minDist = Infinity;
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[(i + 1) % WAYPOINTS.length];
    const d = distToSegment(p, a, b);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export default function Racing4P() {
  const canvasRef = useRef(null);
  const [playerCount, setPlayerCount] = useState(4);
  const [phase, setPhase] = useState('menu'); // menu | playing | over
  const [leaderboard, setLeaderboard] = useState([]);
  const [victoryText, setVictoryText] = useState("");
  const stateRef = useRef({ restart: null, cleanup: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const keys = {};
    const onKeyDown = e => { keys[e.code] = true; };
    const onKeyUp = e => { keys[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Obstacles scattered on road
    const obstacles = [
      { x: 300, y: 110, size: 14, type: 'OIL' },
      { x: 780, y: 200, size: 14, type: 'CONE' },
      { x: 700, y: 480, size: 14, type: 'OIL' },
      { x: 220, y: 400, size: 14, type: 'CONE' }
    ];

    class Car {
      constructor(idx, x, y, angle, isCPU = false) {
        this.idx = idx;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 0;
        this.maxSpeed = isCPU ? 3.8 + Math.random() * 0.4 : 5.2;
        this.acceleration = 0.08;
        this.friction = 0.96;
        this.turnSpeed = 0.055;
        this.radius = 12;
        this.isCPU = isCPU;
        this.color = PLAYER_COLORS[idx];
        this.label = PLAYER_LABELS[idx];
        
        // Lap tracking
        this.currentWaypoint = 0;
        this.lap = 1;
        this.finished = false;
        
        // AI specific
        this.targetWaypoint = 0;
        this.spinOut = 0; // oil slip penalty timer
      }

      update() {
        if (this.finished) {
          this.speed *= 0.9;
          this.x += Math.cos(this.angle) * this.speed;
          this.y += Math.sin(this.angle) * this.speed;
          return;
        }

        if (this.spinOut > 0) {
          this.spinOut--;
          this.angle += 0.25; // Spin rotation
          this.speed *= 0.92;
          this.x += Math.cos(this.angle) * this.speed;
          this.y += Math.sin(this.angle) * this.speed;
          return;
        }

        // Off-road grass limit check
        const distFromTrack = getDistanceToTrack({ x: this.x, y: this.y });
        let speedLimit = this.maxSpeed;
        if (distFromTrack > 62) {
          speedLimit = 1.6; // Grass crawl
        }

        if (!this.isCPU) {
          // Human controls
          const ctl = CONTROL_SETS[this.idx];
          if (keys[ctl.up]) {
            this.speed = Math.min(speedLimit, this.speed + this.acceleration);
          } else if (keys[ctl.down]) {
            this.speed = Math.max(-1.5, this.speed - this.acceleration * 1.5);
          } else {
            this.speed *= this.friction;
          }

          if (Math.abs(this.speed) > 0.2) {
            const direction = this.speed > 0 ? 1 : -1;
            if (keys[ctl.left]) this.angle -= this.turnSpeed * direction;
            if (keys[ctl.right]) this.angle += this.turnSpeed * direction;
          }
        } else {
          // CPU Waypoint Tracking AI
          const target = WAYPOINTS[this.targetWaypoint];
          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const distToTarget = Math.hypot(dx, dy);

          if (distToTarget < 50) {
            this.targetWaypoint = (this.targetWaypoint + 1) % WAYPOINTS.length;
          }

          // Steer towards target waypoint
          const targetAngle = Math.atan2(dy, dx);
          let diff = targetAngle - this.angle;
          
          // Normalize angle difference
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;

          if (diff < -0.05) this.angle -= this.turnSpeed * 0.85;
          else if (diff > 0.05) this.angle += this.turnSpeed * 0.85;

          // Accelerate
          this.speed = Math.min(speedLimit, this.speed + this.acceleration * 0.9);
        }

        // Apply Vector movement
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Obstacle Collisions
        obstacles.forEach(obs => {
          if (Math.hypot(this.x - obs.x, this.y - obs.y) < this.radius + obs.size) {
            if (obs.type === 'OIL') {
              this.spinOut = 50; // spinout frames
            } else {
              this.speed = -1.2; // Cone crash bump
            }
          }
        });

        // Dynamic Lap Waypoint checks
        const nextWaypointIdx = (this.currentWaypoint + 1) % WAYPOINTS.length;
        const nextWp = WAYPOINTS[nextWaypointIdx];
        if (Math.hypot(this.x - nextWp.x, this.y - nextWp.y) < 85) {
          this.currentWaypoint = nextWaypointIdx;
          if (nextWaypointIdx === 0) {
            this.lap++;
            if (this.lap > 3) {
              this.finished = true;
            }
          }
        }
      }

      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(-12, -7, 24, 14);

        // Car Body
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.8;
        
        ctx.beginPath();
        ctx.roundRect(-14, -8, 28, 16, 4);
        ctx.fill();
        ctx.stroke();

        // Windshield cabin
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.roundRect(-4, -6, 12, 12, 2);
        ctx.fill();

        // Neon spoiler on rear
        ctx.fillStyle = '#fff';
        ctx.fillRect(-14, -8, 3, 16);

        // Label Tag
        ctx.restore();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(PLAYER_LABELS[this.idx].split(' ')[0], this.x, this.y - 14);
      }
    }

    let cars = [];

    function setupMatch(count) {
      cars = [];
      // 4 starting grid placements behind finish line
      const starts = [
        { x: 500, y: 130, angle: 0 },
        { x: 470, y: 130, angle: 0 },
        { x: 500, y: 160, angle: 0 },
        { x: 470, y: 160, angle: 0 },
        { x: 500, y: 100, angle: 0 },
        { x: 470, y: 100, angle: 0 }
      ];

      for (let i = 0; i < 6; i++) {
        const isCPU = i >= count;
        const grid = starts[i];
        cars.push(new Car(i, grid.x, grid.y, grid.angle, isCPU));
      }
    }

    function drawTrack(ctx) {
      // Grass background
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer Red-White Curb stripes
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 152;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      WAYPOINTS.forEach((wp, i) => {
        if (i === 0) ctx.moveTo(wp.x, wp.y);
        else ctx.lineTo(wp.x, wp.y);
      });
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 144;
      ctx.setLineDash([12, 12]);
      ctx.stroke();
      ctx.setLineDash([]); // clear dash

      // Grey Asphalt Road Ribbon
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 132;
      ctx.beginPath();
      WAYPOINTS.forEach((wp, i) => {
        if (i === 0) ctx.moveTo(wp.x, wp.y);
        else ctx.lineTo(wp.x, wp.y);
      });
      ctx.closePath();
      ctx.stroke();

      // Checkered Start / Finish Line
      ctx.save();
      ctx.translate(500, 130);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, -66, 4, 132); // vertical line
      ctx.restore();

      // Draw waypoints indicators for sci-fi HUD feel
      WAYPOINTS.forEach((wp, idx) => {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 4, 0, Math.PI*2);
        ctx.fill();
      });
    }

    function drawObstacles(ctx) {
      obstacles.forEach(obs => {
        if (obs.type === 'OIL') {
          // Slick dark pool
          ctx.fillStyle = 'rgba(15,15,15,0.85)';
          ctx.beginPath();
          ctx.ellipse(obs.x, obs.y, obs.size + 4, obs.size - 2, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Red-orange hazard cones
          ctx.fillStyle = '#ff7675';
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y - obs.size);
          ctx.lineTo(obs.x - obs.size, obs.y + obs.size);
          ctx.lineTo(obs.x + obs.size, obs.y + obs.size);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillRect(obs.x - obs.size/2, obs.y, obs.size, 3);
        }
      });
    }

    function gameLoop() {
      // 1. Draw track
      drawTrack(ctx);
      drawObstacles(ctx);

      // 2. Update and draw cars
      let finishedCount = 0;
      cars.forEach(car => {
        car.update();
        car.draw(ctx);
        if (car.finished) finishedCount++;
      });

      // 3. Leaderboard calculations
      const standings = [...cars]
        .sort((a, b) => {
          if (a.finished !== b.finished) return b.finished - a.finished;
          if (a.lap !== b.lap) return b.lap - a.lap;
          if (a.currentWaypoint !== b.currentWaypoint) return b.currentWaypoint - a.currentWaypoint;
          // Distance to next waypoint (smaller is better)
          const nextWp = WAYPOINTS[(a.currentWaypoint + 1) % WAYPOINTS.length];
          const distA = Math.hypot(a.x - nextWp.x, a.y - nextWp.y);
          const distB = Math.hypot(b.x - nextWp.x, b.y - nextWp.y);
          return distA - distB;
        });

      setLeaderboard(standings.map(c => `${c.label.split(' ')[0]} - L${Math.min(3, c.lap)}/3`));

      // 4. End Condition
      if (finishedCount > 0) {
        const winner = standings[0];
        setVictoryText(`${winner.label.toUpperCase()} WINS THE GRAND PRIX!`);
        setPhase('over');
        cancelAnimationFrame(animationId);
        return;
      }

      animationId = requestAnimationFrame(gameLoop);
    }

    stateRef.current.start = (count) => {
      setVictoryText("");
      setupMatch(count);
      setPhase('playing');
      animationId = requestAnimationFrame(gameLoop);
    };

    stateRef.current.cleanup = () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };

    return () => {
      stateRef.current.cleanup?.();
    };
  }, []);

  const handleStart = (count) => {
    setPlayerCount(count);
    stateRef.current.start?.(count);
  };

  return (
    <div className="r4-root bg-[#090b14] text-white font-mono min-h-screen relative flex flex-col items-center">
      <BackButton />

      {phase === 'menu' && (
        <div className="r4-overlay absolute inset-0 bg-[#06070c]/90 border border-cyan-500/20 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] max-w-xl mx-auto my-auto h-[480px]">
          <span className="text-[10px] text-cyan-400 tracking-[0.4em]">// MULTIPLAYER_GRID</span>
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)] mt-2 mb-4">
            2D RACER 4P
          </h1>
          <p className="text-xs text-gray-400 max-w-md text-center mb-6 tracking-wide leading-relaxed">
            Classic 2D grand prix. Steer through curves, dodge oil spills, and beat rival CPUs or friends! Out of road triggers slowdown penalty.
          </p>

          <div className="bg-black/30 border border-white/5 p-4 rounded-xl mb-6 text-left max-w-sm w-full text-[11px] text-gray-300">
            <h4 className="text-[10px] text-purple-400 tracking-widest uppercase mb-2">// CONTROL_MATRIX</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>P1: WASD</div>
              <div>P2: IJKL</div>
              <div>P3: TFGH</div>
              <div>P4: Arrows</div>
            </div>
            <p className="text-[9px] text-cyan-400 font-bold uppercase text-center mt-3 tracking-wider">
              UP is Forward / Accelerate
            </p>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => handleStart(2)}
              className="relative group px-6 py-2 text-cyan-400 hover:text-white uppercase transition-colors duration-300 tracking-widest text-xs font-black"
            >
              <span className="relative z-10">2 PLAYERS</span>
              <span className="absolute inset-0 border border-cyan-500 rounded bg-cyan-950/20" />
            </button>
            <button 
              onClick={() => handleStart(4)}
              className="relative group px-6 py-2 text-purple-400 hover:text-white uppercase transition-colors duration-300 tracking-widest text-xs font-black"
            >
              <span className="relative z-10">4 PLAYERS</span>
              <span className="absolute inset-0 border border-purple-500 rounded bg-purple-950/20" />
            </button>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <div className="absolute top-6 left-6 right-6 flex justify-between z-20 pointer-events-none text-xs">
          {/* Leaderboard Panel */}
          <div className="bg-black/60 border border-cyan-500/20 text-cyan-400 p-4 rounded-xl backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <h3 className="font-bold text-[10px] tracking-widest uppercase border-b border-cyan-500/30 pb-1 mb-2">// STANDINGS</h3>
            <div className="grid grid-cols-1 gap-1">
              {leaderboard.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <span>{idx + 1}.</span>
                  <span className="font-bold text-white">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* HUD Target information */}
          <div className="bg-black/60 border border-purple-500/20 text-purple-400 p-4 rounded-xl backdrop-blur-sm max-w-xs text-right h-fit">
            <h3 className="font-bold text-[10px] tracking-widest uppercase mb-1">// OBJECTIVE</h3>
            <p className="text-white text-[11px] leading-tight font-medium">COMPLETE 3 LAPS TO CLAIM VICTORY</p>
          </div>
        </div>
      )}

      {phase === 'over' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-30">
          <div className="bg-[#07070f]/95 border border-cyan-500/30 p-8 md:p-12 rounded-2xl text-center shadow-[0_0_50px_rgba(6,182,212,0.15)] max-w-md w-full">
            <span className="text-[10px] text-cyan-400 tracking-[0.4em]">// RIVALRY_RESOLVED</span>
            <h2 className="text-3xl font-black text-white mt-2 mb-4 uppercase">GRAND PRIX OVER</h2>
            <div className="bg-black/40 border border-white/5 p-4 rounded-xl mb-6 text-sm text-cyan-300 uppercase tracking-wide">
              {victoryText}
            </div>
            
            <button 
              onClick={() => handleStart(playerCount)}
              className="relative group px-6 py-2.5 text-cyan-400 hover:text-white uppercase transition-colors tracking-widest text-xs font-bold w-full"
            >
              <span className="relative z-10">RE-ENGAGE RACERS</span>
              <span className="absolute inset-0 border border-cyan-500 group-hover:border-cyan-400 rounded bg-cyan-950/20 transition-all duration-300" />
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} width={1000} height={600} className="r4-canvas mt-20 border border-white/10 rounded-2xl shadow-2xl bg-[#27ae60]" />
    </div>
  );
}
