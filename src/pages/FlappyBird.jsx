import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './FlappyBird.css';

export default function FlappyBird() {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('flappy_best') || '0'));
  const stateRef = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W, H;
    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    let animId;

    const bird = { x: 0, y: 0, vy: 0, r: 16 };
    let pipes = [];
    let clouds = [];
    let sc = 0, bestSc = parseInt(localStorage.getItem('flappy_best') || '0');
    let started = false, over = false;
    let pipeTimer = 0;
    const gap = 160;
    const pipeW = 60;
    const pipeSpeed = 3;
    const flapForce = -8;
    const gravity = 0.4;
    let dayTime = 1; // 1 = day, 0 = night
    let particles = [];

    function init() {
      bird.x = W * 0.2; bird.y = H * 0.4; bird.vy = 0;
      pipes = []; clouds = []; sc = 0; pipeTimer = 0; dayTime = 1;
      particles = [];
      for (let i = 0; i < 6; i++) {
        clouds.push({ x: Math.random() * W, y: Math.random() * H * 0.3, w: 60 + Math.random() * 60, speed: 0.3 + Math.random() * 0.5 });
      }
      setScore(0);
    }

    function flap() {
      if (!started || over) return;
      bird.vy = flapForce;
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: bird.x - 10, y: bird.y, vx: -Math.random() * 2, vy: (Math.random() - 0.5) * 3,
          life: 1, color: '#ffd740',
        });
      }
    }

    function addPipe() {
      const minTop = 60;
      const maxTop = H - gap - 80;
      const topH = minTop + Math.random() * (maxTop - minTop);
      pipes.push({ x: W + 10, topH, scored: false });
    }

    function update() {
      bird.vy += gravity;
      bird.y += bird.vy;
      if (bird.y > H - 50) { bird.y = H - 50; endGame(); }
      if (bird.y < bird.r) { bird.y = bird.r; bird.vy = 0; }

      pipeTimer++;
      if (pipeTimer > 100) { addPipe(); pipeTimer = 0; }

      for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= pipeSpeed + sc * 0.05;
        if (p.x + pipeW < 0) { pipes.splice(i, 1); continue; }
        // Collision
        if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + pipeW) {
          if (bird.y - bird.r < p.topH || bird.y + bird.r > p.topH + gap) { endGame(); }
        }
        if (!p.scored && p.x + pipeW < bird.x) {
          p.scored = true; sc++;
          setScore(sc);
          if (sc > bestSc) { bestSc = sc; localStorage.setItem('flappy_best', bestSc); setBest(bestSc); }
        }
      }

      // Day/night cycle
      dayTime = Math.max(0.15, 1 - sc * 0.02);

      // Clouds
      clouds.forEach(c => { c.x -= c.speed; if (c.x + c.w < 0) { c.x = W + 20; c.y = Math.random() * H * 0.3; } });

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.04;
        if (pt.life <= 0) particles.splice(i, 1);
      }
    }

    function endGame() {
      over = true; started = false;
      setPhase('over');
    }

    function draw() {
      // Sky gradient
      const d = dayTime;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, `rgb(${Math.round(30 + 100 * d)},${Math.round(60 + 140 * d)},${Math.round(100 + 155 * d)})`);
      sky.addColorStop(1, `rgb(${Math.round(10 + 180 * d)},${Math.round(20 + 190 * d)},${Math.round(40 + 160 * d)})`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Stars at night
      if (d < 0.5) {
        ctx.fillStyle = `rgba(255,255,255,${0.8 - d})`;
        for (let i = 0; i < 30; i++) {
          const sx = (i * 137) % W, sy = (i * 97) % (H * 0.5);
          ctx.fillRect(sx, sy, 2, 2);
        }
      }

      // Clouds
      ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.15 * d})`;
      clouds.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.w * 0.3, 0, Math.PI * 2);
        ctx.arc(c.x + c.w * 0.3, c.y - 8, c.w * 0.25, 0, Math.PI * 2);
        ctx.arc(c.x + c.w * 0.5, c.y, c.w * 0.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ground
      ctx.fillStyle = '#3a6a3a';
      ctx.fillRect(0, H - 50, W, 50);
      ctx.fillStyle = '#4a8a4a';
      ctx.fillRect(0, H - 50, W, 5);

      // Pipes
      pipes.forEach(p => {
        const grad = ctx.createLinearGradient(p.x, 0, p.x + pipeW, 0);
        grad.addColorStop(0, '#4caf50'); grad.addColorStop(0.5, '#66bb6a'); grad.addColorStop(1, '#388e3c');
        ctx.fillStyle = grad;
        // Top pipe
        ctx.fillRect(p.x, 0, pipeW, p.topH);
        ctx.fillRect(p.x - 5, p.topH - 20, pipeW + 10, 20);
        // Bottom pipe
        const botY = p.topH + gap;
        ctx.fillRect(p.x, botY, pipeW, H - botY);
        ctx.fillRect(p.x - 5, botY, pipeW + 10, 20);
      });

      // Bird
      const angle = Math.min(bird.vy * 3, 60) * Math.PI / 180;
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(angle);
      // Body
      ctx.fillStyle = '#ffd740';
      ctx.beginPath(); ctx.arc(0, 0, bird.r, 0, Math.PI * 2); ctx.fill();
      // Wing
      ctx.fillStyle = '#ffab00';
      ctx.beginPath();
      ctx.ellipse(-6, 4, 10, 6, -0.3, 0, Math.PI * 2); ctx.fill();
      // Eye
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -5, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(9, -5, 2.5, 0, Math.PI * 2); ctx.fill();
      // Beak
      ctx.fillStyle = '#ff5722';
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(22, 2); ctx.lineTo(14, 5); ctx.fill();
      ctx.restore();

      // Particles
      particles.forEach(pt => {
        const a = Math.round(pt.life * 255).toString(16).padStart(2, '0');
        ctx.fillStyle = pt.color + a;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 3 * pt.life, 0, Math.PI * 2); ctx.fill();
      });

      // Score in-game
      if (started && !over) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sc, W / 2, 80);
      }
    }

    function loop() {
      if (started && !over) update();
      draw();
      animId = requestAnimationFrame(loop);
    }

    const onClick = () => {
      if (over) return;
      if (!started) {
        started = true; over = false; init();
        setPhase('playing');
      }
      flap();
    };

    const onKey = (ev) => {
      if (ev.code === 'Space' || ev.code === 'ArrowUp') { ev.preventDefault(); onClick(); }
    };

    window.addEventListener('keydown', onKey);
    canvas.addEventListener('click', onClick);

    stateRef.current.restart = () => {
      over = false; started = false; init();
      setPhase('menu');
    };

    init();
    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <div className="fb-root">
      <canvas ref={canvasRef} className="fb-canvas" />
      {phase === 'menu' && (
        <div className="fb-overlay">
          <h1>🐦 Flappy Bird</h1>
          <p>Click or press SPACE to flap</p>
          <p className="fb-best">Best: {best}</p>
        </div>
      )}
      {phase === 'over' && (
        <div className="fb-gameover">
          <h2>Game Over</h2>
          <p>Score: {score}</p>
          <p>Best: {best}</p>
          <button onClick={() => stateRef.current.restart?.()}>Try Again</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
