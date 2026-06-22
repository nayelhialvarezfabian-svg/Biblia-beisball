/* ============================================================
   public.js — Lógica de la Pantalla Pública
   ============================================================ */

const PHASE_LABELS = {
  idle: "Listo",
  drawing: "Sorteando…",
  asking: "Respondiendo",
  flyout: "¡Fly Out!",
  "run-decision": "Carrera",
  gameover: "Juego terminado"
};

const ANIM_TEXT = {
  inicio: { text: "¡Comienza el juego!", cls: "" },
  hit: { text: "¡Hit!", cls: "" },
  double: { text: "¡Doble Hit!", cls: "" },
  triple: { text: "¡Triple Hit!", cls: "" },
  homerun: { text: "¡Home Run!", cls: "fx-grass" },
  flyout: { text: "¡Fly Out!", cls: "fx-danger" },
  carrera: { text: "¡Carrera!", cls: "fx-grass" },
  cambioInning: { text: "Cambio de Inning", cls: "" },
  victoria: { text: "¡Victoria!", cls: "fx-grass" }
};

let lastSoundNonce = null;
let lastAnimNonce = null;
let lastTickSecond = null;
let rafId = null;

function $(id) { return document.getElementById(id); }

function setLogo(el, logoKey) {
  const lib = LOGO_LIBRARY[logoKey] || LOGO_LIBRARY.leon;
  el.innerHTML = lib.svg;
}

function renderFlags(container, team) {
  const items = [];
  if (team.flags.shield) items.push('<span class="badge badge--grass">🛡️ Escudo</span>');
  if (team.flags.doubleScore) items.push('<span class="badge badge--grass">x2 Puntos</span>');
  if (team.flags.fireball) items.push('<span class="badge badge--leather">🔥 Bola de Fuego</span>');
  container.innerHTML = items.join("");
}

function render(state) {
  const [a, b] = state.teams;

  document.getElementById("teamPanelA").style.setProperty("--team-color", a.color);
  document.getElementById("teamPanelB").style.setProperty("--team-color", b.color);
  setLogo($("logoA"), a.logo);
  setLogo($("logoB"), b.logo);
  $("nameA").textContent = a.name;
  $("nameB").textContent = b.name;
  $("scoreA").textContent = a.score;
  $("scoreB").textContent = b.score;
  $("runsA").textContent = a.runs;
  $("runsB").textContent = b.runs;
  $("outsA").textContent = a.outs;
  $("outsB").textContent = b.outs;
  $("tokensA").textContent = a.tokens;
  $("tokensB").textContent = b.tokens;
  renderFlags($("flagsA"), a);
  renderFlags($("flagsB"), b);

  $("batA").classList.toggle("active", state.battingTeamIndex === 0 && state.current.phase !== "gameover");
  $("batB").classList.toggle("active", state.battingTeamIndex === 1 && state.current.phase !== "gameover");

  $("inningNow").textContent = Math.min(state.inning, state.config.maxInnings);
  $("inningMax").textContent = state.config.maxInnings;
  $("phaseBadge").textContent = PHASE_LABELS[state.current.phase] || state.current.phase;

  // diamante: bases del equipo al bate
  const batting = state.teams[state.battingTeamIndex];
  document.getElementById("diamondSvg").style.setProperty("--team-color", batting.color);
  ["base1", "base2", "base3"].forEach((id, i) => {
    const el = $(id);
    el.classList.toggle("lit", !!batting.bases[i]);
    el.style.setProperty("--team-color", batting.color);
  });

  // tarjeta de pregunta
  const q = state.current.question;
  const showCard = q && state.current.phase !== "drawing" && state.current.phase !== "gameover";
  $("questionCard").hidden = !showCard;
  $("idlePrompt").hidden = showCard || state.current.phase === "drawing" || state.current.phase === "gameover";
  if (showCard) {
    $("qCategoria").textContent = q.categoria;
    $("qValor").textContent = q.valor + " pts";
    $("qTexto").textContent = q.pregunta;
    $("qPista").hidden = !q.revealedHint || !q.pista;
    $("qPista").textContent = q.pista ? ("Pista: " + q.pista) : "";
  }

  // animación de sorteo
  const drawingLabel = $("drawingLabel");
  drawingLabel.hidden = state.current.phase !== "drawing";
  if (state.current.phase === "drawing") drawingLabel.textContent = state.current.chosenDifficulty || "…";

  // fly out banner
  const flyoutBanner = $("flyoutBanner");
  flyoutBanner.hidden = state.current.phase !== "flyout";
  if (state.current.phase === "flyout") {
    const defIdx = state.current.flyoutFor != null ? state.current.flyoutFor : (state.battingTeamIndex === 0 ? 1 : 0);
    $("flyoutTeam").textContent = state.teams[defIdx].name + " tiene la oportunidad";
  }

  // overlay de carrera
  const runOverlay = $("runOverlay");
  runOverlay.hidden = state.current.phase !== "run-decision" || state.pendingRuns.length === 0;
  if (!runOverlay.hidden) {
    $("runTeamName").textContent = state.teams[state.pendingRuns[0].teamIndex].name;
  }

  // overlay de fin de juego
  const overEl = $("gameOverOverlay");
  overEl.hidden = state.current.phase !== "gameover";
  if (!overEl.hidden) {
    $("winnerName").textContent = state.winnerIndex == null ? "¡Empate!" : ("¡Gana " + state.teams[state.winnerIndex].name + "!");
    $("finalScore").textContent = `${a.name} ${a.score} pts — ${b.score} pts ${b.name}`;
  }

  // timer visible?
  const timerActive = state.current.timer.running || state.current.timer.remainingAtPause > 0;
  $("timerStage").hidden = !timerActive;

  handleSound(state);
  handleAnimation(state);
}

function handleSound(state) {
  const ev = state.soundEvent;
  if (ev && ev.nonce !== lastSoundNonce) {
    lastSoundNonce = ev.nonce;
    SoundEngine.play(ev.id);
  }
}

function fxPopup(text, cls) {
  const layer = $("animLayer");
  const span = document.createElement("div");
  span.className = "fx-text " + (cls || "");
  span.textContent = text;
  layer.innerHTML = "";
  layer.appendChild(span);
  setTimeout(() => { if (layer.contains(span)) layer.removeChild(span); }, 1150);
}

function flyRunner(teamIndex) {
  const dot = $("runnerDot");
  const color = Engine.state.teams[teamIndex].color;
  dot.setAttribute("fill", color);
  const pts = [[200, 320], [320, 180], [200, 60], [80, 180], [200, 320]];
  dot.setAttribute("opacity", "1");
  dot.setAttribute("cx", pts[0][0]);
  dot.setAttribute("cy", pts[0][1]);
  let i = 1;
  const step = () => {
    if (i >= pts.length) { dot.setAttribute("opacity", "0"); return; }
    dot.setAttribute("cx", pts[i][0]);
    dot.setAttribute("cy", pts[i][1]);
    i++;
    setTimeout(step, 260);
  };
  setTimeout(step, 60);
}

function handleAnimation(state) {
  const anim = state.lastAnimation;
  if (!anim || anim.nonce === lastAnimNonce) return;
  lastAnimNonce = anim.nonce;
  const info = ANIM_TEXT[anim.type];
  if (info) fxPopup(info.text, info.cls);
  if (["hit", "double", "triple", "homerun", "carrera"].includes(anim.type) && anim.payload && anim.payload.teamIndex != null) {
    flyRunner(anim.payload.teamIndex);
  }
}

/* ---------- bucle local del cronómetro (suave, sin depender de broadcasts por segundo) ---------- */
function timerLoop() {
  const remaining = Engine.getRemainingSeconds();
  const t = Engine.state.current.timer;
  const duration = t.duration || 1;
  const pct = Math.max(0, Math.min(1, remaining / duration));
  const circumference = 326.7;
  $("timerRingFg").style.strokeDashoffset = String(circumference * (1 - pct));
  $("timerNum").textContent = Math.ceil(remaining);
  $("timerRingFg").classList.toggle("warn", remaining <= 5 && remaining > 0);

  const sec = Math.ceil(remaining);
  if (t.running && sec <= 5 && sec > 0 && sec !== lastTickSecond) {
    lastTickSecond = sec;
    SoundEngine.play("cuentaRegresiva");
  }
  if (!t.running) lastTickSecond = null;

  rafId = requestAnimationFrame(timerLoop);
}

/* ---------- activación de audio (política de autoplay del navegador) ---------- */
function showUnlockOverlay() {
  const div = document.createElement("div");
  div.className = "overlay";
  div.id = "unlockOverlay";
  div.innerHTML = `<div class="modal parchment" style="text-align:center;">
    <p class="eyebrow">Pantalla pública</p>
    <h2 class="h-display">Toca para activar el sonido</h2>
    <p>Los navegadores requieren una interacción antes de permitir audio.</p>
  </div>`;
  document.body.appendChild(div);
  const dismiss = () => {
    SoundEngine.unlock();
    div.remove();
    window.removeEventListener("click", dismiss);
    window.removeEventListener("keydown", dismiss);
  };
  window.addEventListener("click", dismiss);
  window.addEventListener("keydown", dismiss);
}

document.addEventListener("DOMContentLoaded", () => {
  showUnlockOverlay();
  Engine.subscribe(render);
  rafId = requestAnimationFrame(timerLoop);
});
