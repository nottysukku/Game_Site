import React, { useEffect, useRef, useState, useCallback } from 'react';
import './SoccerHeads.css';
import BackButton from './BackButton';

export default function SoccerHeads() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [announcement, setAnnouncement] = useState("");
  const [mode, setMode] = useState(null); // null = menu, '1p' or '2p'

  const startGame = useCallback((selectedMode) => {
    setMode(selectedMode);
    setScore({ p1: 0, p2: 0 });
    setAnnouncement("");
  }, []);

  // Menu screen
  if (mode === null) {
    return (
      <div className="soccer-container relative">
        <BackButton />
        <div className="soccer-menu">
          <h1 className="soccer-title">⚽ Soccer Heads ⚽</h1>
          <p className="soccer-subtitle">First to 5 goals wins!</p>
          <div className="soccer-menu-buttons">
            <button className="soccer-btn soccer-btn-1p" onClick={() => startGame('1p')}>
              🤖 VS Computer
            </button>
            <button className="soccer-btn soccer-btn-2p" onClick={() => startGame('2p')}>
              👥 2 Players
            </button>
          </div>
          <div className="soccer-controls-info">
            <div className="soccer-control-card">
              <h3>Player 1</h3>
              <p><span>W A D</span> — Move / Jump</p>
              <p><span>SPACE</span> — Kick</p>
            </div>
            <div className="soccer-control-card">
              <h3>Player 2</h3>
              <p><span>← ↑ →</span> — Move / Jump</p>
              <p><span>ENTER / L</span> — Kick</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="soccer-container relative">
      <BackButton />
      <SoccerGame
        mode={mode}
        score={score}
        setScore={setScore}
        announcement={announcement}
        setAnnouncement={setAnnouncement}
        onBackToMenu={() => setMode(null)}
        canvasRef={canvasRef}
      />
    </div>
  );
}

function SoccerGame({ mode, score, setScore, announcement, setAnnouncement, onBackToMenu, canvasRef }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let gameOver = false;
    let scoreP1 = 0;
    let scoreP2 = 0;
    let announcementTimer = 0; // replaces broken setTimeout

    const keys = {};
    const handleKeyDown = (e) => {
      // Prevent page scroll on arrow keys / space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (gameOver) {
        if (e.code === 'KeyR' || e.code === 'Space' || e.code === 'Enter') {
          gameOver = false;
          scoreP1 = 0;
          scoreP2 = 0;
          setScore({ p1: 0, p2: 0 });
          setAnnouncement("");
          resetPositions();
        }
        if (e.code === 'Escape') {
          onBackToMenu();
        }
        return;
      }
      keys[e.code] = true;
    };
    const handleKeyUp = (e) => { keys[e.code] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Physics constants
    const GRAVITY = 0.55;
    const BALL_GRAVITY = 0.45;
    const GROUND_FRICTION = 0.985; // horizontal friction on ground
    const AIR_DRAG = 0.999; // very slight air drag
    const RESTITUTION = 0.72; // bounciness

    const W = canvas.width;
    const H = canvas.height;
    const groundY = H - 50;
    const goalW = 100;
    const goalH = 170;
    const goalPostThickness = 8;

    let particles = [];
    let screenShake = 0;

    class Particle {
      constructor(x, y, color, speed, life) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 4 + 2;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // particles fall slightly
        this.life--;
      }
      draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }

    function spawnParticles(x, y, color, count, speed = 10) {
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color, speed, 30 + Math.random() * 20));
      }
    }

    class Player {
      constructor(x, color, isPlayer2) {
        this.startX = x;
        this.x = x;
        this.y = groundY - 45; // radius = 45
        this.radius = 45;
        this.color = color;
        this.vx = 0;
        this.vy = 0;
        this.speed = 7;
        this.jumpPower = -13;
        this.jumps = 0;
        this.maxJumps = 2;
        this.isPlayer2 = isPlayer2;
        this.jumpKeyWasDown = false;

        // Kick mechanics
        this.kicking = false;
        this.kickTimer = 0;
        this.kickCooldown = 0;
        this.shoeAngle = 0;

        // Status
        this.frozen = 0;
        this.hasFireKick = false;

        // Visuals
        this.squish = 1;
        this.squishVy = 0;
        this.facingDir = isPlayer2 ? -1 : 1;
      }

      get onGround() {
        return this.y + this.radius >= groundY - 1;
      }

      update() {
        // Squish animation (spring logic)
        this.squishVy += (1 - this.squish) * 0.15;
        this.squishVy *= 0.75;
        this.squish += this.squishVy;

        if (this.kickCooldown > 0) this.kickCooldown--;

        if (this.frozen > 0) {
          this.frozen--;
          this.vx *= 0.85;
          if (Math.random() < 0.1) {
            spawnParticles(this.x, this.y, '#00ffff', 1, 2);
          }
        } else {
          // Movement
          let moving = false;
          if (!this.isPlayer2) {
            // Player 1 controls: WASD + Space
            if (keys['KeyA']) { this.vx -= 1.2; moving = true; this.facingDir = -1; }
            if (keys['KeyD']) { this.vx += 1.2; moving = true; this.facingDir = 1; }

            if (keys['KeyW']) {
              if (this.jumps < this.maxJumps && !this.jumpKeyWasDown) {
                this.vy = this.jumpPower;
                this.jumps++;
                this.squish = 1.3;
                if (this.onGround) spawnParticles(this.x, groundY, '#ccc', 5, 3);
              }
              this.jumpKeyWasDown = true;
            } else {
              this.jumpKeyWasDown = false;
            }

            if (keys['Space'] && !this.kicking && this.kickCooldown <= 0) {
              this.kicking = true;
              this.kickTimer = 18;
              this.kickCooldown = 25;
            }
          } else if (mode === '2p') {
            // Player 2 controls (human): Arrow keys + Enter/L
            if (keys['ArrowLeft']) { this.vx -= 1.2; moving = true; this.facingDir = -1; }
            if (keys['ArrowRight']) { this.vx += 1.2; moving = true; this.facingDir = 1; }

            if (keys['ArrowUp']) {
              if (this.jumps < this.maxJumps && !this.jumpKeyWasDown) {
                this.vy = this.jumpPower;
                this.jumps++;
                this.squish = 1.3;
                if (this.onGround) spawnParticles(this.x, groundY, '#ccc', 5, 3);
              }
              this.jumpKeyWasDown = true;
            } else {
              this.jumpKeyWasDown = false;
            }

            if ((keys['Enter'] || keys['ShiftRight'] || keys['KeyL']) && !this.kicking && this.kickCooldown <= 0) {
              this.kicking = true;
              this.kickTimer = 18;
              this.kickCooldown = 25;
            }
          }
          // AI mode is handled separately in updateAI()

          // Friction & speed limits
          if (!moving && this.onGround) this.vx *= 0.82;
          else if (!moving) this.vx *= 0.96; // less air friction
          this.vx = Math.max(-this.speed, Math.min(this.speed, this.vx));
        }

        // Apply physics
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        // Ground collision
        if (this.y + this.radius > groundY) {
          if (this.vy > 5) {
            this.squish = 0.7;
            spawnParticles(this.x, groundY, '#ccc', 3, 2);
          }
          this.y = groundY - this.radius;
          this.vy = 0;
          this.jumps = 0;
        }

        // Boundaries — players can't enter goals
        if (this.x - this.radius < goalW && this.y + this.radius > groundY - goalH) {
          this.x = goalW + this.radius;
          this.vx = Math.max(0, this.vx);
        }
        if (this.x + this.radius > W - goalW && this.y + this.radius > groundY - goalH) {
          this.x = W - goalW - this.radius;
          this.vx = Math.min(0, this.vx);
        }
        if (this.x - this.radius < 0) { this.x = this.radius; this.vx = Math.max(0, this.vx); }
        if (this.x + this.radius > W) { this.x = W - this.radius; this.vx = Math.min(0, this.vx); }

        // Kick logic
        if (this.kicking) {
          this.kickTimer--;
          const progress = 1 - (this.kickTimer / 18);
          this.shoeAngle = Math.sin(progress * Math.PI) * (this.facingDir === -1 ? -1.5 : 1.5);
          if (this.kickTimer <= 0) {
            this.kicking = false;
            this.shoeAngle = 0;
          }
        }
      }

      draw(ctx) {
        if (this.frozen > 0) {
          ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
          const iceW = this.radius * 2 + 16;
          ctx.fillRect(this.x - iceW / 2, this.y - this.radius - 8, iceW, this.radius * 2 + 16);
          ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
          ctx.lineWidth = 2;
          ctx.strokeRect(this.x - iceW / 2, this.y - this.radius - 8, iceW, this.radius * 2 + 16);
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(1 / Math.max(0.5, this.squish), Math.max(0.5, this.squish));

        // Head (Circle with outline)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        ctx.stroke();

        // Shadow on head for 3D look
        const headGrad = ctx.createRadialGradient(-10, -10, 5, 0, 0, this.radius);
        headGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
        headGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Face
        const faceDir = this.facingDir;
        const eyeOffsetX = faceDir * 16;

        // Eye white
        ctx.beginPath();
        ctx.arc(eyeOffsetX, -10, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#333';
        ctx.stroke();

        // Pupil
        ctx.beginPath();
        ctx.arc(eyeOffsetX + faceDir * 4, -10, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();

        // Mouth
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#333';
        if (this.kicking) {
          ctx.arc(eyeOffsetX, 15, 8, 0, Math.PI);
        } else {
          ctx.arc(eyeOffsetX, 15, 5, 0.2, Math.PI - 0.2);
        }
        ctx.stroke();

        // Headband
        ctx.strokeStyle = this.isPlayer2 ? '#1565c0' : '#c2185b';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius - 2, -Math.PI * 0.85, -Math.PI * 0.15);
        ctx.stroke();

        ctx.restore();

        // Shoe
        ctx.save();
        const shoeBaseX = this.x + this.facingDir * 10;
        const shoeBaseY = this.y + this.radius - 5;
        ctx.translate(shoeBaseX, shoeBaseY);
        ctx.rotate(this.shoeAngle);

        ctx.fillStyle = this.hasFireKick ? '#ff3300' : '#555';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        if (this.hasFireKick && this.kicking) {
          spawnParticles(shoeBaseX, shoeBaseY, '#ff9800', 1, 3);
        }

        ctx.beginPath();
        if (this.facingDir < 0) {
          ctx.roundRect(-40, -10, 50, 20, 10);
        } else {
          ctx.roundRect(-10, -10, 50, 20, 10);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    class Ball {
      constructor() {
        this.radius = 22;
        this.rotation = 0;
        this.reset();
      }
      reset() {
        this.x = W / 2;
        this.y = 200;
        this.vx = 0;
        this.vy = 0;
        this.fire = false;
        this.rotation = 0;
        this.lastKicker = null;
      }
      update() {
        // Gravity
        this.vy += BALL_GRAVITY;

        // Air drag (very gentle, only affects horizontal)
        this.vx *= AIR_DRAG;

        this.x += this.vx;
        this.y += this.vy;

        this.rotation += this.vx * 0.04;

        if (this.fire) {
          spawnParticles(this.x, this.y, '#ff5252', 2, 5);
        }

        // Ground collision
        if (this.y + this.radius > groundY) {
          this.y = groundY - this.radius;
          this.vy *= -RESTITUTION;
          this.vx *= GROUND_FRICTION;
          // Kill small bounces
          if (Math.abs(this.vy) < 1.5) this.vy = 0;
          if (this.fire && Math.abs(this.vy) < 2) this.fire = false;
        }

        // Ceiling
        if (this.y - this.radius < 0) {
          this.y = this.radius;
          this.vy = Math.abs(this.vy) * RESTITUTION;
        }

        // --- Goal post collisions ---
        // Left goal: spans x=0 to x=goalW, y=groundY-goalH to y=groundY
        // The post is the vertical bar at x=goalW, and the crossbar at y=groundY-goalH

        // Left goal vertical post (right side of left goal)
        if (this.x + this.radius > goalW - goalPostThickness &&
            this.x - this.radius < goalW + goalPostThickness &&
            this.y + this.radius > groundY - goalH &&
            this.y - this.radius < groundY) {
          // Only bounce if ball is outside the goal area
          if (this.x > goalW) {
            this.x = goalW + goalPostThickness + this.radius;
            this.vx = Math.abs(this.vx) * RESTITUTION;
          }
        }

        // Left goal crossbar (top of left goal)
        if (this.x < goalW &&
            this.y + this.radius > groundY - goalH - goalPostThickness &&
            this.y - this.radius < groundY - goalH + goalPostThickness) {
          if (this.vy > 0 && this.y < groundY - goalH) {
            this.y = groundY - goalH - goalPostThickness - this.radius;
            this.vy *= -RESTITUTION;
          }
        }

        // Right goal vertical post (left side of right goal)
        if (this.x - this.radius < W - goalW + goalPostThickness &&
            this.x + this.radius > W - goalW - goalPostThickness &&
            this.y + this.radius > groundY - goalH &&
            this.y - this.radius < groundY) {
          if (this.x < W - goalW) {
            this.x = W - goalW - goalPostThickness - this.radius;
            this.vx = -Math.abs(this.vx) * RESTITUTION;
          }
        }

        // Right goal crossbar
        if (this.x > W - goalW &&
            this.y + this.radius > groundY - goalH - goalPostThickness &&
            this.y - this.radius < groundY - goalH + goalPostThickness) {
          if (this.vy > 0 && this.y < groundY - goalH) {
            this.y = groundY - goalH - goalPostThickness - this.radius;
            this.vy *= -RESTITUTION;
          }
        }

        // Wall bounces — but NOT inside goals!
        // Left wall (only above goal)
        if (this.x - this.radius < 0 && this.y + this.radius < groundY - goalH) {
          this.x = this.radius;
          this.vx = Math.abs(this.vx) * RESTITUTION;
        }
        // Right wall (only above goal)
        if (this.x + this.radius > W && this.y + this.radius < groundY - goalH) {
          this.x = W - this.radius;
          this.vx = -Math.abs(this.vx) * RESTITUTION;
        }

        // Back wall of goals (inside goal, bounce off back wall)
        if (this.x - this.radius < 0 && this.y + this.radius >= groundY - goalH) {
          this.x = this.radius;
          this.vx = Math.abs(this.vx) * 0.3;
        }
        if (this.x + this.radius > W && this.y + this.radius >= groundY - goalH) {
          this.x = W - this.radius;
          this.vx = -Math.abs(this.vx) * 0.3;
        }

        // Speed cap
        const maxSpeed = 25;
        this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));
        this.vy = Math.max(-maxSpeed, Math.min(maxSpeed, this.vy));
      }
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Ball shadow on the ground
        ctx.restore();
        ctx.save();

        // Shadow
        const shadowScale = Math.max(0.3, 1 - (groundY - this.y - this.radius) / 400);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(this.x, groundY - 2, this.radius * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ball
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Fire glow
        if (this.fire) {
          ctx.shadowColor = '#ff5500';
          ctx.shadowBlur = 25;
        }

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#333';
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Soccer ball pentagon pattern
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5;
          const ex = Math.cos(angle) * this.radius * 0.85;
          const ey = Math.sin(angle) * this.radius * 0.85;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = '#bbb';
          ctx.lineWidth = 1;
          ctx.stroke();
          // Small pentagon at edge
          ctx.fillStyle = '#222';
          ctx.beginPath();
          ctx.arc(ex, ey, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    class PowerUp {
      constructor() {
        this.x = 200 + Math.random() * (W - 400);
        this.y = groundY - 60 - Math.random() * 150;
        this.radius = 18;
        this.type = Math.random() > 0.5 ? 'FIRE' : 'FREEZE';
        this.active = true;
        this.floatOffset = Math.random() * Math.PI * 2;
        this.spawnTime = 0;
      }
      update() {
        this.floatOffset += 0.06;
        this.spawnTime++;
      }
      draw(ctx) {
        if (!this.active) return;
        const yPos = this.y + Math.sin(this.floatOffset) * 8;
        const pulse = 1 + Math.sin(this.spawnTime * 0.1) * 0.1;

        ctx.save();
        ctx.shadowColor = this.type === 'FIRE' ? '#ff9800' : '#00bcd4';
        ctx.shadowBlur = 15 + Math.sin(this.spawnTime * 0.15) * 5;

        ctx.fillStyle = this.type === 'FIRE' ? '#ff9800' : '#00bcd4';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3;
          const r = this.radius * pulse;
          if (i === 0) ctx.moveTo(this.x + r * Math.cos(a), yPos + r * Math.sin(a));
          else ctx.lineTo(this.x + r * Math.cos(a), yPos + r * Math.sin(a));
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type === 'FIRE' ? '🔥' : '❄️', this.x, yPos);
        ctx.restore();
      }
    }

    // ===== AI Logic =====
    function updateAI(ai, ball, opponent) {
      if (mode !== '1p') return;
      if (ai.frozen > 0) return;

      const ballDx = ball.x - ai.x;
      const ballDy = ball.y - ai.y;
      const distToBall = Math.hypot(ballDx, ballDy);

      // Predict ball position a bit ahead
      const predictFrames = 20;
      const predictedBallX = ball.x + ball.vx * predictFrames * 0.5;
      const predictedBallY = ball.y + ball.vy * predictFrames * 0.3;

      const ownGoalX = W - goalW / 2; // AI defends right goal
      const ballComingToward = ball.vx > 1;
      const ballOnMySide = ball.x > W / 2;
      const isBehindBall = ai.x > ball.x;

      // Defensive position
      const defenseX = W - goalW - 80;
      let targetX;
      let wantJump = false;
      let wantKick = false;

      // Difficulty: reaction delay and precision
      const reactionRandom = Math.random();

      if (ballOnMySide || ballComingToward) {
        // Ball is on AI's side or coming toward AI — be aggressive
        if (isBehindBall && ball.y > groundY - 100) {
          // Ball is in front, try to kick it away
          targetX = ball.x + 30;
        } else {
          targetX = ball.x + 40; // get behind ball to kick toward opponent goal
        }

        // Jump to header the ball if ball is above
        if (ball.y < ai.y - 30 && distToBall < 200) {
          wantJump = true;
        }

        // Kick when close
        if (distToBall < ai.radius + ball.radius + 40) {
          wantKick = true;
        }
      } else {
        // Ball is on opponent side — hold defensive position
        targetX = defenseX;

        // But still go for ball if it's close to center
        if (ball.x > W * 0.35) {
          targetX = Math.min(ball.x + 30, defenseX);
        }
      }

      // Movement toward target
      const moveThreshold = 15;
      if (reactionRandom > 0.05) { // 95% reaction rate
        if (ai.x < targetX - moveThreshold) {
          ai.vx += 1.1;
          ai.facingDir = 1;
        } else if (ai.x > targetX + moveThreshold) {
          ai.vx -= 1.1;
          ai.facingDir = -1;
        }
      }

      // Jumping
      if (wantJump && ai.onGround && reactionRandom > 0.15) {
        if (!ai.jumpKeyWasDown) {
          ai.vy = ai.jumpPower;
          ai.jumps++;
          ai.squish = 1.3;
          spawnParticles(ai.x, groundY, '#ccc', 5, 3);
        }
        ai.jumpKeyWasDown = true;
      } else if (!wantJump) {
        ai.jumpKeyWasDown = false;
        // Double jump to reach high balls
        if (ball.y < ai.y - 80 && distToBall < 150 && ai.jumps < 2 && !ai.onGround) {
          ai.vy = ai.jumpPower;
          ai.jumps++;
          ai.squish = 1.3;
        }
      }

      // Kicking
      if (wantKick && !ai.kicking && ai.kickCooldown <= 0 && reactionRandom > 0.1) {
        ai.kicking = true;
        ai.kickTimer = 18;
        ai.kickCooldown = 30;
        ai.facingDir = -1; // kick toward opponent's goal
      }
    }

    const p1 = new Player(200, '#e91e63', false);
    const p2 = new Player(W - 200, '#2196f3', true);
    const ball = new Ball();

    scoreP1 = 0;
    scoreP2 = 0;
    let powerUp = null;
    let powerUpTimer = 0;
    let goalCelebration = 0;

    // Player-to-player collision
    function resolvePlayerCollision(a, b) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = a.radius + b.radius - 10; // slight overlap allowed

      if (dist < minDist && dist > 0) {
        const angle = Math.atan2(dy, dx);
        const overlap = minDist - dist;
        const pushX = Math.cos(angle) * overlap * 0.5;
        const pushY = Math.sin(angle) * overlap * 0.5;

        a.x -= pushX;
        b.x += pushX;
        a.y -= pushY;
        b.y += pushY;

        // Exchange some horizontal velocity
        const tempVx = a.vx;
        a.vx = a.vx * 0.3 + b.vx * 0.7;
        b.vx = b.vx * 0.3 + tempVx * 0.7;

        a.squish = 0.85;
        b.squish = 0.85;
      }
    }

    // Ball-player collision
    function resolveCollision(p, b) {
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const dist = Math.hypot(dx, dy);
      const minDist = p.radius + b.radius;

      if (dist < minDist && dist > 0) {
        // Resolve penetration
        const angle = Math.atan2(dy, dx);
        const overlap = minDist - dist;
        b.x += Math.cos(angle) * overlap;
        b.y += Math.sin(angle) * overlap;

        // Relative velocity along collision normal
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        const rvx = b.vx - p.vx;
        const rvy = b.vy - p.vy;
        const velAlongNormal = rvx * nx + rvy * ny;

        if (velAlongNormal > 0) return; // Moving apart

        const e = RESTITUTION;
        const j = -(1 + e) * velAlongNormal;

        // Apply impulse to ball
        b.vx += j * nx;
        b.vy += j * ny;

        // Add a bit of the player's velocity to the ball for more responsive feel
        b.vx += p.vx * 0.3;
        b.vy += p.vy * 0.2;

        b.lastKicker = p;
        p.squish = 0.82;

        spawnParticles(b.x, b.y, '#fff', 3, 4);
      }

      // Kick collision (shoe hitbox)
      if (p.kicking && p.kickTimer > 8) {
        const kickDir = p.facingDir;
        const kickZoneX = p.x + kickDir * (p.radius + 20);
        const kickZoneY = p.y + p.radius - 5;
        const kickDist = Math.hypot(b.x - kickZoneX, b.y - kickZoneY);

        if (kickDist < b.radius + 28) {
          const power = p.hasFireKick ? 28 : 16;
          // Kick angle depends on position relative to the player
          const kickAngle = Math.atan2(b.y - kickZoneY, b.x - kickZoneX);
          b.vx = Math.cos(kickAngle) * power + kickDir * power * 0.5;
          b.vy = Math.sin(kickAngle) * power * 0.5 - power * 0.4;

          spawnParticles(b.x, b.y, '#fff', 15, 10);
          screenShake = p.hasFireKick ? 12 : 4;

          if (p.hasFireKick) {
            b.fire = true;
            p.hasFireKick = false;
            spawnParticles(b.x, b.y, '#ff5500', 20, 12);
          }

          b.lastKicker = p;
          p.kickTimer = 0; // consume kick
        }
      }
    }

    function checkGoal() {
      if (gameOver) return;

      if (goalCelebration > 0) {
        goalCelebration--;
        if (goalCelebration === 0) {
          if (scoreP1 >= 5 || scoreP2 >= 5) {
            gameOver = true;
            const winner = scoreP1 >= 5
              ? (mode === '1p' ? "YOU WIN!" : "PLAYER 1 WINS!")
              : (mode === '1p' ? "COMPUTER WINS!" : "PLAYER 2 WINS!");
            setAnnouncement(winner);
          } else {
            resetPositions();
          }
        }
        return;
      }

      // Goal detection: ball center enters the goal area
      const goalTop = groundY - goalH;

      // Left goal (P2 scores / computer scores)
      if (ball.x < goalW - ball.radius && ball.y > goalTop + 15) {
        scoreP2++;
        setScore({ p1: scoreP1, p2: scoreP2 });
        const txt = mode === '1p' ? "COMPUTER SCORES!" : "PLAYER 2 SCORES!";
        triggerGoal(txt);
      }
      // Right goal (P1 scores)
      else if (ball.x > W - goalW + ball.radius && ball.y > goalTop + 15) {
        scoreP1++;
        setScore({ p1: scoreP1, p2: scoreP2 });
        const txt = mode === '1p' ? "YOU SCORE!" : "PLAYER 1 SCORES!";
        triggerGoal(txt);
      }
    }

    function triggerGoal(text) {
      setAnnouncement(text);
      goalCelebration = 90; // 1.5 seconds
      screenShake = 15;
      spawnParticles(ball.x, ball.y, '#ffd740', 80, 18);
      spawnParticles(ball.x, ball.y, '#ff5252', 40, 12);
    }

    function resetPositions() {
      p1.x = 200; p1.y = groundY - p1.radius; p1.vx = 0; p1.vy = 0;
      p1.frozen = 0; p1.hasFireKick = false; p1.kicking = false; p1.kickTimer = 0; p1.kickCooldown = 0;
      p2.x = W - 200; p2.y = groundY - p2.radius; p2.vx = 0; p2.vy = 0;
      p2.frozen = 0; p2.hasFireKick = false; p2.kicking = false; p2.kickTimer = 0; p2.kickCooldown = 0;
      ball.reset();
      powerUp = null;
      powerUpTimer = 0;
      announcementTimer = 0;
      setAnnouncement("");
    }

    function drawGoal(ctx, x, y, width, height, isLeft) {
      // Net pattern
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < width; i += 12) {
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i, y + height);
      }
      for (let j = 0; j < height; j += 12) {
        ctx.moveTo(x, y + j);
        ctx.lineTo(x + width, y + j);
      }
      ctx.stroke();

      // Posts
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = goalPostThickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (isLeft) {
        ctx.moveTo(x + width, y + height);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x, y);
      } else {
        ctx.moveTo(x, y + height);
        ctx.lineTo(x, y);
        ctx.lineTo(x + width, y);
      }
      ctx.stroke();
    }

    function drawBackground(ctx) {
      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, groundY);
      grad.addColorStop(0, '#0d1b4a');
      grad.addColorStop(0.4, '#1a3a7a');
      grad.addColorStop(1, '#2a5298');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, groundY);

      // Stadium lights (subtle)
      ctx.fillStyle = 'rgba(255,255,200,0.03)';
      ctx.beginPath();
      ctx.arc(W * 0.2, 0, 200, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(W * 0.8, 0, 200, 0, Math.PI * 2);
      ctx.fill();

      // Stadium crowd silhouette
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(W / 2, groundY - 100, W / 1.5, 80, 0, Math.PI, 0);
      ctx.fill();

      // Grass
      const grassGrad = ctx.createLinearGradient(0, groundY, 0, H);
      grassGrad.addColorStop(0, '#2e7d32');
      grassGrad.addColorStop(0.3, '#388e3c');
      grassGrad.addColorStop(1, '#1b5e20');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, groundY, W, H - groundY);

      // Grass stripes
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let i = 0; i < W; i += 80) {
        if (Math.floor(i / 80) % 2 === 0) {
          ctx.fillRect(i, groundY, 80, H - groundY);
        }
      }

      // Center line
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(W / 2, groundY);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center circle
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, groundY + 25, 40, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ===== Main Game Loop =====
    function gameLoop() {
      ctx.save();

      // Screen Shake
      if (screenShake > 0) {
        const sx = (Math.random() - 0.5) * screenShake;
        const sy = (Math.random() - 0.5) * screenShake;
        ctx.translate(sx, sy);
        screenShake *= 0.88;
        if (screenShake < 0.5) screenShake = 0;
      }

      // Draw background
      drawBackground(ctx);

      // Draw Goals (behind players)
      drawGoal(ctx, 0, groundY - goalH, goalW, goalH, true);
      drawGoal(ctx, W - goalW, groundY - goalH, goalW, goalH, false);

      if (goalCelebration === 0 && !gameOver) {
        // Update
        p1.update();
        if (mode === '1p') {
          updateAI(p2, ball, p1);
        }
        p2.update();
        ball.update();

        resolveCollision(p1, ball);
        resolveCollision(p2, ball);
        resolvePlayerCollision(p1, p2);
        checkGoal();

        // PowerUps
        powerUpTimer++;
        if (powerUpTimer > 480 && !powerUp) { // spawn every ~8 secs
          powerUp = new PowerUp();
          powerUpTimer = 0;
        }

        if (powerUp && powerUp.active) {
          powerUp.update();
          // Check player collection
          [p1, p2].forEach(p => {
            if (!powerUp || !powerUp.active) return;
            if (Math.hypot(p.x - powerUp.x, p.y - powerUp.y) < p.radius + powerUp.radius) {
              powerUp.active = false;
              spawnParticles(powerUp.x, powerUp.y, powerUp.type === 'FIRE' ? '#ff9800' : '#00ffff', 30, 8);

              if (powerUp.type === 'FIRE') {
                p.hasFireKick = true;
                const label = p === p1 ? (mode === '1p' ? 'YOU' : 'P1') : (mode === '1p' ? 'CPU' : 'P2');
                setAnnouncement(`${label} gets FIRE KICK!`);
              } else if (powerUp.type === 'FREEZE') {
                const enemy = p === p1 ? p2 : p1;
                enemy.frozen = 150; // 2.5 seconds at 60fps
                const label = enemy === p1 ? (mode === '1p' ? 'YOU' : 'P1') : (mode === '1p' ? 'CPU' : 'P2');
                setAnnouncement(`${label} FROZEN!`);
              }
              announcementTimer = 120; // clear after 2 seconds
            }
          });
        }

        // Clear announcement after timer
        if (announcementTimer > 0) {
          announcementTimer--;
          if (announcementTimer === 0) {
            setAnnouncement("");
          }
        }
      } else if (!gameOver) {
        // During goal celebration, just run the timer
        checkGoal();
      }

      // Draw powerup
      if (powerUp && powerUp.active) powerUp.draw(ctx);

      // Draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1);
      }

      // Draw game objects
      ball.draw(ctx);
      p1.draw(ctx);
      p2.draw(ctx);

      // Score display
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const scoreBoxW = 180;
      const scoreBoxH = 55;
      const scoreBoxX = W / 2 - scoreBoxW / 2;
      ctx.beginPath();
      ctx.roundRect(scoreBoxX, 10, scoreBoxW, scoreBoxH, 12);
      ctx.fill();

      // P1 color indicator
      ctx.fillStyle = '#e91e63';
      ctx.beginPath();
      ctx.arc(scoreBoxX + 25, 37, 10, 0, Math.PI * 2);
      ctx.fill();

      // P2 color indicator
      ctx.fillStyle = '#2196f3';
      ctx.beginPath();
      ctx.arc(scoreBoxX + scoreBoxW - 25, 37, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${scoreP1}  -  ${scoreP2}`, W / 2, 38);

      // Mode indicator
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(mode === '1p' ? 'VS COMPUTER' : '2 PLAYERS', W / 2, 58);

      // Game Over Overlay
      if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, W, H);

        // Winner text
        ctx.fillStyle = '#ffd740';
        ctx.font = 'bold 52px Inter, sans-serif';
        ctx.textAlign = 'center';
        const winText = scoreP1 >= 5
          ? (mode === '1p' ? "YOU WIN! 🏆" : "PLAYER 1 WINS! 🏆")
          : (mode === '1p' ? "COMPUTER WINS!" : "PLAYER 2 WINS! 🏆");
        ctx.fillText(winText, W / 2, H / 2 - 60);

        // Score
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px Inter, sans-serif';
        ctx.fillText(`${scoreP1} - ${scoreP2}`, W / 2, H / 2);

        // Instructions
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '20px Inter, sans-serif';
        ctx.fillText("Press R or SPACE to play again", W / 2, H / 2 + 50);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText("Press ESC for menu", W / 2, H / 2 + 80);
      }

      ctx.restore();

      animationId = requestAnimationFrame(gameLoop);
    }

    gameLoop();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, canvasRef, setScore, setAnnouncement, onBackToMenu]);

  return (
    <>
      <div className="soccer-hud">
        <div className="soccer-hud-card soccer-hud-left">
          <h3 style={{ color: '#e91e63' }}>{mode === '1p' ? 'YOU' : 'PLAYER 1'}</h3>
          <p><span>W A D</span> Move/Jump</p>
          <p><span>SPACE</span> Kick</p>
        </div>
        <div className="soccer-hud-card soccer-hud-right">
          <h3 style={{ color: '#2196f3' }}>{mode === '1p' ? 'COMPUTER' : 'PLAYER 2'}</h3>
          {mode === '2p' && (
            <>
              <p><span>← ↑ →</span> Move/Jump</p>
              <p><span>ENTER / L</span> Kick</p>
            </>
          )}
          {mode === '1p' && <p style={{ color: '#aaa' }}>🤖 AI Controlled</p>}
        </div>
      </div>

      {announcement && (
        <div className="soccer-announcement">
          <h1>{announcement}</h1>
        </div>
      )}

      <canvas ref={canvasRef} width={1000} height={600} className="soccer-canvas" />
    </>
  );
}
