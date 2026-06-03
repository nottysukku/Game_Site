// src/pages/fps/FpsAudio.js

let audioCtx = null;
let ambientWindNode = null;
let ambientWindGain = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Helper to create noise buffer for explosions, wind, and grass rustles
function createNoiseBuffer(ctx, duration = 1.0) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// Procedural Gunshot synthesis
export function playShootSound(type, isLocal = true) {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Customize pitch & decay based on weapon type
    if (type === 'smg') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(950, time);
      osc.frequency.exponentialRampToValueAtTime(50, time + 0.08);
      gain.gain.setValueAtTime(isLocal ? 0.12 : 0.05, time);
      gain.gain.linearRampToValueAtTime(0.01, time + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.08);
    }
    else if (type === 'ar') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
      gain.gain.setValueAtTime(isLocal ? 0.15 : 0.06, time);
      gain.gain.linearRampToValueAtTime(0.01, time + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.12);
    }
    else if (type === 'shotgun') {
      // Shotgun: Booming low frequency + white noise explosion blast
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(250, time);
      osc.frequency.exponentialRampToValueAtTime(30, time + 0.25);
      
      gain.gain.setValueAtTime(isLocal ? 0.25 : 0.08, time);
      gain.gain.linearRampToValueAtTime(0.01, time + 0.25);
      
      // Noise component for blast crackle
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.2);
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(400, time);
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(isLocal ? 0.18 : 0.05, time);
      noiseGain.gain.linearRampToValueAtTime(0.01, time + 0.18);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + 0.25);
      noise.start(time);
      noise.stop(time + 0.2);
    }
    else if (type === 'sniper') {
      // Sniper: Booming low resonance + longer tail decay
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, time);
      osc.frequency.exponentialRampToValueAtTime(20, time + 0.4);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, time);
      filter.frequency.exponentialRampToValueAtTime(40, time + 0.4);

      gain.gain.setValueAtTime(isLocal ? 0.3 : 0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + 0.4);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + 0.4);
    }
    else if (type === 'pistol') {
      // Pistol: Sharp snap click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(700, time);
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);
      gain.gain.setValueAtTime(isLocal ? 0.14 : 0.05, time);
      gain.gain.linearRampToValueAtTime(0.01, time + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.1);
    }
  } catch (e) {}
}

// Synthesized mechanical reload clinks
export function playReloadSound(type) {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;
    
    // First click: Drop magazine
    const click1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    click1.type = 'triangle';
    click1.frequency.setValueAtTime(1000, time);
    click1.frequency.exponentialRampToValueAtTime(150, time + 0.08);
    gain1.gain.setValueAtTime(0.04, time);
    gain1.gain.linearRampToValueAtTime(0.001, time + 0.08);
    click1.connect(gain1);
    gain1.connect(ctx.destination);
    click1.start(time);
    click1.stop(time + 0.08);

    // Second click: Slide reload (250ms later)
    const click2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    click2.type = 'sine';
    click2.frequency.setValueAtTime(1400, time + 0.25);
    click2.frequency.exponentialRampToValueAtTime(400, time + 0.35);
    gain2.gain.setValueAtTime(0.06, time + 0.25);
    gain2.gain.linearRampToValueAtTime(0.001, time + 0.35);
    click2.connect(gain2);
    gain2.connect(ctx.destination);
    click2.start(time + 0.25);
    click2.stop(time + 0.35);
  } catch (e) {}
}

// Magazine Empty Click
export function playEmptyClickSound() {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1100, time);
    osc.frequency.linearRampToValueAtTime(700, time + 0.04);
    gain.gain.setValueAtTime(0.05, time);
    gain.gain.linearRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.04);
  } catch (e) {}
}

// Hitmarker feedback sounds
export function playHitmarkerSound(isHeadshot = false) {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (isHeadshot) {
      // Headshot Ding! High-pitched metallic ring
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2100, time);
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
      
      // Harmonics for bell texture
      const harmonic = ctx.createOscillator();
      const hGain = ctx.createGain();
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(3150, time);
      hGain.gain.setValueAtTime(0.03, time);
      hGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      
      harmonic.connect(hGain);
      hGain.connect(ctx.destination);
      harmonic.start(time);
      harmonic.stop(time + 0.2);
    } else {
      // Normal hit: soft quick click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.linearRampToValueAtTime(50, time + 0.04);
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.linearRampToValueAtTime(0.001, time + 0.04);
    }
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + (isHeadshot ? 0.35 : 0.04));
  } catch (e) {}
}

// Explosion synthesizer
export function playExplosionSound() {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;
    const duration = 0.55;
    
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, duration);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, time);
    filter.frequency.exponentialRampToValueAtTime(10, time + duration);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.002, time + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(time);
    noise.stop(time + duration);
  } catch (e) {}
}

// Surface footstep sounds (Grass, Wood, Concrete, Metal)
export function playFootstepSound(surface = 'concrete') {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;
    
    if (surface === 'grass') {
      // Grass: soft bandpass noise rustle
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.12);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, time);
      filter.Q.setValueAtTime(1.5, time);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.04, time);
      gain.gain.linearRampToValueAtTime(0.001, time + 0.12);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(time);
      noise.stop(time + 0.12);
    } 
    else if (surface === 'wood') {
      // Wood: hollow thud/clack (sine at 130Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);
      gain.gain.setValueAtTime(0.07, time);
      gain.gain.linearRampToValueAtTime(0.001, time + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.15);
    } 
    else if (surface === 'metal') {
      // Metal: high frequency ping + decay
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, time);
      osc.frequency.exponentialRampToValueAtTime(200, time + 0.18);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(500, time);
      
      gain.gain.setValueAtTime(0.035, time);
      gain.gain.linearRampToValueAtTime(0.001, time + 0.18);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + 0.18);
    } 
    else {
      // Concrete: short flat click thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(60, time + 0.1);
      gain.gain.setValueAtTime(0.06, time);
      gain.gain.linearRampToValueAtTime(0.001, time + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.1);
    }
  } catch (e) {}
}

// Ambient background wind generator (Continuous loop)
export function startAmbientWind() {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;
    
    if (ambientWindNode) return; // Already playing
    
    ambientWindNode = ctx.createBufferSource();
    ambientWindNode.buffer = createNoiseBuffer(ctx, 4.0); // 4-second loopable block
    ambientWindNode.loop = true;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, time); // Low rumble wind
    filter.Q.setValueAtTime(0.8, time);
    
    ambientWindGain = ctx.createGain();
    ambientWindGain.gain.setValueAtTime(0, time);
    ambientWindGain.gain.linearRampToValueAtTime(0.035, time + 2.0); // Slow fade-in over 2s
    
    ambientWindNode.connect(filter);
    filter.connect(ambientWindGain);
    ambientWindGain.connect(ctx.destination);
    
    ambientWindNode.start(time);
  } catch (e) {}
}

export function stopAmbientWind() {
  try {
    if (ambientWindNode) {
      ambientWindNode.stop();
      ambientWindNode.disconnect();
      ambientWindNode = null;
    }
    if (ambientWindGain) {
      ambientWindGain.disconnect();
      ambientWindGain = null;
    }
  } catch (e) {}
}
