import React, { useRef, useEffect, useState, useCallback } from 'react';
import BackButton from './BackButton';
import './Motocross.css';

const W = 900, H = 500;
const GRAVITY = 0.35;
const GROUND_Y = H - 60;
const WHEEL_R = 14;
const BODY_W = 50, BODY_H = 20;
const MAX_SPEED = 7;
const ACCEL = 0.15;
const BRAKE = 0.1;
const LEAN_SPEED = 0.04;
const BOUNCE = 0.3;
const SEG_W = 6;

function generateTerrain(startX, count, prev) {
  const segs = [];
  let x = startX;
  let y = prev || GROUND_Y;
  for (let i = 0; i < count; i++) {
    const type = Math.random();
    let dy = 0;
    if (type < 0.15) dy = -Math.random() * 40 - 10; // ramp up
    else if (type < 0.25) dy = Math.random() * 30 + 5; // dip
    else if (type < 0.35) dy = -Math.random() * 60 - 20; // big jump
    else dy = (Math.random() - 0.5) * 12;
    y = Math.max(100, Math.min(GROUND_Y + 30, y + dy));
    segs.push({ x, y });
    x += SEG_W;
  }
  return segs;
}

function getTerrainY(terrain, px) {
  for (let i = 0; i < terrain.length - 1; i++) {
    const a = terrain[i], b = terrain[i + 1];
    if (px >= a.x && px < b.x) {
      const t = (px - a.x) / (b.x - a.x);
      return a.y + (b.y - a.y) * t;
    }
  }
  return GROUND_Y;
}

function getTerrainAngle(terrain, px) {
  for (let i = 0; i < terrain.length - 1; i++) {
    const a = terrain[i], b = terrain[i + 1];
    if (px >= a.x && px < b.x) {
      return Math.atan2(b.y - a.y, b.x - a.x);
    }
  }
  return 0;
}

export default function Motocross() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // menu | playing | dead
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const stateRef = useRef({});
  const keysRef = useRef({});

  const startGame = useCallback(() => {
    const terrain = generateTerrain(0, 2000, GROUND_Y);
    stateRef.current = {
      bike: {
        x: 200, y: GROUND_Y - WHEEL_R - BODY_H / 2,
        vx: 0, vy: 0, angle: 0, onGround: false,
        fuel: 100
      },
      terrain,
      camX: 0,
      distance: 0,
      alive: true,
      flipCount: 0, totalRotation: 0
    };
    setScore(0);
    setGameState('playing');
  }, []);

  useEffect(() => {
    const onKey = (e) => { keysRef.current[e.key] = e.type === 'keydown'; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
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
      const bike = s.bike;

      if (!s.alive) { setGameState('dead'); return; }

      // Physics
      if (k['ArrowUp'] || k['w']) bike.vx = Math.min(bike.vx + ACCEL, MAX_SPEED);
      if (k['ArrowDown'] || k['s']) bike.vx = Math.max(bike.vx - BRAKE, -1);
      if (k['ArrowLeft'] || k['a']) bike.angle -= LEAN_SPEED;
      if (k['ArrowRight'] || k['d']) bike.angle += LEAN_SPEED;

      bike.vy += GRAVITY;
      bike.x += bike.vx;
      bike.y += bike.vy;

      // Terrain collision
      const frontWheelX = bike.x + 18;
      const rearWheelX = bike.x - 18;
      const groundFront = getTerrainY(s.terrain, frontWheelX + s.camX);
      const groundRear = getTerrainY(s.terrain, rearWheelX + s.camX);
      const avgGround = (groundFront + groundRear) / 2;
      const terrAngle = getTerrainAngle(s.terrain, bike.x + s.camX);

      bike.onGround = false;
      if (bike.y + WHEEL_R + BODY_H / 2 >= avgGround) {
        bike.y = avgGround - WHEEL_R - BODY_H / 2;
        if (bike.vy > 0) {
          bike.vy = -bike.vy * BOUNCE;
          if (Math.abs(bike.vy) < 1) bike.vy = 0;
        }
        bike.onGround = true;
        // Check crash - too much angle on landing
        const angleDiff = Math.abs(bike.angle - terrAngle);
        if (angleDiff > 1.3 && bike.vx > 1) {
          s.alive = false;
        }
        // Gradually align bike angle to terrain
        bike.angle += (terrAngle - bike.angle) * 0.15;
        // Friction
        bike.vx *= 0.99;
      }

      // Extend terrain
      const worldX = bike.x + s.camX;
      const lastSeg = s.terrain[s.terrain.length - 1];
      if (worldX > lastSeg.x - W * 2) {
        const newSegs = generateTerrain(lastSeg.x + SEG_W, 500, lastSeg.y);
        s.terrain.push(...newSegs);
      }
      // Trim old terrain
      while (s.terrain.length > 100 && s.terrain[1].x < worldX - W) {
        s.terrain.shift();
      }

      // Camera follows bike
      s.camX += (bike.x - 250 + s.camX - s.camX) * 0.1;
      const targetCamX = bike.x - 250;
      s.camX += (targetCamX - s.camX) * 0.08;

      s.distance = Math.max(s.distance, Math.floor(worldX / 10));
      setScore(s.distance);

      // Check if fell off screen
      if (bike.y > H + 100) s.alive = false;

      // ──── DRAW ────
      ctx.clearRect(0, 0, W, H);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, '#0a1628');
      skyGrad.addColorStop(0.5, '#1a2a44');
      skyGrad.addColorStop(1, '#3a2a1a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = '#fff3';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 137 + 50) % W + W - (s.camX * 0.1) % W) % W;
        const sy = (i * 73 + 20) % (H * 0.5);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Mountains (parallax)
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 40) {
        const mx = x + s.camX * 0.15;
        const my = H - 120 - Math.sin(mx * 0.005) * 60 - Math.cos(mx * 0.003) * 40;
        ctx.lineTo(x, my);
      }
      ctx.lineTo(W, H);
      ctx.fill();

      // Terrain
      ctx.save();
      ctx.beginPath();
      let firstDrawn = true;
      for (const seg of s.terrain) {
        const drawX = seg.x - s.camX;
        if (drawX < -20 || drawX > W + 20) continue;
        if (firstDrawn) { ctx.moveTo(drawX, seg.y); firstDrawn = false; }
        else ctx.lineTo(drawX, seg.y);
      }
      ctx.lineTo(W + 20, H + 20);
      ctx.lineTo(-20, H + 20);
      ctx.closePath();
      const terrGrad = ctx.createLinearGradient(0, H - 150, 0, H);
      terrGrad.addColorStop(0, '#4a6a3a');
      terrGrad.addColorStop(0.3, '#3a5a2a');
      terrGrad.addColorStop(1, '#2a3a1a');
      ctx.fillStyle = terrGrad;
      ctx.fill();
      ctx.strokeStyle = '#6a8a4a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Draw bike
      const bx = bike.x - s.camX;
      const by = bike.y;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(bike.angle);

      // Wheels
      ctx.fillStyle = '#222';
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(-18, BODY_H / 2, WHEEL_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(18, BODY_H / 2, WHEEL_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Spokes
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      const spokeAngle = (s.distance * 0.1) % (Math.PI * 2);
      for (let w = -1; w <= 1; w += 2) {
        for (let sp = 0; sp < 4; sp++) {
          const a = spokeAngle + sp * Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(w * 18, BODY_H / 2);
          ctx.lineTo(w * 18 + Math.cos(a) * WHEEL_R * 0.9, BODY_H / 2 + Math.sin(a) * WHEEL_R * 0.9);
          ctx.stroke();
        }
      }

      // Frame
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-18, BODY_H / 2 - 4);
      ctx.lineTo(-5, -BODY_H / 2);
      ctx.lineTo(12, -BODY_H / 2);
      ctx.lineTo(18, BODY_H / 2 - 4);
      ctx.stroke();
      // Seat
      ctx.fillStyle = '#333';
      ctx.fillRect(-8, -BODY_H / 2 - 4, 18, 5);
      // Handlebars
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(12, -BODY_H / 2);
      ctx.lineTo(16, -BODY_H / 2 - 12);
      ctx.stroke();
      // Engine
      ctx.fillStyle = '#666';
      ctx.fillRect(-6, 0, 12, 8);

      // Rider
      ctx.fillStyle = '#ffd740';
      ctx.beginPath();
      ctx.arc(2, -BODY_H / 2 - 18, 8, 0, Math.PI * 2);
      ctx.fill(); // head
      ctx.strokeStyle = '#ffd740';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(2, -BODY_H / 2 - 10);
      ctx.lineTo(2, -BODY_H / 2 + 2);
      ctx.stroke(); // body
      ctx.beginPath();
      ctx.moveTo(2, -BODY_H / 2 - 6);
      ctx.lineTo(14, -BODY_H / 2 - 14);
      ctx.stroke(); // arm to handlebar
      ctx.beginPath();
      ctx.moveTo(2, -BODY_H / 2 + 2);
      ctx.lineTo(-6, BODY_H / 2 - 6);
      ctx.stroke(); // leg

      ctx.restore();

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'dead') setBest(b => Math.max(b, score));
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
          <h2>🏍️ Motocross</h2>
          <p>Physics-based 2D motorcycle platformer</p>
          <button onClick={startGame}>Start Ride</button>
          <p style={{ fontSize: '.85rem', color: '#666' }}>Arrow keys / WASD: ↑ Accelerate · ↓ Brake · ←→ Lean</p>
        </div>
      )}
      {gameState === 'dead' && (
        <div className="motocross-overlay">
          <h2>💥 Crashed!</h2>
          <p>Distance: {score}m · Best: {Math.max(best, score)}m</p>
          <button onClick={startGame}>Try Again</button>
        </div>
      )}
      <div className="motocross-controls">↑ Accelerate · ↓ Brake · ←→ Lean</div>
      <BackButton />
    </div>
  );
}
