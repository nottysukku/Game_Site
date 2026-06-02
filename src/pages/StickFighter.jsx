import React, { useEffect, useRef, useState } from "react";
import BackButton from "./BackButton";
import "./StickFighter.css";

export default function StickFighter() {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("menu");
  const [score, setScore] = useState(0);
  const [playerHP, setPlayerHP] = useState(100);
  const [enemyHP, setEnemyHP] = useState(100);
  const [enemyMaxHP, setEnemyMaxHP] = useState(100);
  const [wave, setWave] = useState(1);
  const [combo, setCombo] = useState(0);
  const [arenaName, setArenaName] = useState("Dojo");
  const [isBoss, setIsBoss] = useState(false);
  const [specialMeter, setSpecialMeter] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [powerUpActive, setPowerUpActive] = useState("");
  const [comboRank, setComboRank] = useState("");
  const stateRef = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let W, H;
    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    let animId,
      lastTime = performance.now();

    /* ============== CONFIG ============== */
    const CFG = {
      gravity: 1800,
      playerSpeed: 340,
      playerJump: 620,
      basePunchDmg: 12,
      baseKickDmg: 18,
      upperDmg: 25,
      specialDmg: 50,
      punchRange: 55,
      kickRange: 65,
      upperRange: 50,
      specialRange: 120,
      punchCd: 0.3,
      kickCd: 0.42,
      upperCd: 0.55,
      specialCd: 1.2,
      blockDmgMult: 0.25,
      comboTimeout: 1.5,
      specialMeterMax: 100,
      meterPerHit: 8,
      bossWaveInterval: 5,
      powerUpDropChance: 0.3,
      powerUpDuration: 8,
      screenShakeIntensity: 8,
      screenShakeDuration: 0.2,
      slowMoDuration: 0.6,
      slowMoFactor: 0.25,
      arenaTransitionDuration: 1.5,
    };

    /* ============== ARENAS / BIOMES ============== */
    const ARENAS = [
      {
        name: "Dojo",
        skyTop: "#1a1a3e",
        skyBot: "#0a0e1a",
        ground: "#3b2a17",
        groundLine: "#5a4030",
        wallColor: "#2a1c10",
        pillars: "#4a3020",
        detail: "#ffd86b",
        weather: "leaves",
        bgElements: "lanterns",
        ambientColor: "rgba(255,216,107,0.03)",
      },
      {
        name: "Street Fight",
        skyTop: "#0f0f2a",
        skyBot: "#1a0a2a",
        ground: "#333340",
        groundLine: "#555568",
        wallColor: "#222235",
        pillars: "#444458",
        detail: "#e040fb",
        weather: "rain",
        bgElements: "neon",
        ambientColor: "rgba(224,64,251,0.03)",
      },
      {
        name: "Dungeon",
        skyTop: "#0a0a12",
        skyBot: "#050508",
        ground: "#3a3f45",
        groundLine: "#555a60",
        wallColor: "#252830",
        pillars: "#4a4e58",
        detail: "#69f0ae",
        weather: "dust",
        bgElements: "torches",
        ambientColor: "rgba(105,240,174,0.03)",
      },
      {
        name: "Volcano",
        skyTop: "#1a0505",
        skyBot: "#0a0202",
        ground: "#4a2020",
        groundLine: "#6a3030",
        wallColor: "#2a1010",
        pillars: "#5a2828",
        detail: "#ff5252",
        weather: "embers",
        bgElements: "lava",
        ambientColor: "rgba(255,82,82,0.04)",
      },
      {
        name: "Ice Temple",
        skyTop: "#0a0f1a",
        skyBot: "#05080f",
        ground: "#5a7a8a",
        groundLine: "#8aafbf",
        wallColor: "#3a5a6a",
        pillars: "#6a9aaa",
        detail: "#00e5ff",
        weather: "snow",
        bgElements: "crystals",
        ambientColor: "rgba(0,229,255,0.03)",
      },
    ];

    /* ============== BOSS DEFINITIONS ============== */
    const BOSSES = [
      {
        name: "Shadow Ninja",
        color: "#9c27b0",
        accentColor: "#e040fb",
        hpMult: 4,
        spdMult: 1.4,
        dmgMult: 1.5,
        size: 1.3,
        special: "dash",
      },
      {
        name: "Dark Knight",
        color: "#455a64",
        accentColor: "#ff5252",
        hpMult: 5,
        spdMult: 1.2,
        dmgMult: 2.0,
        size: 1.5,
        special: "slam",
      },
      {
        name: "Fire Demon",
        color: "#ff3d00",
        accentColor: "#ffd740",
        hpMult: 6,
        spdMult: 1.6,
        dmgMult: 2.5,
        size: 1.7,
        special: "fireball",
      },
    ];

    const POWERUP_TYPES = [
      { type: "heal", color: "#69f0ae", icon: "+", effect: "Restores 30 HP" },
      {
        type: "damage",
        color: "#ff5252",
        icon: "!",
        effect: "2x damage for 8s",
      },
      {
        type: "speed",
        color: "#ffd740",
        icon: ">",
        effect: "1.5x speed for 8s",
      },
      {
        type: "shield",
        color: "#00e5ff",
        icon: "O",
        effect: "Shield blocks 3 hits",
      },
    ];

    /* ============== GAME STATE ============== */
    let sc = 0,
      currentWave = 1,
      comboCount = 0,
      comboTimer = 0;
    let started = false,
      over = false;
    let meter = 0;
    let best = Number(localStorage.getItem("sfBestScore") || "0");
    setBestScore(best);
    let groundY;

    // Arena system
    let currentArenaIdx = 0;
    let arenaTransition = 0; // 0 = no transition, >0 = transitioning
    let fromArenaIdx = 0;

    // Camera effects
    let camShakeTime = 0,
      camShakeIntensity = 0;
    let slowMoTime = 0;
    let flashAlpha = 0;
    let zoomFactor = 1;
    let zoomTarget = 1;

    // Boss intro/defeat
    let bossIntroTime = 0;
    let bossDefeatTime = 0;
    let bossIntroFoe = null;

    // Particles & weather
    const particles = [];
    const weatherParticles = [];
    const floatingTexts = [];

    // Power-ups
    const droppedPowerUps = [];
    let activePowerUp = { type: "", timer: 0, shieldHits: 0 };

    // Projectiles from boss
    const projectiles = [];

    /* ============== FIGHTERS ============== */
    const p = {
      x: 200,
      y: 0,
      vx: 0,
      vy: 0,
      speed: CFG.playerSpeed,
      jump: CFG.playerJump,
      jumping: false,
      hp: 100,
      maxHp: 100,
      attacking: false,
      atkType: "",
      atkTimer: 0,
      atkCd: 0,
      blocking: false,
      dir: 1,
      runTime: 0,
      hitFlash: 0,
    };
    const e = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      speed: 200,
      hp: 100,
      maxHp: 100,
      attacking: false,
      atkType: "",
      atkTimer: 0,
      atkCd: 0,
      aiT: 0,
      dir: -1,
      isBoss: false,
      bossType: null,
      size: 1,
      runTime: 0,
      hitFlash: 0,
      specialCd: 0,
    };

    const keys = {
      a: false,
      d: false,
      w: false,
      j: false,
      k: false,
      l: false,
      s: false,
      q: false,
    };

    /* ============== HELPER FUNCTIONS ============== */
    function lerp(a, b, t) {
      return a + (b - a) * Math.min(1, Math.max(0, t));
    }
    function lerpColor(hex1, hex2, t) {
      const c1 = hexToRgb(hex1),
        c2 = hexToRgb(hex2);
      const r = Math.round(lerp(c1.r, c2.r, t));
      const g = Math.round(lerp(c1.g, c2.g, t));
      const b = Math.round(lerp(c1.b, c2.b, t));
      return `rgb(${r},${g},${b})`;
    }
    function hexToRgb(hex) {
      hex = hex.replace("#", "");
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
      };
    }
    function getArena() {
      if (arenaTransition > 0) {
        const t = 1 - arenaTransition / CFG.arenaTransitionDuration;
        const from = ARENAS[fromArenaIdx];
        const to = ARENAS[currentArenaIdx];
        return {
          name: to.name,
          weather: to.weather,
          bgElements: to.bgElements,
          skyTop: lerpColor(from.skyTop, to.skyTop, t),
          skyBot: lerpColor(from.skyBot, to.skyBot, t),
          ground: lerpColor(from.ground, to.ground, t),
          groundLine: lerpColor(from.groundLine, to.groundLine, t),
          wallColor: lerpColor(from.wallColor, to.wallColor, t),
          pillars: lerpColor(from.pillars, to.pillars, t),
          detail: lerpColor(from.detail, to.detail, t),
          ambientColor: to.ambientColor,
        };
      }
      return ARENAS[currentArenaIdx];
    }

    function spawnParticles(x, y, color, count = 8, spread = 6) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * spread * 2,
          vy: (Math.random() - 0.5) * spread * 2 - 2,
          life: 1,
          color,
          size: 3 + Math.random() * 4,
        });
      }
    }
    function spawnFloatingText(x, y, text, color, size = 20) {
      floatingTexts.push({ x, y, text, color, size, life: 1.2, vy: -80 });
    }
    function triggerShake(intensity, duration) {
      camShakeIntensity = intensity || CFG.screenShakeIntensity;
      camShakeTime = duration || CFG.screenShakeDuration;
    }
    function triggerSlowMo() {
      slowMoTime = CFG.slowMoDuration;
    }
    function triggerFlash(alpha = 0.5) {
      flashAlpha = alpha;
    }
    function spawnPowerUpDrop(x, y) {
      if (Math.random() > CFG.powerUpDropChance) return;
      const type =
        POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
      droppedPowerUps.push({
        x,
        y: y - 20,
        type: type.type,
        color: type.color,
        icon: type.icon,
        life: 10,
        bobT: 0,
      });
    }
    function applyPowerUp(pu) {
      if (pu.type === "heal") {
        p.hp = Math.min(p.maxHp, p.hp + 30);
        setPlayerHP(p.hp);
        spawnFloatingText(p.x, p.y - 80, "+30 HP", "#69f0ae", 22);
      } else if (pu.type === "damage") {
        activePowerUp = {
          type: "damage",
          timer: CFG.powerUpDuration,
          shieldHits: 0,
        };
        setPowerUpActive("2x DMG");
      } else if (pu.type === "speed") {
        activePowerUp = {
          type: "speed",
          timer: CFG.powerUpDuration,
          shieldHits: 0,
        };
        setPowerUpActive("1.5x SPD");
      } else if (pu.type === "shield") {
        activePowerUp = { type: "shield", timer: 999, shieldHits: 3 };
        setPowerUpActive("SHIELD x3");
      }
      spawnParticles(p.x, p.y - 40, pu.color, 12, 8);
    }
    function getComboRank(c) {
      if (c >= 20) return "SSS";
      if (c >= 15) return "SS";
      if (c >= 10) return "S";
      if (c >= 7) return "A";
      if (c >= 5) return "B";
      if (c >= 3) return "C";
      return "";
    }
    function getDmgMultiplier() {
      return activePowerUp.type === "damage" ? 2 : 1;
    }
    function getSpdMultiplier() {
      return activePowerUp.type === "speed" ? 1.5 : 1;
    }

    /* ============== INIT FIGHT ============== */
    function initFight() {
      groundY = H - 90;
      p.x = W * 0.25;
      p.y = groundY;
      p.vx = 0;
      p.vy = 0;
      p.attacking = false;
      p.atkCd = 0;
      p.atkTimer = 0;
      p.blocking = false;
      p.hitFlash = 0;
      p.runTime = 0;
      // Player HP carries over between waves, healed partially
      if (currentWave > 1) {
        p.hp = Math.min(p.maxHp, p.hp + 20);
      } else {
        p.hp = 100;
      }
      setPlayerHP(p.hp);

      // Check for arena change
      const newArenaIdx = Math.min(
        ARENAS.length - 1,
        Math.floor((currentWave - 1) / 4),
      );
      if (newArenaIdx !== currentArenaIdx) {
        fromArenaIdx = currentArenaIdx;
        currentArenaIdx = newArenaIdx;
        arenaTransition = CFG.arenaTransitionDuration;
        triggerFlash(0.4);
      }
      setArenaName(ARENAS[currentArenaIdx].name);

      // Check for boss wave
      const isBossWave =
        currentWave > 1 && currentWave % CFG.bossWaveInterval === 0;
      setIsBoss(isBossWave);

      if (isBossWave) {
        const bossIdx = Math.min(
          BOSSES.length - 1,
          Math.floor(currentWave / CFG.bossWaveInterval) - 1,
        );
        const boss = BOSSES[bossIdx];
        e.isBoss = true;
        e.bossType = boss;
        e.size = boss.size;
        e.maxHp = Math.floor((100 + (currentWave - 1) * 20) * boss.hpMult);
        e.hp = e.maxHp;
        e.speed = (200 + currentWave * 15) * boss.spdMult;
        e.specialCd = 3;
        bossIntroTime = 2.0;
        bossIntroFoe = boss;
        triggerShake(12, 0.5);
        triggerFlash(0.6);
        zoomTarget = 0.95;
      } else {
        e.isBoss = false;
        e.bossType = null;
        e.size = 1;
        e.maxHp = 100 + (currentWave - 1) * 25;
        e.hp = e.maxHp;
        e.speed = 200 + currentWave * 15;
        e.specialCd = 0;
        bossIntroTime = 0;
        zoomTarget = 1;
      }
      e.x = W * 0.75;
      e.y = groundY;
      e.vx = 0;
      e.vy = 0;
      e.attacking = false;
      e.atkCd = 0;
      e.atkTimer = 0;
      e.aiT = 0;
      e.dir = -1;
      e.hitFlash = 0;
      e.runTime = 0;
      setEnemyHP(e.hp);
      setEnemyMaxHP(e.maxHp);

      // Clear projectiles and power ups
      projectiles.length = 0;
    }

    /* ============== WEATHER SYSTEM ============== */
    function initWeather() {
      weatherParticles.length = 0;
      for (let i = 0; i < 60; i++) {
        weatherParticles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: 0,
          vy: 0,
          size: 0,
          alpha: 0,
        });
      }
    }
    function updateWeather(dt, arena) {
      for (const wp of weatherParticles) {
        switch (arena.weather) {
          case "leaves":
            wp.vx = Math.sin(wp.y * 0.01 + performance.now() * 0.001) * 30;
            wp.vy = 40 + Math.sin(wp.x * 0.005) * 15;
            wp.size = 4 + Math.sin(wp.x) * 2;
            wp.alpha = 0.4;
            wp.color = "#4a7a30";
            break;
          case "rain":
            wp.vx = -30;
            wp.vy = 500 + Math.random() * 100;
            wp.size = 2;
            wp.alpha = 0.3;
            wp.color = "#88aaff";
            break;
          case "dust":
            wp.vx = 15 + Math.sin(performance.now() * 0.0005 + wp.y) * 10;
            wp.vy = 10 + Math.random() * 5;
            wp.size = 2 + Math.random() * 2;
            wp.alpha = 0.25;
            wp.color = "#aaa090";
            break;
          case "embers":
            wp.vx = Math.sin(performance.now() * 0.001 + wp.x * 0.1) * 20;
            wp.vy = -50 - Math.random() * 40;
            wp.size = 2 + Math.random() * 3;
            wp.alpha = 0.6 + Math.random() * 0.3;
            wp.color = Math.random() > 0.5 ? "#ff5522" : "#ffd740";
            break;
          case "snow":
            wp.vx = Math.sin(performance.now() * 0.0008 + wp.y * 0.02) * 25;
            wp.vy = 30 + Math.random() * 20;
            wp.size = 2 + Math.random() * 3;
            wp.alpha = 0.5;
            wp.color = "#ddeeff";
            break;
        }
        wp.x += wp.vx * dt;
        wp.y += wp.vy * dt;
        if (wp.y > H + 10) {
          wp.y = -10;
          wp.x = Math.random() * W;
        }
        if (wp.y < -10) {
          wp.y = H + 10;
          wp.x = Math.random() * W;
        }
        if (wp.x > W + 10) wp.x = -10;
        if (wp.x < -10) wp.x = W + 10;
      }
    }

    /* ============== DRAW FUNCTIONS ============== */
    function drawArenaBackground(arena) {
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, arena.skyTop);
      skyGrad.addColorStop(1, arena.skyBot);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Background elements
      const time = performance.now() * 0.001;
      ctx.globalAlpha = 0.15;
      switch (arena.bgElements) {
        case "lanterns":
          for (let i = 0; i < 6; i++) {
            const lx = W * 0.1 + W * 0.8 * (i / 5);
            const ly = H * 0.15 + Math.sin(time + i) * 10;
            ctx.fillStyle = "#ffd86b";
            ctx.beginPath();
            ctx.arc(lx, ly, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ff8800";
            ctx.beginPath();
            ctx.arc(lx, ly, 6, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case "neon":
          ctx.strokeStyle = "#e040fb";
          ctx.lineWidth = 3;
          for (let i = 0; i < 4; i++) {
            const nx = W * 0.15 + W * 0.7 * (i / 3);
            ctx.strokeRect(nx - 30, H * 0.08, 60, 30);
            ctx.strokeRect(nx - 20, H * 0.12, 40, 15);
          }
          ctx.strokeStyle = "#00e5ff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, H * 0.25);
          ctx.lineTo(W, H * 0.25);
          ctx.stroke();
          break;
        case "torches":
          for (let i = 0; i < 8; i++) {
            const tx = W * 0.05 + W * 0.9 * (i / 7);
            const flicker = 8 + Math.sin(time * 5 + i * 2) * 3;
            ctx.fillStyle = "#ff6600";
            ctx.beginPath();
            ctx.arc(tx, H * 0.35, flicker, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffaa00";
            ctx.beginPath();
            ctx.arc(tx, H * 0.35, flicker * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case "lava":
          ctx.fillStyle = "#ff2200";
          for (let i = 0; i < 5; i++) {
            const bx = ((time * 30 + i * W * 0.22) % (W + 60)) - 30;
            const by = H * 0.8 + Math.sin(time * 2 + i) * 8;
            ctx.beginPath();
            ctx.arc(bx, by, 15 + Math.sin(time * 3 + i) * 5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case "crystals":
          ctx.fillStyle = "#00e5ff";
          for (let i = 0; i < 6; i++) {
            const cx = W * 0.08 + W * 0.84 * (i / 5);
            const ch = 20 + (i % 3) * 10;
            ctx.beginPath();
            ctx.moveTo(cx, H * 0.2);
            ctx.lineTo(cx - 6, H * 0.2 + ch);
            ctx.lineTo(cx + 6, H * 0.2 + ch);
            ctx.closePath();
            ctx.fill();
          }
          break;
      }
      ctx.globalAlpha = 1;

      // Pillars
      ctx.fillStyle = arena.pillars;
      const pillarW = 18,
        pillarH = H * 0.45;
      for (let i = 0; i < 4; i++) {
        const px = W * 0.08 + W * 0.84 * (i / 3);
        ctx.fillRect(
          px - pillarW / 2,
          groundY - pillarH,
          pillarW,
          pillarH + 20,
        );
        // Capital
        ctx.fillStyle = arena.detail;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(
          px - pillarW / 2 - 4,
          groundY - pillarH - 6,
          pillarW + 8,
          8,
        );
        ctx.globalAlpha = 1;
        ctx.fillStyle = arena.pillars;
      }

      // Wall behind ground
      ctx.fillStyle = arena.wallColor;
      ctx.fillRect(0, groundY - 5, W, 8);

      // Ground
      ctx.fillStyle = arena.ground;
      ctx.fillRect(0, groundY + 3, W, H - groundY);
      ctx.fillStyle = arena.groundLine;
      ctx.fillRect(0, groundY + 3, W, 4);

      // Ambient glow
      ctx.fillStyle = arena.ambientColor;
      ctx.fillRect(0, 0, W, H);
    }

    function drawWeather() {
      for (const wp of weatherParticles) {
        ctx.globalAlpha = wp.alpha;
        ctx.fillStyle = wp.color;
        if (getArena().weather === "rain") {
          ctx.fillRect(wp.x, wp.y, 1, wp.size * 3);
        } else {
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function drawStick(
      x,
      y,
      color,
      dir,
      attacking,
      atkType,
      sizeMult = 1,
      isBossFighter = false,
      bossColor = null,
    ) {
      const s = sizeMult;
      const baseColor = isBossFighter ? bossColor || color : color;
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 3 * s;
      ctx.lineCap = "round";

      // Head glow for boss
      if (isBossFighter) {
        ctx.save();
        ctx.shadowColor = bossColor || "#ff0000";
        ctx.shadowBlur = 15 * s;
      }

      // Head
      ctx.beginPath();
      ctx.arc(x, y - 60 * s, 13 * s, 0, Math.PI * 2);
      ctx.stroke();
      if (isBossFighter) {
        // Eyes
        ctx.fillStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(x - 4 * s * dir, y - 62 * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 4 * s * dir, y - 62 * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
        // Horns
        ctx.beginPath();
        ctx.moveTo(x - 10 * s, y - 70 * s);
        ctx.lineTo(x - 16 * s, y - 85 * s);
        ctx.stroke();
        ctx.moveTo(x + 10 * s, y - 70 * s);
        ctx.lineTo(x + 16 * s, y - 85 * s);
        ctx.stroke();
      }

      // Body
      ctx.beginPath();
      ctx.moveTo(x, y - 48 * s);
      ctx.lineTo(x, y - 20 * s);
      ctx.stroke();

      // Arms
      const runPhase = Math.sin(performance.now() * 0.008 + x);
      if (attacking && atkType === "punch") {
        ctx.beginPath();
        ctx.moveTo(x, y - 40 * s);
        ctx.lineTo(x + dir * 35 * s, y - 36 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 40 * s);
        ctx.lineTo(x - dir * 12 * s, y - 30 * s);
        ctx.stroke();
        ctx.fillStyle = isBossFighter ? bossColor || "#ffd740" : "#ffd740";
        ctx.beginPath();
        ctx.arc(x + dir * 38 * s, y - 36 * s, 7 * s, 0, Math.PI * 2);
        ctx.fill();
      } else if (attacking && atkType === "kick") {
        ctx.beginPath();
        ctx.moveTo(x, y - 40 * s);
        ctx.lineTo(x - 12 * s, y - 32 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 40 * s);
        ctx.lineTo(x + 12 * s, y - 32 * s);
        ctx.stroke();
      } else if (attacking && atkType === "upper") {
        ctx.beginPath();
        ctx.moveTo(x, y - 40 * s);
        ctx.lineTo(x + dir * 20 * s, y - 65 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 40 * s);
        ctx.lineTo(x - dir * 10 * s, y - 30 * s);
        ctx.stroke();
        ctx.fillStyle = "#e040fb";
        ctx.beginPath();
        ctx.arc(x + dir * 22 * s, y - 68 * s, 8 * s, 0, Math.PI * 2);
        ctx.fill();
      } else if (attacking && atkType === "special") {
        // Both arms forward with energy
        ctx.beginPath();
        ctx.moveTo(x, y - 40 * s);
        ctx.lineTo(x + dir * 42 * s, y - 38 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 40 * s);
        ctx.lineTo(x + dir * 40 * s, y - 30 * s);
        ctx.stroke();
        // Energy burst
        ctx.save();
        ctx.shadowColor = "#ffd740";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#ffd740";
        for (let i = 0; i < 3; i++) {
          const r = 10 + i * 7;
          ctx.globalAlpha = 0.6 - i * 0.15;
          ctx.beginPath();
          ctx.arc(
            x + dir * (45 + i * 10) * s,
            y - 34 * s,
            r * s,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      } else {
        // Idle arms with slight motion
        const armSwing =
          Math.abs(p.vx) > 10 || (isBossFighter && Math.abs(e.vx) > 10)
            ? runPhase * 15
            : 0;
        ctx.beginPath();
        ctx.moveTo(x, y - 40 * s);
        ctx.lineTo(x - 12 * s + armSwing * s * dir, y - 28 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 40 * s);
        ctx.lineTo(x + 12 * s - armSwing * s * dir, y - 28 * s);
        ctx.stroke();
      }

      // Legs
      if (attacking && atkType === "kick") {
        ctx.beginPath();
        ctx.moveTo(x, y - 20 * s);
        ctx.lineTo(x + dir * 40 * s, y - 12 * s);
        ctx.stroke();
        ctx.fillStyle = isBossFighter ? bossColor || "#ff5252" : "#ff5252";
        ctx.beginPath();
        ctx.arc(x + dir * 43 * s, y - 12 * s, 7 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y - 20 * s);
        ctx.lineTo(x - dir * 8 * s, y);
        ctx.stroke();
      } else {
        const legSwing =
          Math.abs(p.vx) > 10 || (isBossFighter && Math.abs(e.vx) > 10)
            ? runPhase * 12
            : 0;
        ctx.beginPath();
        ctx.moveTo(x, y - 20 * s);
        ctx.lineTo(x - 12 * s + legSwing * s, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 20 * s);
        ctx.lineTo(x + 12 * s - legSwing * s, y);
        ctx.stroke();
      }

      if (isBossFighter) ctx.restore();

      // Hit flash overlay
      const flashVal = isBossFighter ? e.hitFlash : p.hitFlash;
      if (flashVal > 0) {
        ctx.globalAlpha = flashVal;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x, y - 35 * s, 30 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Block stance indicator
      if (!isBossFighter && p.blocking) {
        ctx.strokeStyle = "#00e5ff";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x, y - 35, 35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Shield power-up visual
      if (
        !isBossFighter &&
        activePowerUp.type === "shield" &&
        activePowerUp.shieldHits > 0
      ) {
        ctx.strokeStyle = "#00e5ff";
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.4 + Math.sin(performance.now() * 0.005) * 0.2;
        ctx.beginPath();
        ctx.arc(x, y - 35, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Damage power-up glow
      if (
        !isBossFighter &&
        activePowerUp.type === "damage" &&
        activePowerUp.timer > 0
      ) {
        ctx.save();
        ctx.shadowColor = "#ff5252";
        ctx.shadowBlur = 15;
        ctx.strokeStyle = "#ff5252";
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y - 35, 38, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    function drawPowerUps() {
      for (const pu of droppedPowerUps) {
        const by = pu.y + Math.sin(pu.bobT * 3) * 5;
        ctx.save();
        ctx.shadowColor = pu.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = pu.color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(pu.x, by, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#000";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pu.icon, pu.x, by + 1);
        ctx.restore();
      }
    }

    function drawProjectiles() {
      for (const proj of projectiles) {
        ctx.save();
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = proj.color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.r * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    function drawParticles() {
      for (const pt of particles) {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawFloatingTexts() {
      for (const ft of floatingTexts) {
        ctx.save();
        ctx.font = `bold ${ft.size}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.min(1, ft.life);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }
    }

    function drawBossIntro() {
      if (bossIntroTime <= 0 || !bossIntroFoe) return;
      const t = bossIntroTime;
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.6, t * 0.4)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.font = `bold ${48 + Math.sin(t * 8) * 4}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = bossIntroFoe.accentColor;
      ctx.shadowColor = bossIntroFoe.accentColor;
      ctx.shadowBlur = 25;
      ctx.fillText(`⚔ ${bossIntroFoe.name} ⚔`, W / 2, H / 2 - 20);
      ctx.font = "bold 22px sans-serif";
      ctx.fillStyle = "#eee";
      ctx.shadowBlur = 0;
      ctx.fillText(`BOSS WAVE ${currentWave}`, W / 2, H / 2 + 25);
      ctx.restore();
    }

    function drawBossDefeat() {
      if (bossDefeatTime <= 0) return;
      const t = bossDefeatTime;
      ctx.save();
      ctx.fillStyle = `rgba(255,215,0,${Math.min(0.3, t * 0.2)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.font = `bold ${52 + Math.sin(t * 10) * 3}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd740";
      ctx.shadowColor = "#ffd740";
      ctx.shadowBlur = 30;
      ctx.fillText("BOSS DEFEATED!", W / 2, H / 2 - 15);
      ctx.font = "bold 20px sans-serif";
      ctx.fillStyle = "#69f0ae";
      ctx.shadowBlur = 0;
      ctx.fillText(
        `+${500 * Math.ceil(currentWave / CFG.bossWaveInterval)} BONUS`,
        W / 2,
        H / 2 + 25,
      );
      ctx.restore();
    }

    /* ============== UPDATE FUNCTIONS ============== */
    function updatePlayer(dt) {
      groundY = H - 90;
      const spdMul = getSpdMultiplier();
      if (p.blocking) {
        p.vx = 0;
      } else if (keys.a) {
        p.vx = -p.speed * spdMul;
        p.dir = -1;
      } else if (keys.d) {
        p.vx = p.speed * spdMul;
        p.dir = 1;
      } else p.vx = 0;

      if (keys.w && !p.jumping) {
        p.vy = -p.jump;
        p.jumping = true;
      }
      p.vy += CFG.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y >= groundY) {
        p.y = groundY;
        p.vy = 0;
        p.jumping = false;
      }
      p.x = Math.max(60, Math.min(W - 60, p.x));
      if (p.atkCd > 0) p.atkCd -= dt;
      if (p.atkTimer > 0) {
        p.atkTimer -= dt;
        if (p.atkTimer <= 0) p.attacking = false;
      }
      if (p.hitFlash > 0) p.hitFlash -= dt * 4;
      p.blocking = keys.l && !p.attacking;
    }

    function dealDamageToEnemy(dmg, atkType, hitX, hitY) {
      const finalDmg = Math.floor(dmg * getDmgMultiplier());
      e.hp -= finalDmg;
      e.hitFlash = 0.5;
      sc += finalDmg * (1 + comboCount * 0.2);
      comboCount++;
      comboTimer = CFG.comboTimeout;
      meter = Math.min(CFG.specialMeterMax, meter + CFG.meterPerHit);
      setCombo(comboCount);
      setScore(Math.floor(sc));
      setEnemyHP(Math.max(0, e.hp));
      setSpecialMeter(Math.floor((meter / CFG.specialMeterMax) * 100));
      setComboRank(getComboRank(comboCount));

      const colors = {
        punch: "#ffd740",
        kick: "#ff5252",
        upper: "#e040fb",
        special: "#ffd740",
      };
      spawnParticles(hitX, hitY, colors[atkType] || "#fff", 10 + comboCount, 8);
      spawnFloatingText(
        hitX,
        hitY - 20,
        `-${finalDmg}`,
        colors[atkType] || "#fff",
        18 + Math.min(comboCount * 2, 16),
      );

      if (comboCount >= 3) triggerShake(3 + comboCount, 0.1);
      if (comboCount >= 10) triggerShake(10, 0.2);
      if (atkType === "special") {
        triggerShake(15, 0.35);
        triggerSlowMo();
        triggerFlash(0.5);
      }
      if (atkType === "upper") {
        e.vy = -400;
        triggerShake(8, 0.15);
      }
    }

    function checkPlayerAttack(dt) {
      if (!p.attacking || p.atkTimer < atkDuration(p.atkType) - 0.05) return; // hit only at start of attack
      const range =
        {
          punch: CFG.punchRange,
          kick: CFG.kickRange,
          upper: CFG.upperRange,
          special: CFG.specialRange,
        }[p.atkType] || 40;
      const dx = Math.abs(p.x - e.x),
        dy = Math.abs(p.y - e.y);
      if (dx < range * e.size && dy < 60 * e.size) {
        const baseDmg =
          {
            punch: CFG.basePunchDmg,
            kick: CFG.baseKickDmg,
            upper: CFG.upperDmg,
            special: CFG.specialDmg,
          }[p.atkType] || 10;
        dealDamageToEnemy(
          baseDmg + comboCount * 2,
          p.atkType,
          e.x,
          e.y - 30 * e.size,
        );
      }
    }

    function atkDuration(type) {
      return (
        { punch: 0.18, kick: 0.22, upper: 0.28, special: 0.45 }[type] || 0.2
      );
    }

    function updateEnemy(dt) {
      if (bossIntroTime > 0) return; // Frozen during intro
      e.aiT += dt;
      const dist = p.x - e.x;
      const absDist = Math.abs(dist);

      if (e.aiT > 0.5) {
        // Movement AI
        const attackRange = e.isBoss ? 80 * e.size : 60;
        if (absDist > attackRange) {
          e.vx = dist > 0 ? e.speed : -e.speed;
          e.dir = dist > 0 ? 1 : -1;
          e.runTime += dt;
        } else {
          e.vx *= 0.8;
          e.dir = dist > 0 ? 1 : -1;

          // Attack decision
          const atkChance = (0.8 + currentWave * 0.12) * dt;
          if (Math.random() < atkChance && !e.attacking && e.atkCd <= 0) {
            e.attacking = true;
            e.atkType = Math.random() < 0.4 ? "kick" : "punch";
            e.atkTimer = atkDuration(e.atkType);
            e.atkCd =
              (e.isBoss ? 0.4 : 0.55) - Math.min(0.2, currentWave * 0.015);

            if (
              absDist < (e.atkType === "kick" ? 60 : 45) * e.size &&
              Math.abs(p.y - e.y) < 55
            ) {
              let dmg = (e.atkType === "kick" ? 15 : 10) + currentWave * 0.8;
              if (e.isBoss && e.bossType) dmg *= e.bossType.dmgMult;
              if (p.blocking) {
                dmg *= CFG.blockDmgMult;
                spawnFloatingText(p.x, p.y - 70, "BLOCKED!", "#00e5ff", 18);
              } else if (
                activePowerUp.type === "shield" &&
                activePowerUp.shieldHits > 0
              ) {
                activePowerUp.shieldHits--;
                dmg = 0;
                spawnFloatingText(p.x, p.y - 70, "SHIELD!", "#00e5ff", 20);
                if (activePowerUp.shieldHits <= 0) {
                  activePowerUp = { type: "", timer: 0, shieldHits: 0 };
                  setPowerUpActive("");
                }
              }
              p.hp -= Math.floor(dmg);
              p.hitFlash = 0.4;
              setPlayerHP(Math.max(0, p.hp));
              spawnParticles(
                p.x,
                p.y - 30,
                e.isBoss ? e.bossType?.accentColor || "#ff5252" : "#ff5252",
                6,
              );
              if (!p.blocking) triggerShake(5, 0.12);
            }
          }

          // Boss special attacks
          if (e.isBoss && e.specialCd <= 0 && !e.attacking) {
            e.specialCd = 3 + Math.random() * 2;
            if (e.bossType?.special === "fireball") {
              projectiles.push({
                x: e.x,
                y: e.y - 35 * e.size,
                vx: (dist > 0 ? 1 : -1) * 400,
                vy: -50,
                r: 10,
                color: "#ff4400",
                dmg: 20,
                life: 3,
              });
              projectiles.push({
                x: e.x,
                y: e.y - 50 * e.size,
                vx: (dist > 0 ? 1 : -1) * 350,
                vy: -120,
                r: 8,
                color: "#ffd740",
                dmg: 15,
                life: 3,
              });
            } else if (e.bossType?.special === "dash") {
              e.vx = (dist > 0 ? 1 : -1) * e.speed * 4;
              triggerShake(6, 0.15);
              spawnParticles(e.x, e.y - 30, "#9c27b0", 10, 10);
            } else if (e.bossType?.special === "slam") {
              e.vy = -500;
              setTimeout(() => {
                triggerShake(15, 0.3);
                spawnParticles(e.x, e.y, "#ff5252", 20, 12);
              }, 500);
            }
          }
          if (e.specialCd > 0) e.specialCd -= dt;
        }
      }

      e.vy += CFG.gravity * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.y >= groundY) {
        e.y = groundY;
        e.vy = 0;
      }
      e.x = Math.max(60, Math.min(W - 60, e.x));
      if (e.atkCd > 0) e.atkCd -= dt;
      if (e.atkTimer > 0) {
        e.atkTimer -= dt;
        if (e.atkTimer <= 0) e.attacking = false;
      }
      if (e.hitFlash > 0) e.hitFlash -= dt * 4;
    }

    function updateProjectiles(dt) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.vy += CFG.gravity * 0.3 * dt;
        proj.life -= dt;
        // Hit player
        const dx = p.x - proj.x,
          dy = p.y - 30 - proj.y;
        if (Math.sqrt(dx * dx + dy * dy) < proj.r + 25) {
          let dmg = proj.dmg;
          if (p.blocking) {
            dmg *= CFG.blockDmgMult;
            spawnFloatingText(p.x, p.y - 70, "BLOCKED!", "#00e5ff");
          } else if (
            activePowerUp.type === "shield" &&
            activePowerUp.shieldHits > 0
          ) {
            activePowerUp.shieldHits--;
            dmg = 0;
            spawnFloatingText(p.x, p.y - 70, "SHIELD!", "#00e5ff", 20);
            if (activePowerUp.shieldHits <= 0) {
              activePowerUp = { type: "", timer: 0, shieldHits: 0 };
              setPowerUpActive("");
            }
          }
          p.hp -= Math.floor(dmg);
          p.hitFlash = 0.4;
          setPlayerHP(Math.max(0, p.hp));
          spawnParticles(proj.x, proj.y, proj.color, 8);
          triggerShake(6, 0.15);
          projectiles.splice(i, 1);
          continue;
        }
        if (proj.life <= 0 || proj.y > H || proj.x < -50 || proj.x > W + 50) {
          projectiles.splice(i, 1);
        }
      }
    }

    function updateParticlesAndTexts(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 80 * dt;
        pt.life -= dt * 1.8;
        if (pt.life <= 0) particles.splice(i, 1);
      }
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy * dt;
        ft.life -= dt;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
      }
    }

    function updatePowerUps(dt) {
      // Update active power-up timers
      if (
        activePowerUp.type &&
        activePowerUp.type !== "shield" &&
        activePowerUp.type !== "heal"
      ) {
        activePowerUp.timer -= dt;
        if (activePowerUp.timer <= 0) {
          activePowerUp = { type: "", timer: 0, shieldHits: 0 };
          setPowerUpActive("");
        }
      }
      // Update dropped power-ups
      for (let i = droppedPowerUps.length - 1; i >= 0; i--) {
        const pu = droppedPowerUps[i];
        pu.bobT += dt;
        pu.life -= dt;
        if (pu.life <= 0) {
          droppedPowerUps.splice(i, 1);
          continue;
        }
        // Player pickup
        if (Math.abs(p.x - pu.x) < 35 && Math.abs(p.y - pu.y) < 50) {
          applyPowerUp(pu);
          droppedPowerUps.splice(i, 1);
        }
      }
    }

    function updateCamera(dt) {
      if (camShakeTime > 0) camShakeTime -= dt;
      if (slowMoTime > 0) slowMoTime -= dt;
      if (flashAlpha > 0) flashAlpha -= dt * 3;
      zoomFactor = lerp(zoomFactor, zoomTarget, dt * 3);
    }

    function updateCombo(dt) {
      if (comboTimer > 0) {
        comboTimer -= dt;
      } else if (comboCount > 0) {
        comboCount = 0;
        setCombo(0);
        setComboRank("");
      }
    }

    function updateArenaTransition(dt) {
      if (arenaTransition > 0) {
        arenaTransition -= dt;
        if (arenaTransition < 0) arenaTransition = 0;
      }
    }

    function updateBossTimers(dt) {
      if (bossIntroTime > 0) bossIntroTime -= dt;
      if (bossDefeatTime > 0) bossDefeatTime -= dt;
    }

    function checkWinLoss() {
      if (e.hp <= 0) {
        const wassBoss = e.isBoss;
        if (wassBoss) {
          const bonus = 500 * Math.ceil(currentWave / CFG.bossWaveInterval);
          sc += bonus;
          bossDefeatTime = 2.0;
          triggerShake(18, 0.5);
          triggerSlowMo();
          triggerFlash(0.7);
          zoomTarget = 1;
        } else {
          sc += 100 * currentWave;
        }
        spawnPowerUpDrop(e.x, e.y);
        setScore(Math.floor(sc));
        currentWave++;
        setWave(currentWave);
        initFight();
        return;
      }
      if (p.hp <= 0) {
        over = true;
        started = false;
        if (sc > best) {
          best = Math.floor(sc);
          localStorage.setItem("sfBestScore", String(best));
          setBestScore(best);
        }
        setPhase("over");
      }
    }

    /* ============== MAIN UPDATE ============== */
    function update(dt) {
      // Apply slow-mo
      const effectiveDt = slowMoTime > 0 ? dt * CFG.slowMoFactor : dt;

      updateBossTimers(effectiveDt);
      updateArenaTransition(effectiveDt);
      updatePlayer(effectiveDt);
      checkPlayerAttack(effectiveDt);
      updateEnemy(effectiveDt);
      updateProjectiles(effectiveDt);
      updatePowerUps(effectiveDt);
      updateCombo(effectiveDt);
      updateParticlesAndTexts(effectiveDt);
      updateCamera(dt); // Camera uses real dt for smooth effects
      updateWeather(effectiveDt, getArena());
      checkWinLoss();
    }

    /* ============== MAIN DRAW ============== */
    function draw() {
      ctx.save();
      // Camera shake offset
      let shakeX = 0,
        shakeY = 0;
      if (camShakeTime > 0) {
        const intensity =
          camShakeIntensity * (camShakeTime / CFG.screenShakeDuration);
        shakeX = (Math.random() - 0.5) * intensity * 2;
        shakeY = (Math.random() - 0.5) * intensity * 2;
      }
      // Zoom
      if (zoomFactor !== 1) {
        ctx.translate(W / 2, H / 2);
        ctx.scale(zoomFactor, zoomFactor);
        ctx.translate(-W / 2, -H / 2);
      }
      ctx.translate(shakeX, shakeY);

      const arena = getArena();
      drawArenaBackground(arena);
      drawWeather();
      drawPowerUps();
      drawProjectiles();

      // Draw enemy
      drawStick(
        e.x,
        e.y,
        e.isBoss ? e.bossType?.color || "#ff5252" : "#ff5252",
        e.dir,
        e.attacking,
        e.atkType,
        e.size,
        e.isBoss,
        e.bossType?.accentColor,
      );
      // Draw player
      drawStick(p.x, p.y, "#00e5ff", p.dir, p.attacking, p.atkType);

      drawParticles();
      drawFloatingTexts();

      // Combo display on canvas
      if (comboCount > 2) {
        ctx.save();
        const cSize = 28 + Math.min(comboCount * 2, 24);
        ctx.font = `bold ${cSize}px sans-serif`;
        ctx.fillStyle = "#ffd740";
        ctx.textAlign = "center";
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = "#ff8800";
        ctx.shadowBlur = 15;
        ctx.fillText(`${comboCount}x COMBO!`, W / 2, H * 0.38);
        const rank = getComboRank(comboCount);
        if (rank) {
          ctx.font = `bold ${cSize + 8}px sans-serif`;
          ctx.fillStyle =
            comboCount >= 15
              ? "#ff5252"
              : comboCount >= 10
                ? "#e040fb"
                : "#ffd740";
          ctx.fillText(rank, W / 2, H * 0.38 - cSize - 5);
        }
        ctx.restore();
      }

      // Special meter visual on ground
      if (meter > 0 && meter < CFG.specialMeterMax) {
        const mw = 120;
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(p.x - mw / 2, p.y + 10, mw, 6);
        ctx.fillStyle = "#ffd740";
        ctx.fillRect(
          p.x - mw / 2,
          p.y + 10,
          mw * (meter / CFG.specialMeterMax),
          6,
        );
      } else if (meter >= CFG.specialMeterMax) {
        ctx.save();
        ctx.font = "bold 12px sans-serif";
        ctx.fillStyle = "#ffd740";
        ctx.textAlign = "center";
        ctx.globalAlpha = 0.5 + Math.sin(performance.now() * 0.006) * 0.3;
        ctx.fillText("Q - SPECIAL!", p.x, p.y + 20);
        ctx.restore();
      }

      ctx.restore(); // Undo camera transforms

      // Flash overlay (drawn outside camera transform)
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(flashAlpha, 1)})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Slow-mo vignette
      if (slowMoTime > 0) {
        const vig = ctx.createRadialGradient(
          W / 2,
          H / 2,
          W * 0.3,
          W / 2,
          H / 2,
          W * 0.7,
        );
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, "rgba(0,0,0,0.4)");
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
      }

      // Boss intro overlay
      drawBossIntro();
      drawBossDefeat();
    }

    /* ============== GAME LOOP ============== */
    function gameLoop(now) {
      const rawDt = Math.min((now - lastTime) / 1000, 0.05); // Cap at 50ms (20fps min)
      lastTime = now;

      if (started && !over) update(rawDt);
      draw();
      animId = requestAnimationFrame(gameLoop);
    }

    /* ============== INPUT ============== */
    const onKeyDown = (ev) => {
      const k = ev.key.toLowerCase();
      if (ev.code === "Space" && !started && !over) {
        started = true;
        over = false;
        sc = 0;
        currentWave = 1;
        comboCount = 0;
        meter = 0;
        currentArenaIdx = 0;
        arenaTransition = 0;
        activePowerUp = { type: "", timer: 0, shieldHits: 0 };
        setScore(0);
        setWave(1);
        setCombo(0);
        setSpecialMeter(0);
        setComboRank("");
        setPowerUpActive("");
        setArenaName(ARENAS[0].name);
        initFight();
        setPhase("playing");
      }
      if (k in keys) keys[k] = true;
      if (!started || over || p.blocking) return;
      if (k === "j" && !p.attacking && p.atkCd <= 0) {
        p.attacking = true;
        p.atkType = "punch";
        p.atkTimer = atkDuration("punch");
        p.atkCd = CFG.punchCd;
      }
      if (k === "k" && !p.attacking && p.atkCd <= 0) {
        p.attacking = true;
        p.atkType = "kick";
        p.atkTimer = atkDuration("kick");
        p.atkCd = CFG.kickCd;
      }
      if (k === "s" && !p.attacking && p.atkCd <= 0 && !p.jumping) {
        p.attacking = true;
        p.atkType = "upper";
        p.atkTimer = atkDuration("upper");
        p.atkCd = CFG.upperCd;
        p.vy = -350;
        p.jumping = true;
      }
      if (k === "q" && !p.attacking && meter >= CFG.specialMeterMax) {
        p.attacking = true;
        p.atkType = "special";
        p.atkTimer = atkDuration("special");
        p.atkCd = CFG.specialCd;
        meter = 0;
        setSpecialMeter(0);
      }
    };
    const onKeyUp = (ev) => {
      const k = ev.key.toLowerCase();
      if (k in keys) keys[k] = false;
    };

    stateRef.current.restart = () => {
      over = false;
      started = false;
      sc = 0;
      currentWave = 1;
      comboCount = 0;
      meter = 0;
      particles.length = 0;
      floatingTexts.length = 0;
      droppedPowerUps.length = 0;
      projectiles.length = 0;
      activePowerUp = { type: "", timer: 0, shieldHits: 0 };
      currentArenaIdx = 0;
      arenaTransition = 0;
      camShakeTime = 0;
      slowMoTime = 0;
      flashAlpha = 0;
      zoomFactor = 1;
      zoomTarget = 1;
      bossIntroTime = 0;
      bossDefeatTime = 0;
      setScore(0);
      setWave(1);
      setCombo(0);
      setSpecialMeter(0);
      setComboRank("");
      setPowerUpActive("");
      setArenaName(ARENAS[0].name);
      p.hp = 100;
      p.maxHp = 100;
      initFight();
      setPhase("menu");
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    initWeather();
    initFight();
    lastTime = performance.now();
    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="sf-root">
      <canvas ref={canvasRef} className="sf-canvas" />

      {phase === "menu" && (
        <div className="sf-overlay">
          <h1>🥊 Stickman Fighter</h1>
          <p className="sf-subtitle">
            Epic Combat with Bosses, Arenas & Special Moves
          </p>
          <div className="sf-keys">
            <p>
              <b>A / D</b> – Move &nbsp; <b>W</b> – Jump &nbsp; <b>L</b> – Block
            </p>
            <p>
              <b>J</b> – Punch &nbsp; <b>K</b> – Kick &nbsp; <b>S</b> – Uppercut
            </p>
            <p>
              <b>Q</b> – Special Attack (when meter full)
            </p>
          </div>
          <p className="sf-start-hint">Press SPACE to fight</p>
          {bestScore > 0 && (
            <p className="sf-best-display">Best: {bestScore}</p>
          )}
        </div>
      )}

      {phase === "playing" && (
        <div className="sf-hud">
          <div className="sf-hud-left">
            <div className="sf-bar-wrap">
              <span className="sf-label cyan-text">YOU</span>
              <div className="sf-bar">
                <div
                  className="sf-fill cyan"
                  style={{ width: `${playerHP}%` }}
                />
              </div>
            </div>
            {specialMeter > 0 && (
              <div className="sf-meter-wrap">
                <span className="sf-label gold-text">SP</span>
                <div className="sf-meter-bar">
                  <div
                    className="sf-meter-fill"
                    style={{ width: `${specialMeter}%` }}
                  />
                </div>
                {specialMeter >= 100 && (
                  <span className="sf-ready-flash">READY!</span>
                )}
              </div>
            )}
          </div>

          <div className="sf-info">
            <div className="sf-score-display">Score: {score}</div>
            <div className="sf-wave-display">
              Wave {wave} {isBoss && <span className="sf-boss-tag">BOSS</span>}
            </div>
            <div className="sf-arena-name">{arenaName}</div>
            {combo > 1 && (
              <div className="sf-combo-hud">
                {combo}x{" "}
                {comboRank && <span className="sf-rank">{comboRank}</span>}
              </div>
            )}
            {powerUpActive && (
              <div className="sf-powerup-hud">{powerUpActive}</div>
            )}
          </div>

          <div className="sf-hud-right">
            <span className="sf-label red-text">
              {isBoss ? e.bossType?.name || "BOSS" : "ENEMY"}
            </span>
            <div className="sf-bar-wrap">
              <div className={`sf-bar ${isBoss ? "boss-bar" : ""}`}>
                <div
                  className={`sf-fill ${isBoss ? "boss" : "red"}`}
                  style={{
                    width: `${Math.max(0, (enemyHP / enemyMaxHP) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "over" && (
        <div className="sf-gameover">
          <h2>{playerHP <= 0 ? "Defeated!" : "Victory!"}</h2>
          <p className="sf-go-score">Score: {score}</p>
          <p>Waves Survived: {wave - 1}</p>
          <p className="sf-go-best">Best: {bestScore}</p>
          <button onClick={() => stateRef.current.restart?.()}>
            Fight Again
          </button>
        </div>
      )}

      <BackButton />
    </div>
  );
}
