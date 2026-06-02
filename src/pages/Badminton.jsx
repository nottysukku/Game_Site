import React, { useEffect, useRef, useState } from 'react';
import './Badminton.css';
import BackButton from './BackButton';

export default function Badminton() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const keys = {};
    window.addEventListener('keydown', (e) => { keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });

    // Physics
    const GRAVITY = 0.5;
    const groundY = 550;
    const net = { x: 500, y: 350, w: 10, h: 200 };

    let particles = [];
    let screenShake = 0;

    class Particle {
      constructor(x, y, color, speed, life) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed * Math.random();
        this.vy = Math.sin(angle) * speed * Math.random();
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 3 + 1;
      }
      update() {
        this.vy += GRAVITY * 0.2;
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

    function spawnParticles(x, y, color, count, speed) {
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color, speed, 20 + Math.random() * 20));
      }
    }

    class Stickman {
      constructor(x, color, isPlayer2) {
        this.x = x;
        this.y = groundY;
        this.color = color;
        this.vx = 0;
        this.vy = 0;
        this.speed = 8;
        this.jumpPower = -15;
        this.isPlayer2 = isPlayer2;
        
        // Animation states
        this.legAngle = 0;
        this.walkCycle = 0;
        this.armAngle = isPlayer2 ? Math.PI : 0;
        this.swinging = false;
        this.swingTimer = 0;
        this.swingType = 'upstroke'; // 'upstroke' | 'downstroke'
      }

      update() {
        let moving = false;
        if (!this.isPlayer2) {
          if (keys['KeyA']) { this.vx = -this.speed; moving = true; }
          else if (keys['KeyD']) { this.vx = this.speed; moving = true; }
          else this.vx = 0;

          if (keys['KeyW'] && this.y >= groundY) {
            this.vy = this.jumpPower;
          }
          if (keys['Space'] && !this.swinging) {
            this.swinging = true;
            this.swingTimer = 20;
            this.swingType = 'upstroke';
          }
          if ((keys['KeyS'] || keys['ShiftLeft']) && !this.swinging) {
            this.swinging = true;
            this.swingTimer = 20;
            this.swingType = 'downstroke';
          }
        } else {
          if (keys['ArrowLeft']) { this.vx = -this.speed; moving = true; }
          else if (keys['ArrowRight']) { this.vx = this.speed; moving = true; }
          else this.vx = 0;

          if (keys['ArrowUp'] && this.y >= groundY) {
            this.vy = this.jumpPower;
          }
          if ((keys['Enter'] || keys['ShiftRight'] || keys['KeyL']) && !this.swinging) {
            this.swinging = true;
            this.swingTimer = 20;
            this.swingType = 'upstroke';
          }
          if ((keys['ArrowDown'] || keys['KeyK']) && !this.swinging) {
            this.swinging = true;
            this.swingTimer = 20;
            this.swingType = 'downstroke';
          }
        }

        // Apply physics
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        // Ground collision
        if (this.y > groundY) {
          this.y = groundY;
          this.vy = 0;
        }

        // Net and wall collision
        if (!this.isPlayer2) {
          if (this.x < 20) this.x = 20;
          if (this.x > net.x - 40) this.x = net.x - 40;
        } else {
          if (this.x < net.x + 40 + net.w) this.x = net.x + 40 + net.w;
          if (this.x > canvas.width - 20) this.x = canvas.width - 20;
        }

        // Animation logic
        if (moving && this.y === groundY) {
          this.walkCycle += 0.2;
          this.legAngle = Math.sin(this.walkCycle) * 0.8;
        } else if (this.y < groundY) {
          this.legAngle = 0.5; // jumping pose
        } else {
          this.legAngle = 0; // standing
          this.walkCycle = 0;
        }

        // Arm Swing
        if (this.swinging) {
          this.swingTimer--;
          const progress = 1 - (this.swingTimer / 20);
          
          if (this.swingType === 'upstroke') {
            if (!this.isPlayer2) {
              // swing from PI/4 to -PI
              this.armAngle = Math.PI/4 - progress * Math.PI * 1.5;
            } else {
              // swing from PI*3/4 to 2PI
              this.armAngle = Math.PI*3/4 + progress * Math.PI * 1.5;
            }
          } else {
            // DOWNSTROKE / SMASH SWING
            if (!this.isPlayer2) {
              // starts high behind, swings forward and down
              this.armAngle = -Math.PI * 0.5 + progress * Math.PI * 1.25;
            } else {
              // starts high behind, swings forward and down
              this.armAngle = Math.PI * 1.5 - progress * Math.PI * 1.25;
            }
          }

          if (this.swingTimer <= 0) {
            this.swinging = false;
          }
        } else {
          this.armAngle = this.isPlayer2 ? Math.PI*3/4 : Math.PI/4;
        }
      }

      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y - 100);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Head
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, -20, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eye headband
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.fillRect(-20, -25, 40, 8);
        ctx.fillStyle = '#000';
        const eyeX = this.isPlayer2 ? -10 : 10;
        ctx.beginPath();
        ctx.arc(eyeX, -21, 3, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 50);
        ctx.stroke();

        // Legs
        ctx.beginPath();
        ctx.moveTo(0, 50);
        ctx.lineTo(Math.sin(this.legAngle)*30, 50 + Math.cos(this.legAngle)*50);
        ctx.moveTo(0, 50);
        ctx.lineTo(Math.sin(-this.legAngle)*30, 50 + Math.cos(-this.legAngle)*50);
        ctx.stroke();

        // Off arm
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(this.isPlayer2 ? 15 : -15, 40);
        ctx.stroke();

        // Racket Arm & Racket
        ctx.save();
        ctx.translate(0, 10);
        ctx.rotate(this.armAngle);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -35); // arm length
        ctx.stroke();

        // Racket
        ctx.translate(0, -35);
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -30); // handle
        ctx.stroke();
        
        ctx.translate(0, -45); // center of racket head
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 20, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Strings
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ccc';
        ctx.beginPath();
        for(let i=-8; i<=8; i+=4) {
          ctx.moveTo(i, -18); ctx.lineTo(i, 18);
          ctx.moveTo(-10, i*2); ctx.lineTo(10, i*2);
        }
        ctx.stroke();
        
        ctx.restore(); // end racket arm
        ctx.restore(); // end player
      }

      getRacketWorldPos() {
        const ax = this.x;
        const ay = this.y - 90; // shoulder
        const armLength = 35;
        const racketHandle = 30;
        const racketCenter = 15;
        const totalLen = armLength + racketHandle + racketCenter;
        
        const angle = this.armAngle - Math.PI/2; 
        
        return {
          x: ax + Math.cos(angle) * totalLen,
          y: ay + Math.sin(angle) * totalLen
        };
      }
    }

    class Shuttlecock {
      constructor() {
        this.radius = 8;
        this.reset(1);
      }
      
      reset(server) {
        this.vx = 0;
        this.vy = 0;
        this.server = server;
        this.isServed = false;
        this.active = true;
        this.rotation = server === 1 ? 0 : Math.PI;
      }

      update() {
        if (!this.active) return;
        
        if (!this.isServed) {
          // Shuttlecock is held by the server's hand prior to serve
          if (this.server === 1) {
            this.x = p1.x + 25;
            this.y = p1.y - 100;
            this.rotation = -Math.PI / 6; // tilted in hand
          } else {
            this.x = p2.x - 25;
            this.y = p2.y - 100;
            this.rotation = Math.PI + Math.PI / 6;
          }
          return;
        }
        
        // Gravity
        this.vy += GRAVITY * 0.6; 
        
        // Aerodynamic drag (shuttlecock has high drag)
        const speed = Math.hypot(this.vx, this.vy);
        const drag = 0.008 * speed * speed;
        
        if (speed > 0) {
          this.vx -= (this.vx / speed) * drag;
          this.vy -= (this.vy / speed) * drag;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Rotation points to velocity
        this.rotation = Math.atan2(this.vy, this.vx);

        // Collision with walls
        if (this.x < 0 || this.x > canvas.width) {
          this.vx *= -0.5;
        }

        // Collision with net
        if (this.x > net.x - this.radius && this.x < net.x + net.w + this.radius &&
            this.y > net.y) {
          this.vx *= -0.5;
          if (this.y < net.y + 10) this.vy *= -0.5;
        }

        // Hit ground -> point
        if (this.y > groundY) {
          this.active = false;
          let text = "";
          if (this.x < net.x) {
            scoreP2++;
            setScore({ p1: scoreP1, p2: scoreP2 });
            text = "POINT P2!";
            setTimeout(() => this.reset(2), 2000);
          } else {
            scoreP1++;
            setScore({ p1: scoreP1, p2: scoreP2 });
            text = "POINT P1!";
            setTimeout(() => this.reset(1), 2000);
          }
          setAnnouncement(text);
          screenShake = 10;
          spawnParticles(this.x, groundY, '#ccc', 20, 5);
          setTimeout(() => setAnnouncement(""), 1500);
        }
      }

      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Cork
        ctx.fillStyle = '#f5f5dc'; // beige
        ctx.beginPath();
        ctx.arc(8, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Feathers (triangle cone)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-15, -12);
        ctx.lineTo(-15, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ribs
        ctx.beginPath();
        ctx.moveTo(0, -6); ctx.lineTo(-10, -10);
        ctx.moveTo(0, 6); ctx.lineTo(-10, 10);
        ctx.moveTo(4, 0); ctx.lineTo(-12, 0);
        ctx.stroke();

        ctx.restore();
      }
    }

    const p1 = new Stickman(150, '#ff5252', false);
    const p2 = new Stickman(850, '#448aff', true);
    const birdie = new Shuttlecock();
    
    let scoreP1 = 0;
    let scoreP2 = 0;
    function checkRacketCollision(player, birdie) {
      if (player.swinging && birdie.active) {
        // If the birdie is not served, only the server can strike it
        if (!birdie.isServed && birdie.server === 1 && player.isPlayer2) return;
        if (!birdie.isServed && birdie.server === 2 && !player.isPlayer2) return;

        const racketPos = player.getRacketWorldPos();
        let shouldHit = false;
        let isServeLaunch = false;

        if (!birdie.isServed) {
          // Instant serve launch on swing!
          if (player.swingTimer > 10 && player.swingTimer < 20) {
            shouldHit = true;
            isServeLaunch = true;
          }
        } else {
          // Normal gameplay collision
          const dist = Math.hypot(birdie.x - racketPos.x, birdie.y - racketPos.y);
          if (dist < 65 && player.swingTimer > 10 && player.swingTimer < 19) {
            shouldHit = true;
          }
        }

        if (shouldHit) {
          birdie.isServed = true;
          
          let bx = 0;
          let by = 0;
          const isSmash = player.swingType === 'downstroke';

          if (isServeLaunch) {
            // Perfect serve arch
            bx = player.isPlayer2 ? -15 : 15;
            by = -14;
            spawnParticles(birdie.x, birdie.y, '#fff', 12, 4);
          } else {
            const hitAngle = Math.atan2(birdie.y - racketPos.y, birdie.x - racketPos.x);
            let power = isSmash ? 32 : 22;

            bx = Math.cos(hitAngle) * power + player.vx * 0.5;
            by = Math.sin(hitAngle) * power;

            if (isSmash) {
               bx = player.isPlayer2 ? -28 : 28;
               by = 16; // smash down hard
               screenShake = 22;
               spawnParticles(racketPos.x, racketPos.y, '#ffd166', 30, 8);
               setAnnouncement("SMASH!");
               setTimeout(() => { if (announcement === "SMASH!") setAnnouncement("") }, 1000);
            } else {
               by = -14;
               if (player.isPlayer2) {
                 if (bx > -5) bx = -15;
               } else {
                 if (bx < 5) bx = 15;
               }
            }
            spawnParticles(racketPos.x, racketPos.y, '#fff', 10, 5);
          }

          birdie.vx = bx;
          birdie.vy = by;

          player.swingTimer = 5; // prevent multi hits
        }
      }
    }

    function drawCourt(ctx) {
      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
      skyGrad.addColorStop(0, '#87CEEB');
      skyGrad.addColorStop(1, '#e0f6ff');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, groundY);

      // Clouds (simple)
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(200, 100, 40, 0, Math.PI*2);
      ctx.arc(240, 100, 50, 0, Math.PI*2);
      ctx.arc(280, 100, 40, 0, Math.PI*2);
      ctx.fill();

      // Floor
      const floorGrad = ctx.createLinearGradient(0, groundY, 0, canvas.height);
      floorGrad.addColorStop(0, '#388e3c');
      floorGrad.addColorStop(1, '#1b5e20');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

      // Court Lines
      ctx.fillStyle = '#fff';
      // Center line under net
      ctx.fillRect(net.x - 2, groundY, 4, canvas.height - groundY);
      // Service lines (perspective faked)
      ctx.beginPath();
      ctx.moveTo(100, groundY); ctx.lineTo(50, canvas.height);
      ctx.moveTo(900, groundY); ctx.lineTo(950, canvas.height);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw Net Posts
      ctx.fillStyle = '#333';
      ctx.fillRect(net.x - 5, net.y, 10, groundY - net.y);
      
      // Draw Net Mesh
      ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
      ctx.fillRect(net.x - 5, net.y, 10, net.h);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let i=0; i<=net.h; i+=10) {
        ctx.moveTo(net.x - 5, net.y + i);
        ctx.lineTo(net.x + 5, net.y + i);
      }
      for(let i=-5; i<=5; i+=5) {
        ctx.moveTo(net.x + i, net.y);
        ctx.lineTo(net.x + i, net.y + net.h);
      }
      ctx.stroke();
    }

    function gameLoop() {
      ctx.save();
      
      if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
      }

      drawCourt(ctx);

      p1.update();
      p2.update();
      birdie.update();

      checkRacketCollision(p1, birdie);
      checkRacketCollision(p2, birdie);

      // Draw players and birdie behind particles
      p1.draw(ctx);
      p2.draw(ctx);
      birdie.draw(ctx);

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1);
      }

      // Scores
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(canvas.width/2 - 120, 10, 240, 60);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${scoreP1} - ${scoreP2}`, canvas.width/2, 40);

      ctx.restore();

      animationId = requestAnimationFrame(gameLoop);
    }

    gameLoop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="badminton-container relative">
      <BackButton />

      <div className="absolute top-4 left-4 right-4 flex justify-between px-10 pointer-events-none">
        <div className="text-white bg-black/50 p-4 rounded-xl backdrop-blur-sm border border-white/20">
          <h3 className="font-bold text-red-400 mb-2">PLAYER 1</h3>
          <p className="text-sm">A D - Move | W - Jump</p>
          <p className="text-sm">SPACE - Upstroke Swing</p>
          <p className="text-sm">S / L-SHIFT - Smash Downstroke</p>
        </div>
        <div className="text-white bg-black/50 p-4 rounded-xl backdrop-blur-sm border border-white/20 text-right">
          <h3 className="font-bold text-blue-400 mb-2">PLAYER 2</h3>
          <p className="text-sm">← → - Move | ↑ - Jump</p>
          <p className="text-sm">ENTER / L - Upstroke Swing</p>
          <p className="text-sm">↓ / K - Smash Downstroke</p>
        </div>
      </div>

      {announcement && (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 text-center pointer-events-none z-50 animate-bounce">
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] uppercase italic tracking-wider">
            {announcement}
          </h1>
        </div>
      )}

      <canvas ref={canvasRef} width={1000} height={600} className="badminton-canvas mt-20" />
    </div>
  );
}
