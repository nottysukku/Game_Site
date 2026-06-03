import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './Racing4P.css';

const DEFAULT_PLAYER_COLORS = ['#34d399', '#60a5fa', '#f472b6', '#f59e0b', '#a855f7', '#06b6d4'];
const COLOR_SWATCHES = ['#34d399', '#60a5fa', '#f472b6', '#f59e0b', '#ef4444', '#06b6d4'];
const PLAYER_LABELS = ['P1', 'P2 (Blue)', 'P3 (Pink)', 'P4 (Yellow)', 'CPU 1', 'CPU 2'];

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
  const [playerCount, setPlayerCount] = useState(2);
  const [lapCount, setLapCount] = useState(3);
  const [p1Color, setP1Color] = useState('#34d399');
  const [phase, setPhase] = useState('menu'); // menu | countdown | playing | over
  const [leaderboard, setLeaderboard] = useState([]);
  const [victoryText, setVictoryText] = useState("");
  const stateRef = useRef({ start: null, cleanup: null });

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
      constructor(idx, x, y, angle, isCPU = false, totalLaps = 3, colors = null) {
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
        this.color = colors ? colors[idx] : DEFAULT_PLAYER_COLORS[idx];
        this.label = PLAYER_LABELS[idx];
        this.totalLaps = totalLaps;

        // Lap tracking
        this.currentWaypoint = 0;
        this.lap = 1;
        this.finished = false;

        // AI specific
        this.targetWaypoint = 0;
      }

      update(countdownActive) {
        // During countdown, force zero speed and ignore input
        if (countdownActive) {
          this.speed = 0;
          return;
        }

        if (this.finished) {
          this.speed *= 0.9;
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

        // Check oil overlap for high-friction zone
        let inOil = false;
        obstacles.forEach(obs => {
          if (obs.type === 'OIL' && Math.hypot(this.x - obs.x, this.y - obs.y) < this.radius + obs.size) {
            inOil = true;
          }
        });
        if (inOil) {
          speedLimit = 1.0; // Oil high-friction crawl
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

        // Obstacle Collisions (only cones now — oil is handled via speedLimit above)
        obstacles.forEach(obs => {
          if (Math.hypot(this.x - obs.x, this.y - obs.y) < this.radius + obs.size) {
            if (obs.type === 'CONE') {
              this.speed = -1.2; // Cone crash bump
            }
            // OIL is handled above via speedLimit, no spinout
          }
        });

        // Dynamic Lap Waypoint checks
        const nextWaypointIdx = (this.currentWaypoint + 1) % WAYPOINTS.length;
        const nextWp = WAYPOINTS[nextWaypointIdx];
        if (Math.hypot(this.x - nextWp.x, this.y - nextWp.y) < 85) {
          this.currentWaypoint = nextWaypointIdx;
          if (nextWaypointIdx === 0) {
            this.lap++;
            if (this.lap > this.totalLaps) {
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
    // Countdown state managed inside the engine
    let countdownPhase = 0; // 0=not active, 3,2,1 = steps, -1 = GO!, -2 = done
    let countdownStartTime = 0;
    const COUNTDOWN_STEP_MS = 1000;
    let goFadeAlpha = 1.0;

    function setupMatch(count, laps, colors) {
      cars = [];
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
        cars.push(new Car(i, grid.x, grid.y, grid.angle, isCPU, laps, colors));
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
      ctx.fillRect(-2, -66, 4, 132);
      ctx.restore();

      // Draw waypoints indicators for sci-fi HUD feel
      WAYPOINTS.forEach((wp) => {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawObstacles(ctx) {
      obstacles.forEach(obs => {
        if (obs.type === 'OIL') {
          // Mud/tar puddle - dark brown instead of pure black
          ctx.fillStyle = 'rgba(62, 39, 18, 0.88)';
          ctx.beginPath();
          ctx.ellipse(obs.x, obs.y, obs.size + 6, obs.size, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(40, 25, 10, 0.9)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Inner highlight blob
          ctx.fillStyle = 'rgba(90, 60, 30, 0.5)';
          ctx.beginPath();
          ctx.ellipse(obs.x - 2, obs.y + 1, obs.size - 4, obs.size - 6, 0.2, 0, Math.PI * 2);
          ctx.fill();
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
          ctx.fillRect(obs.x - obs.size / 2, obs.y, obs.size, 3);
        }
      });
    }

    function drawTrafficLight(ctx, step, alpha) {
      // step: 3 = all red, 2 = top red + middle yellow, 1 = top red + middle yellow,
      //       -1 = all green (GO!)
      // alpha: global opacity for fade out
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha = alpha;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const lightRadius = 22;
      const spacing = 58;
      const boxW = 70;
      const boxH = 190;

      // Housing
      ctx.fillStyle = '#111';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 12);
      ctx.fill();
      ctx.stroke();

      // Three lights
      const positions = [
        { y: cy - spacing, color: 'red' },     // top
        { y: cy, color: 'yellow' },             // middle
        { y: cy + spacing, color: 'green' }     // bottom
      ];

      positions.forEach((pos, i) => {
        // Determine if this light is ON
        let on = false;
        if (step === 3) {
          // All red
          on = (i === 0);
        } else if (step === 2 || step === 1) {
          // Top red + middle yellow
          on = (i === 0 || i === 1);
        } else if (step === -1) {
          // All green
          on = (i === 2);
        }

        // Dark base
        ctx.fillStyle = on ? 'transparent' : 'rgba(30,30,30,0.9)';
        ctx.beginPath();
        ctx.arc(cx, pos.y, lightRadius, 0, Math.PI * 2);
        ctx.fill();

        if (on) {
          // Glow
          let glowColor, lightColor;
          if (pos.color === 'red') {
            glowColor = 'rgba(255,50,50,0.5)';
            lightColor = '#ff3333';
          } else if (pos.color === 'yellow') {
            glowColor = 'rgba(255,200,0,0.5)';
            lightColor = '#ffcc00';
          } else {
            glowColor = 'rgba(0,255,100,0.5)';
            lightColor = '#00ff66';
          }

          // Outer glow
          const glow = ctx.createRadialGradient(cx, pos.y, lightRadius * 0.3, cx, pos.y, lightRadius * 2);
          glow.addColorStop(0, glowColor);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(cx, pos.y, lightRadius * 2, 0, Math.PI * 2);
          ctx.fill();

          // Light circle
          ctx.fillStyle = lightColor;
          ctx.beginPath();
          ctx.arc(cx, pos.y, lightRadius, 0, Math.PI * 2);
          ctx.fill();

          // Specular highlight
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath();
          ctx.arc(cx - 5, pos.y - 6, lightRadius * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Text label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (step >= 1) {
        ctx.fillText(String(step), cx, cy + boxH / 2 + 35);
      } else if (step === -1) {
        ctx.fillStyle = '#00ff66';
        ctx.fillText('GO!', cx, cy + boxH / 2 + 35);
      }

      ctx.restore();
    }

    function gameLoop(currentLaps) {
      // 1. Draw track
      drawTrack(ctx);
      drawObstacles(ctx);

      const countdownActive = countdownPhase > 0;

      // 2. Update and draw cars
      let finishedCount = 0;
      cars.forEach(car => {
        car.update(countdownActive);
        car.draw(ctx);
        if (car.finished) finishedCount++;
      });

      // Handle countdown progression
      if (countdownPhase > 0) {
        const elapsed = performance.now() - countdownStartTime;
        const totalSteps = 3; // 3, 2, 1
        const currentStep = totalSteps - Math.floor(elapsed / COUNTDOWN_STEP_MS);
        if (currentStep >= 1) {
          countdownPhase = currentStep;
        } else if (elapsed < (totalSteps + 1) * COUNTDOWN_STEP_MS) {
          // GO! phase
          countdownPhase = -1;
        } else {
          // Countdown fully done, start fading
          countdownPhase = -2;
          goFadeAlpha = 1.0;
        }
      }

      // Draw traffic light during countdown
      if (countdownPhase > 0 || countdownPhase === -1) {
        drawTrafficLight(ctx, countdownPhase, 1.0);
      } else if (countdownPhase === -2 && goFadeAlpha > 0) {
        drawTrafficLight(ctx, -1, goFadeAlpha);
        goFadeAlpha -= 0.03;
        if (goFadeAlpha <= 0) {
          goFadeAlpha = 0;
          countdownPhase = 0; // fully done
          setPhase('playing');
        }
      }

      // 3. Leaderboard calculations
      const standings = [...cars]
        .sort((a, b) => {
          if (a.finished !== b.finished) return b.finished - a.finished;
          if (a.lap !== b.lap) return b.lap - a.lap;
          if (a.currentWaypoint !== b.currentWaypoint) return b.currentWaypoint - a.currentWaypoint;
          const nextWp = WAYPOINTS[(a.currentWaypoint + 1) % WAYPOINTS.length];
          const distA = Math.hypot(a.x - nextWp.x, a.y - nextWp.y);
          const distB = Math.hypot(b.x - nextWp.x, b.y - nextWp.y);
          return distA - distB;
        });

      setLeaderboard(standings.map(c => `${c.label.split(' ')[0]} - L${Math.min(currentLaps, c.lap)}/${currentLaps}`));

      // 4. End Condition
      if (finishedCount > 0) {
        const winner = standings[0];
        setVictoryText(`${winner.label.toUpperCase()} WINS THE GRAND PRIX!`);
        setPhase('over');
        cancelAnimationFrame(animationId);
        return;
      }

      animationId = requestAnimationFrame(() => gameLoop(currentLaps));
    }

    stateRef.current.start = (count, laps, colors) => {
      setVictoryText("");
      setupMatch(count, laps, colors);
      setPhase('countdown');

      // Start countdown
      countdownPhase = 3;
      countdownStartTime = performance.now();
      goFadeAlpha = 1.0;

      animationId = requestAnimationFrame(() => gameLoop(laps));
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

  const handleStart = () => {
    // Build colors array with P1 custom color
    const colors = [...DEFAULT_PLAYER_COLORS];
    colors[0] = p1Color;
    setPhase('countdown');
    stateRef.current.start?.(playerCount, lapCount, colors);
  };

  return (
    <div className="r4-root">
      <BackButton />

      {phase === 'menu' && (
        <div className="r4-overlay">
          <div className="r4-menu-panel">
            <span className="r4-tag">// MULTIPLAYER_GRID</span>
            <h1 className="r4-title">2D RACER 4P</h1>
            <p className="r4-subtitle">
              Classic 2D grand prix. Steer through curves, dodge mud pits, and beat rival CPUs or friends! Off-road triggers slowdown penalty.
            </p>

            {/* Settings */}
            <div className="r4-settings">
              {/* Player Count */}
              <div className="r4-setting-group">
                <div className="r4-setting-label">// PLAYER COUNT</div>
                <div className="r4-btn-row">
                  {[1, 2, 3, 4].map(n => (
                    <button
                      key={n}
                      className={`r4-option-btn${playerCount === n ? ' active' : ''}`}
                      onClick={() => setPlayerCount(n)}
                    >
                      {n} {n === 1 ? 'PLAYER' : 'PLAYERS'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lap Count */}
              <div className="r4-setting-group">
                <div className="r4-setting-label">// LAP COUNT</div>
                <div className="r4-btn-row">
                  {[3, 5, 10].map(n => (
                    <button
                      key={n}
                      className={`r4-option-btn${lapCount === n ? ' active' : ''}`}
                      onClick={() => setLapCount(n)}
                    >
                      {n} LAPS
                    </button>
                  ))}
                </div>
              </div>

              {/* P1 Color Picker */}
              <div className="r4-setting-group">
                <div className="r4-setting-label">// P1 CAR COLOR</div>
                <div className="r4-swatch-row">
                  {COLOR_SWATCHES.map(c => (
                    <div
                      key={c}
                      className={`r4-swatch${p1Color === c ? ' active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setP1Color(c)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Controls Info */}
            <div className="r4-controls-box">
              <div className="r4-setting-label">// CONTROL_MATRIX</div>
              <div className="r4-controls-grid">
                <div>P1: WASD</div>
                <div>P2: IJKL</div>
                <div>P3: TFGH</div>
                <div>P4: Arrows</div>
              </div>
              <div className="r4-controls-hint">UP is Forward / Accelerate</div>
            </div>

            <button className="r4-start-btn" onClick={handleStart}>
              START RACE
            </button>
          </div>
        </div>
      )}

      {(phase === 'playing' || phase === 'countdown') && (
        <div className="r4-hud-bar">
          {/* Leaderboard Panel */}
          <div className="r4-leaderboard">
            <div className="r4-leaderboard-title">// STANDINGS</div>
            <div>
              {leaderboard.map((item, idx) => (
                <div key={idx} className="r4-standing-row">
                  <span className="r4-standing-rank">{idx + 1}.</span>
                  <span className="r4-standing-name">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* HUD Objective */}
          <div className="r4-objective">
            <div className="r4-objective-title">// OBJECTIVE</div>
            <div className="r4-objective-text">COMPLETE {lapCount} LAPS TO CLAIM VICTORY</div>
          </div>
        </div>
      )}

      {phase === 'over' && (
        <div className="r4-gameover-overlay">
          <div className="r4-gameover-panel">
            <span className="r4-gameover-tag">// RIVALRY_RESOLVED</span>
            <h2 className="r4-gameover-heading">GRAND PRIX OVER</h2>
            <div className="r4-gameover-result">
              {victoryText}
            </div>
            <button className="r4-restart-btn" onClick={handleStart}>
              RE-ENGAGE RACERS
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} width={1000} height={600} className="r4-canvas" />
    </div>
  );
}
