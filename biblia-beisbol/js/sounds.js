/* ============================================================
   sounds.js — Motor de audio sintetizado (sin internet)
   Genera todos los efectos del concurso con Web Audio API,
   para no depender de archivos .mp3 externos.
   ============================================================ */

const SoundEngine = (() => {
  let ctx = null;
  let muted = false;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, gainVal, glideTo) {
    const c = ensureCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, c.currentTime + start);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + start + dur);
    gain.gain.setValueAtTime(0, c.currentTime + start);
    gain.gain.linearRampToValueAtTime(gainVal != null ? gainVal : 0.25, c.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + dur + 0.05);
  }

  function noiseBurst(start, dur, gainVal) {
    const c = ensureCtx();
    const bufferSize = c.sampleRate * dur;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(gainVal != null ? gainVal : 0.3, c.currentTime + start);
    src.connect(gain).connect(c.destination);
    src.start(c.currentTime + start);
  }

  const RECIPES = {
    inicio: () => { [261.6, 329.6, 392, 523.3].forEach((f, i) => tone(f, i * 0.12, 0.35, "triangle")); },
    cambioInning: () => { tone(392, 0, 0.18, "square"); tone(523.3, 0.18, 0.22, "square"); },
    hit: () => { tone(440, 0, 0.12, "square"); noiseBurst(0, 0.08, 0.2); },
    double: () => { tone(440, 0, 0.1, "square"); tone(554.4, 0.1, 0.14, "square"); },
    triple: () => { tone(440, 0, 0.09, "square"); tone(554.4, 0.09, 0.09, "square"); tone(659.3, 0.18, 0.18, "square"); },
    homerun: () => {
      [392, 523.3, 659.3, 784, 987.8].forEach((f, i) => tone(f, i * 0.09, 0.3, "sawtooth", 0.22));
      noiseBurst(0.05, 0.4, 0.15);
    },
    flyout: () => { tone(300, 0, 0.18, "sawtooth", 0.2, 120); noiseBurst(0, 0.15, 0.15); },
    carrera: () => { [523.3, 659.3, 784].forEach((f, i) => tone(f, i * 0.1, 0.25, "triangle")); },
    victoria: () => {
      [392, 392, 392, 523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, i * 0.16, 0.5, "triangle", 0.22));
    },
    cuentaRegresiva: () => { tone(880, 0, 0.1, "square", 0.18); },
    out: () => { tone(180, 0, 0.3, "sawtooth", 0.2, 80); }
  };

  function play(id) {
    if (muted) return;
    try {
      const recipe = RECIPES[id];
      if (recipe) recipe();
    } catch (e) { /* el navegador puede requerir interacción previa del usuario */ }
  }

  function setMuted(v) { muted = v; }
  function isMuted() { return muted; }
  function unlock() { try { ensureCtx(); } catch (e) {} }

  return { play, setMuted, isMuted, unlock, list: SOUND_EVENTS };
})();
