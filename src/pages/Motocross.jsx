import React, { useRef, useEffect, useState, useCallback } from 'react';
import BackButton from './BackButton';
import './Motocross.css';

const W = 950, H = 550;
const SEG_W = 10;
const NUM_SEGMENTS = 3000;

// Generate smooth procedurally generated terrain (hills, ramps, loop-the-loop, bridges)
function generateTerrain() {
  const segs = [];
  let x = 0;
  let y = H - 80;
  for (let i = 0; i < NUM_SEGMENTS; i++) {
    let dy = 0;
    
    // Add various features: starting grid, gentle hills, big drops, steep ramps, and jumps
    if (i < 40) {
      dy = 0; // Flat start
    } else if (i >= 120 && i < 150) {
      dy = -Math.sin((i - 120) / 10) * 12; // Ramps/bridges
    } else if (i >= 250 && i < 290) {
      dy = -4.5; // Long step climb
    } else if (i >= 400 && i < 430) {
      dy = Math.sin((i - 400) / 5) * 16; // Rollercoaster dips
    } else if (i >= 550 && i < 590) {
      dy = -5.5; // Big jump ramp
    } else if (i >= 590 && i < 610) {
      dy = 12; // Steep drop
    } else {
      // General rolling hills
      dy = Math.sin(i * 0.08) * 3 + Math.cos(i * 0.03) * 2;
    }
    
    y = Math.max(120, Math.min(H - 40, y + dy));
    segs.push({ x, y });
    x += SEG_W;
  }
  return segs;
}

function getTerrainY(terrain, px) {
  const idx = Math.floor(px / SEG_W);
  if (idx < 0) return H - 80;
  if (idx >= terrain.length - 1) return terrain[terrain.length - 1].y;
  const a = terrain[idx], b = terrain[idx + 1];
  const t = (px - a.x) / SEG_W;
  return a.y + (b.y - a.y) * t;
}

function getTerrainAngle(terrain, px) {
  const idx = Math.floor(px / SEG_W);
  if (idx < 0 || idx >= terrain.length - 1) return 0;
  const a = terrain[idx], b = terrain[idx + 1];
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export default function Motocross() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // menu | playing | dead
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const stateRef = useRef({});
  const keysRef = useRef({});

  const startGame = useCallback(() => {
    const terrain = generateTerrain();
    
    // Verlet physics particles setup
    // 0: Rear Wheel, 1: Front Wheel
    // 2: Chassis Seat/Pelvis Pivot, 3: Chassis Handlebars/Fork Top
    const startX = 200;
    const startY = getTerrainY(terrain, startX) - 50;

    const particles = [
      // Bike points (0-3)
      { x: startX - 32, y: startY + 15, px: startX - 32, py: startY + 15, mass: 1.0, invMass: 1.0, rad: 16, isWheel: true, ground: false }, // Rear wheel
      { x: startX + 32, y: startY + 15, px: startX + 32, py: startY + 15, mass: 1.0, invMass: 1.0, rad: 16, isWheel: true, ground: false }, // Front wheel
      { x: startX - 12, y: startY - 10, px: startX - 12, py: startY - 10, mass: 1.2, invMass: 0.83, rad: 8 },  // Seat/Hips anchor
      { x: startX + 16, y: startY - 24, px: startX + 16, py: startY - 24, mass: 1.2, invMass: 0.83, rad: 8 },  // Handlebars/Chest anchor
      
      // Rider points (4-8) - linked to chassis when riding
      { x: startX - 12, y: startY - 28, px: startX - 12, py: startY - 28, mass: 0.8, invMass: 1.25, rad: 8 },  // Rider Pelvis
      { x: startX + 2,  y: startY - 48, px: startX + 2,  py: startY - 48, mass: 0.8, invMass: 1.25, rad: 9 },  // Rider Chest
      { x: startX + 6,  y: startY - 66, px: startX + 6,  py: startY - 66, mass: 0.6, invMass: 1.66, rad: 10 }, // Rider Head (helmet)
      { x: startX + 16, y: startY - 24, px: startX + 16, py: startY - 24, mass: 0.4, invMass: 2.5, rad: 4 },   // Rider Hand
      { x: startX - 4,  y: startY - 2,  px: startX - 4,  py: startY - 2,  mass: 0.4, invMass: 2.5, rad: 4 }    // Rider Foot
    ];

    // Rigid & Spring Constraints connecting particles
    const constraints = [
      // Bike frame structures
      { p1: 0, p2: 2, dist: 32, stiff: 0.35, isSuspension: true },  // Rear shock suspension
      { p1: 1, p2: 3, dist: 42, stiff: 0.35, isSuspension: true },  // Front forks suspension
      { p1: 2, p2: 3, dist: 32, stiff: 0.95 },  // Top frame tube
      { p1: 0, p2: 3, dist: 62, stiff: 0.95 },  // Rear wheel to handlebars diagonal
      { p1: 1, p2: 2, dist: 62, stiff: 0.95 },  // Front wheel to seat diagonal
      { p1: 0, p2: 1, dist: 64, stiff: 0.15 },  // Bottom wheelbase tie (helps stability)

      // Rider joints
      { p1: 4, p2: 5, dist: 20, stiff: 0.85 },  // Spine/Torso
      { p1: 5, p2: 6, dist: 18, stiff: 0.85 },  // Neck
      { p1: 5, p2: 7, dist: 22, stiff: 0.7 },   // Arms (to handlebars)
      { p1: 4, p2: 8, dist: 26, stiff: 0.7 }    // Legs (to footpeg)
    ];

    // Mounting constraints holding rider on bike
    const mountConstraints = [
      { p1: 7, p2: 3, dist: 0, stiff: 1.0 }, // Hands on handlebars
      { p1: 8, p2: 2, dist: 14, stiff: 1.0 }, // Feet on footpeg (offset from seat)
      { p1: 4, p2: 2, dist: 12, stiff: 0.9 }  // Pelvis on seat
    ];

    stateRef.current = {
      particles,
      constraints,
      mountConstraints,
      terrain,
      camX: 0,
      score: 0,
      crashed: false,
      crashedTimer: 0,
      particlesVisual: [],
      wheelRotRear: 0,
      wheelRotFront: 0
    };

    setScore(0);
    setGameState('playing');
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const isDown = e.type === 'keydown';
      keysRef.current[e.key] = isDown;
      
      // Support WASD equivalents
      if (e.key === 'w' || e.key === 'W') keysRef.current['ArrowUp'] = isDown;
      if (e.key === 's' || e.key === 'S') keysRef.current['ArrowDown'] = isDown;
      if (e.key === 'a' || e.key === 'A') keysRef.current['ArrowLeft'] = isDown;
      if (e.key === 'd' || e.key === 'D') keysRef.current['ArrowRight'] = isDown;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const loop = () => {
      const s = stateRef.current;
      const k = keysRef.current;
      const dt = 0.016; // Fixed timestep for physics stability

      if (s.crashed) {
        s.crashedTimer += dt;
        if (s.crashedTimer > 2.8) {
          setGameState('dead');
          return;
        }
      }

      // ──── PHYSICS STEP ────
      
      // 1. Apply gravity & controls (forces)
      s.particles.forEach((p, idx) => {
        const vx = p.x - p.px;
        const vy = p.y - p.py;

        p.px = p.x;
        p.py = p.y;

        // Apply constant gravity
        p.y += vy + 0.38; // gravity force
        p.x += vx;
      });

      // Drive controls & active torque calculations
      if (!s.crashed) {
        const rear = s.particles[0];
        const front = s.particles[1];
        const seat = s.particles[2];
        const bars = s.particles[3];
        const chest = s.particles[5];

        // Drive acceleration (torque pushing rear wheel forward, causing front wheel to lift)
        if (k['ArrowUp']) {
          if (rear.ground) {
            rear.x += 0.85; // Forward force
            // Rotational counter-torque (lift front wheel)
            front.y -= 0.38;
            seat.y += 0.18;
            
            // Spawn dirt particle FX
            if (Math.random() < 0.4) {
              s.particlesVisual.push({
                x: rear.x, y: rear.y + rear.rad,
                vx: -6 - Math.random() * 4,
                vy: -2 - Math.random() * 4,
                color: '#8b5a2b',
                age: 0, maxAge: 0.5 + Math.random() * 0.4
              });
            }
          } else {
            // Spin rear wheel mid-air (increases rotation angle visually)
            s.wheelRotRear += 0.35;
          }
        }

        // Braking / Reversing
        if (k['ArrowDown']) {
          if (rear.ground || front.ground) {
            rear.x -= 0.3;
            // Balance out torque to push front down
            front.y += 0.2;
          }
        }

        // Active Lean Controls (torques rotating the chassis)
        const leanTorque = 0.65;
        if (k['ArrowLeft']) {
          // Lean back (CCW): seat moves down/back, bars move up/forward
          seat.x -= leanTorque;
          seat.y += leanTorque * 0.5;
          bars.x += leanTorque;
          bars.y -= leanTorque * 0.5;
          chest.x -= leanTorque * 0.3; // Lean rider body back
        }
        if (k['ArrowRight']) {
          // Lean forward (CW): seat moves up/forward, bars move down/back
          seat.x += leanTorque;
          seat.y -= leanTorque * 0.5;
          bars.x -= leanTorque;
          bars.y += leanTorque * 0.5;
          chest.x += leanTorque * 0.3; // Lean rider body forward
        }
      }

      // 2. Resolve Constraints
      const iterations = 8;
      for (let step = 0; step < iterations; step++) {
        // Resolve structural chassis and skeleton
        s.constraints.forEach((c) => {
          const p1 = s.particles[c.p1];
          const p2 = s.particles[c.p2];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.hypot(dx, dy);
          const diff = c.dist - dist;
          const percent = (diff / dist) * 0.5 * c.stiffness;
          const offsetX = dx * percent;
          const offsetY = dy * percent;

          if (!p1.isWheel || !c.isSuspension) {
            p1.x -= offsetX * p1.invMass;
            p1.y -= offsetY * p1.invMass;
          }
          if (!p2.isWheel || !c.isSuspension) {
            p2.x += offsetX * p2.invMass;
            p2.y += offsetY * p2.invMass;
          }
        });

        // Resolve rider mounts to bike if not crashed
        if (!s.crashed) {
          s.mountConstraints.forEach((c) => {
            const p1 = s.particles[c.p1];
            const p2 = s.particles[c.p2];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy);
            const diff = c.dist - dist;
            if (dist > 0.1) {
              const percent = (diff / dist) * 0.5 * c.stiffness;
              const offsetX = dx * percent;
              const offsetY = dy * percent;

              p1.x -= offsetX * p1.invMass;
              p1.y -= offsetY * p1.invMass;
              p2.x += offsetX * p2.invMass;
              p2.y += offsetY * p2.invMass;
            }
          });
        }
      }

      // 3. Resolve Collisions against Terrain
      s.particles.forEach((p, idx) => {
        const groundY = getTerrainY(s.terrain, p.x);
        p.ground = false;

        if (p.y > groundY - p.rad) {
          p.ground = true;
          const angle = getTerrainAngle(s.terrain, p.x);
          const nx = -Math.sin(angle);
          const ny = Math.cos(angle);

          // Push out of ground along terrain normal
          const pen = (groundY - p.rad) - p.y;
          p.x += nx * pen;
          p.y = groundY - p.rad;

          const vx = p.x - p.px;
          const vy = p.y - p.py;

          // Apply sliding friction and bounce
          const bounce = p.isWheel ? 0.05 : 0.25;
          const friction = p.isWheel ? 0.95 : 0.65;
          
          p.px = p.x - vx * friction;
          p.py = p.y + vy * bounce;

          // Crash trigger: rider head or chest hit terrain at high speed, or high angle impact
          if (!s.crashed && (idx === 6 || idx === 5)) {
            const impactSpeed = Math.hypot(vx, vy);
            if (impactSpeed > 3.8 || idx === 6) {
              s.crashed = true;
              s.crashedTimer = 0;
            }
          }
        }
      });

      // Additional bike angle crash checks (upside down landing)
      if (!s.crashed) {
        const rear = s.particles[0];
        const front = s.particles[1];
        const head = s.particles[6];
        const bikeAngle = Math.atan2(front.y - rear.y, front.x - rear.x);
        const headY = head.y;
        const rearY = rear.y;

        // If upside down (angle relative to horizontal is large) and head is lower than wheels
        if (headY > rearY + 12 && Math.abs(bikeAngle) > Math.PI * 0.45) {
          s.crashed = true;
          s.crashedTimer = 0;
        }
      }

      // Rotate wheels visually based on horizontal speed
      const rear = s.particles[0];
      const front = s.particles[1];
      const speed = rear.x - rear.px;
      s.wheelRotRear += speed / rear.rad;
      s.wheelRotFront += speed / front.rad;

      // Update particle visuals (smoke, exhaust)
      for (let i = s.particlesVisual.length - 1; i >= 0; i--) {
        const p = s.particlesVisual[i];
        p.age += dt;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity on particles
        if (p.age >= p.maxAge) {
          s.particlesVisual.splice(i, 1);
        }
      }

      // Spawn visual smoke puffs from exhaust
      if (!s.crashed && Math.random() < 0.12) {
        const seat = s.particles[2];
        s.particlesVisual.push({
          x: seat.x - 14, y: seat.y + 6,
          vx: -1.5 - Math.random() * 1.5,
          vy: -0.5 - Math.random() * 1.0,
          color: 'rgba(200, 200, 200, 0.45)',
          age: 0, maxAge: 0.6 + Math.random() * 0.4
        });
      }

      // Camera follows rider pelvis
      const trackPoint = s.particles[4]; // Pelvis
      s.camX += (trackPoint.x - 280 - s.camX) * 0.08;
      s.camX = Math.max(0, s.camX);

      s.distance = Math.max(s.distance, Math.floor(trackPoint.x / 10));
      setScore(s.distance);

      // Check if fell off screen
      if (trackPoint.y > H + 100) {
        s.crashed = true;
        s.crashedTimer += 1.0; // speed up restart
      }

      // ──── RENDER ────
      ctx.clearRect(0, 0, W, H);

      // Skybox background gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, '#7dd3fc');
      skyGrad.addColorStop(0.65, '#e0f2fe');
      skyGrad.addColorStop(1, '#ffedd5');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Draw Sun in distance (parallax)
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(W - 150 - s.camX * 0.05, 110, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(W - 150 - s.camX * 0.05, 110, 28, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Parallax back hills
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 50) {
        const worldX = x + s.camX * 0.2;
        const my = H - 90 - Math.sin(worldX * 0.003) * 60 - Math.cos(worldX * 0.001) * 30;
        ctx.lineTo(x, my);
      }
      ctx.lineTo(W, H);
      ctx.fill();

      // Middle hills
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 40) {
        const worldX = x + s.camX * 0.5;
        const my = H - 60 - Math.cos(worldX * 0.006) * 45 - Math.sin(worldX * 0.002) * 20;
        ctx.lineTo(x, my);
      }
      ctx.lineTo(W, H);
      ctx.fill();

      // Draw Terrain segments
      ctx.save();
      ctx.beginPath();
      let first = true;
      s.terrain.forEach((seg) => {
        const drawX = seg.x - s.camX;
        if (drawX < -50 || drawX > W + 50) return;
        if (first) {
          ctx.moveTo(drawX, seg.y);
          first = false;
        } else {
          ctx.lineTo(drawX, seg.y);
        }
      });
      ctx.lineTo(W + 50, H + 50);
      ctx.lineTo(-50, H + 50);
      ctx.closePath();

      // Dirt fill gradient
      const terrGrad = ctx.createLinearGradient(0, H - 200, 0, H);
      terrGrad.addColorStop(0, '#78350f');
      terrGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = terrGrad;
      ctx.fill();

      // Green grass top outline
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();

      // Draw particle FX (exhaust, dirt)
      s.particlesVisual.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - s.camX, p.y, 3 + (p.age * 5), 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw physical bike elements
      const p_rear = s.particles[0];
      const p_front = s.particles[1];
      const p_seat = s.particles[2];
      const p_bars = s.particles[3];

      // Draw rear shock coil (spring representation)
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(p_rear.x - s.camX, p_rear.y);
      // spring zigzag lines
      const midX = (p_rear.x + p_seat.x) / 2 - s.camX;
      const midY = (p_rear.y + p_seat.y) / 2;
      ctx.lineTo(midX - 4, midY - 6);
      ctx.lineTo(midX + 4, midY + 6);
      ctx.lineTo(p_seat.x - s.camX, p_seat.y);
      ctx.stroke();

      // Draw front fork suspension
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(p_front.x - s.camX, p_front.y);
      ctx.lineTo(p_bars.x - s.camX, p_bars.y);
      ctx.stroke();

      // Draw main chassis tubes
      ctx.strokeStyle = '#ff3b30'; // red framing
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(p_rear.x - s.camX, p_rear.y);
      ctx.lineTo(p_seat.x - s.camX, p_seat.y);
      ctx.lineTo(p_bars.x - s.camX, p_bars.y);
      ctx.closePath();
      ctx.stroke();

      // Engine block / details in center of chassis
      ctx.fillStyle = '#1f2937';
      ctx.fillRect((p_rear.x + p_seat.x)/2 - s.camX + 6, (p_rear.y + p_seat.y)/2 + 2, 16, 12);
      ctx.fillStyle = '#4b5563';
      ctx.fillRect((p_rear.x + p_seat.x)/2 - s.camX + 10, (p_rear.y + p_seat.y)/2 + 4, 8, 8);

      // Seat pad
      ctx.fillStyle = '#0f172a';
      ctx.save();
      ctx.translate(p_seat.x - s.camX, p_seat.y);
      ctx.rotate(Math.atan2(p_bars.y - p_seat.y, p_bars.x - p_seat.x));
      ctx.fillRect(-10, -5, 16, 6);
      ctx.restore();

      // Exhaust pipe
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo((p_rear.x + p_seat.x)/2 - s.camX, (p_rear.y + p_seat.y)/2 + 6);
      ctx.lineTo(p_seat.x - s.camX - 12, p_seat.y + 4);
      ctx.stroke();

      // Draw wheels (rotating tires)
      for (const w of [
        { p: p_rear, rot: s.wheelRotRear },
        { p: p_front, rot: s.wheelRotFront }
      ]) {
        ctx.save();
        ctx.translate(w.p.x - s.camX, w.p.y);
        ctx.rotate(w.rot);
        
        // Tire outer ring
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.arc(0, 0, w.p.rad - 2.5, 0, Math.PI * 2);
        ctx.stroke();

        // Inner rim
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, w.p.rad - 6, 0, Math.PI * 2);
        ctx.stroke();

        // Spokes
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        for (let sp = 0; sp < 6; sp++) {
          const angle = (sp * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * (w.p.rad - 5), Math.sin(angle) * (w.p.rad - 5));
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Humanoid Rider (Verlet points: Pelvis 4, Chest 5, Head 6, Hand 7, Foot 8)
      const p_pelv = s.particles[4];
      const p_chst = s.particles[5];
      const p_head = s.particles[6];
      const p_hand = s.particles[7];
      const p_foot = s.particles[8];

      ctx.save();
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';

      // 1. Draw Legs (pelvis -> foot)
      ctx.strokeStyle = '#0284c7'; // Blue rider pants
      ctx.beginPath();
      // Midpoint knee joint approximation
      const kneeX = (p_pelv.x + p_foot.x) / 2 - s.camX - 3 * (s.crashed ? 0 : 1);
      const kneeY = (p_pelv.y + p_foot.y) / 2 + 5 * (s.crashed ? 0 : 1);
      ctx.moveTo(p_pelv.x - s.camX, p_pelv.y);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(p_foot.x - s.camX, p_foot.y);
      ctx.stroke();

      // 2. Draw Torso (pelvis -> chest)
      ctx.strokeStyle = '#f43f5e'; // Red jersey
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(p_pelv.x - s.camX, p_pelv.y);
      ctx.lineTo(p_chst.x - s.camX, p_chst.y);
      ctx.stroke();

      // 3. Draw Arms (chest -> hand)
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      // Midpoint elbow joint approximation
      const elbowX = (p_chst.x + p_hand.x) / 2 - s.camX + 2 * (s.crashed ? 0 : 1);
      const elbowY = (p_chst.y + p_hand.y) / 2 - 3 * (s.crashed ? 0 : 1);
      ctx.moveTo(p_chst.x - s.camX, p_chst.y);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(p_hand.x - s.camX, p_hand.y);
      ctx.stroke();

      // 4. Draw Helmet / Head (chest -> head)
      ctx.strokeStyle = '#0f172a'; // Neck collar
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(p_chst.x - s.camX, p_chst.y - 2);
      ctx.lineTo(p_head.x - s.camX, p_head.y + 4);
      ctx.stroke();

      // Helmet sphere
      ctx.fillStyle = '#eab308'; // Glowing yellow helmet
      ctx.beginPath();
      ctx.arc(p_head.x - s.camX, p_head.y, p_head.rad, 0, Math.PI * 2);
      ctx.fill();

      // Visor decal
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      const faceAngle = s.crashed ? s.crashedTimer * 5 : Math.atan2(p_chst.y - p_head.y, p_chst.x - p_head.x) + Math.PI / 2;
      ctx.arc(
        p_head.x - s.camX + Math.cos(faceAngle + 0.3) * 5,
        p_head.y + Math.sin(faceAngle + 0.3) * 5,
        3.5, 0, Math.PI * 2
      );
      ctx.fill();

      ctx.restore();

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'dead') {
      setBest(b => Math.max(b, score));
    }
  }, [gameState, score]);

  return (
    <div className="motocross-root">
      <canvas ref={canvasRef} width={W} height={H} />
      <div className="motocross-hud">
        <div>Distance: <span>{score}m</span></div>
        <div>Best: <span>{best}m</span></div>
      </div>
      {gameState === 'menu' && (
        <div className="motocross-overlay">
          <h2>🏍️ Trials Motocross</h2>
          <p>Physics-based motorcycle platformer with active lean and full ragdoll crash physics.</p>
          <button onClick={startGame}>Start Ride</button>
          <div className="motocross-instructions">
            <strong>Controls:</strong>
            <ul>
              <li>↑ / W: Accelerate (lifts front wheel)</li>
              <li>↓ / S: Brake / Reverse</li>
              <li>← / A: Lean Backwards (CCW torque)</li>
              <li>→ / D: Lean Forwards (CW torque)</li>
            </ul>
          </div>
        </div>
      )}
      {gameState === 'dead' && (
        <div className="motocross-overlay">
          <h2>💥 Rider Crashed!</h2>
          <p>Distance: {score}m · Best: {Math.max(best, score)}m</p>
          <button onClick={startGame}>Try Again</button>
        </div>
      )}
      <div className="motocross-controls">↑/W Accelerate · ↓/S Brake · ←/A Lean Back · →/D Lean Forward</div>
      <BackButton />
    </div>
  );
}
