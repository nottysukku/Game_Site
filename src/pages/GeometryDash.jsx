import React, { useRef, useEffect, useState, useCallback } from 'react';
import BackButton from './BackButton';
import './GeometryDash.css';

const W = 900, H = 500;
const TILE = 40;
const GRAVITY = 0.7;
const JUMP_VEL = -11;
const SCROLL_SPEED = 5;
const GROUND_Y = H - TILE * 2;
const PLAYER_SIZE = 30;

function generateLevel() {
  const obstacles = [];
  let x = 600;
  const patterns = [
    // Single spike
    () => [{ type: 'spike', x: 0, y: 0 }],
    // Double spike
    () => [{ type: 'spike', x: 0, y: 0 }, { type: 'spike', x: TILE, y: 0 }],
    // Block
    () => [{ type: 'block', x: 0, y: 0 }],
    // Block + spike on top
    () => [{ type: 'block', x: 0, y: 0 }, { type: 'spike', x: 0, y: -TILE }],
    // Gap (no ground for a bit)
    () => [{ type: 'gap', x: 0, width: TILE * 3 }],
    // Triple spike
    () => [{ type: 'spike', x: 0, y: 0 }, { type: 'spike', x: TILE, y: 0 }, { type: 'spike', x: TILE * 2, y: 0 }],
    // Double block stair
    () => [{ type: 'block', x: 0, y: 0 }, { type: 'block', x: TILE, y: 0 }, { type: 'block', x: TILE, y: -TILE }],
    // Spike after block
    () => [{ type: 'block', x: 0, y: 0 }, { type: 'spike', x: TILE * 2, y: 0 }],
  ];

  for (let i = 0; i < 200; i++) {
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const items = pattern();
    for (const item of items) {
      obstacles.push({ ...item, x: x + item.x, baseY: item.y || 0 });
    }
    x += TILE * (2 + Math.floor(Math.random() * 4));
  }
  return { obstacles, totalLength: x };
}

export default function GeometryDash() {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [progress, setProgress] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [best, setBest] = useState(0);
  const stateRef = useRef({});

  const startGame = useCallback(() => {
    const level = generateLevel();
    stateRef.current = {
      player: { x: 150, y: GROUND_Y - PLAYER_SIZE, vy: 0, rotation: 0, onGround: true, dead: false },
      camX: 0,
      obstacles: level.obstacles,
      totalLength: level.totalLength,
      particles: [],
      groundGaps: level.obstacles.filter(o => o.type === 'gap'),
      hue: 0, bgPulse: 0, frame: 0
    };
    setProgress(0);
    setAttempts(a => a + 1);
    setPhase('playing');
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf, jumping = false;

    const onDown = () => { jumping = true; };
    const onUp = () => { jumping = false; };
    const onKey = (e) => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); jumping = e.type === 'keydown'; } };

    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    const loop = () => {
      const s = stateRef.current;
      const p = s.player;
      s.frame++;
      s.hue = (s.hue + 0.5) % 360;

      if (p.dead) {
        setBest(b => Math.max(b, Math.floor((s.camX / s.totalLength) * 100)));
        setPhase('dead');
        return;
      }

      // Scroll
      s.camX += SCROLL_SPEED;
      const prog = Math.min(100, Math.floor((s.camX / s.totalLength) * 100));
      setProgress(prog);

      // Win
      if (s.camX >= s.totalLength) {
        setBest(100);
        setPhase('win');
        return;
      }

      // Check if over a gap
      let overGap = false;
      for (const g of s.groundGaps) {
        if (p.x + s.camX > g.x && p.x + s.camX < g.x + (g.width || TILE * 3)) {
          overGap = true;
          break;
        }
      }

      // Jump
      if (jumping && p.onGround) {
        p.vy = JUMP_VEL;
        p.onGround = false;
      }

      // Physics
      p.vy += GRAVITY;
      p.y += p.vy;

      // Ground collision
      if (!overGap && p.y + PLAYER_SIZE >= GROUND_Y) {
        p.y = GROUND_Y - PLAYER_SIZE;
        p.vy = 0;
        p.onGround = true;
      }

      // Fall death
      if (p.y > H + 50) p.dead = true;

      // Rotation
      if (!p.onGround) p.rotation += 0.08;
      else {
        // Snap to nearest 90 degrees
        const target = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
        p.rotation += (target - p.rotation) * 0.3;
      }

      // Obstacle collision
      for (const o of s.obstacles) {
        const ox = o.x - s.camX;
        const oy = GROUND_Y + o.baseY;

        if (ox < -TILE * 2 || ox > W + TILE * 2) continue;

        if (o.type === 'spike') {
          // Triangle collision
          const sx = ox, sy = oy;
          const dx = (p.x + PLAYER_SIZE / 2) - (sx + TILE / 2);
          const dy = (p.y + PLAYER_SIZE / 2) - (sy - TILE / 2);
          if (Math.abs(dx) < PLAYER_SIZE * 0.4 + TILE * 0.3 && Math.abs(dy) < PLAYER_SIZE * 0.4 + TILE * 0.3) {
            p.dead = true;
            // Death particles
            for (let i = 0; i < 15; i++) {
              s.particles.push({
                x: p.x + PLAYER_SIZE / 2, y: p.y + PLAYER_SIZE / 2,
                vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                life: 30, hue: s.hue
              });
            }
          }
        } else if (o.type === 'block') {
          const bx = ox, by = oy - TILE;
          const px = p.x, py = p.y;
          if (px + PLAYER_SIZE > bx && px < bx + TILE && py + PLAYER_SIZE > by && py < by + TILE) {
            // Top collision
            if (p.vy > 0 && py + PLAYER_SIZE - p.vy <= by) {
              p.y = by - PLAYER_SIZE;
              p.vy = 0;
              p.onGround = true;
            } else {
              p.dead = true;
            }
          }
        }
      }

      // Particles
      s.particles = s.particles.filter(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.2; pt.life--; return pt.life > 0; });

      // Trail particles when on ground
      if (p.onGround && s.frame % 3 === 0) {
        s.particles.push({
          x: p.x + PLAYER_SIZE / 2, y: p.y + PLAYER_SIZE,
          vx: -1 - Math.random(), vy: -Math.random() * 2,
          life: 15, hue: s.hue
        });
      }

      // ──── DRAW ────
      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, `hsl(${s.hue}, 60%, 8%)`);
      bgGrad.addColorStop(1, `hsl(${s.hue + 40}, 50%, 12%)`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Background grid
      ctx.strokeStyle = `hsla(${s.hue}, 50%, 30%, 0.08)`;
      ctx.lineWidth = 1;
      const gridOff = s.camX % TILE;
      for (let x = -gridOff; x < W; x += TILE) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += TILE) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Ground
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
      groundGrad.addColorStop(0, `hsl(${s.hue}, 50%, 25%)`);
      groundGrad.addColorStop(1, `hsl(${s.hue}, 40%, 15%)`);

      // Draw ground with gaps
      ctx.fillStyle = groundGrad;
      let gx = 0;
      // Simple: draw full ground then cut gaps
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      // Top line
      ctx.strokeStyle = `hsl(${s.hue}, 80%, 50%)`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke();

      // Cut out gaps
      ctx.fillStyle = bgGrad;
      for (const g of s.groundGaps) {
        const ggx = g.x - s.camX;
        const gw = g.width || TILE * 3;
        if (ggx < W && ggx + gw > 0) {
          ctx.fillRect(ggx, GROUND_Y, gw, H - GROUND_Y + 10);
        }
      }

      // Obstacles
      for (const o of s.obstacles) {
        const ox = o.x - s.camX;
        if (ox < -TILE * 2 || ox > W + TILE * 2) continue;

        if (o.type === 'spike') {
          const sy = GROUND_Y + o.baseY;
          ctx.fillStyle = `hsl(${s.hue + 180}, 80%, 50%)`;
          ctx.beginPath();
          ctx.moveTo(ox, sy);
          ctx.lineTo(ox + TILE / 2, sy - TILE);
          ctx.lineTo(ox + TILE, sy);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = `hsl(${s.hue + 180}, 90%, 70%)`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (o.type === 'block') {
          const by = GROUND_Y + o.baseY - TILE;
          ctx.fillStyle = `hsl(${s.hue}, 50%, 30%)`;
          ctx.fillRect(ox, by, TILE, TILE);
          ctx.strokeStyle = `hsl(${s.hue}, 80%, 50%)`;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(ox, by, TILE, TILE);
        }
      }

      // Particles
      for (const pt of s.particles) {
        ctx.globalAlpha = pt.life / 30;
        ctx.fillStyle = `hsl(${pt.hue}, 80%, 60%)`;
        ctx.fillRect(pt.x - 3, pt.y - 3, 6, 6);
      }
      ctx.globalAlpha = 1;

      // Player
      if (!p.dead) {
        ctx.save();
        ctx.translate(p.x + PLAYER_SIZE / 2, p.y + PLAYER_SIZE / 2);
        ctx.rotate(p.rotation);
        ctx.fillStyle = `hsl(${s.hue + 120}, 80%, 55%)`;
        ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
        ctx.strokeStyle = `hsl(${s.hue + 120}, 90%, 75%)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
        // Icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▶', 1, 0);
        ctx.restore();

        // Glow
        ctx.shadowColor = `hsl(${s.hue + 120}, 80%, 55%)`;
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'transparent';
        ctx.fillRect(p.x, p.y, PLAYER_SIZE, PLAYER_SIZE);
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [phase]);

  return (
    <div className="gdash-root">
      <canvas ref={canvasRef} width={W} height={H} />
      <div className="gdash-hud">
        <div>Progress: <span>{progress}%</span></div>
        <div>Attempts: <span>{attempts}</span></div>
        <div>Best: <span>{best}%</span></div>
      </div>
      <div className="gdash-progress"><div className="gdash-progress-fill" style={{ width: `${progress}%` }} /></div>
      {phase === 'menu' && (
        <div className="gdash-overlay">
          <h2>▶ Geometry Dash</h2>
          <p>Click or press Space to jump. Don't hit the obstacles!</p>
          <button onClick={startGame}>Play</button>
        </div>
      )}
      {phase === 'dead' && (
        <div className="gdash-overlay">
          <h2>💀 Crashed at {progress}%</h2>
          <p>Attempt #{attempts} · Best: {best}%</p>
          <button onClick={startGame}>Retry</button>
        </div>
      )}
      {phase === 'win' && (
        <div className="gdash-overlay">
          <h2>⭐ Level Complete!</h2>
          <p>Attempts: {attempts}</p>
          <button onClick={startGame}>Play Again</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
