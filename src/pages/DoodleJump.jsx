import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './DoodleJump.css';

const W = 360, H = 560;
const PW = 40, PH = 30;
const PLAT_W = 65, PLAT_H = 12;
const GRAVITY = 0.35;
const JUMP_VEL = -10;

function genPlatforms(startY = H, count = 12) {
  const plats = [];
  for (let i = 0; i < count; i++) {
    plats.push({
      x: Math.random() * (W - PLAT_W),
      y: startY - i * (H / count) - 40,
      type: Math.random() < 0.15 ? 'moving' : 'static',
      dir: Math.random() < 0.5 ? 1 : -1,
    });
  }
  return plats;
}

export default function DoodleJump() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('dj-high') || '0'));
  const stateRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const s = {
      px: W / 2 - PW / 2, py: H - 100,
      vx: 0, vy: 0,
      platforms: genPlatforms(),
      score: 0, maxY: H - 100,
      keys: {}, gameOver: false,
    };
    stateRef.current = s;

    const keyDown = (e) => { s.keys[e.key] = true; };
    const keyUp = (e) => { s.keys[e.key] = false; };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    let af;
    const loop = () => {
      if (!s.gameOver) update(s);
      draw(ctx, s);
      af = requestAnimationFrame(loop);
    };

    function update(s) {
      // Horizontal movement
      if (s.keys['ArrowLeft'] || s.keys['a']) s.vx = -5;
      else if (s.keys['ArrowRight'] || s.keys['d']) s.vx = 5;
      else s.vx *= 0.85;

      s.px += s.vx;
      // Wrap around
      if (s.px > W) s.px = -PW;
      if (s.px + PW < 0) s.px = W;

      s.vy += GRAVITY;
      s.py += s.vy;

      // Platform collision (only when falling)
      if (s.vy >= 0) {
        for (const p of s.platforms) {
          if (s.px + PW > p.x && s.px < p.x + PLAT_W &&
              s.py + PH >= p.y && s.py + PH <= p.y + PLAT_H + 8) {
            s.vy = JUMP_VEL;
            break;
          }
        }
      }

      // Scroll up when player goes above middle
      if (s.py < H / 2) {
        const diff = H / 2 - s.py;
        s.py = H / 2;
        for (const p of s.platforms) p.y += diff;
        s.score += Math.floor(diff);
        setScore(s.score);
      }

      // Move moving platforms
      for (const p of s.platforms) {
        if (p.type === 'moving') {
          p.x += p.dir * 1.5;
          if (p.x <= 0 || p.x + PLAT_W >= W) p.dir *= -1;
        }
      }

      // Remove off-screen platforms and add new ones
      s.platforms = s.platforms.filter(p => p.y < H + 20);
      while (s.platforms.length < 10) {
        const topY = Math.min(...s.platforms.map(p => p.y));
        s.platforms.push({
          x: Math.random() * (W - PLAT_W),
          y: topY - 40 - Math.random() * 60,
          type: Math.random() < 0.2 ? 'moving' : 'static',
          dir: Math.random() < 0.5 ? 1 : -1,
        });
      }

      // Game over
      if (s.py > H + 50) {
        s.gameOver = true;
        setGameOver(true);
        if (s.score > parseInt(localStorage.getItem('dj-high') || '0')) {
          localStorage.setItem('dj-high', String(s.score));
          setHighScore(s.score);
        }
      }
    }

    function draw(ctx, s) {
      // Background gradient
      ctx.fillStyle = '#0d1225';
      ctx.fillRect(0, 0, W, H);
      // Stars
      ctx.fillStyle = '#ffffff10';
      for (let i = 0; i < 40; i++) {
        ctx.fillRect((i * 97) % W, (i * 131 + s.score * 0.05) % H, 1.5, 1.5);
      }

      // Platforms
      for (const p of s.platforms) {
        const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + PLAT_H);
        if (p.type === 'moving') {
          grad.addColorStop(0, '#ce93d8');
          grad.addColorStop(1, '#ab47bc');
        } else {
          grad.addColorStop(0, '#69f0ae');
          grad.addColorStop(1, '#00c853');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, PLAT_W, PLAT_H, 6);
        ctx.fill();
      }

      // Player
      ctx.fillStyle = '#ffd740';
      ctx.beginPath();
      ctx.roundRect(s.px, s.py, PW, PH, 8);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(s.px + 10, s.py + 8, 5, 6);
      ctx.fillRect(s.px + 25, s.py + 8, 5, 6);
      // Mouth
      ctx.fillStyle = '#ff5252';
      ctx.fillRect(s.px + 14, s.py + 20, 12, 3);
    }

    af = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(af);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, []);

  const restart = () => {
    const s = {
      px: W / 2 - PW / 2, py: H - 100,
      vx: 0, vy: 0,
      platforms: genPlatforms(),
      score: 0, maxY: H - 100,
      keys: stateRef.current?.keys || {}, gameOver: false,
    };
    stateRef.current = s;
    setScore(0);
    setGameOver(false);
  };

  // Need to update stateRef on restart
  useEffect(() => {
    if (stateRef.current && !gameOver) {
      // Re-ref
    }
  }, [gameOver]);

  return (
    <div className="dj-root">
      <div className="dj-hud">
        <span>Score: <strong>{score}</strong></span>
        <span>Best: <strong>{highScore}</strong></span>
      </div>
      <canvas ref={canvasRef} width={W} height={H} className="dj-canvas" />
      {gameOver && (
        <div className="dj-over">
          <h2>Game Over!</h2>
          <p>Score: {score}</p>
          <button onClick={restart}>Play Again</button>
        </div>
      )}
      <p className="dj-hint">← → or A/D to move</p>
      <BackButton />
    </div>
  );
}
