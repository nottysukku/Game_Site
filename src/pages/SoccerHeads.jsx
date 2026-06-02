import React, { useEffect, useRef, useState } from 'react';
import './SoccerHeads.css';
import BackButton from './BackButton';

export default function SoccerHeads() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let gameOver = false;
    let scoreP1 = 0;
    let scoreP2 = 0;

    const keys = {};
    window.addEventListener('keydown', (e) => {
      if (gameOver) {
        if (e.code === 'KeyR' || e.code === 'Space' || e.code === 'Enter') {
          gameOver = false;
          scoreP1 = 0;
          scoreP2 = 0;
          setScore({ p1: 0, p2: 0 });
          resetPositions();
        }
        return;
      }
      keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });

    // Physics constants
    const GRAVITY = 0.6;
    const FRICTION = 0.95;
    const RESTITUTION = 0.7; // bounciness

    const groundY = 550;
    const goalW = 100;
    const goalH = 180;

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
        this.x = x;
        this.y = groundY - 50;
        this.radius = 45;
        this.color = color;
        this.vx = 0;
        this.vy = 0;
        this.speed = 7;
        this.jumpPower = -14;
        this.jumps = 0;
        this.isPlayer2 = isPlayer2;
        
        // Kick mechanics
        this.kicking = false;
        this.kickTimer = 0;
        this.shoeAngle = 0;

        // Status
        this.frozen = 0;
        this.hasFireKick = false;
        
        // Visuals
        this.squish = 1;
        this.squishVy = 0;
      }

      update() {
        // Squish physics (spring logic)
        this.squishVy += (1 - this.squish) * 0.1;
        this.squishVy *= 0.8;
        this.squish += this.squishVy;

        if (this.frozen > 0) {
          this.frozen--;
          this.vx = 0;
          if (Math.random() < 0.1) {
            spawnParticles(this.x, this.y, '#00ffff', 1, 2);
          }
        } else {
          // Movement
          let moving = false;
          if (!this.isPlayer2) {
            if (keys['KeyA']) { this.vx -= 1.5; moving = true; }
            if (keys['KeyD']) { this.vx += 1.5; moving = true; }
            
            if (keys['KeyW']) {
              if (this.jumps < 2 && !this.jumpKeyWasDown) {
                this.vy = this.jumpPower;
                this.jumps++;
                this.squish = 1.3; // stretch on jump
                spawnParticles(this.x, groundY, '#ccc', 5, 3);
              }
              this.jumpKeyWasDown = true;
            } else {
              this.jumpKeyWasDown = false;
            }

            if (keys['Space'] && !this.kicking) {
              this.kicking = true;
              this.kickTimer = 20;
            }
          } else {
            if (keys['ArrowLeft']) { this.vx -= 1.5; moving = true; }
            if (keys['ArrowRight']) { this.vx += 1.5; moving = true; }
            
            if (keys['ArrowUp']) {
              if (this.jumps < 2 && !this.jumpKeyWasDown) {
                this.vy = this.jumpPower;
                this.jumps++;
                this.squish = 1.3;
                spawnParticles(this.x, groundY, '#ccc', 5, 3);
              }
              this.jumpKeyWasDown = true;
            } else {
              this.jumpKeyWasDown = false;
            }

            if ((keys['Enter'] || keys['ShiftRight'] || keys['KeyL']) && !this.kicking) {
              this.kicking = true;
              this.kickTimer = 20;
            }
          }

          // Friction & Limits
          if (!moving) this.vx *= 0.8;
          if (this.vx > this.speed) this.vx = this.speed;
          if (this.vx < -this.speed) this.vx = -this.speed;
        }

        // Apply physics
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        // Ground collision
        if (this.y + this.radius > groundY) {
          if (this.vy > 5) this.squish = 0.7; // land squish
          this.y = groundY - this.radius;
          this.vy = 0;
          this.jumps = 0;
        }

        // Boundaries (don't go into goals)
        if (this.x - this.radius < goalW && this.y > groundY - goalH) {
           this.x = goalW + this.radius;
           this.vx = 0;
        }
        if (this.x + this.radius > canvas.width - goalW && this.y > groundY - goalH) {
           this.x = canvas.width - goalW - this.radius;
           this.vx = 0;
        }
        if (this.x - this.radius < 0) this.x = this.radius;
        if (this.x + this.radius > canvas.width) this.x = canvas.width - this.radius;

        // Kick logic
        if (this.kicking) {
          this.kickTimer--;
          // Animate shoe angle
          const progress = 1 - (this.kickTimer / 20);
          this.shoeAngle = Math.sin(progress * Math.PI) * (this.isPlayer2 ? -1.5 : 1.5);
          if (this.kickTimer <= 0) {
            this.kicking = false;
            this.shoeAngle = 0;
          }
        }
      }

      draw(ctx) {
        if (this.frozen > 0) {
          // Ice block
          ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
          ctx.fillRect(this.x - this.radius - 10, this.y - this.radius - 10, this.radius*2 + 20, this.radius*2 + 20);
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(1 / this.squish, this.squish);

        // Head (Circle with outline)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        ctx.stroke();

        // Face & Hair
        ctx.fillStyle = '#000';
        // Eye
        const eyeOffsetX = this.isPlayer2 ? -18 : 18;
        ctx.beginPath();
        ctx.arc(eyeOffsetX, -10, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(eyeOffsetX + (this.isPlayer2 ? -4 : 4), -10, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
        
        // Mouth
        ctx.beginPath();
        if (this.kicking) {
          ctx.arc(eyeOffsetX, 15, 8, 0, Math.PI);
        } else {
          ctx.arc(eyeOffsetX, 15, 5, 0, Math.PI);
        }
        ctx.stroke();

        ctx.restore();

        // Shoe
        ctx.save();
        const shoeBaseX = this.x + (this.isPlayer2 ? -10 : 10);
        const shoeBaseY = this.y + this.radius - 5;
        ctx.translate(shoeBaseX, shoeBaseY);
        ctx.rotate(this.shoeAngle);
        
        ctx.fillStyle = this.hasFireKick ? '#ff3300' : '#444';
        if (this.hasFireKick && Math.random() < 0.3) {
           spawnParticles(shoeBaseX, shoeBaseY, '#ff9800', 1, 2);
        }

        ctx.beginPath();
        // Draw a boot shape
        if (this.isPlayer2) {
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
        this.reset();
        this.radius = 22;
        this.rotation = 0;
      }
      reset() {
        this.x = canvas.width / 2;
        this.y = 200;
        this.vx = 0;
        this.vy = 0;
        this.fire = false;
        this.rotation = 0;
      }
      update() {
        this.vy += GRAVITY * 0.8; 
        this.vx *= FRICTION;
        this.vy *= FRICTION;

        this.x += this.vx;
        this.y += this.vy;

        this.rotation += this.vx * 0.05;

        if (this.fire) {
          spawnParticles(this.x, this.y, '#ff5252', 2, 5);
        }

        // Ground collision
        if (this.y + this.radius > groundY) {
          this.y = groundY - this.radius;
          this.vy *= -RESTITUTION;
          this.vx *= 0.98;
          if (this.fire && Math.abs(this.vy) < 2) this.fire = false; 
        }

        // Walls
        if (this.x - this.radius < 0) {
          this.x = this.radius;
          this.vx *= -RESTITUTION;
        }
        if (this.x + this.radius > canvas.width) {
          this.x = canvas.width - this.radius;
          this.vx *= -RESTITUTION;
        }
        // Top
        if (this.y - this.radius < 0) {
          this.y = this.radius;
          this.vy *= -RESTITUTION;
        }

        // Goal Posts Physics (Top bar)
        // Left Goal Post
        if (this.x < goalW && this.y > groundY - goalH && this.y < groundY - goalH + 20) {
           if (this.vy > 0) {
             this.y = groundY - goalH - this.radius;
             this.vy *= -RESTITUTION;
           }
        }
        // Right Goal Post
        if (this.x > canvas.width - goalW && this.y > groundY - goalH && this.y < groundY - goalH + 20) {
           if (this.vy > 0) {
             this.y = groundY - goalH - this.radius;
             this.vy *= -RESTITUTION;
           }
        }
      }
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.stroke();
        
        // Soccer ball pattern
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 5; i++) {
          let angle = (i * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.moveTo(0,0);
          ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    class PowerUp {
      constructor() {
        this.x = 200 + Math.random() * (canvas.width - 400);
        this.y = groundY - 50 - Math.random() * 200;
        this.radius = 20;
        this.type = Math.random() > 0.5 ? 'FIRE' : 'FREEZE';
        this.active = true;
        this.floatOffset = 0;
      }
      draw(ctx) {
        if (!this.active) return;
        this.floatOffset += 0.1;
        const yPos = this.y + Math.sin(this.floatOffset) * 10;
        
        ctx.shadowColor = this.type === 'FIRE' ? '#ff9800' : '#00bcd4';
        ctx.shadowBlur = 15;
        
        ctx.fillStyle = this.type === 'FIRE' ? '#ff9800' : '#00bcd4';
        ctx.beginPath();
        // Hexagon shape
        for(let i=0; i<6; i++) {
           const a = i * Math.PI / 3;
           if(i===0) ctx.moveTo(this.x + this.radius * Math.cos(a), yPos + this.radius * Math.sin(a));
           else ctx.lineTo(this.x + this.radius * Math.cos(a), yPos + this.radius * Math.sin(a));
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type === 'FIRE' ? '🔥' : '❄️', this.x, yPos);
      }
    }

    const p1 = new Player(200, '#e91e63', false);
    const p2 = new Player(canvas.width - 200, '#2196f3', true);
    const ball = new Ball();
    
    scoreP1 = 0;
    scoreP2 = 0;
    let powerUp = null;
    let powerUpTimer = 0;
    let goalCelebration = 0;

    // Circle collision
    function resolveCollision(p, b) {
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const dist = Math.hypot(dx, dy);
      const minDist = p.radius + b.radius;

      if (dist < minDist) {
        // Resolve penetration
        const angle = Math.atan2(dy, dx);
        const overlap = minDist - dist;
        b.x += Math.cos(angle) * overlap;
        b.y += Math.sin(angle) * overlap;

        // Relative velocity
        const rvx = b.vx - p.vx;
        const rvy = b.vy - p.vy;
        const velAlongNormal = rvx * Math.cos(angle) + rvy * Math.sin(angle);
        
        if (velAlongNormal > 0) return; // Moving apart

        const e = RESTITUTION;
        const j = -(1 + e) * velAlongNormal;
        
        // Apply impulse
        b.vx += j * Math.cos(angle);
        b.vy += j * Math.sin(angle);
        
        p.squish = 0.8;
      }

      // Kick collision (shoe hitbox)
      if (p.kicking && p.kickTimer > 10) {
        const kickDir = p.isPlayer2 ? -1 : 1;
        const kickZoneX = p.x + kickDir * (p.radius + 15);
        const kickZoneY = p.y + p.radius - 10;
        const kickDist = Math.hypot(b.x - kickZoneX, b.y - kickZoneY);
        
        if (kickDist < b.radius + 30) {
          let power = p.hasFireKick ? 30 : 18;
          b.vx = kickDir * power;
          b.vy = -power * 0.6;
          
          spawnParticles(b.x, b.y, '#fff', 15, 10);
          screenShake = p.hasFireKick ? 15 : 5;

          if (p.hasFireKick) {
             b.fire = true;
             p.hasFireKick = false;
          }
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
            setAnnouncement(scoreP1 >= 5 ? "PLAYER 1 WINS!" : "PLAYER 2 WINS!");
          } else {
            resetPositions();
          }
        }
        return;
      }

      // Ball fully inside goal logic
      if (ball.x < goalW && ball.y > groundY - goalH + 20) {
        scoreP2++;
        setScore({ p1: scoreP1, p2: scoreP2 });
        triggerGoal("PLAYER 2 SCORES!");
      }
      else if (ball.x > canvas.width - goalW && ball.y > groundY - goalH + 20) {
        scoreP1++;
        setScore({ p1: scoreP1, p2: scoreP2 });
        triggerGoal("PLAYER 1 SCORES!");
      }
    }

    function triggerGoal(text) {
      setAnnouncement(text);
      goalCelebration = 120; // 2 seconds
      screenShake = 20;
      spawnParticles(ball.x, ball.y, '#ffd740', 100, 20);
    }

    function resetPositions() {
      p1.x = 200; p1.y = groundY - p1.radius; p1.vx = 0; p1.vy = 0; p1.frozen = 0; p1.hasFireKick = false;
      p2.x = canvas.width - 200; p2.y = groundY - p2.radius; p2.vx = 0; p2.vy = 0; p2.frozen = 0; p2.hasFireKick = false;
      ball.reset();
      powerUp = null;
      setAnnouncement("");
    }

    function drawGoal(ctx, x, y, width, height, isLeft) {
      // Net pattern
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < width; i += 10) {
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i, y + height);
      }
      for (let j = 0; j < height; j += 10) {
        ctx.moveTo(x, y + j);
        ctx.lineTo(x + width, y + j);
      }
      ctx.stroke();

      // Posts
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 8;
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

    function gameLoop() {
      ctx.save();
      
      // Screen Shake
      if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
      }

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#1a2a6c');
      grad.addColorStop(0.5, '#b21f1f');
      grad.addColorStop(1, '#fdbb2d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stadium elements (simple oval crowd)
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(canvas.width/2, groundY - 150, canvas.width/1.2, 100, 0, Math.PI, 0);
      ctx.fill();

      // Draw Grass
      const grassGrad = ctx.createLinearGradient(0, groundY, 0, canvas.height);
      grassGrad.addColorStop(0, '#2e7d32');
      grassGrad.addColorStop(1, '#1b5e20');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
      
      // Pitch lines
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(canvas.width/2, groundY);
      ctx.lineTo(canvas.width/2, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(canvas.width/2, groundY + 25, 40, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Goals
      drawGoal(ctx, 0, groundY - goalH, goalW, goalH, true);
      drawGoal(ctx, canvas.width - goalW, groundY - goalH, goalW, goalH, false);

      if (goalCelebration === 0 && !gameOver) {
        p1.update();
        p2.update();
        ball.update();

        resolveCollision(p1, ball);
        resolveCollision(p2, ball);
        checkGoal();

        // PowerUps
        powerUpTimer++;
        if (powerUpTimer > 600 && !powerUp) { // spawn every 10 secs
          powerUp = new PowerUp();
          powerUpTimer = 0;
        }

        if (powerUp && powerUp.active) {
          // Check player collection
          [p1, p2].forEach(p => {
            if (Math.hypot(p.x - powerUp.x, p.y - powerUp.y) < p.radius + powerUp.radius) {
              powerUp.active = false;
              spawnParticles(powerUp.x, powerUp.y, powerUp.type === 'FIRE' ? '#ff9800' : '#00ffff', 30, 8);
              
              if (powerUp.type === 'FIRE') {
                p.hasFireKick = true;
                setAnnouncement(`P${p === p1 ? '1' : '2'} gets FIRE KICK!`);
              } else if (powerUp.type === 'FREEZE') {
                const enemy = p === p1 ? p2 : p1;
                enemy.frozen = 180; // 3 seconds at 60fps
                setAnnouncement(`P${p === p1 ? '2' : '1'} FROZEN!`);
              }
              setTimeout(() => { if(announcement.includes("gets") || announcement.includes("FROZEN")) setAnnouncement("") }, 2000);
            }
          });
        }
      } else {
        // Run goal check decrement logic even during goal celebration freezes
        checkGoal();
      }

      if (powerUp && powerUp.active) powerUp.draw(ctx);

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1);
      }

      p1.draw(ctx);
      p2.draw(ctx);
      ball.draw(ctx);

      // Scores Overlay
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(canvas.width/2 - 100, 10, 200, 60);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${scoreP1} - ${scoreP2}`, canvas.width/2, 40);

      // Game Over Overlay
      if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffd740';
        ctx.font = 'bold 54px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(scoreP1 >= 5 ? "PLAYER 1 WINS!" : "PLAYER 2 WINS!", canvas.width / 2, canvas.height / 2 - 55);

        ctx.fillStyle = '#ffffff';
        ctx.font = '22px Inter';
        ctx.fillText("PRESS 'R' OR SPACE TO PLAY AGAIN", canvas.width / 2, canvas.height / 2 + 25);
      }

      ctx.restore();

      animationId = requestAnimationFrame(gameLoop);
    }

    gameLoop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="soccer-container relative">
      <BackButton />
      
      <div className="absolute top-4 left-4 right-4 flex justify-between px-10 pointer-events-none">
        <div className="text-white bg-black/50 p-4 rounded-xl backdrop-blur-sm border border-white/20">
          <h3 className="font-bold text-pink-500 mb-2">PLAYER 1</h3>
          <p className="text-sm">W A D - Move/Jump</p>
          <p className="text-sm">SPACE - Kick</p>
        </div>
        <div className="text-white bg-black/50 p-4 rounded-xl backdrop-blur-sm border border-white/20 text-right">
          <h3 className="font-bold text-blue-400 mb-2">PLAYER 2</h3>
          <p className="text-sm">Arrows - Move/Jump</p>
          <p className="text-sm">ENTER / L - Kick</p>
        </div>
      </div>

      {announcement && (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 text-center pointer-events-none z-50 animate-bounce">
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] uppercase italic tracking-wider">
            {announcement}
          </h1>
        </div>
      )}

      <canvas ref={canvasRef} width={1000} height={600} className="soccer-canvas mt-20" />
    </div>
  );
}
