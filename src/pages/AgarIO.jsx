import React, { useRef, useEffect, useState, useCallback } from 'react';
import BackButton from './BackButton';
import './AgarIO.css';

const W = 4000, H = 4000;
const CW = 900, CH = 600;
const MINI = 120;
const FOOD_COUNT = 600;
const BOT_COUNT = 15;
const BASE_SPEED = 3.5;
const MIN_R = 14;
const COLORS = ['#e53935','#43a047','#1e88e5','#fdd835','#8e24aa','#ff8f00','#00acc1','#d81b60','#7cb342','#5e35b1','#ff6d00','#00897b'];
function rnd(n){ return Math.floor(Math.random()*n); }
function dist(a,b){ return Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2); }
function massToR(mass){ return Math.sqrt(mass)*2.8; }

function makeFood(){
  return { x: rnd(W), y: rnd(H), r: 4+rnd(4), color: COLORS[rnd(COLORS.length)] };
}

function makeBot(id){
  const mass = 40+rnd(80);
  return { id, x: rnd(W), y: rnd(H), mass, r: massToR(mass), color: COLORS[rnd(COLORS.length)], name: ['Bot','Cell','Blob','Orb','Dot','Sphere'][rnd(6)]+id, vx:0, vy:0, targetX: rnd(W), targetY: rnd(H), retargetTimer: 0 };
}

export default function AgarIO(){
  const canvasRef = useRef(null);
  const miniRef = useRef(null);
  const stateRef = useRef(null);
  const mouseRef = useRef({ x: CW/2, y: CH/2 });
  const [started, setStarted] = useState(false);
  const [dead, setDead] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [name, setName] = useState('Player');
  const [score, setScore] = useState(0);

  const initGame = useCallback((playerName) => {
    const food = [];
    for(let i=0;i<FOOD_COUNT;i++) food.push(makeFood());
    const bots = [];
    for(let i=0;i<BOT_COUNT;i++) bots.push(makeBot(i));
    stateRef.current = {
      player: { x: W/2, y: H/2, mass: 50, r: massToR(50), color: COLORS[rnd(COLORS.length)], name: playerName },
      food, bots, camera: { x: W/2, y: H/2, scale: 1 }
    };
    setScore(50);
    setDead(false);
    setStarted(true);
  }, []);

  useEffect(()=>{
    if(!started) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const mini = miniRef.current;
    const mctx = mini.getContext('2d');
    let raf;

    const update = () => {
      const S = stateRef.current;
      if(!S) return;
      const { player, food, bots, camera } = S;

      // Player movement toward mouse
      const mx = mouseRef.current.x, my = mouseRef.current.y;
      const worldMX = (mx - CW/2)/camera.scale + camera.x;
      const worldMY = (my - CH/2)/camera.scale + camera.y;
      const dx = worldMX - player.x, dy = worldMY - player.y;
      const d = Math.sqrt(dx*dx+dy*dy);
      const speed = Math.max(1, BASE_SPEED - player.mass * 0.003);
      if(d > 5){
        player.x += (dx/d)*speed;
        player.y += (dy/d)*speed;
      }
      player.x = Math.max(player.r, Math.min(W-player.r, player.x));
      player.y = Math.max(player.r, Math.min(H-player.r, player.y));
      player.r = massToR(player.mass);

      // Camera
      const targetScale = Math.max(0.3, Math.min(1.2, 50/player.r));
      camera.scale += (targetScale - camera.scale)*0.05;
      camera.x += (player.x - camera.x)*0.1;
      camera.y += (player.y - camera.y)*0.1;

      // Eat food
      for(let i=food.length-1;i>=0;i--){
        if(dist(player, food[i]) < player.r){
          player.mass += 1;
          food[i] = makeFood();
        }
      }

      // Bot AI
      for(const bot of bots){
        bot.retargetTimer--;
        if(bot.retargetTimer<=0){
          // Find nearest food or smaller entity to chase
          let bestTarget = null, bestDist = 800;
          for(const f of food){
            const dd = dist(bot, f);
            if(dd < bestDist){ bestDist=dd; bestTarget=f; }
          }
          // Chase smaller bots or player
          if(bot.mass > player.mass*1.2 && dist(bot,player)<400){
            bestTarget = player;
          }
          for(const other of bots){
            if(other===bot) continue;
            if(bot.mass>other.mass*1.2 && dist(bot,other)<400){
              const dd=dist(bot,other);
              if(!bestTarget||dd<bestDist){ bestDist=dd; bestTarget=other; }
            }
          }
          // Flee from bigger
          if(player.mass>bot.mass*1.2 && dist(bot,player)<300){
            bot.targetX = bot.x + (bot.x-player.x);
            bot.targetY = bot.y + (bot.y-player.y);
          } else if(bestTarget){
            bot.targetX = bestTarget.x;
            bot.targetY = bestTarget.y;
          } else {
            bot.targetX = rnd(W);
            bot.targetY = rnd(H);
          }
          bot.retargetTimer = 20+rnd(40);
        }
        const bdx = bot.targetX-bot.x, bdy = bot.targetY-bot.y;
        const bd = Math.sqrt(bdx*bdx+bdy*bdy);
        const bspeed = Math.max(1, BASE_SPEED - bot.mass*0.003);
        if(bd>5){
          bot.x += (bdx/bd)*bspeed;
          bot.y += (bdy/bd)*bspeed;
        }
        bot.x = Math.max(bot.r, Math.min(W-bot.r, bot.x));
        bot.y = Math.max(bot.r, Math.min(H-bot.r, bot.y));
        bot.r = massToR(bot.mass);

        // Bot eats food
        for(let i=food.length-1;i>=0;i--){
          if(dist(bot, food[i]) < bot.r){
            bot.mass += 1;
            food[i] = makeFood();
          }
        }
      }

      // Bot vs Bot eating
      for(let i=0;i<bots.length;i++){
        for(let j=0;j<bots.length;j++){
          if(i===j) continue;
          if(bots[i].mass > bots[j].mass*1.2 && dist(bots[i],bots[j]) < bots[i].r){
            bots[i].mass += bots[j].mass*0.8;
            Object.assign(bots[j], makeBot(bots[j].id));
          }
        }
      }

      // Player eats bots
      for(let i=0;i<bots.length;i++){
        if(player.mass > bots[i].mass*1.2 && dist(player,bots[i]) < player.r){
          player.mass += bots[i].mass*0.8;
          Object.assign(bots[i], makeBot(bots[i].id));
        }
      }

      // Bots eat player
      for(const bot of bots){
        if(bot.mass > player.mass*1.2 && dist(bot, player) < bot.r){
          setFinalScore(Math.round(player.mass));
          setDead(true);
          setStarted(false);
          return;
        }
      }

      // Decay
      if(player.mass > 60) player.mass *= 0.9998;
      for(const bot of bots) if(bot.mass>60) bot.mass*=0.9998;

      setScore(Math.round(player.mass));

      // ---- DRAW ----
      ctx.clearRect(0,0,CW,CH);
      ctx.save();
      ctx.translate(CW/2, CH/2);
      ctx.scale(camera.scale, camera.scale);
      ctx.translate(-camera.x, -camera.y);

      // Grid
      ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=1;
      const gs=80;
      const sx=Math.floor((camera.x-CW/2/camera.scale)/gs)*gs;
      const sy=Math.floor((camera.y-CH/2/camera.scale)/gs)*gs;
      const ex=camera.x+CW/2/camera.scale+gs;
      const ey=camera.y+CH/2/camera.scale+gs;
      for(let x=sx;x<ex;x+=gs){ ctx.beginPath(); ctx.moveTo(x,sy); ctx.lineTo(x,ey); ctx.stroke(); }
      for(let y=sy;y<ey;y+=gs){ ctx.beginPath(); ctx.moveTo(sx,y); ctx.lineTo(ex,y); ctx.stroke(); }

      // Border
      ctx.strokeStyle='#e53935'; ctx.lineWidth=8;
      ctx.strokeRect(0,0,W,H);

      // Food
      for(const f of food){
        if(f.x<sx-20||f.x>ex+20||f.y<sy-20||f.y>ey+20) continue;
        ctx.beginPath();
        ctx.arc(f.x,f.y,f.r,0,Math.PI*2);
        ctx.fillStyle=f.color;
        ctx.fill();
      }

      // Draw cell helper
      const drawCell=(cell)=>{
        ctx.beginPath();
        ctx.arc(cell.x,cell.y,cell.r,0,Math.PI*2);
        ctx.fillStyle=cell.color;
        ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,.3)';
        ctx.lineWidth=3;
        ctx.stroke();
        // Name
        ctx.fillStyle='#fff';
        ctx.font=`bold ${Math.max(12,cell.r*0.5)}px sans-serif`;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(cell.name, cell.x, cell.y);
        // Mass
        ctx.font=`${Math.max(9,cell.r*0.3)}px sans-serif`;
        ctx.fillStyle='rgba(255,255,255,.7)';
        ctx.fillText(Math.round(cell.mass), cell.x, cell.y+cell.r*0.4);
      };

      for(const bot of bots) drawCell(bot);
      drawCell(player);

      ctx.restore();

      // Minimap
      mctx.fillStyle='#111';
      mctx.fillRect(0,0,MINI,MINI);
      mctx.strokeStyle='#333';
      mctx.strokeRect(0,0,MINI,MINI);
      const ms=MINI/W;
      for(const bot of bots){
        mctx.fillStyle=bot.color;
        mctx.beginPath();
        mctx.arc(bot.x*ms,bot.y*ms,Math.max(2,bot.r*ms),0,Math.PI*2);
        mctx.fill();
      }
      mctx.fillStyle='#fff';
      mctx.beginPath();
      mctx.arc(player.x*ms,player.y*ms,Math.max(3,player.r*ms),0,Math.PI*2);
      mctx.fill();
      // Camera view rect
      mctx.strokeStyle='#80deea';
      mctx.lineWidth=1;
      mctx.strokeRect((camera.x-CW/2/camera.scale)*ms,(camera.y-CH/2/camera.scale)*ms, CW/camera.scale*ms, CH/camera.scale*ms);

      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return ()=>cancelAnimationFrame(raf);
  },[started]);

  useEffect(()=>{
    const handleMouse = (e) => {
      const canvas = canvasRef.current;
      if(!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener('mousemove', handleMouse);
    return ()=>window.removeEventListener('mousemove', handleMouse);
  },[]);

  // Leaderboard
  const leaders = started && stateRef.current ?
    [...stateRef.current.bots, { ...stateRef.current.player, isPlayer: true }]
      .sort((a,b)=>b.mass-a.mass).slice(0,8) : [];

  return (
    <div className="agar-root">
      <BackButton />
      {!started && !dead && (
        <div className="agar-overlay">
          <h2>Agar.io</h2>
          <p>Eat cells smaller than you. Avoid bigger ones!</p>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" maxLength={12} />
          <button onClick={()=>initGame(name||'Player')}>Play</button>
        </div>
      )}
      {dead && (
        <div className="agar-overlay">
          <h2>You were eaten!</h2>
          <p>Final Mass: {finalScore}</p>
          <button onClick={()=>initGame(name||'Player')}>Play Again</button>
        </div>
      )}
      <canvas ref={canvasRef} width={CW} height={CH} />
      <canvas ref={miniRef} className="agar-mini" width={MINI} height={MINI} />
      {started && (
        <>
          <div className="agar-hud">
            <div>Mass: <span>{score}</span></div>
          </div>
          <div className="agar-leader">
            <h3>Leaderboard</h3>
            {leaders.map((l,i)=>(
              <div key={i} className={l.isPlayer?'me':''}>{i+1}. {l.name} — {Math.round(l.mass)}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
