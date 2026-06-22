/* ============================================================
   state.js — Motor del Concurso Bíblico de Béisbol
   Estado único de la partida + persistencia local + sincronía
   en tiempo real entre Pantalla Pública / Juez / Administrador
   usando BroadcastChannel y localStorage (100% sin internet).
   ============================================================ */

const STORAGE_KEY = "bbq_state_v1";
const SAVES_KEY = "bbq_saves_v1";
const CHANNEL_NAME = "bbq-channel";

function uid(prefix) {
  return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

function freshState() {
  return {
    meta: { rev: 1, updatedAt: Date.now(), started: false },
    config: {
      maxInnings: 6,
      normalTime: 30,
      stealTime: 10,
      categories: DEFAULT_CATEGORIES.slice(),
      activeCategories: [] // categorías/libros habilitados para ESTA partida; vacío = todas
    },
    teams: defaultTeams(),
    battingTeamIndex: 0,
    inning: 1,
    outs: 0,
    bases: [false, false, false],
    questions: sampleQuestions(),
    usedQuestionIds: [],
    pendingRuns: [], // [{teamIndex}]
    current: {
      phase: "idle", // idle | drawing | asking | flyout | run-decision | gameover
      question: null,
      category: null,
      flyoutFor: null,
      lastResult: null, // {teamIndex, correct, questionId}
      timer: { running: false, mode: "normal", endAt: null, remainingAtPause: 0, duration: 0, sessionId: null }
    },
    log: [],
    soundEvent: null,
    lastAnimation: null,
    winnerIndex: null
  };
}

class GameEngine {
  constructor() {
    this.state = this._load() || freshState();
    this.listeners = new Set();
    this.lastServerRev = 0;
    this.serverConnected = false;
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (ev) => this._onRemote(ev.data);
    } catch (e) {
      this.channel = null;
    }
    window.addEventListener("storage", (ev) => {
      if (ev.key === STORAGE_KEY && ev.newValue) {
        try { this._onRemote(JSON.parse(ev.newValue)); } catch (e) {}
      }
    });
    this._connectServer();
  }

  /* ---------- sincronización en red (multi-dispositivo) ---------- */
  _connectServer() {
    if (location.protocol === "file:") return; // sin servidor no hay red que escuchar
    if (typeof EventSource === "undefined") { this._startPolling(); return; }

    let sseEverConnected = false;
    try {
      this.sse = new EventSource("/events");
    } catch (e) { this._startPolling(); return; }

    this.sse.addEventListener("state", (ev) => {
      sseEverConnected = true;
      if (ev.data === "null") {
        // el servidor está vacío (recién iniciado): este dispositivo lo siembra con su estado actual
        this._pushToServer();
        return;
      }
      try {
        const incoming = JSON.parse(ev.data);
        const rev = (incoming.meta && incoming.meta.serverRev) || 0;
        if (rev > this.lastServerRev) this._applyIncomingState(incoming);
      } catch (e) { /* mensaje inválido, ignorar */ }
    });

    this.sse.onopen = () => { sseEverConnected = true; this._setConnected(true); };
    this.sse.onerror = () => {
      this._setConnected(false);
      if (!sseEverConnected) {
        // /events no existe en este servidor (p. ej. hosting estático tipo Netlify):
        // se abandona SSE definitivamente y se usa sondeo (polling) en su lugar.
        try { this.sse.close(); } catch (e2) {}
        this._startPolling();
      }
      // si sseEverConnected ya era true, fue solo un corte temporal: EventSource reintenta solo
    };
  }

  /* respaldo: consulta periódica al servidor, usado cuando no hay conexión en vivo (SSE) disponible */
  _startPolling() {
    if (this._pollTimer) return;
    const POLL_MS = 1500;
    const poll = () => {
      fetch("/api/state")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data === null || data === undefined) {
            // servidor sin estado todavía: este dispositivo lo siembra
            if (this.lastServerRev === 0) this._pushToServer();
            this._setConnected(true);
            return;
          }
          this._setConnected(true);
          const rev = (data.meta && data.meta.serverRev) || 0;
          if (rev > this.lastServerRev) this._applyIncomingState(data);
        })
        .catch(() => this._setConnected(false));
    };
    poll();
    this._pollTimer = setInterval(poll, POLL_MS);
  }

  _setConnected(value) {
    const changed = this.serverConnected !== value;
    this.serverConnected = value;
    const badge = document.getElementById("connStatus");
    if (badge) {
      badge.textContent = value ? "● Red" : "○ Local";
      badge.title = value
        ? "Sincronizado con el servidor — otros dispositivos verán los mismos cambios."
        : "Sin servidor o sin conexión: los cambios solo se ven en este dispositivo.";
      badge.classList.toggle("badge--grass", value);
    }
    if (changed) {
      try { window.dispatchEvent(new CustomEvent("bbq:connection", { detail: { connected: value } })); } catch (e) {}
    }
  }

  _applyIncomingState(newState) {
    this.state = newState;
    this.lastServerRev = (newState.meta && newState.meta.serverRev) || 0;
    this._setConnected(true);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch (e) {}
    this._notify();
  }

  _pushToServer() {
    if (location.protocol === "file:") return;
    fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.state)
    })
      .then((r) => r.json())
      .then((serverState) => {
        const rev = (serverState.meta && serverState.meta.serverRev) || 0;
        this._setConnected(true);
        if (rev > this.lastServerRev) this._applyIncomingState(serverState);
        else this.lastServerRev = rev;
      })
      .catch(() => this._setConnected(false));
  }

  /* ---------- persistencia ---------- */
  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  _onRemote(incoming) {
    if (!incoming || !incoming.meta) return;
    if (incoming.meta.rev <= this.state.meta.rev) return;
    this.state = incoming;
    this._notify();
  }

  save(logText) {
    this.state.meta.rev += 1;
    this.state.meta.updatedAt = Date.now();
    if (logText) {
      this.state.log.unshift({ ts: Date.now(), text: logText });
      this.state.log = this.state.log.slice(0, 200);
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch (e) {}
    if (this.channel) {
      try { this.channel.postMessage(this.state); } catch (e) {}
    }
    this._pushToServer();
    this._notify();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  _notify() {
    this.listeners.forEach((fn) => { try { fn(this.state); } catch (e) { console.error(e); } });
  }

  _fireSound(id) {
    this.state.soundEvent = { id, nonce: uid("snd") };
  }
  _fireAnim(type, payload) {
    this.state.lastAnimation = { type, nonce: uid("anim"), payload: payload || null };
  }

  /* ---------- configuración general ---------- */
  resetGame() {
    this.state = freshState();
    this.save("Nueva partida iniciada.");
  }

  hardResetKeepQuestions() {
    const questions = this.state.questions;
    const categories = this.state.config.categories;
    this.state = freshState();
    this.state.questions = questions;
    this.state.config.categories = categories;
    this.save("Partida reiniciada (preguntas conservadas).");
  }

  updateConfig(partial) {
    Object.assign(this.state.config, partial);
    this.save("Configuración actualizada.");
  }

  updateTeam(index, partial) {
    Object.assign(this.state.teams[index], partial);
    this.save(`Equipo "${this.state.teams[index].name}" actualizado.`);
  }

  startGame() {
    this.state.meta.started = true;
    this._fireSound("inicio");
    this._fireAnim("inicio");
    this.save("¡Comienza el juego!");
  }

  /* ---------- preguntas ---------- */
  addQuestion(q) {
    q.id = q.id || uid("q");
    this.state.questions.push(q);
    if (q.categoria && !this.state.config.categories.includes(q.categoria)) {
      this.state.config.categories.push(q.categoria);
    }
    this.save("Pregunta agregada.");
  }
  updateQuestion(id, partial) {
    const q = this.state.questions.find((x) => x.id === id);
    if (!q) return;
    Object.assign(q, partial);
    this.save("Pregunta editada.");
  }
  deleteQuestion(id) {
    this.state.questions = this.state.questions.filter((x) => x.id !== id);
    this.save("Pregunta eliminada.");
  }
  importQuestions(list, mode) {
    const incoming = list.map((q) => ({ ...q, id: q.id || uid("q") }));
    if (mode === "replace") {
      this.state.questions = incoming;
      this.state.usedQuestionIds = [];
    } else {
      this.state.questions = this.state.questions.concat(incoming);
    }
    incoming.forEach((q) => {
      if (q.categoria && !this.state.config.categories.includes(q.categoria)) {
        this.state.config.categories.push(q.categoria);
      }
    });
    this.save(`Se importaron ${incoming.length} preguntas.`);
  }
  resetUsedQuestions() {
    this.state.usedQuestionIds = [];
    this.save("Banco de preguntas reiniciado (todas disponibles de nuevo).");
  }
  addCategory(name) {
    if (!name) return;
    if (!this.state.config.categories.includes(name)) {
      this.state.config.categories.push(name);
      this.save(`Categoría "${name}" agregada.`);
    }
  }
  deleteCategory(name) {
    this.state.config.categories = this.state.config.categories.filter((c) => c !== name);
    this.state.config.activeCategories = this.state.config.activeCategories.filter((c) => c !== name);
    this.save(`Categoría "${name}" eliminada.`);
  }

  /* categorías/libros habilitados para la partida actual (se eligen ANTES de iniciar el juego) */
  setActiveCategories(list) {
    this.state.config.activeCategories = Array.isArray(list) ? list.slice() : [];
    const desc = this.state.config.activeCategories.length
      ? this.state.config.activeCategories.join(", ")
      : "todas las categorías";
    this.save(`Categorías de esta partida: ${desc}.`);
  }

  /* ---------- timer (basado en timestamps, sin doble-tick entre pestañas) ---------- */
  startTimer(mode) {
    const duration = mode === "steal" ? this.state.config.stealTime : this.state.config.normalTime;
    this.state.current.timer = {
      running: true, mode, duration,
      endAt: Date.now() + duration * 1000,
      remainingAtPause: 0,
      sessionId: uid("t")
    };
    this.save();
  }
  pauseTimer() {
    const t = this.state.current.timer;
    if (!t.running) return;
    const remaining = Math.max(0, (t.endAt - Date.now()) / 1000);
    t.running = false;
    t.remainingAtPause = remaining;
    this.save("Cronómetro pausado.");
  }
  resumeTimer() {
    const t = this.state.current.timer;
    if (t.running) return;
    t.endAt = Date.now() + (t.remainingAtPause || 0) * 1000;
    t.running = true;
    this.save("Cronómetro reanudado.");
  }
  addTime(seconds) {
    const t = this.state.current.timer;
    if (t.running) t.endAt += seconds * 1000;
    else t.remainingAtPause = (t.remainingAtPause || 0) + seconds;
    this.save(`Se agregaron ${seconds}s al cronómetro.`);
  }
  stopTimer() {
    this.state.current.timer = { running: false, mode: "normal", endAt: null, remainingAtPause: 0, duration: 0, sessionId: null };
  }
  getRemainingSeconds() {
    const t = this.state.current.timer;
    if (!t || (!t.running && !t.remainingAtPause)) return 0;
    if (t.running) return Math.max(0, (t.endAt - Date.now()) / 1000);
    return t.remainingAtPause || 0;
  }

  /* ---------- flujo de preguntas ---------- */
  availableQuestions(categoria) {
    return this.state.questions.filter(
      (q) => q.categoria === categoria && !this.state.usedQuestionIds.includes(q.id)
    );
  }

  /* pool de preguntas de una dificultad, restringido a las categorías/libros
     activos de esta partida (si no hay ninguna marcada, se usan todas) */
  availableQuestionsByDifficulty(dificultad) {
    const active = this.state.config.activeCategories;
    const restrict = active && active.length > 0;
    return this.state.questions.filter(
      (q) =>
        q.dificultad === dificultad &&
        !this.state.usedQuestionIds.includes(q.id) &&
        (!restrict || active.includes(q.categoria))
    );
  }

  drawQuestion(categoria) {
    const pool = this.availableQuestions(categoria);
    if (pool.length === 0) {
      return { ok: false, reason: "Sin preguntas disponibles en esta categoría." };
    }
    const q = pool[Math.floor(Math.random() * pool.length)];
    this.state.current.category = categoria;
    this.state.current.question = { ...q, revealedHint: false };
    this.state.current.phase = "drawing";
    this.state.current.lastResult = null;
    this._fireAnim("drawing", { categoria });
    this.save(`Categoría elegida: ${categoria}.`);
    return { ok: true, question: q };
  }

  /* sorteo por dificultad: el equipo elige el nivel de riesgo (Fácil..Experto)
     y el sistema saca una pregunta al azar de esa dificultad dentro de las
     categorías/libros activos de la partida. */
  drawQuestionByDifficulty(dificultad) {
    const pool = this.availableQuestionsByDifficulty(dificultad);
    if (pool.length === 0) {
      return { ok: false, reason: `Sin preguntas disponibles en dificultad "${dificultad}" dentro de las categorías activas.` };
    }
    const q = pool[Math.floor(Math.random() * pool.length)];
    this.state.current.chosenDifficulty = dificultad;
    this.state.current.category = q.categoria; // libro real de la pregunta sorteada (se muestra al revelar)
    this.state.current.question = { ...q, revealedHint: false };
    this.state.current.phase = "drawing";
    this.state.current.lastResult = null;
    this._fireAnim("drawing", { dificultad });
    this.save(`Dificultad elegida: ${dificultad}.`);
    return { ok: true, question: q };
  }

  revealQuestion() {
    if (this.state.current.phase !== "drawing") return;
    this.state.current.phase = "asking";
    this.startTimer("normal");
    this._fireAnim("reveal");
  }

  battingTeam() { return this.state.teams[this.state.battingTeamIndex]; }
  defendingIndex() { return this.state.battingTeamIndex === 0 ? 1 : 0; }
  defendingTeam() { return this.state.teams[this.defendingIndex()]; }

  _markUsed() {
    const q = this.state.current.question;
    if (q && !this.state.usedQuestionIds.includes(q.id)) {
      this.state.usedQuestionIds.push(q.id);
    }
  }

  _upgradePlay(playType, team) {
    if (team.flags.fireball) {
      team.flags.fireball = false;
      const order = ["hit", "double", "triple", "homerun"];
      const idx = order.indexOf(playType);
      playType = order[Math.min(idx + 1, order.length - 1)];
    }
    return playType;
  }

  _scoreFor(team, points) {
    if (team.flags.doubleScore) {
      team.flags.doubleScore = false;
      points = points * 2;
    }
    team.score += points;
  }

  /* aplica una jugada de avance de bases al equipo al bate */
  applyPlay(playType, opts) {
    opts = opts || {};
    const team = this.battingTeam();
    playType = opts.skipUpgrade ? playType : this._upgradePlay(playType, team);
    const advance = PLAY_BASES[playType];
    const points = opts.points != null ? opts.points : PLAY_TO_VALUE[playType];

    // mover corredores desde la base más adelantada hacia atrás
    let runsScored = 0;
    const bases = team.bases;
    for (let i = 2; i >= 0; i--) {
      if (!bases[i]) continue;
      const newPos = i + advance;
      bases[i] = false;
      if (newPos >= 3) runsScored++;
      else bases[newPos] = true;
    }
    // el bateador también avanza
    const batterPos = advance - 1;
    if (batterPos >= 3) runsScored++;
    else if (batterPos >= 0) bases[batterPos] = true;

    if (!opts.noPoints) this._scoreFor(team, points);

    for (let i = 0; i < runsScored; i++) {
      this.state.pendingRuns.push({ teamIndex: this.state.battingTeamIndex });
    }

    this._fireSound(playType);
    this._fireAnim(playType, { teamIndex: this.state.battingTeamIndex, runsScored });

    if (runsScored > 0) {
      this.state.current.phase = "run-decision";
    } else {
      this.state.current.phase = "idle";
    }
    return { runsScored, playType, points };
  }

  /* respuesta correcta del equipo al bate -> jugada automática según valor de la pregunta */
  markCorrect() {
    const q = this.state.current.question;
    if (!q) return;
    this.stopTimer();
    const baseType = VALUE_TO_PLAY[q.valor] || "hit";
    this._markUsed();
    this.state.current.lastResult = { teamIndex: this.state.battingTeamIndex, correct: true, questionId: q.id };
    const res = this.applyPlay(baseType, { points: q.valor });
    this.save(`${this.battingTeam().name} respondió correctamente (${PLAY_LABELS[res.playType]}).`);
  }

  /* jugada manual directa (botones Hit/Doble/Triple/HomeRun en panel del juez) */
  manualPlay(playType) {
    this.stopTimer();
    if (this.state.current.question) this._markUsed();
    this.state.current.lastResult = null;
    const res = this.applyPlay(playType, { skipUpgrade: false });
    this.save(`Jugada manual aplicada: ${PLAY_LABELS[res.playType]} para ${this.battingTeam().name}.`);
  }

  /* respuesta incorrecta del equipo al bate */
  markIncorrect() {
    const q = this.state.current.question;
    const team = this.battingTeam();
    this.stopTimer();
    if (q) this._markUsed();
    this.state.current.lastResult = q ? { teamIndex: this.state.battingTeamIndex, correct: false, questionId: q.id } : null;

    if (team.flags.shield) {
      team.flags.shield = false;
      this.state.current.phase = "idle";
      this.save(`¡Escudo activado! Se anuló el out de ${team.name}.`);
      return;
    }
    team.outs += 1;
    this.state.outs = team.outs;
    // abre ventana de Fly Out para el equipo defensor
    this.state.current.phase = "flyout";
    this.state.current.flyoutFor = this.defendingIndex();
    this.startTimer("steal");
    this.save(`${team.name} falló. Out #${team.outs}. Oportunidad de Fly Out para ${this.defendingTeam().name}.`);
  }

  /* fly out manual forzado por el juez sin pasar por markIncorrect */
  triggerFlyOut() {
    this.stopTimer();
    this.state.current.phase = "flyout";
    this.state.current.flyoutFor = this.defendingIndex();
    this.startTimer("steal");
    this.save(`Fly Out manual activado para ${this.defendingTeam().name}.`);
  }

  resolveFlyOut(correct) {
    const q = this.state.current.question;
    this.stopTimer();
    const defIdx = this.state.current.flyoutFor != null ? this.state.current.flyoutFor : this.defendingIndex();
    const defTeam = this.state.teams[defIdx];
    if (correct && q) {
      this._scoreFor(defTeam, q.valor);
      this._fireSound("flyout");
      this._fireAnim("flyout", { teamIndex: defIdx });
      this.state.log.unshift({ ts: Date.now(), text: `¡Fly Out! ${defTeam.name} respondió y sumó ${q.valor} puntos.` });
    } else {
      this.state.log.unshift({ ts: Date.now(), text: "Ambos equipos fallaron. La pregunta queda descartada." });
    }
    this.state.current.flyoutFor = null;
    this._afterOutCheck();
  }

  _afterOutCheck() {
    const team = this.battingTeam();
    if (team.outs >= 3) {
      this._endHalfInning();
    } else {
      this.state.current.phase = "idle";
      this.save();
    }
  }

  _endHalfInning() {
    const team = this.battingTeam();
    team.outs = 0;
    team.bases = [false, false, false];
    this.state.outs = 0;
    this.state.bases = [false, false, false];

    if (this.state.battingTeamIndex === 0) {
      this.state.battingTeamIndex = 1;
    } else {
      this.state.battingTeamIndex = 0;
      this.state.inning += 1;
    }

    if (this.state.inning > this.state.config.maxInnings) {
      this._endGame();
      return;
    }
    this.state.current.phase = "idle";
    this.state.current.question = null;
    this._fireSound("cambioInning");
    this._fireAnim("cambioInning");
    this.save(`Cambio de turno. Inning ${this.state.inning}, batea ${this.battingTeam().name}.`);
  }

  _endGame() {
    const [a, b] = this.state.teams;
    this.state.winnerIndex = a.score === b.score ? null : (a.score > b.score ? 0 : 1);
    this.state.current.phase = "gameover";
    this.state.current.question = null;
    this._fireSound("victoria");
    this._fireAnim("victoria", { winnerIndex: this.state.winnerIndex });
    const msg = this.state.winnerIndex == null
      ? "¡Juego terminado en empate!"
      : `¡Juego terminado! Gana ${this.state.teams[this.state.winnerIndex].name}.`;
    this.save(msg);
  }

  forceEndInning() {
    this._endHalfInning();
  }

  /* descarta la pregunta actual sin aplicar jugada y vuelve a selección de categoría */
  skipQuestion() {
    this.stopTimer();
    if (this.state.current.question) this._markUsed();
    this.state.current.question = null;
    this.state.current.flyoutFor = null;
    this.state.current.lastResult = null;
    this.state.current.phase = "idle";
    this.save("El juez descartó la pregunta actual.");
  }

  /* ---------- decisión de carrera (A: cobrar / B: ficha) ---------- */
  chooseRunOption(option) {
    if (this.state.pendingRuns.length === 0) return;
    const run = this.state.pendingRuns.shift();
    const team = this.state.teams[run.teamIndex];
    if (option === "cobrar") {
      team.score += 100;
      team.runs += 1;
      this._fireSound("carrera");
      this._fireAnim("carrera", { teamIndex: run.teamIndex });
      this.save(`${team.name} cobró una carrera (+100 pts).`);
    } else {
      team.tokens += 1;
      team.runs += 1;
      this.save(`${team.name} convirtió una carrera en ficha especial.`);
    }
    if (this.state.pendingRuns.length === 0) {
      this.state.current.phase = "idle";
      this.save();
    }
  }

  /* ---------- segunda oportunidad (reabre la pregunta fallada) ---------- */
  reopenQuestion() {
    const lr = this.state.current.lastResult;
    if (!lr || lr.correct) return false;
    const team = this.state.teams[lr.teamIndex];
    if (team.outs > 0) team.outs -= 1;
    this.state.outs = this.battingTeam().outs;
    const idx = this.state.usedQuestionIds.indexOf(lr.questionId);
    if (idx >= 0) this.state.usedQuestionIds.splice(idx, 1);
    this.state.current.phase = "asking";
    this.state.current.flyoutFor = null;
    this.startTimer("normal");
    this.save("Segunda oportunidad: la pregunta se reabre.");
    return true;
  }

  /* ---------- ventajas especiales (fichas) ---------- */
  useAdvantage(teamIndex, advantageId) {
    const team = this.state.teams[teamIndex];
    const adv = ADVANTAGES.find((a) => a.id === advantageId);
    if (!adv) return { ok: false, reason: "Ventaja desconocida." };
    if (team.tokens < adv.cost) return { ok: false, reason: "No tiene fichas suficientes." };

    switch (advantageId) {
      case "tiempoExtra":
        if (!this.state.current.timer.running && !this.state.current.timer.remainingAtPause) {
          return { ok: false, reason: "No hay un cronómetro activo." };
        }
        this.addTime(10);
        break;
      case "relevo":
        // efecto ceremonial: el juez anuncia el cambio de jugador en vivo
        break;
      case "roboBase":
        this._advanceSingleRunner(this.state.battingTeamIndex);
        break;
      case "pista":
        if (!this.state.current.question || !this.state.current.question.pista) {
          return { ok: false, reason: "No hay pista disponible para esta pregunta." };
        }
        this.state.current.question.revealedHint = true;
        break;
      case "escudo":
        team.flags.shield = true;
        break;
      case "segundaOportunidad": {
        const reopened = this._spendThenReopen(team, adv);
        return reopened;
      }
      case "dobleScore":
        team.flags.doubleScore = true;
        break;
      case "bolaDeFuego":
        team.flags.fireball = true;
        break;
      default:
        return { ok: false, reason: "Ventaja no implementada." };
    }
    team.tokens -= adv.cost;
    this._fireAnim("advantage", { teamIndex, advantageId });
    this.save(`${team.name} usó la ventaja: ${adv.label}.`);
    return { ok: true };
  }

  _spendThenReopen(team, adv) {
    const lr = this.state.current.lastResult;
    if (!lr || lr.correct || lr.teamIndex !== this.state.battingTeamIndex) {
      return { ok: false, reason: "Solo se puede usar justo después de fallar una pregunta propia." };
    }
    team.tokens -= adv.cost;
    this.reopenQuestion();
    return { ok: true };
  }

  _advanceSingleRunner(teamIndex) {
    const team = this.state.teams[teamIndex];
    const bases = team.bases;
    if (bases[2]) {
      bases[2] = false;
      this.state.pendingRuns.push({ teamIndex });
      this.state.current.phase = "run-decision";
    } else if (bases[1]) {
      bases[1] = false; bases[2] = true;
    } else if (bases[0]) {
      bases[0] = false; bases[1] = true;
    }
  }

  /* ---------- correcciones administrativas ---------- */
  adminSet(teamIndex, field, value) {
    const team = this.state.teams[teamIndex];
    if (!team) return;
    team[field] = value;
    if (field === "outs") this.state.outs = teamIndex === this.state.battingTeamIndex ? value : this.state.outs;
    this.save(`Corrección manual: ${field} de ${team.name} = ${value}.`);
  }

  /* ---------- sonidos manuales ---------- */
  playSoundManual(id) {
    this._fireSound(id);
    this.save();
  }

  /* ---------- guardado de partidas con nombre ---------- */
  listSavedGames() {
    try { return JSON.parse(localStorage.getItem(SAVES_KEY) || "[]"); } catch (e) { return []; }
  }
  saveNamedGame(name) {
    const saves = this.listSavedGames();
    const snapshot = { name, ts: Date.now(), state: this.state };
    const idx = saves.findIndex((s) => s.name === name);
    if (idx >= 0) saves[idx] = snapshot; else saves.push(snapshot);
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
  }
  loadNamedGame(name) {
    const saves = this.listSavedGames();
    const found = saves.find((s) => s.name === name);
    if (!found) return false;
    this.state = found.state;
    this.state.meta.rev += 1;
    this.save(`Partida "${name}" cargada.`);
    return true;
  }
  deleteNamedGame(name) {
    const saves = this.listSavedGames().filter((s) => s.name !== name);
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
  }
}

const Engine = new GameEngine();
