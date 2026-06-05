import React, { useRef, useEffect, useState, useCallback } from 'react';
import BackButton from './BackButton';
import './GravityShooter.css';

const W = 900, H = 600;
const GRAVITY = 0.12;
const JUMP_VEL = -5.5;
const MOVE_SPEED = 2.5;
const PLAYER_R = 16;
const BULLET_SPEED = 8;
const GUN_LEN = 28;
const GUN_ROT_SPEED = 0.04;
const MAX_HP = 100;
const BULLET_DMG = 18;

const COLORS = ['#69f0ae', '#ff5252', '#448aff', '#ffd740'];
const NAMES = ['P1', 'P2', 'P3', 'P4'];
const CONTROLS = [
  { left: 'a', right: 'd', up: 'w', fire: ' ' },
  { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', fire: 'Enter' },
  { left: 'j', right: 'l', up: 'i', fire: 'o' },
  { left: '4', right: '6', up: '8', fire: '0' },
];

const PLATFORMS = [
  { x: 100, y: 480, w: 200, h: 14 },
  { x: 380, y: 400, w: 160, h: 14 },
  { x: 620, y: 480, w: 200, h: 14 },
  { x: 200, y: 300, w: 150, h: 14 },
  { x: 550, y: 300, w: 150, h: 14 },
  { x: 350, y: 200, w: 180, h: 14 },
  { x: 50, y: 160, w: 120, h: 14 },
  { x: 730, y: 160, w: 120, h: 14 },
  { x: 0, y: H - 10, w: W, h: 20 },
];

function createPlayer(idx, total) {
  const spawnX = [150, 750, 300, 600];
  return {
    x: spawnX[idx], y: 100, vx: 0, vy: 0,
    hp: MAX_HP, alive: true,
    gunAngle: idx * Math.PI / 2,
    canFire: true, fireCD: 0,
    isAI: false, aiTimer: 0, aiTarget: -1
  };
}

function createAI(idx) {
  const p = createPlayer(idx, 2);
  p.isAI = true;
  return p;
}

export default function GravityShooter() {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [playerCount, setPlayerCount] = useState(2);
  const [winner, setWinner] = useState('');
  const stateRef = useRef({});
  const keysRef = useRef({});

  const startGame = useCallback((count) => {
    setPlayerCount(count);
    const players = [];
    if (count === 1) {
      players.push(createPlayer(0, 2));
      players.push(createAI(1));
    } else {
      for (let i = 0; i < count; i++) players.push(createPlayer(i, count));
    }
    stateRef.current = { players, bullets: [], particles: [] };
    setWinner('');
    setPhase('playing');
  }, []);

  useEffect(() => {
    const down = (e) => { keysRef.current[e.key] = true; };
    const up = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const loop = () => {
      const s = stateRef.current;
      const k = keysRef.current;

      // Update players
      s.players.forEach((p, idx) => {
        if (!p.alive) return;
        const ctrl = CONTROLS[idx];

        // AI logic
        if (p.isAI) {
          p.aiTimer++;
          const aliveTargets = s.players.filter((t, i) => i !== idx && t.alive);
          if (aliveTargets.length > 0) {
            const target = aliveTargets[0];
            const dx = target.x - p.x;
            const dy = target.y - p.y;
            // Move toward target
            if (Math.abs(dx) > 80) p.vx += (dx > 0 ? 0.12 : -0.12);
            // Jump occasionally
            if (p.aiTimer % 60 === 0 && Math.random() < 0.4) p.vy = JUMP_VEL;
            // Fire when gun roughly points at target
            const aimAngle = Math.atan2(dy, dx);
            const angleDiff = Math.abs(((p.gunAngle - aimAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
            if (angleDiff < 0.3 && p.canFire) {
              s.bullets.push({
                x: p.x + Math.cos(p.gunAngle) * GUN_LEN,
                y: p.y + Math.sin(p.gunAngle) * GUN_LEN,
                vx: Math.cos(p.gunAngle) * BULLET_SPEED,
                vy: Math.sin(p.gunAngle) * BULLET_SPEED,
                owner: idx
              });
              p.canFire = false;
              p.fireCD = 30;
            }
          }
        } else {
          if (k[ctrl.left]) p.vx -= 0.25;
          if (k[ctrl.right]) p.vx += 0.25;
          if (k[ctrl.up]) {
            // Check if on platform
            const onPlat = PLATFORMS.some(pl =>
              p.x > pl.x - PLAYER_R && p.x < pl.x + pl.w + PLAYER_R &&
              p.y + PLAYER_R >= pl.y - 2 && p.y + PLAYER_R <= pl.y + 8
            );
            if (onPlat) p.vy = JUMP_VEL;
          }
          if (k[ctrl.fire] && p.canFire) {
            s.bullets.push({
              x: p.x + Math.cos(p.gunAngle) * GUN_LEN,
              y: p.y + Math.sin(p.gunAngle) * GUN_LEN,
              vx: Math.cos(p.gunAngle) * BULLET_SPEED,
              vy: Math.sin(p.gunAngle) * BULLET_SPEED,
              owner: idx
            });
            p.canFire = false;
            p.fireCD = 30;
          }
        }

        // Gun rotation
        p.gunAngle += GUN_ROT_SPEED;

        // Fire cooldown
        if (!p.canFire) {
          p.fireCD--;
          if (p.fireCD <= 0) p.canFire = true;
        }

        // Physics
        p.vy += GRAVITY;
        p.vx *= 0.94;
        p.x += p.vx;
        p.y += p.vy;

        // Clamp speed
        p.vx = Math.max(-MOVE_SPEED, Math.min(MOVE_SPEED, p.vx));

        // Platform collision
        for (const pl of PLATFORMS) {
          if (p.x + PLAYER_R > pl.x && p.x - PLAYER_R < pl.x + pl.w) {
            if (p.y + PLAYER_R >= pl.y && p.y + PLAYER_R <= pl.y + pl.h + 6 && p.vy > 0) {
              p.y = pl.y - PLAYER_R;
              p.vy = 0;
            }
          }
        }

        // Wall bounds
        if (p.x < PLAYER_R) { p.x = PLAYER_R; p.vx = 0; }
        if (p.x > W - PLAYER_R) { p.x = W - PLAYER_R; p.vx = 0; }
        if (p.y < -200) p.y = -200;
      });

      // Update bullets
      s.bullets = s.bullets.filter(b => {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += GRAVITY * 0.3;
        if (b.x < -20 || b.x > W + 20 || b.y < -100 || b.y > H + 20) return false;

        // Hit platform?
        for (const pl of PLATFORMS) {
          if (b.x > pl.x && b.x < pl.x + pl.w && b.y > pl.y && b.y < pl.y + pl.h) return false;
        }

        // Hit player?
        for (let i = 0; i < s.players.length; i++) {
          if (i === b.owner) continue;
          const p = s.players[i];
          if (!p.alive) continue;
          const dx = b.x - p.x, dy = b.y - p.y;
          if (dx * dx + dy * dy < (PLAYER_R + 4) ** 2) {
            p.hp -= BULLET_DMG;
            // Knockback
            p.vx += b.vx * 0.3;
            p.vy += b.vy * 0.3;
            // Particles
            for (let j = 0; j < 6; j++) {
              s.particles.push({
                x: b.x, y: b.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 20, color: COLORS[i]
              });
            }
            if (p.hp <= 0) { p.alive = false; p.hp = 0; }
            return false;
          }
        }
        return true;
      });

      // Particles
      s.particles = s.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
        return p.life > 0;
      });

      // Check winner
      const alive = s.players.filter(p => p.alive);
      if (alive.length <= 1) {
        const w = alive.length === 1
          ? NAMES[s.players.indexOf(alive[0])]
          : 'Nobody';
        setWinner(w + ' wins!');
        setPhase('gameover');
        return;
      }

      // ──── DRAW ────
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = '#ffffff15';
      for (let i = 0; i < 60; i++) {
        ctx.fillRect((i * 137 + 30) % W, (i * 89 + 10) % H, 2, 2);
      }

      // Platforms
      for (const pl of PLATFORMS) {
        const grad = ctx.createLinearGradient(pl.x, pl.y, pl.x, pl.y + pl.h);
        grad.addColorStop(0, '#334');
        grad.addColorStop(1, '#222');
        ctx.fillStyle = grad;
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.strokeStyle = '#556';
        ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
      }

      // Players
      s.players.forEach((p, idx) => {
        if (!p.alive) return;
        // Body
        ctx.beginPath();
        ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[idx] + '44';
        ctx.fill();
        ctx.strokeStyle = COLORS[idx];
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Face
        ctx.fillStyle = COLORS[idx];
        ctx.fillRect(p.x - 4, p.y - 4, 3, 3);
        ctx.fillRect(p.x + 2, p.y - 4, 3, 3);
        ctx.fillRect(p.x - 3, p.y + 3, 6, 2);

        // Gun
        const gx = p.x + Math.cos(p.gunAngle) * GUN_LEN;
        const gy = p.y + Math.sin(p.gunAngle) * GUN_LEN;
        ctx.strokeStyle = p.canFire ? '#fff' : '#666';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(gx, gy);
        ctx.stroke();
        // Gun tip
        ctx.beginPath();
        ctx.arc(gx, gy, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.canFire ? '#fff' : '#666';
        ctx.fill();

        // Name
        ctx.fillStyle = COLORS[idx];
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(NAMES[idx] + (p.isAI ? ' (AI)' : ''), p.x, p.y - PLAYER_R - 8);
      });

      // Bullets
      for (const b of s.bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[b.owner];
        ctx.fill();
        ctx.shadowColor = COLORS[b.owner];
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Particles
      for (const p of s.particles) {
        ctx.globalAlpha = p.life / 20;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const renderHUD = () => {
    if (phase !== 'playing') return null;
    const s = stateRef.current;
    if (!s.players) return null;
    return (
      <div className="gshooter-hud">
        {s.players.map((p, i) => (
          <div key={i} className="gshooter-hp-bar" style={{ borderColor: COLORS[i] + '66' }}>
            <span style={{ color: COLORS[i], fontWeight: 700, fontSize: '.8rem' }}>
              {NAMES[i]}{p.isAI ? '🤖' : ''}
            </span>
            <div className="gshooter-hp-fill">
              <div style={{ width: `${Math.max(0, p.hp)}%`, background: COLORS[i] }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="gshooter-root">
      <canvas ref={canvasRef} width={W} height={H} />
      {renderHUD()}
      {phase === 'menu' && (
        <div className="gshooter-menu">
          <h2>🔫 Gravity Shooter</h2>
          <p>Low-gravity arena! Guns rotate around players — time your shots! Last player standing wins.</p>
          <div className="gshooter-mode-btns">
            <button onClick={() => startGame(1)}>1 vs AI</button>
            <button onClick={() => startGame(2)}>2 Players</button>
            <button onClick={() => startGame(3)}>3 Players</button>
            <button onClick={() => startGame(4)}>4 Players</button>
          </div>
          <p style={{ fontSize: '.8rem', color: '#555' }}>
            P1: WASD + Space · P2: Arrows + Enter · P3: IJKL + O · P4: Numpad 8456 + 0
          </p>
        </div>
      )}
      {phase === 'gameover' && (
        <div className="gshooter-winner">
          <h2>🏆 {winner}</h2>
          <button onClick={() => setPhase('menu')}>Play Again</button>
        </div>
      )}
      <div className="gshooter-controls">
        P1: WASD + Space · P2: Arrows + Enter · P3: IJKL + O · P4: 8456 + 0
      </div>
      <BackButton />
    </div>
  );
}
