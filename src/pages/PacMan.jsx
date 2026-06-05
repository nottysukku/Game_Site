import React, { useRef, useEffect, useState, useCallback } from 'react';
import BackButton from './BackButton';
import './PacMan.css';

const TILE = 24;
const MAZE_DEF = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '     #.##### ## #####.#     ',
  '     #.##          ##.#     ',
  '     #.## ###--### ##.#     ',
  '######.## #      # ##.######',
  '      .   #      #   .      ',
  '######.## #      # ##.######',
  '     #.## ######## ##.#     ',
  '     #.##          ##.#     ',
  '     #.## ######## ##.#     ',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##................##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];

const ROWS = MAZE_DEF.length;
const COLS = MAZE_DEF[0].length;
const W = COLS * TILE;
const H = ROWS * TILE;

const GHOST_COLORS = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];
const GHOST_NAMES = ['Blinky', 'Pinky', 'Inky', 'Clyde'];

function parseMaze() {
  const walls = [], dots = [], powerPills = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = MAZE_DEF[r][c];
      if (ch === '#') walls.push({ r, c });
      else if (ch === '.') dots.push({ r, c, eaten: false });
      else if (ch === 'o') powerPills.push({ r, c, eaten: false });
    }
  }
  return { walls, dots, powerPills };
}

function isWall(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  return MAZE_DEF[r]?.[c] === '#';
}

export default function PacMan() {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const stateRef = useRef({});
  const keysRef = useRef({});

  const startGame = useCallback(() => {
    const { walls, dots, powerPills } = parseMaze();
    stateRef.current = {
      walls, dots, powerPills,
      pac: { r: 23, c: 14, x: 14 * TILE + TILE / 2, y: 23 * TILE + TILE / 2, dir: 0, nextDir: 0, mouthAngle: 0, mouthDir: 1, speed: 2 },
      ghosts: [
        { r: 11, c: 14, x: 14 * TILE + TILE / 2, y: 11 * TILE + TILE / 2, dir: 0, color: GHOST_COLORS[0], mode: 'scatter', scared: false, speed: 1.5, eaten: false },
        { r: 13, c: 12, x: 12 * TILE + TILE / 2, y: 13 * TILE + TILE / 2, dir: 1, color: GHOST_COLORS[1], mode: 'scatter', scared: false, speed: 1.4, eaten: false },
        { r: 13, c: 14, x: 14 * TILE + TILE / 2, y: 13 * TILE + TILE / 2, dir: 2, color: GHOST_COLORS[2], mode: 'scatter', scared: false, speed: 1.4, eaten: false },
        { r: 13, c: 16, x: 16 * TILE + TILE / 2, y: 13 * TILE + TILE / 2, dir: 3, color: GHOST_COLORS[3], mode: 'scatter', scared: false, speed: 1.3, eaten: false },
      ],
      score: 0, lives: 3, level: 1,
      powerTimer: 0, ghostsEatenCombo: 0,
      frame: 0, modeTimer: 0, scatter: true,
    };
    setScore(0); setLives(3); setLevel(1);
    setPhase('playing');
  }, []);

  useEffect(() => {
    const d = (e) => { keysRef.current[e.key] = true; e.preventDefault(); };
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

    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // left, down, right, up; but actually let me redefine:
    // 0=right, 1=down, 2=left, 3=up
    const DX = [1, 0, -1, 0];
    const DY = [0, 1, 0, -1];

    function canMove(x, y, dir) {
      const nx = x + DX[dir] * 2;
      const ny = y + DY[dir] * 2;
      const nc = Math.floor(nx / TILE);
      const nr = Math.floor(ny / TILE);
      // Tunnel wrap
      if (nc < 0 || nc >= COLS) return true;
      return !isWall(nr, nc);
    }

    const loop = () => {
      const s = stateRef.current;
      const k = keysRef.current;
      const pac = s.pac;

      s.frame++;
      s.modeTimer++;

      // Mode switching
      if (s.modeTimer > 420) { s.scatter = !s.scatter; s.modeTimer = 0; }

      // Input
      if (k['ArrowRight'] || k['d']) pac.nextDir = 0;
      if (k['ArrowDown'] || k['s']) pac.nextDir = 1;
      if (k['ArrowLeft'] || k['a']) pac.nextDir = 2;
      if (k['ArrowUp'] || k['w']) pac.nextDir = 3;

      // Try next direction
      const cx = Math.round((pac.x - TILE / 2) / TILE);
      const cy = Math.round((pac.y - TILE / 2) / TILE);
      const onGrid = Math.abs(pac.x - (cx * TILE + TILE / 2)) < 3 && Math.abs(pac.y - (cy * TILE + TILE / 2)) < 3;

      if (onGrid) {
        pac.x = cx * TILE + TILE / 2;
        pac.y = cy * TILE + TILE / 2;
        pac.r = cy; pac.c = cx;

        if (canMove(pac.x, pac.y, pac.nextDir)) pac.dir = pac.nextDir;
      }

      if (canMove(pac.x, pac.y, pac.dir)) {
        pac.x += DX[pac.dir] * pac.speed;
        pac.y += DY[pac.dir] * pac.speed;
      }

      // Tunnel
      if (pac.x < -TILE) pac.x = W + TILE;
      if (pac.x > W + TILE) pac.x = -TILE;

      // Mouth animation
      pac.mouthAngle += 0.15 * pac.mouthDir;
      if (pac.mouthAngle > 0.6) pac.mouthDir = -1;
      if (pac.mouthAngle < 0.05) pac.mouthDir = 1;

      // Eat dots
      const pr = Math.floor(pac.y / TILE);
      const pc = Math.floor(pac.x / TILE);
      for (const d of s.dots) {
        if (!d.eaten && d.r === pr && d.c === pc) {
          d.eaten = true; s.score += 10;
        }
      }
      for (const pp of s.powerPills) {
        if (!pp.eaten && pp.r === pr && pp.c === pc) {
          pp.eaten = true; s.score += 50;
          s.powerTimer = 300;
          s.ghostsEatenCombo = 0;
          for (const g of s.ghosts) { if (!g.eaten) g.scared = true; }
        }
      }

      // Power timer
      if (s.powerTimer > 0) {
        s.powerTimer--;
        if (s.powerTimer <= 0) {
          for (const g of s.ghosts) g.scared = false;
        }
      }

      // Ghosts
      for (const g of s.ghosts) {
        const gx = Math.round((g.x - TILE / 2) / TILE);
        const gy = Math.round((g.y - TILE / 2) / TILE);
        const gOnGrid = Math.abs(g.x - (gx * TILE + TILE / 2)) < 2 && Math.abs(g.y - (gy * TILE + TILE / 2)) < 2;

        if (gOnGrid) {
          g.x = gx * TILE + TILE / 2;
          g.y = gy * TILE + TILE / 2;
          g.r = gy; g.c = gx;

          // Choose direction
          let bestDir = g.dir;
          let bestDist = Infinity;
          let targetR, targetC;

          if (g.eaten) {
            targetR = 13; targetC = 14; // Back to ghost house
          } else if (g.scared) {
            // Random direction
            const options = [];
            for (let d = 0; d < 4; d++) {
              if (d === (g.dir + 2) % 4) continue;
              const nr = gy + DY[d], nc = gx + DX[d];
              if (!isWall(nr, nc)) options.push(d);
            }
            bestDir = options.length > 0 ? options[Math.floor(Math.random() * options.length)] : g.dir;
          } else {
            // Chase/scatter
            if (s.scatter) {
              const corners = [[0, COLS - 1], [ROWS - 1, COLS - 1], [ROWS - 1, 0], [0, 0]];
              const ci = s.ghosts.indexOf(g) % 4;
              targetR = corners[ci][0]; targetC = corners[ci][1];
            } else {
              targetR = pac.r; targetC = pac.c;
              // Pinky targets 4 ahead
              if (g === s.ghosts[1]) { targetR += DY[pac.dir] * 4; targetC += DX[pac.dir] * 4; }
            }

            for (let d = 0; d < 4; d++) {
              if (d === (g.dir + 2) % 4) continue;
              const nr = gy + DY[d], nc = gx + DX[d];
              if (isWall(nr, nc)) continue;
              const dist = (nr - targetR) ** 2 + (nc - targetC) ** 2;
              if (dist < bestDist) { bestDist = dist; bestDir = d; }
            }
          }

          // Check if chosen dir is valid
          const nr = gy + DY[bestDir], nc = gx + DX[bestDir];
          if (!isWall(nr, nc)) g.dir = bestDir;
          else {
            // Find any valid dir
            for (let d = 0; d < 4; d++) {
              const rr = gy + DY[d], cc = gx + DX[d];
              if (!isWall(rr, cc)) { g.dir = d; break; }
            }
          }
        }

        const spd = g.eaten ? 3 : g.scared ? 1 : g.speed;
        const nmx = g.x + DX[g.dir] * spd;
        const nmy = g.y + DY[g.dir] * spd;
        const nmc = Math.floor(nmx / TILE);
        const nmr = Math.floor(nmy / TILE);
        if (!isWall(nmr, nmc)) {
          g.x = nmx; g.y = nmy;
        }

        // Tunnel
        if (g.x < -TILE) g.x = W + TILE;
        if (g.x > W + TILE) g.x = -TILE;

        // Ghost returned to house
        if (g.eaten && Math.abs(g.x - 14 * TILE - TILE / 2) < 8 && Math.abs(g.y - 13 * TILE - TILE / 2) < 8) {
          g.eaten = false; g.scared = false;
        }

        // Collision with pac
        const dx = pac.x - g.x, dy = pac.y - g.y;
        if (dx * dx + dy * dy < (TILE * 0.8) ** 2) {
          if (g.scared && !g.eaten) {
            g.eaten = true;
            s.ghostsEatenCombo++;
            s.score += 200 * s.ghostsEatenCombo;
          } else if (!g.eaten) {
            s.lives--;
            setLives(s.lives);
            if (s.lives <= 0) { setPhase('gameover'); return; }
            // Reset positions
            pac.x = 14 * TILE + TILE / 2; pac.y = 23 * TILE + TILE / 2; pac.dir = 0;
            s.ghosts[0].x = 14 * TILE + TILE / 2; s.ghosts[0].y = 11 * TILE + TILE / 2;
            s.ghosts[1].x = 12 * TILE + TILE / 2; s.ghosts[1].y = 13 * TILE + TILE / 2;
            s.ghosts[2].x = 14 * TILE + TILE / 2; s.ghosts[2].y = 13 * TILE + TILE / 2;
            s.ghosts[3].x = 16 * TILE + TILE / 2; s.ghosts[3].y = 13 * TILE + TILE / 2;
          }
        }
      }

      // Check level complete
      if (s.dots.every(d => d.eaten) && s.powerPills.every(p => p.eaten)) {
        s.level++;
        setLevel(s.level);
        const { dots, powerPills } = parseMaze();
        s.dots = dots; s.powerPills = powerPills;
        pac.x = 14 * TILE + TILE / 2; pac.y = 23 * TILE + TILE / 2;
      }

      setScore(s.score);

      // ──── DRAW ────
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      // Walls
      ctx.fillStyle = '#2244aa';
      for (const w of s.walls) {
        ctx.fillRect(w.c * TILE, w.r * TILE, TILE, TILE);
      }
      // Wall borders for depth
      ctx.strokeStyle = '#4466cc';
      ctx.lineWidth = 1;
      for (const w of s.walls) {
        const r = w.r, c = w.c;
        if (!isWall(r - 1, c)) { ctx.beginPath(); ctx.moveTo(c * TILE, r * TILE); ctx.lineTo((c + 1) * TILE, r * TILE); ctx.stroke(); }
        if (!isWall(r + 1, c)) { ctx.beginPath(); ctx.moveTo(c * TILE, (r + 1) * TILE); ctx.lineTo((c + 1) * TILE, (r + 1) * TILE); ctx.stroke(); }
        if (!isWall(r, c - 1)) { ctx.beginPath(); ctx.moveTo(c * TILE, r * TILE); ctx.lineTo(c * TILE, (r + 1) * TILE); ctx.stroke(); }
        if (!isWall(r, c + 1)) { ctx.beginPath(); ctx.moveTo((c + 1) * TILE, r * TILE); ctx.lineTo((c + 1) * TILE, (r + 1) * TILE); ctx.stroke(); }
      }

      // Dots
      for (const d of s.dots) {
        if (d.eaten) continue;
        ctx.fillStyle = '#ffb8aa';
        ctx.beginPath();
        ctx.arc(d.c * TILE + TILE / 2, d.r * TILE + TILE / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Power pills
      for (const pp of s.powerPills) {
        if (pp.eaten) continue;
        ctx.fillStyle = (s.frame % 20 < 10) ? '#ffb8aa' : '#ff8866';
        ctx.beginPath();
        ctx.arc(pp.c * TILE + TILE / 2, pp.r * TILE + TILE / 2, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pac-Man
      const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      const baseAngle = angles[pac.dir];
      ctx.fillStyle = '#ffd740';
      ctx.beginPath();
      ctx.arc(pac.x, pac.y, TILE / 2 - 2, baseAngle + pac.mouthAngle, baseAngle + Math.PI * 2 - pac.mouthAngle);
      ctx.lineTo(pac.x, pac.y);
      ctx.fill();

      // Ghosts
      for (const g of s.ghosts) {
        const gx = g.x, gy = g.y;
        const gr = TILE / 2 - 2;
        ctx.fillStyle = g.eaten ? '#ffffff22' : g.scared ? (s.powerTimer < 60 && s.frame % 10 < 5 ? '#fff' : '#2244ff') : g.color;
        // Body
        ctx.beginPath();
        ctx.arc(gx, gy - 2, gr, Math.PI, 0);
        ctx.lineTo(gx + gr, gy + gr);
        // Wavy bottom
        for (let wave = 0; wave < 3; wave++) {
          const wx = gx + gr - (wave + 1) * (gr * 2 / 3);
          ctx.quadraticCurveTo(wx + gr / 3, gy + gr - 5, wx, gy + gr);
        }
        ctx.fill();

        if (!g.eaten) {
          // Eyes
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(gx - 4, gy - 4, 4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(gx + 4, gy - 4, 4, 0, Math.PI * 2); ctx.fill();
          if (!g.scared) {
            ctx.fillStyle = '#00f';
            const edx = DX[g.dir] * 2, edy = DY[g.dir] * 2;
            ctx.beginPath(); ctx.arc(gx - 4 + edx, gy - 4 + edy, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(gx + 4 + edx, gy - 4 + edy, 2, 0, Math.PI * 2); ctx.fill();
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  return (
    <div className="pacman-root">
      <canvas ref={canvasRef} width={W} height={H} />
      <div className="pacman-hud">
        <div>Score: <span>{score}</span></div>
        <div>Lives: <span>{'●'.repeat(Math.max(0, lives))}</span></div>
        <div>Level: <span>{level}</span></div>
      </div>
      {phase === 'menu' && (
        <div className="pacman-overlay">
          <h2>👾 Pac-Man</h2>
          <p>Eat all dots, avoid ghosts, grab power pellets!</p>
          <button onClick={startGame}>Start Game</button>
          <p style={{ fontSize: '.85rem', color: '#666' }}>Arrow keys / WASD to move</p>
        </div>
      )}
      {phase === 'gameover' && (
        <div className="pacman-overlay">
          <h2>💀 Game Over</h2>
          <p>Score: {score} · Level: {level}</p>
          <button onClick={startGame}>Try Again</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
