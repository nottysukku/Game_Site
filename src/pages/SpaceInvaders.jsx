import React, { useEffect, useRef, useState, useCallback } from 'react';
import BackButton from './BackButton';
import './SpaceInvaders.css';

const W = 480, H = 600;
const PLAYER_W = 40, PLAYER_H = 20;
const BULLET_W = 3, BULLET_H = 12;
const ALIEN_W = 30, ALIEN_H = 20;
const ALIEN_COLS = 8, ALIEN_ROWS = 4;
const ALIEN_GAP = 10;

export default function SpaceInvaders() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const stateRef = useRef(null);

  const initState = useCallback((waveNum = 1) => {
    const aliens = [];
    for (let r = 0; r < ALIEN_ROWS; r++)
      for (let c = 0; c < ALIEN_COLS; c++)
        aliens.push({
          x: 40 + c * (ALIEN_W + ALIEN_GAP),
          y: 40 + r * (ALIEN_H + ALIEN_GAP),
          alive: true,
          type: r,
        });
    return {
      px: W / 2 - PLAYER_W / 2,
      bullets: [],
      aliens,
      alienBullets: [],
      alienDir: 1,
      alienSpeed: 0.3 + waveNum * 0.15,
      alienTimer: 0,
      alienShootTimer: 0,
      keys: {},
      score: stateRef.current?.score || 0,
      lives: stateRef.current?.lives ?? 3,
      wave: waveNum,
      gameOver: false,
      win: false,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    stateRef.current = initState(1);
    setScore(0); setLives(3); setWave(1); setGameOver(false);

    const keyDown = (e) => { stateRef.current.keys[e.key] = true; };
    const keyUp = (e) => { stateRef.current.keys[e.key] = false; };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    let af;
    let lastTime = 0;
    const loop = (time) => {
      const dt = Math.min(time - lastTime, 32);
      lastTime = time;
      const s = stateRef.current;
      if (!s.gameOver) update(s, dt);
      draw(ctx, s);
      af = requestAnimationFrame(loop);
    };

    function update(s, dt) {
      // Player movement
      if (s.keys['ArrowLeft'] || s.keys['a']) s.px = Math.max(0, s.px - 4);
      if (s.keys['ArrowRight'] || s.keys['d']) s.px = Math.min(W - PLAYER_W, s.px + 4);
      // Shoot
      if (s.keys[' '] && s.bullets.length < 3) {
        s.bullets.push({ x: s.px + PLAYER_W / 2 - BULLET_W / 2, y: H - 50 });
        s.keys[' '] = false;
      }
      // Bullets
      s.bullets = s.bullets.filter(b => { b.y -= 6; return b.y > -BULLET_H; });
      // Alien bullets
      s.alienBullets = s.alienBullets.filter(b => { b.y += 3.5; return b.y < H; });
      // Alien movement
      s.alienTimer += dt;
      if (s.alienTimer > 16) {
        s.alienTimer = 0;
        let edge = false;
        for (const a of s.aliens) {
          if (!a.alive) continue;
          a.x += s.alienDir * s.alienSpeed;
          if (a.x <= 5 || a.x + ALIEN_W >= W - 5) edge = true;
        }
        if (edge) {
          s.alienDir *= -1;
          for (const a of s.aliens) if (a.alive) a.y += 8;
        }
      }
      // Alien shoot
      s.alienShootTimer += dt;
      if (s.alienShootTimer > 1200 - s.wave * 80) {
        s.alienShootTimer = 0;
        const alive = s.aliens.filter(a => a.alive);
        if (alive.length) {
          const shooter = alive[Math.floor(Math.random() * alive.length)];
          s.alienBullets.push({ x: shooter.x + ALIEN_W / 2, y: shooter.y + ALIEN_H });
        }
      }
      // Collision: bullets vs aliens
      for (const b of s.bullets) {
        for (const a of s.aliens) {
          if (!a.alive) continue;
          if (b.x < a.x + ALIEN_W && b.x + BULLET_W > a.x && b.y < a.y + ALIEN_H && b.y + BULLET_H > a.y) {
            a.alive = false;
            b.y = -999;
            s.score += (4 - a.type) * 10;
            setScore(s.score);
          }
        }
      }
      // Collision: alien bullets vs player
      for (const b of s.alienBullets) {
        if (b.x < s.px + PLAYER_W && b.x + BULLET_W > s.px && b.y < H - 30 && b.y + BULLET_H > H - 50) {
          b.y = 9999;
          s.lives--;
          setLives(s.lives);
          if (s.lives <= 0) { s.gameOver = true; setGameOver(true); }
        }
      }
      // Aliens reaching bottom
      for (const a of s.aliens) {
        if (a.alive && a.y + ALIEN_H >= H - 60) { s.gameOver = true; setGameOver(true); }
      }
      // Wave cleared
      if (s.aliens.every(a => !a.alive)) {
        const nw = s.wave + 1;
        const ns = initState(nw);
        ns.score = s.score; ns.lives = s.lives;
        stateRef.current = ns;
        setWave(nw);
      }
    }

    function draw(ctx, s) {
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, W, H);
      // Stars
      ctx.fillStyle = '#ffffff15';
      for (let i = 0; i < 60; i++) {
        const sx = (i * 137 + 50) % W, sy = (i * 97 + 30) % H;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      // Player
      ctx.fillStyle = '#69f0ae';
      ctx.fillRect(s.px, H - 45, PLAYER_W, PLAYER_H);
      ctx.fillStyle = '#b9f6ca';
      ctx.fillRect(s.px + PLAYER_W / 2 - 3, H - 52, 6, 10);
      // Bullets
      ctx.fillStyle = '#ffd740';
      for (const b of s.bullets) ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
      // Alien bullets
      ctx.fillStyle = '#ff5252';
      for (const b of s.alienBullets) ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
      // Aliens
      const alienColors = ['#ff5252', '#ff6e40', '#ffd740', '#69f0ae'];
      for (const a of s.aliens) {
        if (!a.alive) continue;
        ctx.fillStyle = alienColors[a.type];
        ctx.fillRect(a.x, a.y, ALIEN_W, ALIEN_H);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(a.x + 7, a.y + 6, 4, 4);
        ctx.fillRect(a.x + ALIEN_W - 11, a.y + 6, 4, 4);
      }
    }

    af = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(af);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, [initState]);

  const restart = () => {
    stateRef.current = initState(1);
    stateRef.current.score = 0; stateRef.current.lives = 3;
    setScore(0); setLives(3); setWave(1); setGameOver(false);
  };

  return (
    <div className="si-root">
      <div className="si-hud">
        <span>Score: {score}</span><span>Wave: {wave}</span><span>Lives: {'♥'.repeat(lives)}</span>
      </div>
      <canvas ref={canvasRef} width={W} height={H} className="si-canvas" />
      {gameOver && (
        <div className="si-over">
          <h2>Game Over</h2>
          <p>Score: {score}</p>
          <button onClick={restart}>Play Again</button>
        </div>
      )}
      <div className="si-controls"><p>← → or A/D to move • Space to shoot</p></div>
      <BackButton />
    </div>
  );
}
