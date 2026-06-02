import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './Breakout.css';

export default function Breakout() {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const stateRef = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W, H;
    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    let animId;

    const paddleH = 14, paddleW = 120;
    let paddle = { x: 0, w: paddleW, h: paddleH };
    let balls = [];
    let bricks = [];
    let sc = 0, lv = 1, livesLeft = 3;
    let started = false, over = false;
    let powerups = [];
    let particles = [];

    const brickColors = ['#ff5252', '#ffd740', '#4caf50', '#00e5ff', '#ce93d8', '#ff9800'];

    function buildBricks() {
      bricks = [];
      const cols = Math.min(12, 6 + lv);
      const rows = Math.min(8, 3 + lv);
      const bw = Math.min(80, (W - 40) / cols - 4);
      const bh = 22;
      const offsetX = (W - cols * (bw + 4)) / 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          bricks.push({
            x: offsetX + c * (bw + 4), y: 50 + r * (bh + 4),
            w: bw, h: bh, color: brickColors[r % brickColors.length],
            hits: r < 2 && lv > 2 ? 2 : 1,
          });
        }
      }
    }

    function resetBall() {
      balls = [{
        x: W / 2, y: H - 80,
        vx: (Math.random() < 0.5 ? 3 : -3) + lv * 0.3,
        vy: -(4 + lv * 0.3),
        r: 8,
      }];
    }

    function init() {
      paddle.x = W / 2 - paddle.w / 2;
      paddle.w = paddleW;
      sc = 0; lv = 1; livesLeft = 3;
      powerups = []; particles = [];
      buildBricks(); resetBall();
      setScore(0); setLives(3); setLevel(1);
    }

    function spawnPart(x, y, color, n = 5) {
      for (let i = 0; i < n; i++) {
        particles.push({
          x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
          life: 1, color,
        });
      }
    }

    function update() {
      // Paddle follow mouse handled by mousemove

      for (let bi = balls.length - 1; bi >= 0; bi--) {
        const b = balls[bi];
        b.x += b.vx; b.y += b.vy;
        // Walls
        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
        if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }
        // Paddle
        if (b.vy > 0 && b.y + b.r >= H - 40 - paddle.h && b.x > paddle.x && b.x < paddle.x + paddle.w) {
          b.vy = -Math.abs(b.vy);
          const hit = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
          b.vx = hit * 5;
          spawnPart(b.x, b.y, '#00e5ff', 3);
        }
        // Bottom
        if (b.y > H) {
          balls.splice(bi, 1);
          if (balls.length === 0) {
            livesLeft--;
            setLives(livesLeft);
            if (livesLeft <= 0) { over = true; started = false; setPhase('over'); return; }
            resetBall();
          }
          continue;
        }

        // Bricks
        for (let i = bricks.length - 1; i >= 0; i--) {
          const br = bricks[i];
          if (b.x + b.r > br.x && b.x - b.r < br.x + br.w && b.y + b.r > br.y && b.y - b.r < br.y + br.h) {
            br.hits--;
            if (br.hits <= 0) {
              spawnPart(br.x + br.w / 2, br.y + br.h / 2, br.color, 8);
              // Powerup drop chance
              if (Math.random() < 0.15) {
                const type = Math.random() < 0.5 ? 'multi' : 'wide';
                powerups.push({ x: br.x + br.w / 2, y: br.y, type, vy: 2 });
              }
              bricks.splice(i, 1);
              sc += 10 * lv;
              setScore(sc);
            } else {
              br.color = '#999'; // Damaged
            }
            b.vy *= -1;
            break;
          }
        }
      }

      // Powerups
      for (let i = powerups.length - 1; i >= 0; i--) {
        const pw = powerups[i];
        pw.y += pw.vy;
        if (pw.y > H) { powerups.splice(i, 1); continue; }
        if (pw.y + 15 >= H - 40 - paddle.h && pw.x > paddle.x && pw.x < paddle.x + paddle.w) {
          if (pw.type === 'multi') {
            const nb = balls[0] || { x: W / 2, y: H - 100, vx: 3, vy: -4, r: 8 };
            balls.push({ ...nb, vx: nb.vx + 2 }, { ...nb, vx: nb.vx - 2 });
          } else if (pw.type === 'wide') {
            paddle.w = Math.min(240, paddle.w + 40);
          }
          spawnPart(pw.x, pw.y, '#ffd740', 6);
          powerups.splice(i, 1);
        }
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.03;
        if (pt.life <= 0) particles.splice(i, 1);
      }

      // Level clear
      if (bricks.length === 0) {
        lv++; setLevel(lv);
        paddle.w = paddleW;
        buildBricks(); resetBall();
      }
    }

    function draw() {
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, W, H);

      // Grid bg
      ctx.strokeStyle = 'rgba(0,229,255,.04)';
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Bricks
      bricks.forEach(br => {
        ctx.fillStyle = br.color;
        ctx.shadowColor = br.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(br.x, br.y, br.w, br.h, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Paddle
      const pg = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.w, 0);
      pg.addColorStop(0, '#00e5ff'); pg.addColorStop(1, '#00b0d0');
      ctx.fillStyle = pg;
      ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(paddle.x, H - 40 - paddle.h, paddle.w, paddle.h, 7);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Balls
      balls.forEach(b => {
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Powerups
      powerups.forEach(pw => {
        ctx.fillStyle = pw.type === 'multi' ? '#ff5252' : '#ffd740';
        ctx.font = '18px sans-serif';
        ctx.fillText(pw.type === 'multi' ? '⚡' : '↔', pw.x - 8, pw.y + 8);
      });

      // Particles
      particles.forEach(pt => {
        const a = Math.round(pt.life * 255).toString(16).padStart(2, '0');
        ctx.fillStyle = pt.color + a;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 3 * pt.life, 0, Math.PI * 2); ctx.fill();
      });
    }

    function loop() {
      if (started && !over) update();
      draw();
      animId = requestAnimationFrame(loop);
    }

    const onMove = (ev) => {
      paddle.x = ev.clientX - paddle.w / 2;
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
    };

    const onStart = () => {
      if (over) return;
      if (!started) {
        started = true; over = false; init();
        setPhase('playing');
      }
    };

    const onKey = (ev) => {
      if (ev.code === 'Space') { ev.preventDefault(); onStart(); }
      if (ev.code === 'ArrowLeft') paddle.x = Math.max(0, paddle.x - 30);
      if (ev.code === 'ArrowRight') paddle.x = Math.min(W - paddle.w, paddle.x + 30);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('click', onStart);

    stateRef.current.restart = () => {
      over = false; started = false; init();
      setPhase('menu');
    };

    init();
    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', onStart);
    };
  }, []);

  return (
    <div className="bo-root">
      <canvas ref={canvasRef} className="bo-canvas" />
      {phase === 'menu' && (
        <div className="bo-overlay">
          <h1>🧱 Breakout</h1>
          <p>Mouse to move paddle</p>
          <p>Click or SPACE to start</p>
        </div>
      )}
      {phase === 'playing' && (
        <div className="bo-hud">
          <span>Score: {score}</span>
          <span>Level: {level}</span>
          <span>❤️ {lives}</span>
        </div>
      )}
      {phase === 'over' && (
        <div className="bo-gameover">
          <h2>Game Over</h2>
          <p>Score: {score}</p>
          <p>Level reached: {level}</p>
          <button onClick={() => stateRef.current.restart?.()}>Restart</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
