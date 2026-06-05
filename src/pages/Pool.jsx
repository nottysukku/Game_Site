import React, { useRef, useEffect, useState, useCallback } from 'react';
import BackButton from './BackButton';
import './Pool.css';

const W = 800, H = 450;
const TABLE_X = 50, TABLE_Y = 50;
const TABLE_W = W - 100, TABLE_H = H - 100;
const BALL_R = 10;
const FRICTION = 0.985;
const POCKET_R = 18;
const CUE_LEN = 140;
const MAX_POWER = 16;

const POCKETS = [
  { x: TABLE_X + 4, y: TABLE_Y + 4 },
  { x: TABLE_X + TABLE_W / 2, y: TABLE_Y - 2 },
  { x: TABLE_X + TABLE_W - 4, y: TABLE_Y + 4 },
  { x: TABLE_X + 4, y: TABLE_Y + TABLE_H - 4 },
  { x: TABLE_X + TABLE_W / 2, y: TABLE_Y + TABLE_H + 2 },
  { x: TABLE_X + TABLE_W - 4, y: TABLE_Y + TABLE_H - 4 },
];

const BALL_COLORS = [
  '#fff',    // 0 cue
  '#ffd740', // 1 solid
  '#2196f3', // 2
  '#ff0000', // 3
  '#6a1b9a', // 4
  '#ff6600', // 5
  '#00897b', // 6
  '#8b0000', // 7
  '#000',    // 8
  '#ffd740', // 9 stripe
  '#2196f3', // 10
  '#ff0000', // 11
  '#6a1b9a', // 12
  '#ff6600', // 13
  '#00897b', // 14
  '#8b0000', // 15
];

function rackBalls() {
  const cx = TABLE_X + TABLE_W * 0.72, cy = TABLE_Y + TABLE_H / 2;
  const order = [1, 2, 3, 8, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
  const balls = [{ id: 0, x: TABLE_X + TABLE_W * 0.25, y: cy, vx: 0, vy: 0, sunk: false }];
  let idx = 0;
  const sp = BALL_R * 2.1;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      if (idx >= order.length) break;
      balls.push({
        id: order[idx++],
        x: cx + row * sp * 0.866,
        y: cy + (col - row / 2) * sp,
        vx: 0, vy: 0, sunk: false
      });
    }
  }
  return balls;
}

function ballsMoving(balls) {
  return balls.some(b => !b.sunk && (Math.abs(b.vx) > 0.05 || Math.abs(b.vy) > 0.05));
}

export default function Pool() {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('menu'); // menu | playing | gameover
  const [mode, setMode] = useState('ai'); // ai | local
  const [turn, setTurn] = useState(1); // 1 or 2
  const [p1Type, setP1Type] = useState(null); // 'solid'|'stripe'|null
  const [winner, setWinner] = useState('');
  const [message, setMessage] = useState('');
  const stateRef = useRef({});
  const mouseRef = useRef({ x: 0, y: 0, down: false, power: 0 });

  const startGame = useCallback((m) => {
    setMode(m);
    stateRef.current = { balls: rackBalls(), shooting: false, aiThinking: false, aiTimer: 0 };
    setTurn(1); setP1Type(null); setWinner(''); setMessage('Player 1: Break!');
    setPhase('playing');
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    let raf;

    const onMove = (e) => {
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    const onDown = (e) => { mouseRef.current.down = true; mouseRef.current.power = 0; };
    const onUp = () => {
      const m = mouseRef.current;
      if (m.down && m.power > 0.5) {
        const s = stateRef.current;
        const cue = s.balls[0];
        if (!cue.sunk && !ballsMoving(s.balls) && !s.shooting) {
          const isPlayerTurn = turn === 1 || (mode === 'local' && turn === 2);
          if (isPlayerTurn || s.aiThinking) {
            const angle = Math.atan2(cue.y - m.y, cue.x - m.x);
            const power = Math.min(m.power * 0.15, MAX_POWER);
            cue.vx = Math.cos(angle) * power;
            cue.vy = Math.sin(angle) * power;
            s.shooting = true;
            s.aiThinking = false;
          }
        }
      }
      m.down = false; m.power = 0;
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);

    const loop = () => {
      const s = stateRef.current;
      const m = mouseRef.current;
      const balls = s.balls;

      // Power charge
      if (m.down) m.power = Math.min(m.power + 1.5, 100);

      // Physics
      let moving = false;
      for (const b of balls) {
        if (b.sunk) continue;
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= FRICTION;
        b.vy *= FRICTION;
        if (Math.abs(b.vx) < 0.05) b.vx = 0;
        if (Math.abs(b.vy) < 0.05) b.vy = 0;
        if (b.vx !== 0 || b.vy !== 0) moving = true;

        // Walls
        if (b.x - BALL_R < TABLE_X) { b.x = TABLE_X + BALL_R; b.vx = Math.abs(b.vx) * 0.85; }
        if (b.x + BALL_R > TABLE_X + TABLE_W) { b.x = TABLE_X + TABLE_W - BALL_R; b.vx = -Math.abs(b.vx) * 0.85; }
        if (b.y - BALL_R < TABLE_Y) { b.y = TABLE_Y + BALL_R; b.vy = Math.abs(b.vy) * 0.85; }
        if (b.y + BALL_R > TABLE_Y + TABLE_H) { b.y = TABLE_Y + TABLE_H - BALL_R; b.vy = -Math.abs(b.vy) * 0.85; }

        // Pockets
        for (const pk of POCKETS) {
          const dx = b.x - pk.x, dy = b.y - pk.y;
          if (dx * dx + dy * dy < POCKET_R * POCKET_R) {
            b.sunk = true; b.vx = 0; b.vy = 0;
            break;
          }
        }
      }

      // Ball-ball collision
      for (let i = 0; i < balls.length; i++) {
        if (balls[i].sunk) continue;
        for (let j = i + 1; j < balls.length; j++) {
          if (balls[j].sunk) continue;
          const dx = balls[j].x - balls[i].x;
          const dy = balls[j].y - balls[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < BALL_R * 2) {
            const nx = dx / dist, ny = dy / dist;
            const overlap = BALL_R * 2 - dist;
            balls[i].x -= nx * overlap * 0.5;
            balls[i].y -= ny * overlap * 0.5;
            balls[j].x += nx * overlap * 0.5;
            balls[j].y += ny * overlap * 0.5;
            const dvx = balls[i].vx - balls[j].vx;
            const dvy = balls[i].vy - balls[j].vy;
            const dot = dvx * nx + dvy * ny;
            if (dot > 0) {
              balls[i].vx -= dot * nx;
              balls[i].vy -= dot * ny;
              balls[j].vx += dot * nx;
              balls[j].vy += dot * ny;
            }
          }
        }
      }

      // After shot settles
      if (s.shooting && !moving) {
        s.shooting = false;
        // Check sunk balls
        const sunkThisShot = balls.filter(b => b.sunk && !b._counted);
        sunkThisShot.forEach(b => b._counted = true);

        const cue = balls[0];
        // Cue ball sunk = foul
        if (cue.sunk) {
          cue.sunk = false;
          cue.x = TABLE_X + TABLE_W * 0.25;
          cue.y = TABLE_Y + TABLE_H / 2;
          cue.vx = 0; cue.vy = 0;
          setMessage(`Scratch! Player ${turn === 1 ? 2 : 1}'s turn`);
          setTurn(t => t === 1 ? 2 : 1);
        } else {
          // Assign types
          const sunkNow = sunkThisShot.filter(b => b.id !== 0);
          if (sunkNow.length > 0 && !p1Type) {
            const first = sunkNow[0];
            if (first.id >= 1 && first.id <= 7) {
              setP1Type(turn === 1 ? 'solid' : 'stripe');
            } else if (first.id >= 9) {
              setP1Type(turn === 1 ? 'stripe' : 'solid');
            }
          }

          // Check 8-ball sunk
          const eightBall = balls.find(b => b.id === 8);
          if (eightBall && eightBall.sunk) {
            // Check if player cleared their balls
            const myType = turn === 1 ? p1Type : (p1Type === 'solid' ? 'stripe' : 'solid');
            const myBalls = balls.filter(b => {
              if (myType === 'solid') return b.id >= 1 && b.id <= 7;
              if (myType === 'stripe') return b.id >= 9 && b.id <= 15;
              return false;
            });
            const allSunk = myBalls.every(b => b.sunk);
            if (allSunk) {
              setWinner(`Player ${turn} wins!`);
            } else {
              setWinner(`Player ${turn === 1 ? 2 : 1} wins! (8-ball sunk early)`);
            }
            setPhase('gameover');
            return;
          }

          // Check all non-8 balls sunk
          const allNon8Sunk = balls.filter(b => b.id !== 0 && b.id !== 8).every(b => b.sunk);
          if (allNon8Sunk) {
            setMessage('All balls sunk! Sink the 8-ball to win!');
          }

          const mySunk = sunkNow.length > 0;
          if (!mySunk) {
            setTurn(t => t === 1 ? 2 : 1);
            setMessage(`Player ${turn === 1 ? 2 : 1}'s turn`);
          } else {
            setMessage(`Nice! Player ${turn} goes again`);
          }
        }
      }

      // AI logic
      if (mode === 'ai' && turn === 2 && !s.shooting && !moving && !s.aiThinking && phase === 'playing') {
        s.aiThinking = true;
        s.aiTimer = 40;
      }
      if (s.aiThinking) {
        s.aiTimer--;
        if (s.aiTimer <= 0) {
          const cue = balls[0];
          // Find target ball
          const myType = p1Type === 'solid' ? 'stripe' : (p1Type === 'stripe' ? 'solid' : null);
          let targets = balls.filter(b => !b.sunk && b.id !== 0 && b.id !== 8);
          if (myType === 'solid') targets = targets.filter(b => b.id >= 1 && b.id <= 7);
          else if (myType === 'stripe') targets = targets.filter(b => b.id >= 9 && b.id <= 15);
          if (targets.length === 0) {
            const eight = balls.find(b => b.id === 8 && !b.sunk);
            if (eight) targets = [eight];
          }
          if (targets.length > 0) {
            const t = targets[Math.floor(Math.random() * targets.length)];
            const angle = Math.atan2(t.y - cue.y, t.x - cue.x);
            const power = 5 + Math.random() * 8;
            cue.vx = Math.cos(angle) * power;
            cue.vy = Math.sin(angle) * power;
            s.shooting = true;
          }
          s.aiThinking = false;
        }
      }

      // ──── DRAW ────
      ctx.fillStyle = '#0a1a0a';
      ctx.fillRect(0, 0, W, H);

      // Table border
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(TABLE_X - 20, TABLE_Y - 20, TABLE_W + 40, TABLE_H + 40);
      // Felt
      ctx.fillStyle = '#1a6a2a';
      ctx.fillRect(TABLE_X, TABLE_Y, TABLE_W, TABLE_H);
      // Inner border detail
      ctx.strokeStyle = '#0a4a1a';
      ctx.lineWidth = 2;
      ctx.strokeRect(TABLE_X, TABLE_Y, TABLE_W, TABLE_H);

      // Pockets
      for (const pk of POCKETS) {
        ctx.beginPath();
        ctx.arc(pk.x, pk.y, POCKET_R, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0a';
        ctx.fill();
      }

      // Balls
      for (const b of balls) {
        if (b.sunk) continue;
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = BALL_COLORS[b.id];
        ctx.fill();
        ctx.strokeStyle = '#00000055';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Stripe indicator
        if (b.id >= 9 && b.id <= 15) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(b.x, b.y, BALL_R * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
        }
        // Number
        if (b.id > 0) {
          ctx.fillStyle = b.id === 8 ? '#fff' : '#000';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.id, b.x, b.y);
        }
        // Cue ball highlight
        if (b.id === 0) {
          ctx.beginPath();
          ctx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff55';
          ctx.fill();
        }
      }

      // Cue stick
      const cue = balls[0];
      if (!cue.sunk && !moving && !s.aiThinking) {
        const isPlayer = turn === 1 || mode === 'local';
        if (isPlayer) {
          const angle = Math.atan2(cue.y - m.y, cue.x - m.x);
          const offset = 20 + m.power * 0.4;
          const sx = cue.x + Math.cos(angle) * offset;
          const sy = cue.y + Math.sin(angle) * offset;
          const ex = sx + Math.cos(angle) * CUE_LEN;
          const ey = sy + Math.sin(angle) * CUE_LEN;

          ctx.strokeStyle = '#c8a060';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.strokeStyle = '#a07840';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(angle) * 20, sy + Math.sin(angle) * 20);
          ctx.stroke();

          // Aim line
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#ffffff33';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cue.x, cue.y);
          ctx.lineTo(cue.x - Math.cos(angle) * 200, cue.y - Math.sin(angle) * 200);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup', onUp);
    };
  }, [phase, turn, mode, p1Type]);

  return (
    <div className="pool-root">
      <canvas ref={canvasRef} width={W} height={H} />
      <div className="pool-hud">
        <span style={{ color: turn === 1 ? '#4caf50' : '#888' }}>
          Player 1 {p1Type === 'solid' ? '(Solid)' : p1Type === 'stripe' ? '(Stripe)' : ''} {turn === 1 ? '◄' : ''}
        </span>
        <span style={{ color: '#aaa' }}>{message}</span>
        <span style={{ color: turn === 2 ? '#4caf50' : '#888' }}>
          {turn === 2 ? '►' : ''} {mode === 'ai' ? 'AI' : 'Player 2'} {p1Type === 'solid' ? '(Stripe)' : p1Type === 'stripe' ? '(Solid)' : ''}
        </span>
      </div>
      {phase === 'playing' && (
        <div className="pool-power">
          <div className="pool-power-fill" style={{ height: `${mouseRef.current.power || 0}%` }} />
        </div>
      )}
      {phase === 'menu' && (
        <div className="pool-overlay">
          <h2>🎱 8-Ball Pool</h2>
          <p>Classic pool — sink your balls and pot the 8-ball last!</p>
          <div className="pool-mode-btns">
            <button onClick={() => startGame('ai')}>🤖 vs AI</button>
            <button onClick={() => startGame('local')}>👥 2 Players (Local)</button>
          </div>
        </div>
      )}
      {phase === 'gameover' && (
        <div className="pool-overlay">
          <h2>🏆 {winner}</h2>
          <button onClick={() => setPhase('menu')}>Play Again</button>
        </div>
      )}
      <div className="pool-info">Click & drag on cue ball to aim · Hold longer for more power</div>
      <BackButton />
    </div>
  );
}
