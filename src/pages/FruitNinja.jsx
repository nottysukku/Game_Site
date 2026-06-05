import React, { useRef, useEffect, useState, useCallback } from 'react';
import BackButton from './BackButton';
import './FruitNinja.css';

const W = 800, H = 550;
const GRAVITY = 0.25;
const FRUITS = [
  { emoji: '🍎', color: '#ff4444', points: 10 },
  { emoji: '🍊', color: '#ff8800', points: 10 },
  { emoji: '🍋', color: '#ffdd00', points: 10 },
  { emoji: '🍉', color: '#44aa44', points: 15 },
  { emoji: '🍇', color: '#9944cc', points: 15 },
  { emoji: '🍑', color: '#ffaaaa', points: 20 },
  { emoji: '🥝', color: '#88cc44', points: 20 },
  { emoji: '🍍', color: '#ffcc00', points: 25 },
  { emoji: '🍓', color: '#ff2244', points: 15 },
];
const BOMB = { emoji: '💣', color: '#333' };

export default function FruitNinja() {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [combo, setCombo] = useState(0);
  const [missed, setMissed] = useState(0);
  const stateRef = useRef({});
  const mouseRef = useRef({ x: -1, y: -1, px: -1, py: -1, down: false, trail: [] });

  const startGame = useCallback(() => {
    stateRef.current = {
      fruits: [], sliced: [], particles: [],
      score: 0, combo: 0, missed: 0, maxMissed: 3,
      spawnTimer: 0, spawnRate: 50, frame: 0,
      comboTimer: 0
    };
    setScore(0); setCombo(0); setMissed(0);
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
      const m = mouseRef.current;
      m.px = m.x; m.py = m.y;
      m.x = e.clientX - rect.left;
      m.y = e.clientY - rect.top;
      if (m.down) m.trail.push({ x: m.x, y: m.y, life: 12 });
      if (m.trail.length > 30) m.trail.shift();
    };
    const onDown = () => { mouseRef.current.down = true; };
    const onUp = () => { mouseRef.current.down = false; };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);

    const loop = () => {
      const s = stateRef.current;
      const m = mouseRef.current;
      s.frame++;

      // Spawn fruits
      s.spawnTimer++;
      if (s.spawnTimer >= s.spawnRate) {
        s.spawnTimer = 0;
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const isBomb = Math.random() < 0.12;
          const fruit = isBomb ? { ...BOMB, isBomb: true } : { ...FRUITS[Math.floor(Math.random() * FRUITS.length)] };
          fruit.x = 100 + Math.random() * (W - 200);
          fruit.y = H + 30;
          fruit.vx = (Math.random() - 0.5) * 5;
          fruit.vy = -(10 + Math.random() * 5);
          fruit.rotation = 0;
          fruit.rotSpeed = (Math.random() - 0.5) * 0.15;
          fruit.radius = 28;
          fruit.sliced = false;
          fruit.counted = false;
          s.fruits.push(fruit);
        }
        // Increase difficulty
        s.spawnRate = Math.max(20, 50 - s.frame * 0.005);
      }

      // Update fruits
      let slicedThisFrame = 0;
      s.fruits = s.fruits.filter(f => {
        f.x += f.vx;
        f.y += f.vy;
        f.vy += GRAVITY;
        f.rotation += f.rotSpeed;

        // Check slice
        if (!f.sliced && m.down && m.px >= 0) {
          const dx = m.x - f.x, dy = m.y - f.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < f.radius + 10) {
            f.sliced = true;
            if (f.isBomb) {
              s.missed = s.maxMissed;
              setMissed(s.maxMissed);
            } else {
              slicedThisFrame++;
              s.score += f.points;
              // Juice particles
              for (let j = 0; j < 10; j++) {
                s.particles.push({
                  x: f.x, y: f.y,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  life: 20 + Math.random() * 10,
                  color: f.color,
                  r: 3 + Math.random() * 4
                });
              }
              // Sliced halves
              s.sliced.push(
                { emoji: f.emoji, x: f.x - 10, y: f.y, vx: -3, vy: -2, rotation: f.rotation, life: 40 },
                { emoji: f.emoji, x: f.x + 10, y: f.y, vx: 3, vy: -2, rotation: f.rotation + 1, life: 40 }
              );
            }
            return false;
          }
        }

        // Off screen
        if (f.y > H + 60) {
          if (!f.sliced && !f.isBomb && !f.counted) {
            f.counted = true;
            s.missed++;
            setMissed(s.missed);
          }
          return false;
        }
        return true;
      });

      if (slicedThisFrame > 0) {
        s.comboTimer = 15;
        s.combo += slicedThisFrame;
        if (slicedThisFrame >= 2) s.score += slicedThisFrame * 5; // combo bonus
      }
      if (s.comboTimer > 0) {
        s.comboTimer--;
        if (s.comboTimer <= 0) {
          setCombo(s.combo);
          s.combo = 0;
        }
      }

      setScore(s.score);

      // Check game over
      if (s.missed >= s.maxMissed) {
        setBest(b => Math.max(b, s.score));
        setPhase('gameover');
        return;
      }

      // Update sliced halves
      s.sliced = s.sliced.filter(sl => {
        sl.x += sl.vx; sl.y += sl.vy; sl.vy += 0.3; sl.rotation += 0.1; sl.life--;
        return sl.life > 0;
      });

      // Particles
      s.particles = s.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
        return p.life > 0;
      });

      // Trail
      m.trail = m.trail.filter(t => { t.life--; return t.life > 0; });

      // ──── DRAW ────
      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1a0a0a');
      grad.addColorStop(1, '#2a1a0a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Score splashes
      if (s.combo > 1 && s.comboTimer > 0) {
        ctx.fillStyle = '#ffd740';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${s.combo}x COMBO!`, W / 2, 80);
      }

      // Particles
      for (const p of s.particles) {
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Sliced halves
      for (const sl of s.sliced) {
        ctx.save();
        ctx.translate(sl.x, sl.y);
        ctx.rotate(sl.rotation);
        ctx.globalAlpha = sl.life / 40;
        ctx.font = '32px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sl.emoji, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // Fruits
      for (const f of s.fruits) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);
        ctx.font = '44px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.emoji, 0, 0);
        ctx.restore();
      }

      // Blade trail
      if (m.trail.length > 1) {
        ctx.strokeStyle = '#ffffff88';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.trail[0].x, m.trail[0].y);
        for (let i = 1; i < m.trail.length; i++) {
          ctx.globalAlpha = m.trail[i].life / 12;
          ctx.lineTo(m.trail[i].x, m.trail[i].y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        // Glow
        ctx.strokeStyle = '#ff525244';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(m.trail[0].x, m.trail[0].y);
        for (let i = 1; i < m.trail.length; i++) ctx.lineTo(m.trail[i].x, m.trail[i].y);
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // Miss indicators
      ctx.fillStyle = '#ff5252';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      const xCount = '✕'.repeat(s.missed) + '○'.repeat(s.maxMissed - s.missed);
      ctx.fillText(xCount, 15, H - 15);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup', onUp);
    };
  }, [phase]);

  return (
    <div className="fninja-root">
      <canvas ref={canvasRef} width={W} height={H} />
      <div className="fninja-hud">
        <div>Score: <span>{score}</span></div>
        <div>Best: <span>{best}</span></div>
      </div>
      {phase === 'menu' && (
        <div className="fninja-overlay">
          <h2>🍉 Fruit Ninja</h2>
          <p>Slice fruits, avoid bombs! Miss 3 fruits and it's over.</p>
          <button onClick={startGame}>Start Slicing</button>
          <p style={{ fontSize: '.85rem', color: '#666' }}>Click and drag to slice</p>
        </div>
      )}
      {phase === 'gameover' && (
        <div className="fninja-overlay">
          <h2>🔪 Game Over</h2>
          <p>Score: {score} · Best: {Math.max(best, score)}</p>
          <button onClick={startGame}>Try Again</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
