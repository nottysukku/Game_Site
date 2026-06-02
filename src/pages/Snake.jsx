import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './Snake.css';

export default function Snake() {
  const canvasRef = useRef(null);
  const stateRef = useRef({ running: false });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('snakeHigh') || 0));
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = 660, H = 660, grid = 22, cols = W / grid, rows = H / grid;
    canvas.width = W; canvas.height = H;

    let snake, dir, food, running, sc, lastTime, spd;
    const particles = [];

    function init() {
      snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dir = { x: 1, y: 0 };
      sc = 0; running = true; spd = speed;
      setScore(0); setGameOver(false);
      placeFood();
      lastTime = 0;
    }

    function placeFood() {
      let pos;
      do {
        pos = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
      } while (snake.some(s => s.x === pos.x && s.y === pos.y));
      food = pos;
    }

    function spawnParticles(x, y) {
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: x * grid + grid / 2,
          y: y * grid + grid / 2,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 1,
          hue: Math.random() * 60 + 10,
        });
      }
    }

    function update() {
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      // Wrap around
      head.x = (head.x + cols) % cols;
      head.y = (head.y + rows) % rows;

      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        running = false;
        stateRef.current.running = false;
        setGameOver(true);
        const hs = Math.max(sc, Number(localStorage.getItem('snakeHigh') || 0));
        localStorage.setItem('snakeHigh', hs);
        setHighScore(hs);
        return;
      }

      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        sc++;
        setScore(sc);
        spawnParticles(food.x, food.y);
        placeFood();
        // Speed up every 5 points
        if (sc % 5 === 0) spd = Math.min(spd + 0.3, 4);
      } else {
        snake.pop();
      }
    }

    function draw() {
      // Background
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= cols; i++) {
        ctx.beginPath(); ctx.moveTo(i * grid, 0); ctx.lineTo(i * grid, H); ctx.stroke();
      }
      for (let i = 0; i <= rows; i++) {
        ctx.beginPath(); ctx.moveTo(0, i * grid); ctx.lineTo(W, i * grid); ctx.stroke();
      }

      // Food
      ctx.shadowColor = '#ff5252';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#ff5252';
      ctx.beginPath();
      ctx.arc(food.x * grid + grid / 2, food.y * grid + grid / 2, grid / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Snake
      snake.forEach((s, i) => {
        const isHead = i === 0;
        const alpha = 1 - (i / snake.length) * 0.5;
        if (isHead) {
          ctx.shadowColor = '#69f0ae';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#69f0ae';
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(105, 240, 174, ${alpha})`;
        }
        ctx.fillRect(s.x * grid + 1, s.y * grid + 1, grid - 2, grid - 2);

        if (isHead) {
          ctx.shadowBlur = 0;
          // Eyes
          ctx.fillStyle = '#000';
          const eyeOff = dir.x !== 0 ? { x: dir.x * 4, y: -3 } : { x: -3, y: dir.y * 4 };
          ctx.beginPath();
          ctx.arc(s.x * grid + grid / 2 + eyeOff.x, s.y * grid + grid / 2 + eyeOff.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(s.x * grid + grid / 2 + (dir.x !== 0 ? eyeOff.x : 3), s.y * grid + grid / 2 + (dir.y !== 0 ? eyeOff.y : 3), 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.life})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fill();
      }

      // Border
      ctx.strokeStyle = 'rgba(105,240,174,0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, W, H);
    }

    function loop(time) {
      if (!running) { draw(); return; }
      if (time - lastTime > Math.max(50, 130 - spd * 15)) {
        lastTime = time;
        update();
      }
      draw();
      animId = requestAnimationFrame(loop);
    }

    let animId;
    const onKeyDown = e => {
      if (e.key === 'ArrowUp' && dir.y === 0) dir = { x: 0, y: -1 };
      if (e.key === 'ArrowDown' && dir.y === 0) dir = { x: 0, y: 1 };
      if (e.key === 'ArrowLeft' && dir.x === 0) dir = { x: -1, y: 0 };
      if (e.key === 'ArrowRight' && dir.x === 0) dir = { x: 1, y: 0 };
    };
    window.addEventListener('keydown', onKeyDown);

    init();
    stateRef.current = {
      running: true,
      restart: () => { init(); animId = requestAnimationFrame(loop); }
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [speed]);

  return (
    <div className="snake-root">
      <h1 className="snake-title">Snake</h1>
      <div className="snake-hud">
        <span className="snake-score">Score: {score}</span>
        <span className="snake-high">Best: {highScore}</span>
      </div>
      <canvas ref={canvasRef} className="snake-canvas" />
      {gameOver && (
        <div className="snake-gameover">
          <h2>Game Over!</h2>
          <p>Score: {score}</p>
          <button onClick={() => stateRef.current.restart?.()}>Play Again</button>
        </div>
      )}
      <div className="snake-controls">
        <label>Speed:
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
            <option value={1}>Normal</option>
            <option value={2}>Fast</option>
            <option value={3}>Extreme</option>
          </select>
        </label>
      </div>
      <BackButton />
    </div>
  );
}
