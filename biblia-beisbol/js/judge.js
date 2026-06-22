/* ============================================================
   judge.js — Lógica del Panel del Juez
   ============================================================ */

function $(id) { return document.getElementById(id); }
let currentAdvTeam = 0;
let lastSoundNonce = null;
let drawTimeout = null;

function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, 2600);
}

function renderTopbar(state) {
  const [a, b] = state.teams;
  $("tbNameA").textContent = a.name;
  $("tbNameB").textContent = b.name;
  $("tbScoreA").textContent = a.score;
  $("tbScoreB").textContent = b.score;
  $("tbDotA").style.background = a.color;
  $("tbDotB").style.background = b.color;
  $("tbInning").textContent = `Inning ${Math.min(state.inning, state.config.maxInnings)}/${state.config.maxInnings}`;
  $("tbPhase").textContent = ({
    idle: "Listo", drawing: "Sorteando", asking: "Respondiendo",
    flyout: "Fly Out", "run-decision": "Carrera", gameover: "Terminado"
  })[state.current.phase] || state.current.phase;
  $("tbOuts").textContent = `Outs ${state.teams[state.battingTeamIndex].outs}`;
}

function renderDifficulties(state) {
  $("battingNow").textContent = state.teams[state.battingTeamIndex].name;

  const active = state.config.activeCategories;
  $("activeCatsNote").textContent = active && active.length
    ? "Libros en juego: " + active.join(", ")
    : "Libros en juego: todas las categorías disponibles";

  const grid = $("categoryGrid");
  grid.innerHTML = "";
  const disabled = state.current.phase !== "idle";
  DIFFICULTY_LEVELS.forEach((dif) => {
    const count = Engine.availableQuestionsByDifficulty(dif).length;
    const valor = DIFFICULTY_TO_VALUE[dif];
    const playType = VALUE_TO_PLAY[valor];
    const btn = document.createElement("button");
    btn.className = "btn cat-btn";
    btn.disabled = disabled || count === 0;
    btn.innerHTML = `${dif}<span class="cnt">${PLAY_LABELS[playType]} · ${valor} pts · ${count} disponibles</span>`;
    btn.addEventListener("click", () => {
      const res = Engine.drawQuestionByDifficulty(dif);
      if (!res.ok) { showToast(res.reason); return; }
      clearTimeout(drawTimeout);
      drawTimeout = setTimeout(() => Engine.revealQuestion(), 1700);
    });
    grid.appendChild(btn);
  });
  $("categorySection").style.opacity = state.current.phase === "gameover" ? 0.4 : 1;
}

function renderQuestion(state) {
  const show = state.current.phase === "asking" && state.current.question;
  $("questionSection").hidden = !show;
  if (show) {
    const q = state.current.question;
    $("qjCategoria").textContent = q.categoria;
    $("qjValor").textContent = q.valor + " pts";
    $("qjPhaseTag").textContent = q.dificultad;
    $("qjTexto").textContent = q.pregunta;
    $("qjRespuesta").textContent = q.respuesta;
  }
}

function renderFlyout(state) {
  const show = state.current.phase === "flyout";
  $("flyoutSection").hidden = !show;
  if (show) {
    const defIdx = state.current.flyoutFor != null ? state.current.flyoutFor : (state.battingTeamIndex === 0 ? 1 : 0);
    $("flyoutTeamName").textContent = state.teams[defIdx].name;
    $("flyoutRespuesta").textContent = state.current.question ? state.current.question.respuesta : "—";
  }
}

function renderRunDecision(state) {
  const show = state.current.phase === "run-decision" && state.pendingRuns.length > 0;
  $("runSection").hidden = !show;
  if (show) {
    $("runTeamNameJ").textContent = state.teams[state.pendingRuns[0].teamIndex].name;
  }
}

function renderAdvantages(state) {
  const team = state.teams[currentAdvTeam];
  $("advTab0").classList.toggle("active", currentAdvTeam === 0);
  $("advTab1").classList.toggle("active", currentAdvTeam === 1);
  $("advTab0").textContent = state.teams[0].name + " (" + state.teams[0].tokens + " \uD83C\uDFAB)";
  $("advTab1").textContent = state.teams[1].name + " (" + state.teams[1].tokens + " \uD83C\uDFAB)";
  const grid = $("advGrid");
  grid.innerHTML = "";
  ADVANTAGES.forEach((adv) => {
    const row = document.createElement("div");
    row.className = "adv-item";
    const canAfford = team.tokens >= adv.cost;
    row.innerHTML = `
      <div class="info"><b>${adv.label} \u00B7 ${adv.cost} \uD83C\uDFAB</b><span>${adv.desc}</span></div>
      <button class="btn btn--amber" ${canAfford ? "" : "disabled"}>Usar</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      const res = Engine.useAdvantage(currentAdvTeam, adv.id);
      if (!res.ok) showToast(res.reason);
    });
    grid.appendChild(row);
  });
}

function renderSounds() {
  const grid = $("soundGrid");
  if (grid.dataset.built) return;
  grid.dataset.built = "1";
  SOUND_EVENTS.forEach((s) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = s.label;
    btn.addEventListener("click", () => Engine.playSoundManual(s.id));
    grid.appendChild(btn);
  });
}

function renderLog(state) {
  const list = $("logList");
  list.innerHTML = state.log.slice(0, 30).map((entry) => {
    const time = new Date(entry.ts).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return `<div class="log-item"><time>${time}</time>${entry.text}</div>`;
  }).join("");
}

function handleSound(state) {
  const ev = state.soundEvent;
  if (ev && ev.nonce !== lastSoundNonce) {
    lastSoundNonce = ev.nonce;
    SoundEngine.play(ev.id);
  }
}

function render(state) {
  renderTopbar(state);
  renderDifficulties(state);
  renderQuestion(state);
  renderFlyout(state);
  renderRunDecision(state);
  renderAdvantages(state);
  renderLog(state);
  handleSound(state);

  $("btnStartGame").disabled = state.meta.started;
  $("btnCambioInning").disabled = state.current.phase === "gameover";
}

function bindEvents() {
  $("btnCorrecta").addEventListener("click", () => Engine.markCorrect());
  $("btnIncorrecta").addEventListener("click", () => Engine.markIncorrect());
  $("btnFlyCorrecta").addEventListener("click", () => Engine.resolveFlyOut(true));
  $("btnFlyIncorrecta").addEventListener("click", () => Engine.resolveFlyOut(false));
  $("btnCobrar").addEventListener("click", () => Engine.chooseRunOption("cobrar"));
  $("btnFicha").addEventListener("click", () => Engine.chooseRunOption("ficha"));
  $("btnManualFlyOut").addEventListener("click", () => Engine.triggerFlyOut());
  $("btnSiguiente").addEventListener("click", () => Engine.skipQuestion());
  $("btnCambioInning").addEventListener("click", () => {
    if (confirm("\u00BFForzar el cambio de inning ahora mismo?")) Engine.forceEndInning();
  });
  $("btnPauseTimer").addEventListener("click", () => {
    const t = Engine.state.current.timer;
    if (t.running) Engine.pauseTimer(); else if (t.remainingAtPause > 0) Engine.resumeTimer();
    else showToast("No hay un cronómetro activo.");
  });
  $("btnStartGame").addEventListener("click", () => Engine.startGame());

  document.querySelectorAll(".play-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm(`\u00BFAplicar jugada manual: ${btn.dataset.play.toUpperCase()}?`)) {
        Engine.manualPlay(btn.dataset.play);
      }
    });
  });

  $("advTab0").addEventListener("click", () => { currentAdvTeam = 0; render(Engine.state); });
  $("advTab1").addEventListener("click", () => { currentAdvTeam = 1; render(Engine.state); });

  document.addEventListener("click", () => SoundEngine.unlock(), { once: true });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  renderSounds();
  Engine.subscribe(render);
});
