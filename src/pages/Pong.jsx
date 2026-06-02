import React, { useEffect, useRef, useState } from 'react';
import BackButton from './BackButton';
import './Pong.css';

export default function Pong() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [rally, setRally] = useState(0);
  const [mode, setMode] = useState(null); // null = menu, '2p', 'ai'
  const [difficulty, setDifficulty] = useState(2);

  useEffect(() => {
    if (!mode) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = 800, H = 500;
    canvas.width = W; canvas.height = H;

    const keys = { ArrowUp: false, ArrowDown: false, w: false, s: false };
    let animId;
    let p1Score = 0, p2Score = 0;
    let currentRally = 0;
    const isAI = mode === 'ai';
    const diff = difficulty;

    const BALL_SPEED = 8;

    const paddle = { w: 12, h: 90 };
    let p1Y = H / 2 - paddle.h / 2;
    let p2Y = H / 2 - paddle.h / 2;
    let ballX = W / 2, ballY = H / 2, bsx = -BALL_SPEED, bsy = -3;
    let isPaused = false;
    let trailPositions = [];

    function resetBall(toLeft) {
      ballX = W / 2; ballY = H / 2;
      bsx = toLeft ? -BALL_SPEED : BALL_SPEED;
      bsy = (Math.random() * 5 - 2.5);
      currentRally = 0;
      setRally(0);
      trailPositions = [];
    }

    function score(who) {
      if (isPaused) return;
      isPaused = true;
      if (who === 'p1') p1Score++;
      else p2Score++;
      setScores({ player1: p1Score, player2: p2Score });
      bsx = 0; bsy = 0;
      setTimeout(() => { resetBall(who === 'p1'); isPaused = false; }, 700);
    }

    function update() {
      const pSpeed = 9;

      // Player 1 (left paddle) — W / S
      if (keys.w) p1Y -= pSpeed;
      if (keys.s) p1Y += pSpeed;
      p1Y = Math.max(0, Math.min(H - paddle.h, p1Y));

      if (isAI) {
        // AI controls right paddle
        const compSpeed = 3 + diff * 1.5;
        const compCenter = p2Y + paddle.h / 2;
        if (compCenter < ballY - 10) p2Y += compSpeed;
        else if (compCenter > ballY + 10) p2Y -= compSpeed;
      } else {
        // Player 2 (right paddle) — Arrow Up / Arrow Down
        if (keys.ArrowUp) p2Y -= pSpeed;
        if (keys.ArrowDown) p2Y += pSpeed;
      }
      p2Y = Math.max(0, Math.min(H - paddle.h, p2Y));

      trailPositions.unshift({ x: ballX, y: ballY });
      if (trailPositions.length > 12) trailPositions.pop();

      ballX += bsx; ballY += bsy;

      if (ballY <= 6) { ballY = 6; bsy *= -1; }
      if (ballY >= H - 6) { ballY = H - 6; bsy *= -1; }

      // Player 1 paddle (left)
      if (ballX <= paddle.w + 10 && ballX > 6) {
        if (ballY >= p1Y && ballY <= p1Y + paddle.h) {
          ballX = paddle.w + 10;
          bsx = Math.abs(bsx) + 0.4;
          const hitPos = (ballY - p1Y - paddle.h / 2) / (paddle.h / 2);
          bsy = hitPos * 7;
          currentRally++;
          setRally(currentRally);
        }
      }

      // Player 2 paddle (right)
      if (ballX >= W - paddle.w - 10 && ballX < W - 6) {
        if (ballY >= p2Y && ballY <= p2Y + paddle.h) {
          ballX = W - paddle.w - 10;
          bsx = -(Math.abs(bsx) + 0.4);
          const hitPos = (ballY - p2Y - paddle.h / 2) / (paddle.h / 2);
          bsy = hitPos * 7;
          currentRally++;
          setRally(currentRally);
        }
      }

      if (!isPaused && ballX < 0) score('p2');
      if (!isPaused && ballX > W) score('p1');
    }

    function draw() {
      // Background
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, W, H);

      // Center line
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(0,229,255,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ball trail
      for (let i = 0; i < trailPositions.length; i++) {
        const t = trailPositions[i];
        const alpha = 0.3 * (1 - i / trailPositions.length);
        const size = 6 * (1 - i / trailPositions.length * 0.5);
        ctx.beginPath();
        ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
        ctx.fill();
      }

      // Ball
      ctx.beginPath();
      ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Paddles with glow
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 15;
      const grad1 = ctx.createLinearGradient(0, p1Y, 0, p1Y + paddle.h);
      grad1.addColorStop(0, '#00e5ff');
      grad1.addColorStop(1, '#0088aa');
      ctx.fillStyle = grad1;
      ctx.fillRect(6, p1Y, paddle.w, paddle.h);

      ctx.shadowColor = '#ff5252';
      ctx.shadowBlur = 15;
      const grad2 = ctx.createLinearGradient(0, p2Y, 0, p2Y + paddle.h);
      grad2.addColorStop(0, '#ff5252');
      grad2.addColorStop(1, '#cc0000');
      ctx.fillStyle = grad2;
      ctx.fillRect(W - paddle.w - 6, p2Y, paddle.w, paddle.h);
      ctx.shadowBlur = 0;

      // Border glow
      ctx.strokeStyle = 'rgba(0,229,255,0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, W - 2, H - 2);
    }

    function gameLoop() {
      if (!isPaused) update();
      draw();
      animId = requestAnimationFrame(gameLoop);
    }

    const onKeyDown = e => { if (e.key in keys) { keys[e.key] = true; e.preventDefault(); } };
    const onKeyUp = e => { if (e.key in keys) keys[e.key] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    resetBall(true);
    gameLoop();

    stateRef.current = { reset: () => {
      p1Score = 0; p2Score = 0;
      setScores({ player1: 0, player2: 0 });
      resetBall(true);
    }};

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [mode, difficulty]);

  const backToMenu = () => {
    setMode(null);
    setScores({ player1: 0, player2: 0 });
    setRally(0);
  };

  // Main menu
  if (!mode) {
    return (
      <div className="pong-root">
        <div className="pong-menu">
          <h1 className="pong-title">PONG</h1>
          <button className="pong-menu-btn cyan" onClick={() => setMode('2p')}>
            2 Player
          </button>
          <button className="pong-menu-btn red" onClick={() => setMode('ai')}>
            VS AI
          </button>
          {/* Difficulty selector shown only for AI */}
          <div className="pong-diff-row">
            <label>AI Difficulty:</label>
            <select value={difficulty} onChange={e => setDifficulty(Number(e.target.value))}>
              <option value={1}>Easy</option>
              <option value={2}>Medium</option>
              <option value={3}>Hard</option>
            </select>
          </div>
        </div>
        <BackButton />
      </div>
    );
  }

  return (
    <div className="pong-root">
      <div className="pong-hud">
        <div className="pong-score cyan">{mode === 'ai' ? 'You' : 'P1'}: {scores.player1}</div>
        <div className="pong-rally">Rally: {rally}</div>
        <div className="pong-score red">{mode === 'ai' ? 'AI' : 'P2'}: {scores.player2}</div>
      </div>
      <canvas ref={canvasRef} className="pong-canvas" />
      <div className="pong-controls">
        <span className="pong-keys">{mode === '2p' ? 'P1: W / S' : 'W / S'}</span>
        <button onClick={() => stateRef.current?.reset()}>Reset</button>
        <button onClick={backToMenu}>Menu</button>
        {mode === '2p' && <span className="pong-keys">P2: ↑ / ↓</span>}
      </div>
      <BackButton />
    </div>
  );
}
