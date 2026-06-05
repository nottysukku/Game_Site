import React, { useRef, useEffect, useState, useCallback } from 'react';
import BackButton from './BackButton';
import './SuperMario.css';

const W = 800, H = 480, TILE = 32;
const GRAVITY = 0.5, JUMP_VEL = -10, MOVE_SPEED = 4;
const COLS = 200, ROWS = Math.ceil(H / TILE);

/* tile types */
const T = { EMPTY: 0, GROUND: 1, BRICK: 2, QBLOCK: 3, PIPE_TL: 4, PIPE_TR: 5, PIPE_BL: 6, PIPE_BR: 7, FLAG: 8, USED: 9 };

/* powerup types */
const PW = { MUSHROOM: 1, STAR: 2, FIRE: 3 };

function buildLevel() {
  const map = Array.from({ length: ROWS }, () => new Array(COLS).fill(T.EMPTY));
  // Ground
  for (let c = 0; c < COLS; c++) {
    if ((c > 40 && c < 43) || (c > 80 && c < 83)) continue; // gaps
    map[ROWS - 1][c] = T.GROUND;
    map[ROWS - 2][c] = T.GROUND;
  }
  // Brick & ? block rows
  const blockRows = [
    { row: ROWS - 6, cols: [12, 13, 14, 16, 18, 19, 20] },
    { row: ROWS - 6, cols: [50, 51, 52, 53, 54] },
    { row: ROWS - 6, cols: [90, 91, 92, 93] },
    { row: ROWS - 10, cols: [14, 15, 16] },
    { row: ROWS - 10, cols: [60, 61, 62, 63] },
  ];
  for (const br of blockRows) {
    for (const c of br.cols) {
      map[br.row][c] = Math.random() < 0.25 ? T.QBLOCK : T.BRICK;
    }
  }
  // Extra ? blocks
  const qPositions = [[ROWS - 6, 30], [ROWS - 6, 70], [ROWS - 10, 45], [ROWS - 6, 110], [ROWS - 10, 100]];
  for (const [r, c] of qPositions) map[r][c] = T.QBLOCK;

  // Pipes
  const pipes = [22, 55, 85, 120, 150];
  for (const c of pipes) {
    const h = 2 + Math.floor(Math.random() * 2);
    for (let r = ROWS - 2 - h; r < ROWS - 2; r++) {
      map[r][c] = (r === ROWS - 2 - h) ? T.PIPE_TL : T.PIPE_BL;
      map[r][c + 1] = (r === ROWS - 2 - h) ? T.PIPE_TR : T.PIPE_BR;
    }
  }
  // Stairs near end
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j <= i; j++) {
      map[ROWS - 3 - j][170 + i] = T.GROUND;
    }
  }
  // Flag
  map[ROWS - 12][185] = T.FLAG;
  return map;
}

function createEnemies() {
  return [
    { x: 15 * TILE, y: 0, vx: -1, alive: true, type: 'goomba' },
    { x: 35 * TILE, y: 0, vx: -1, alive: true, type: 'goomba' },
    { x: 48 * TILE, y: 0, vx: -1, alive: true, type: 'goomba' },
    { x: 65 * TILE, y: 0, vx: 1, alive: true, type: 'koopa' },
    { x: 75 * TILE, y: 0, vx: -1, alive: true, type: 'goomba' },
    { x: 95 * TILE, y: 0, vx: -1, alive: true, type: 'goomba' },
    { x: 105 * TILE, y: 0, vx: 1, alive: true, type: 'goomba' },
    { x: 115 * TILE, y: 0, vx: -1, alive: true, type: 'koopa' },
    { x: 130 * TILE, y: 0, vx: -1, alive: true, type: 'goomba' },
    { x: 145 * TILE, y: 0, vx: -1, alive: true, type: 'goomba' },
    { x: 160 * TILE, y: 0, vx: 1, alive: true, type: 'goomba' },
  ];
}

function isSolid(t) { return t === T.GROUND || t === T.BRICK || t === T.QBLOCK || t === T.PIPE_TL || t === T.PIPE_TR || t === T.PIPE_BL || t === T.PIPE_BR || t === T.USED; }

export default function SuperMario() {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const stateRef = useRef({});
  const keysRef = useRef({});

  const startGame = useCallback(() => {
    stateRef.current = {
      map: buildLevel(),
      mario: {
        x: 3 * TILE, y: (ROWS - 4) * TILE, vx: 0, vy: 0,
        big: false, star: false, fire: false, starTimer: 0,
        jumping: false, facing: 1, invincible: 0, frame: 0
      },
      enemies: createEnemies(),
      powerups: [],
      fireballs: [],
      particles: [],
      camX: 0,
      score: 0, coins: 0, lives: 3,
      won: false, dead: false, deadTimer: 0
    };
    setScore(0); setCoins(0); setLives(3);
    setPhase('playing');
  }, []);

  useEffect(() => {
    const d = (e) => { keysRef.current[e.key] = true; if (e.key === ' ') e.preventDefault(); };
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

    function tileAt(r, c) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return T.EMPTY;
      return stateRef.current.map[r][c];
    }

    const loop = () => {
      const s = stateRef.current;
      const k = keysRef.current;
      const m = s.mario;

      if (s.dead) {
        s.deadTimer++;
        if (s.deadTimer > 80) {
          if (s.lives > 1) {
            s.lives--;
            m.x = 3 * TILE; m.y = (ROWS - 4) * TILE; m.vx = 0; m.vy = 0;
            m.big = false; m.star = false; m.fire = false; m.invincible = 0;
            s.dead = false; s.deadTimer = 0;
            s.camX = 0;
            setLives(s.lives);
          } else {
            setPhase('gameover');
            return;
          }
        }
      }

      if (s.won) { setPhase('win'); return; }

      if (!s.dead) {
        // Input
        if (k['ArrowLeft'] || k['a']) { m.vx = -MOVE_SPEED; m.facing = -1; }
        else if (k['ArrowRight'] || k['d']) { m.vx = MOVE_SPEED; m.facing = 1; }
        else m.vx *= 0.8;

        if ((k['ArrowUp'] || k['w'] || k[' ']) && !m.jumping) {
          m.vy = JUMP_VEL * (m.big ? 1.1 : 1);
          m.jumping = true;
        }

        // Fireball
        if ((k['f'] || k['x']) && m.fire && s.fireballs.length < 2) {
          s.fireballs.push({ x: m.x + m.facing * 16, y: m.y + 8, vx: m.facing * 6, vy: -2 });
          k['f'] = false; k['x'] = false;
        }

        // Physics
        m.vy += GRAVITY;
        m.x += m.vx;
        m.y += m.vy;
        m.frame += Math.abs(m.vx) * 0.1;

        const mw = m.big ? 28 : 24;
        const mh = m.big ? 56 : 32;

        // Horizontal collision
        const col = Math.floor(m.x / TILE);
        const rowT = Math.floor(m.y / TILE);
        const rowB = Math.floor((m.y + mh - 1) / TILE);
        // Right
        if (m.vx > 0) {
          const rc = Math.floor((m.x + mw / 2) / TILE);
          for (let r = rowT; r <= rowB; r++) {
            if (isSolid(tileAt(r, rc))) { m.x = rc * TILE - mw / 2 - 0.1; m.vx = 0; break; }
          }
        }
        // Left
        if (m.vx < 0) {
          const lc = Math.floor((m.x - mw / 2) / TILE);
          for (let r = rowT; r <= rowB; r++) {
            if (isSolid(tileAt(r, lc))) { m.x = (lc + 1) * TILE + mw / 2 + 0.1; m.vx = 0; break; }
          }
        }

        // Vertical collision
        const colL = Math.floor((m.x - mw / 2) / TILE);
        const colR = Math.floor((m.x + mw / 2 - 1) / TILE);
        // Down
        if (m.vy > 0) {
          const br = Math.floor((m.y + mh) / TILE);
          for (let c = colL; c <= colR; c++) {
            if (isSolid(tileAt(br, c))) {
              m.y = br * TILE - mh;
              m.vy = 0;
              m.jumping = false;
              break;
            }
          }
        }
        // Up (head bump)
        if (m.vy < 0) {
          const tr = Math.floor(m.y / TILE);
          for (let c = colL; c <= colR; c++) {
            const tile = tileAt(tr, c);
            if (isSolid(tile)) {
              m.y = (tr + 1) * TILE + 0.1;
              m.vy = 1;
              if (tile === T.BRICK && m.big) {
                s.map[tr][c] = T.EMPTY;
                s.score += 50;
                for (let p = 0; p < 4; p++) {
                  s.particles.push({ x: c * TILE + 16, y: tr * TILE + 16, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5 - 2, life: 30, color: '#b56228' });
                }
              }
              if (tile === T.QBLOCK) {
                s.map[tr][c] = T.USED;
                if (Math.random() < 0.4) {
                  s.coins++;
                  s.score += 200;
                } else {
                  const pwType = !m.big ? PW.MUSHROOM : (Math.random() < 0.5 ? PW.STAR : PW.FIRE);
                  s.powerups.push({ x: c * TILE, y: tr * TILE - TILE, vy: -2, type: pwType, vx: 1 });
                }
              }
              break;
            }
          }
        }

        // Fall death
        if (m.y > ROWS * TILE + 100) { s.dead = true; }

        // Star timer
        if (m.star) { m.starTimer--; if (m.starTimer <= 0) m.star = false; }
        if (m.invincible > 0) m.invincible--;

        // Flag check
        const fc = Math.floor(m.x / TILE);
        const fr = Math.floor(m.y / TILE);
        if (tileAt(fr, fc) === T.FLAG || tileAt(fr + 1, fc) === T.FLAG) s.won = true;
      }

      // Powerups
      s.powerups = s.powerups.filter(pw => {
        pw.vy += 0.3;
        pw.x += pw.vx;
        pw.y += pw.vy;
        // Ground
        const pr = Math.floor((pw.y + TILE) / TILE);
        const pc = Math.floor(pw.x / TILE);
        if (isSolid(tileAt(pr, pc))) { pw.y = (pr - 1) * TILE; pw.vy = 0; }
        // Wall
        const pcR = Math.floor((pw.x + TILE) / TILE);
        if (isSolid(tileAt(Math.floor(pw.y / TILE), pcR))) pw.vx = -Math.abs(pw.vx);
        const pcL = Math.floor(pw.x / TILE);
        if (isSolid(tileAt(Math.floor(pw.y / TILE), pcL - 1))) pw.vx = Math.abs(pw.vx);

        if (pw.y > ROWS * TILE + 50) return false;

        // Mario pickup
        const mw = m.big ? 28 : 24, mhh = m.big ? 56 : 32;
        if (Math.abs(pw.x + 16 - m.x) < mw && Math.abs(pw.y + 16 - m.y - mhh / 2) < mhh / 2 + 10) {
          if (pw.type === PW.MUSHROOM && !m.big) { m.big = true; s.score += 1000; }
          if (pw.type === PW.STAR) { m.star = true; m.starTimer = 300; s.score += 1000; }
          if (pw.type === PW.FIRE) { m.fire = true; m.big = true; s.score += 1000; }
          return false;
        }
        return true;
      });

      // Fireballs
      s.fireballs = s.fireballs.filter(fb => {
        fb.x += fb.vx; fb.vy += 0.4; fb.y += fb.vy;
        const fr = Math.floor((fb.y + 8) / TILE);
        const fc = Math.floor(fb.x / TILE);
        if (isSolid(tileAt(fr, fc))) { fb.vy = -5; }
        if (fb.x < s.camX - 50 || fb.x > s.camX + W + 50 || fb.y > ROWS * TILE) return false;
        // Hit enemy
        for (const e of s.enemies) {
          if (!e.alive) continue;
          if (Math.abs(fb.x - e.x - 16) < 20 && Math.abs(fb.y - e.y - 16) < 20) {
            e.alive = false; s.score += 200;
            return false;
          }
        }
        return true;
      });

      // Enemies
      for (const e of s.enemies) {
        if (!e.alive) continue;
        e.vy = (e.vy || 0) + GRAVITY;
        e.x += e.vx;
        e.y += e.vy;
        // Ground
        const er = Math.floor((e.y + TILE) / TILE);
        const ec = Math.floor((e.x + 16) / TILE);
        if (er >= 0 && er < ROWS && isSolid(tileAt(er, ec))) { e.y = (er - 1) * TILE; e.vy = 0; }
        // Wall
        const ecR = Math.floor((e.x + TILE) / TILE);
        if (isSolid(tileAt(Math.floor(e.y / TILE), ecR))) e.vx = -Math.abs(e.vx);
        const ecL = Math.floor(e.x / TILE) - 1;
        if (ecL >= 0 && isSolid(tileAt(Math.floor(e.y / TILE), ecL))) e.vx = Math.abs(e.vx);

        if (e.y > ROWS * TILE + 50) { e.alive = false; continue; }

        // Mario collision
        if (s.dead) continue;
        const mw = m.big ? 28 : 24, mhh = m.big ? 56 : 32;
        const dx = Math.abs(m.x - e.x - 16);
        const dy = m.y + mhh - e.y;
        if (dx < mw / 2 + 12 && dy > 0 && dy < TILE + 10) {
          if (m.star) {
            e.alive = false; s.score += 200;
          } else if (m.vy > 0 && dy < 18) {
            // Stomp
            e.alive = false;
            m.vy = -7;
            s.score += 100;
          } else if (m.invincible <= 0) {
            if (m.big) { m.big = false; m.fire = false; m.invincible = 60; }
            else { s.dead = true; }
          }
        }
      }

      // Particles
      s.particles = s.particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--; return p.life > 0; });

      // Camera
      const targetCam = m.x - W / 3;
      s.camX += (targetCam - s.camX) * 0.1;
      if (s.camX < 0) s.camX = 0;

      setScore(s.score);
      setCoins(s.coins);

      // ──── DRAW ────
      // Sky
      ctx.fillStyle = '#5c94fc';
      ctx.fillRect(0, 0, W, H);

      // Clouds (parallax)
      ctx.fillStyle = '#ffffff88';
      for (let i = 0; i < 10; i++) {
        const cx = ((i * 200 + 50) - s.camX * 0.3 + 5000) % (COLS * TILE * 0.4);
        const cy = 30 + (i * 37) % 80;
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.arc(cx + 18, cy - 5, 16, 0, Math.PI * 2); ctx.arc(cx + 30, cy, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // Hills
      ctx.fillStyle = '#4a8c3a';
      for (let i = 0; i < 8; i++) {
        const hx = (i * 300 - s.camX * 0.2 + 3000) % (COLS * TILE * 0.3);
        ctx.beginPath();
        ctx.arc(hx, H - 64, 60 + i * 10, Math.PI, 0);
        ctx.fill();
      }

      // Tiles
      const startCol = Math.floor(s.camX / TILE);
      const endCol = Math.ceil((s.camX + W) / TILE) + 1;
      for (let r = 0; r < ROWS; r++) {
        for (let c = startCol; c <= endCol && c < COLS; c++) {
          const t = tileAt(r, c);
          if (t === T.EMPTY) continue;
          const tx = c * TILE - s.camX, ty = r * TILE;
          if (t === T.GROUND) {
            ctx.fillStyle = r === ROWS - 2 ? '#4a8c3a' : '#c66b28';
            ctx.fillRect(tx, ty, TILE, TILE);
            if (r === ROWS - 2) { ctx.fillStyle = '#3a7a2a'; ctx.fillRect(tx, ty + TILE - 4, TILE, 4); }
          } else if (t === T.BRICK) {
            ctx.fillStyle = '#b56228';
            ctx.fillRect(tx, ty, TILE, TILE);
            ctx.strokeStyle = '#8a4a1a';
            ctx.strokeRect(tx + 1, ty + 1, TILE - 2, TILE / 2 - 1);
            ctx.strokeRect(tx + TILE / 2, ty + TILE / 2, TILE / 2 - 1, TILE / 2 - 1);
            ctx.strokeRect(tx + 1, ty + TILE / 2, TILE / 2 - 1, TILE / 2 - 1);
          } else if (t === T.QBLOCK) {
            ctx.fillStyle = '#e7a53a';
            ctx.fillRect(tx, ty, TILE, TILE);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('?', tx + TILE / 2, ty + TILE - 8);
          } else if (t === T.USED) {
            ctx.fillStyle = '#886644';
            ctx.fillRect(tx, ty, TILE, TILE);
          } else if (t === T.PIPE_TL || t === T.PIPE_TR || t === T.PIPE_BL || t === T.PIPE_BR) {
            ctx.fillStyle = t === T.PIPE_TL || t === T.PIPE_TR ? '#2a9a2a' : '#1a8a1a';
            ctx.fillRect(tx, ty, TILE, TILE);
            ctx.strokeStyle = '#0a6a0a';
            ctx.strokeRect(tx, ty, TILE, TILE);
          } else if (t === T.FLAG) {
            ctx.fillStyle = '#888';
            ctx.fillRect(tx + 14, ty, 4, TILE * 10);
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.moveTo(tx + 18, ty);
            ctx.lineTo(tx + 42, ty + 12);
            ctx.lineTo(tx + 18, ty + 24);
            ctx.fill();
          }
        }
      }

      // Powerups
      for (const pw of s.powerups) {
        const px = pw.x - s.camX;
        if (pw.type === PW.MUSHROOM) {
          ctx.fillStyle = '#ff4444';
          ctx.beginPath(); ctx.arc(px + 16, py(pw) + 10, 14, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillRect(px + 6, py(pw) + 10, 20, 12);
          function py(p) { return p.y; }
        } else if (pw.type === PW.STAR) {
          ctx.fillStyle = '#ffd740';
          drawStar(ctx, px + 16, pw.y + 16, 12, 5);
        } else if (pw.type === PW.FIRE) {
          ctx.fillStyle = '#ff6600';
          ctx.beginPath(); ctx.arc(px + 16, pw.y + 16, 12, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffaa00';
          ctx.beginPath(); ctx.arc(px + 16, pw.y + 12, 8, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Fireballs
      for (const fb of s.fireballs) {
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(fb.x - s.camX, fb.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Enemies
      for (const e of s.enemies) {
        if (!e.alive) continue;
        const ex = e.x - s.camX;
        if (ex < -50 || ex > W + 50) continue;
        if (e.type === 'goomba') {
          ctx.fillStyle = '#8a4a1a';
          ctx.beginPath(); ctx.arc(ex + 16, e.y + 10, 14, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#c66b28';
          ctx.fillRect(ex + 4, e.y + 10, 24, 18);
          ctx.fillStyle = '#fff';
          ctx.fillRect(ex + 8, e.y + 6, 5, 5);
          ctx.fillRect(ex + 18, e.y + 6, 5, 5);
          ctx.fillStyle = '#000';
          ctx.fillRect(ex + 10, e.y + 7, 2, 3);
          ctx.fillRect(ex + 20, e.y + 7, 2, 3);
          // Feet
          ctx.fillStyle = '#222';
          ctx.fillRect(ex + 4, e.y + 26, 10, 6);
          ctx.fillRect(ex + 18, e.y + 26, 10, 6);
        } else {
          ctx.fillStyle = '#2a8a2a';
          ctx.fillRect(ex + 4, e.y + 8, 24, 20);
          ctx.fillStyle = '#3aba3a';
          ctx.beginPath(); ctx.arc(ex + 16, e.y + 8, 14, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillRect(ex + 8, e.y + 2, 6, 6);
          ctx.fillRect(ex + 18, e.y + 2, 6, 6);
        }
      }

      // Mario
      if (!s.dead || s.deadTimer < 60) {
        const mx = m.x - s.camX;
        const mhh = m.big ? 56 : 32;
        const mww = m.big ? 28 : 24;

        if (m.invincible > 0 && Math.floor(m.invincible / 4) % 2 === 0) {
          // Blink - don't draw
        } else {
          ctx.save();
          ctx.translate(mx, m.y);

          // Hat
          ctx.fillStyle = m.fire ? '#fff' : '#ff0000';
          ctx.fillRect(-mww / 2 + 2, 0, mww - 4, m.big ? 14 : 10);

          // Face
          ctx.fillStyle = '#ffccaa';
          ctx.fillRect(-mww / 2 + 2, m.big ? 14 : 10, mww - 4, m.big ? 14 : 10);

          // Eyes
          ctx.fillStyle = '#000';
          ctx.fillRect(-4, m.big ? 18 : 12, 3, 3);
          ctx.fillRect(2, m.big ? 18 : 12, 3, 3);

          // Mustache
          ctx.fillStyle = '#5a2a0a';
          ctx.fillRect(-5, m.big ? 26 : 18, 10, 2);

          // Body
          ctx.fillStyle = m.fire ? '#fff' : '#ff0000';
          ctx.fillRect(-mww / 2 + 3, m.big ? 28 : 20, mww - 6, m.big ? 16 : 8);

          // Overalls
          ctx.fillStyle = '#0000cc';
          ctx.fillRect(-mww / 2 + 4, m.big ? 44 : 28, mww - 8, m.big ? 12 : 4);

          // Star glow
          if (m.star) {
            ctx.fillStyle = `hsla(${(Date.now() / 5) % 360}, 100%, 60%, 0.4)`;
            ctx.beginPath();
            ctx.arc(0, mhh / 2, mww, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }

      // Particles
      for (const p of s.particles) {
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - s.camX - 3, p.y - 3, 6, 6);
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(loop);
    };

    function drawStar(c, cx, cy, r, pts) {
      c.beginPath();
      for (let i = 0; i < pts * 2; i++) {
        const a = (Math.PI * i) / pts - Math.PI / 2;
        const d = i % 2 === 0 ? r : r * 0.4;
        const method = i === 0 ? 'moveTo' : 'lineTo';
        c[method](cx + Math.cos(a) * d, cy + Math.sin(a) * d);
      }
      c.closePath();
      c.fill();
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  return (
    <div className="mario-root">
      <canvas ref={canvasRef} width={W} height={H} />
      <div className="mario-hud">
        <span>SCORE: {score}</span>
        <span>COINS: {coins}</span>
        <span>LIVES: {'❤️'.repeat(lives)}</span>
      </div>
      {phase === 'menu' && (
        <div className="mario-overlay">
          <h2>🍄 Super Mario</h2>
          <p>Classic platformer! Jump on enemies, grab powerups, reach the flag!</p>
          <button onClick={startGame}>Start Game</button>
          <p style={{ fontSize: '.85rem', color: '#888' }}>Arrow / WASD: Move & Jump · F: Fireball</p>
        </div>
      )}
      {phase === 'gameover' && (
        <div className="mario-overlay">
          <h2>💀 Game Over</h2>
          <p>Score: {score}</p>
          <button onClick={startGame}>Try Again</button>
        </div>
      )}
      {phase === 'win' && (
        <div className="mario-overlay">
          <h2>⭐ You Win!</h2>
          <p>Score: {score} · Coins: {coins}</p>
          <button onClick={startGame}>Play Again</button>
        </div>
      )}
      <BackButton />
    </div>
  );
}
