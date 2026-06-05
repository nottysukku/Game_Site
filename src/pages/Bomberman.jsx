import React, { useRef, useEffect, useState, useCallback } from 'react';
import BackButton from './BackButton';
import './Bomberman.css';

const TILE = 40;
const COLS = 17, ROWS = 13;
const W = COLS * TILE, H = ROWS * TILE;
const T = { EMPTY: 0, WALL: 1, BRICK: 2, BOMB: 3, FIRE: 4, PW_BOMB: 5, PW_RANGE: 6, PW_SPEED: 7 };

function buildMap() {
  const map = Array.from({ length: ROWS }, () => new Array(COLS).fill(T.EMPTY));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) map[r][c] = T.WALL;
      else if (r % 2 === 0 && c % 2 === 0) map[r][c] = T.WALL;
      else if (Math.random() < 0.35) {
        // Don't block spawn corners
        if ((r <= 2 && c <= 2) || (r <= 2 && c >= COLS - 3) ||
            (r >= ROWS - 3 && c <= 2) || (r >= ROWS - 3 && c >= COLS - 3)) continue;
        map[r][c] = T.BRICK;
      }
    }
  }
  // Ensure players can spawn
  map[1][1] = T.EMPTY; map[1][2] = T.EMPTY; map[2][1] = T.EMPTY;
  map[ROWS - 2][COLS - 2] = T.EMPTY; map[ROWS - 2][COLS - 3] = T.EMPTY; map[ROWS - 3][COLS - 2] = T.EMPTY;
  return map;
}

export default function Bomberman() {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const stateRef = useRef({});
  const keysRef = useRef({});

  const startGame = useCallback(() => {
    stateRef.current = {
      map: buildMap(),
      player: { r: 1, c: 1, x: 1.5 * TILE, y: 1.5 * TILE, maxBombs: 1, range: 2, speed: 2.5, alive: true, bombsOut: 0 },
      enemies: [
        { r: ROWS - 2, c: COLS - 2, x: (COLS - 1.5) * TILE, y: (ROWS - 1.5) * TILE, vr: 0, vc: -1, speed: 1.2, alive: true, moveTimer: 0 },
        { r: 1, c: COLS - 2, x: (COLS - 1.5) * TILE, y: 1.5 * TILE, vr: 1, vc: 0, speed: 1, alive: true, moveTimer: 0 },
        { r: ROWS - 2, c: 1, x: 1.5 * TILE, y: (ROWS - 1.5) * TILE, vr: 0, vc: 1, speed: 1.1, alive: true, moveTimer: 0 },
      ],
      bombs: [], fires: [], powerups: [],
      score: 0, level: 1, frame: 0
    };
    setScore(0); setLevel(1);
    setPhase('playing');
  }, []);

  useEffect(() => {
    const d = (e) => { keysRef.current[e.key] = true; if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); };
    const u = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', d);
    window.addEventListener('keyup', u);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); };
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    function isSolid(r, c) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
      const t = stateRef.current.map[r][c];
      return t === T.WALL || t === T.BRICK || t === T.BOMB;
    }

    const loop = () => {
      const s = stateRef.current;
      const k = keysRef.current;
      const p = s.player;
      s.frame++;

      if (!p.alive) {
        setPhase('gameover');
        return;
      }

      // Player movement
      let dx = 0, dy = 0;
      if (k['ArrowLeft'] || k['a']) dx -= p.speed;
      if (k['ArrowRight'] || k['d']) dx += p.speed;
      if (k['ArrowUp'] || k['w']) dy -= p.speed;
      if (k['ArrowDown'] || k['s']) dy += p.speed;

      const newX = p.x + dx, newY = p.y + dy;
      const halfSize = TILE * 0.4;

      // X movement
      if (dx !== 0) {
        const testR1 = Math.floor((p.y - halfSize) / TILE);
        const testR2 = Math.floor((p.y + halfSize - 1) / TILE);
        const testC = Math.floor((newX + (dx > 0 ? halfSize : -halfSize)) / TILE);
        if (!isSolid(testR1, testC) && !isSolid(testR2, testC)) p.x = newX;
      }
      if (dy !== 0) {
        const testC1 = Math.floor((p.x - halfSize) / TILE);
        const testC2 = Math.floor((p.x + halfSize - 1) / TILE);
        const testR = Math.floor((p.y + (dy > 0 ? halfSize : -halfSize)) / TILE);
        if (!isSolid(testR, testC1) && !isSolid(testR, testC2)) p.y = newY;
      }

      p.r = Math.floor(p.y / TILE);
      p.c = Math.floor(p.x / TILE);

      // Place bomb
      if ((k[' '] || k['e']) && p.bombsOut < p.maxBombs) {
        const br = p.r, bc = p.c;
        if (!s.bombs.some(b => b.r === br && b.c === bc)) {
          s.bombs.push({ r: br, c: bc, timer: 120, range: p.range });
          s.map[br][bc] = T.BOMB;
          p.bombsOut++;
        }
        k[' '] = false; k['e'] = false;
      }

      // Update bombs
      s.bombs = s.bombs.filter(b => {
        b.timer--;
        if (b.timer <= 0) {
          // Explode
          s.map[b.r][b.c] = T.EMPTY;
          p.bombsOut = Math.max(0, p.bombsOut - 1);
          // Create fire in 4 directions
          s.fires.push({ r: b.r, c: b.c, timer: 25 });
          const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
          for (const [dr, dc] of dirs) {
            for (let i = 1; i <= b.range; i++) {
              const fr = b.r + dr * i, fc = b.c + dc * i;
              if (fr < 0 || fr >= ROWS || fc < 0 || fc >= COLS) break;
              const tile = s.map[fr][fc];
              if (tile === T.WALL) break;
              if (tile === T.BRICK) {
                s.map[fr][fc] = T.EMPTY;
                s.fires.push({ r: fr, c: fc, timer: 25 });
                s.score += 10;
                // Random powerup
                if (Math.random() < 0.3) {
                  const types = [T.PW_BOMB, T.PW_RANGE, T.PW_SPEED];
                  s.powerups.push({ r: fr, c: fc, type: types[Math.floor(Math.random() * types.length)] });
                }
                break;
              }
              s.fires.push({ r: fr, c: fc, timer: 25 });
              // Chain explosion
              if (tile === T.BOMB) {
                const chainBomb = s.bombs.find(ob => ob.r === fr && ob.c === fc);
                if (chainBomb) chainBomb.timer = 1;
              }
            }
          }
          return false;
        }
        return true;
      });

      // Update fires
      s.fires = s.fires.filter(f => {
        f.timer--;
        // Kill player
        if (p.r === f.r && p.c === f.c) p.alive = false;
        // Kill enemies
        for (const e of s.enemies) {
          if (e.alive && Math.floor(e.y / TILE) === f.r && Math.floor(e.x / TILE) === f.c) {
            e.alive = false; s.score += 100;
          }
        }
        return f.timer > 0;
      });

      // Powerups
      s.powerups = s.powerups.filter(pw => {
        if (p.r === pw.r && p.c === pw.c) {
          if (pw.type === T.PW_BOMB) p.maxBombs++;
          if (pw.type === T.PW_RANGE) p.range++;
          if (pw.type === T.PW_SPEED) p.speed = Math.min(4, p.speed + 0.3);
          s.score += 50;
          return false;
        }
        return true;
      });

      // Enemies
      for (const e of s.enemies) {
        if (!e.alive) continue;
        e.moveTimer++;
        if (e.moveTimer > 8) {
          e.moveTimer = 0;
          const er = Math.floor(e.y / TILE), ec = Math.floor(e.x / TILE);
          // Random direction change
          if (Math.random() < 0.15 || isSolid(er + e.vr, ec + e.vc)) {
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            const valid = dirs.filter(([dr, dc]) => !isSolid(er + dr, ec + dc));
            if (valid.length > 0) {
              const [nr, nc] = valid[Math.floor(Math.random() * valid.length)];
              e.vr = nr; e.vc = nc;
            }
          }
        }
        const nex = e.x + e.vc * e.speed;
        const ney = e.y + e.vr * e.speed;
        const nr = Math.floor(ney / TILE), nc = Math.floor(nex / TILE);
        if (!isSolid(nr, nc)) { e.x = nex; e.y = ney; }
        else { e.vr = -e.vr; e.vc = -e.vc; }

        // Kill player on touch
        if (Math.abs(p.x - e.x) < TILE * 0.7 && Math.abs(p.y - e.y) < TILE * 0.7) {
          p.alive = false;
        }
      }

      // Check level complete - all enemies dead
      if (s.enemies.every(e => !e.alive)) {
        s.level++;
        setLevel(s.level);
        s.map = buildMap();
        p.x = 1.5 * TILE; p.y = 1.5 * TILE;
        p.bombsOut = 0;
        s.bombs = []; s.fires = []; s.powerups = [];
        s.enemies = [
          { r: ROWS - 2, c: COLS - 2, x: (COLS - 1.5) * TILE, y: (ROWS - 1.5) * TILE, vr: 0, vc: -1, speed: 1.2 + s.level * 0.1, alive: true, moveTimer: 0 },
          { r: 1, c: COLS - 2, x: (COLS - 1.5) * TILE, y: 1.5 * TILE, vr: 1, vc: 0, speed: 1 + s.level * 0.1, alive: true, moveTimer: 0 },
          { r: ROWS - 2, c: 1, x: 1.5 * TILE, y: (ROWS - 1.5) * TILE, vr: 0, vc: 1, speed: 1.1 + s.level * 0.1, alive: true, moveTimer: 0 },
        ];
      }

      setScore(s.score);

      // ──── DRAW ────
      ctx.fillStyle = '#3a7a3a';
      ctx.fillRect(0, 0, W, H);

      // Tiles
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = s.map[r][c];
          const tx = c * TILE, ty = r * TILE;
          if (t === T.WALL) {
            ctx.fillStyle = '#555';
            ctx.fillRect(tx, ty, TILE, TILE);
            ctx.strokeStyle = '#666';
            ctx.strokeRect(tx, ty, TILE, TILE);
          } else if (t === T.BRICK) {
            ctx.fillStyle = '#b56228';
            ctx.fillRect(tx, ty, TILE, TILE);
            ctx.strokeStyle = '#8a4a1a';
            ctx.strokeRect(tx + 1, ty + 1, TILE - 2, TILE / 2 - 1);
            ctx.strokeRect(tx + TILE / 2, ty + TILE / 2, TILE / 2 - 1, TILE / 2 - 1);
          } else {
            ctx.fillStyle = '#2a5a2a';
            ctx.fillRect(tx, ty, TILE, TILE);
          }
        }
      }

      // Powerups
      for (const pw of s.powerups) {
        const px = pw.c * TILE + TILE / 2, py = pw.r * TILE + TILE / 2;
        ctx.fillStyle = pw.type === T.PW_BOMB ? '#ff6e40' : pw.type === T.PW_RANGE ? '#ffd740' : '#69f0ae';
        ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(pw.type === T.PW_BOMB ? 'B' : pw.type === T.PW_RANGE ? 'R' : 'S', px, py);
      }

      // Bombs
      for (const b of s.bombs) {
        const bx = b.c * TILE + TILE / 2, by = b.r * TILE + TILE / 2;
        const pulse = Math.sin(s.frame * 0.2) * 2;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(bx, by, 14 + pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6e40';
        ctx.beginPath(); ctx.arc(bx, by - 14, 4, 0, Math.PI * 2); ctx.fill();
      }

      // Fires
      for (const f of s.fires) {
        const fx = f.c * TILE, fy = f.r * TILE;
        const alpha = f.timer / 25;
        ctx.fillStyle = `rgba(255, 110, 64, ${alpha})`;
        ctx.fillRect(fx + 2, fy + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = `rgba(255, 215, 64, ${alpha * 0.7})`;
        ctx.fillRect(fx + 6, fy + 6, TILE - 12, TILE - 12);
      }

      // Enemies
      for (const e of s.enemies) {
        if (!e.alive) continue;
        ctx.fillStyle = '#ce93d8';
        ctx.beginPath(); ctx.arc(e.x, e.y, TILE * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(e.x - 5, e.y - 4, 4, 4);
        ctx.fillRect(e.x + 1, e.y - 4, 4, 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x - 4, e.y - 3, 2, 2);
        ctx.fillRect(e.x + 2, e.y - 3, 2, 2);
      }

      // Player
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, TILE * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd740';
      ctx.beginPath(); ctx.arc(p.x, p.y - TILE * 0.1, TILE * 0.2, Math.PI, 0); ctx.fill(); // hat
      ctx.fillStyle = '#000';
      ctx.fillRect(p.x - 4, p.y - 2, 3, 3);
      ctx.fillRect(p.x + 2, p.y - 2, 3, 3);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  return (
    <div className="bomber-root">
      <canvas ref={canvasRef} width={W} height={H} />
      <div className="bomber-hud">
        <div>Score: <span>{score}</span></div>
        <div>Level: <span>{level}</span></div>
      </div>
      {phase === 'menu' && (
        <div className="bomber-overlay">
          <h2>💣 Bomberman</h2>
          <p>Place bombs, destroy walls, defeat enemies!</p>
          <button onClick={startGame}>Start Game</button>
          <p style={{ fontSize: '.85rem', color: '#666' }}>Arrows/WASD: Move · Space/E: Bomb</p>
        </div>
      )}
      {phase === 'gameover' && (
        <div className="bomber-overlay">
          <h2>💥 Game Over</h2>
          <p>Score: {score} · Level: {level}</p>
          <button onClick={startGame}>Try Again</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
