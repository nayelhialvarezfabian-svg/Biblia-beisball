/* ============================================================
   admin.js — Lógica del Panel del Administrador
   ============================================================ */

function $(id) { return document.getElementById(id); }
const teamFormInit = [false, false];
const selectedLogo = ["leon", "corona"];
let configInit = false;

function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, 2800);
}

/* ---------- tabs ---------- */
function bindTabs() {
  document.querySelectorAll("#adminTabs .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#adminTabs .tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      $("pane-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "correcciones") populateCorrections(Engine.state);
      if (btn.dataset.tab === "preguntas") { refreshCategorySelects(Engine.state); renderQuestionTable(Engine.state); }
      if (btn.dataset.tab === "partidas") renderSavesList();
      if (btn.dataset.tab === "importar") refreshXlsxNote();
    });
  });
}

/* ---------- equipos ---------- */
function buildLogoGrid(container, teamIndex) {
  container.innerHTML = "";
  Object.entries(LOGO_LIBRARY).forEach(([key, logo]) => {
    const opt = document.createElement("div");
    opt.className = "logo-opt" + (selectedLogo[teamIndex] === key ? " selected" : "");
    opt.innerHTML = logo.svg;
    opt.title = logo.label;
    opt.addEventListener("click", () => {
      selectedLogo[teamIndex] = key;
      container.querySelectorAll(".logo-opt").forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
    });
    container.appendChild(opt);
  });
}

function populateTeamForms(state) {
  document.querySelectorAll(".team-edit").forEach((form) => {
    const idx = parseInt(form.dataset.team, 10);
    if (teamFormInit[idx]) return;
    const team = state.teams[idx];
    form.querySelector(".t-name").value = team.name;
    form.querySelector(".t-color").value = team.color;
    selectedLogo[idx] = team.logo;
    buildLogoGrid(form.querySelector(".t-logo-grid"), idx);
    teamFormInit[idx] = true;
  });
}

function bindTeamForms() {
  document.querySelectorAll(".team-edit .t-save").forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = btn.closest(".team-edit");
      const idx = parseInt(form.dataset.team, 10);
      const name = form.querySelector(".t-name").value.trim() || ("Equipo " + (idx + 1));
      const color = form.querySelector(".t-color").value;
      Engine.updateTeam(idx, { name, color, logo: selectedLogo[idx] });
      showToast("Equipo guardado.");
    });
  });
}

/* ---------- configuración ---------- */
function populateConfig(state) {
  if (configInit) return;
  $("cfgInnings").value = state.config.maxInnings;
  $("cfgNormal").value = state.config.normalTime;
  $("cfgSteal").value = state.config.stealTime;
  configInit = true;
}

function renderCategoryChips(state) {
  const wrap = $("categoryChips");
  wrap.innerHTML = "";
  state.config.categories.forEach((cat) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `${cat} <button title="Eliminar">\u2715</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      if (confirm(`\u00BFEliminar la categoría "${cat}"? Las preguntas existentes la conservarán hasta que las edites.`)) {
        Engine.deleteCategory(cat);
      }
    });
    wrap.appendChild(chip);
  });
  renderActiveCategoryChecks(state);
}

function renderActiveCategoryChecks(state) {
  const wrap = $("activeCategoryChecks");
  const active = state.config.activeCategories || [];
  wrap.innerHTML = state.config.categories.map((cat) => `
    <label class="radio-line" style="background:var(--field-night-3);border:1px solid var(--line-strong);border-radius:999px;padding:6px 12px;">
      <input type="checkbox" value="${cat}" ${active.includes(cat) ? "checked" : ""} /> ${cat}
    </label>
  `).join("");
  wrap.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const checked = [...wrap.querySelectorAll('input[type="checkbox"]:checked')].map((c) => c.value);
      Engine.setActiveCategories(checked);
    });
  });
  $("activeCatsSummary").textContent = active.length
    ? `Esta partida usará: ${active.join(", ")}.`
    : "Si no marcas ninguna, se usarán todas las categorías disponibles.";
}

function bindConfig() {
  $("btnSaveConfig").addEventListener("click", () => {
    Engine.updateConfig({
      maxInnings: parseInt($("cfgInnings").value, 10) || 6,
      normalTime: parseInt($("cfgNormal").value, 10) || 30,
      stealTime: parseInt($("cfgSteal").value, 10) || 10
    });
    showToast("Configuración guardada.");
  });
  $("btnAddCategory").addEventListener("click", () => {
    const input = $("newCategoryInput");
    if (input.value.trim()) { Engine.addCategory(input.value.trim()); input.value = ""; }
  });
  $("btnStartGameAdmin").addEventListener("click", () => Engine.startGame());
  $("btnResetTimer").addEventListener("click", () => { Engine.stopTimer(); Engine.save("Cronómetro reiniciado manualmente."); });
  $("btnNewGame").addEventListener("click", () => {
    if (confirm("Esto borrará TODO el progreso (marcador, bases, preguntas usadas) y restaurará el banco de ejemplo. \u00BFContinuar?")) {
      Engine.resetGame();
      teamFormInit[0] = teamFormInit[1] = false;
      configInit = false;
    }
  });
  $("btnResetKeepQ").addEventListener("click", () => {
    if (confirm("Esto reinicia marcador, bases e innings, pero conserva tu banco de preguntas y categorías. \u00BFContinuar?")) {
      Engine.hardResetKeepQuestions();
      teamFormInit[0] = teamFormInit[1] = false;
      configInit = false;
    }
  });
}

/* ---------- preguntas ---------- */
function refreshCategorySelects(state) {
  [$("qCategoria"), $("qFilterCategoria")].forEach((sel, i) => {
    const keepValue = sel.value;
    const base = i === 1 ? '<option value="">Todas las categorías</option>' : "";
    sel.innerHTML = base + state.config.categories.map((c) => `<option value="${c}">${c}</option>`).join("");
    if ([...sel.options].some((o) => o.value === keepValue)) sel.value = keepValue;
  });
}

function updateValorPreview() {
  const dificultad = $("qDificultad").value;
  const valor = DIFFICULTY_TO_VALUE[dificultad];
  const playType = VALUE_TO_PLAY[valor];
  $("qValorPreview").textContent = `${PLAY_LABELS[playType]} · ${valor} pts`;
}

function bindQuestionForm() {
  $("qDificultad").addEventListener("change", updateValorPreview);
  updateValorPreview();

  $("btnAddQuestion").addEventListener("click", () => {
    const categoria = $("qCategoria").value;
    const pregunta = $("qPregunta").value.trim();
    const respuesta = $("qRespuesta").value.trim();
    if (!categoria) { showToast("Agrega o elige una categoría primero (pestaña Configuración)."); return; }
    if (!pregunta || !respuesta) { showToast("La pregunta y la respuesta son obligatorias."); return; }
    const dificultad = $("qDificultad").value;
    Engine.addQuestion({
      categoria,
      dificultad,
      valor: DIFFICULTY_TO_VALUE[dificultad],
      pregunta, respuesta,
      pista: $("qPista").value.trim()
    });
    $("qPregunta").value = ""; $("qRespuesta").value = ""; $("qPista").value = "";
    showToast("Pregunta agregada.");
  });
  $("qFilterCategoria").addEventListener("change", () => renderQuestionTable(Engine.state));
  $("btnResetUsed").addEventListener("click", () => {
    if (confirm("\u00BFMarcar todas las preguntas como disponibles de nuevo?")) Engine.resetUsedQuestions();
  });
}

function renderQuestionTable(state) {
  const filter = $("qFilterCategoria").value;
  const rows = state.questions.filter((q) => !filter || q.categoria === filter);
  $("qCount").textContent = rows.length;
  $("qTableBody").innerHTML = rows.map((q) => {
    const used = state.usedQuestionIds.includes(q.id);
    return `<tr>
      <td>${q.categoria}</td>
      <td>${q.dificultad}</td>
      <td>${q.valor}</td>
      <td class="q-text">${escapeHtml(q.pregunta)}</td>
      <td>${used ? '<span class="badge badge--leather">Usada</span>' : '<span class="badge badge--grass">Disponible</span>'}</td>
      <td>
        <button class="btn" data-edit="${q.id}">Editar</button>
        <button class="btn btn--danger" data-del="${q.id}">Eliminar</button>
      </td>
    </tr>`;
  }).join("");

  $("qTableBody").querySelectorAll("[data-del]").forEach((b) => {
    b.addEventListener("click", () => {
      if (confirm("\u00BFEliminar esta pregunta permanentemente?")) Engine.deleteQuestion(b.dataset.del);
    });
  });
  $("qTableBody").querySelectorAll("[data-edit]").forEach((b) => {
    b.addEventListener("click", () => editQuestionPrompt(b.dataset.edit));
  });
}

function editQuestionPrompt(id) {
  const q = Engine.state.questions.find((x) => x.id === id);
  if (!q) return;
  const pregunta = prompt("Pregunta:", q.pregunta);
  if (pregunta === null) return;
  const respuesta = prompt("Respuesta:", q.respuesta);
  if (respuesta === null) return;
  const dificultad = prompt(`Dificultad (${DIFFICULTY_LEVELS.join(" / ")}):`, q.dificultad);
  if (dificultad === null) return;
  const dificultadFinal = DIFFICULTY_LEVELS.includes(dificultad.trim()) ? dificultad.trim() : q.dificultad;
  const pista = prompt("Pista (opcional):", q.pista || "");
  Engine.updateQuestion(id, {
    pregunta: pregunta.trim(), respuesta: respuesta.trim(),
    dificultad: dificultadFinal,
    valor: DIFFICULTY_TO_VALUE[dificultadFinal],
    pista: (pista || "").trim()
  });
  showToast("Pregunta actualizada.");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- importar / exportar ---------- */
function refreshXlsxNote() {
  $("xlsxNote").textContent = CSVTools.hasXLSXSupport()
    ? "Soporte para archivos .xlsx detectado (SheetJS cargado)."
    : "Para importar archivos .xlsx reales agrega js/vendor/xlsx.full.min.js (ver README). Mientras tanto, usa CSV.";
}

function bindImportExport() {
  $("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const mode = document.querySelector('input[name="importMode"]:checked').value;
    CSVTools.importFile(file, (questions, err) => {
      if (err) { showToast(err); return; }
      if (!questions || !questions.length) { showToast("No se encontraron preguntas válidas en el archivo."); return; }
      Engine.importQuestions(questions, mode);
      showToast(`Se importaron ${questions.length} preguntas.`);
      e.target.value = "";
    });
  });
  $("btnExportCSV").addEventListener("click", () => {
    CSVTools.downloadCSV(Engine.state.questions, "preguntas-biblia-beisbol.csv");
  });
}

/* ---------- correcciones ---------- */
function populateCorrections(state) {
  document.querySelectorAll("#pane-correcciones .card").forEach((card) => {
    const idx = parseInt(card.dataset.team, 10);
    const team = state.teams[idx];
    card.querySelector(".c-score").value = team.score;
    card.querySelector(".c-runs").value = team.runs;
    card.querySelector(".c-outs").value = team.outs;
    card.querySelector(".c-tokens").value = team.tokens;
  });
}

function bindCorrections() {
  document.querySelectorAll("#pane-correcciones .c-save").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".card");
      const idx = parseInt(card.dataset.team, 10);
      Engine.adminSet(idx, "score", parseInt(card.querySelector(".c-score").value, 10) || 0);
      Engine.adminSet(idx, "runs", parseInt(card.querySelector(".c-runs").value, 10) || 0);
      Engine.adminSet(idx, "outs", Math.max(0, Math.min(3, parseInt(card.querySelector(".c-outs").value, 10) || 0)));
      Engine.adminSet(idx, "tokens", Math.max(0, parseInt(card.querySelector(".c-tokens").value, 10) || 0));
      showToast("Corrección aplicada.");
    });
  });
}

/* ---------- partidas guardadas ---------- */
function renderSavesList() {
  const saves = Engine.listSavedGames();
  const wrap = $("savesList");
  if (!saves.length) { wrap.innerHTML = '<p class="hint-text">No hay partidas guardadas todavía.</p>'; return; }
  wrap.innerHTML = saves.slice().reverse().map((s) => {
    const date = new Date(s.ts).toLocaleString("es-DO");
    return `<div class="save-row">
      <div><strong>${escapeHtml(s.name)}</strong><br><span class="hint-text">${date}</span></div>
      <div class="btn-row">
        <button class="btn btn--amber" data-load="${escapeHtml(s.name)}">Cargar</button>
        <button class="btn btn--danger" data-del="${escapeHtml(s.name)}">Eliminar</button>
      </div>
    </div>`;
  }).join("");
  wrap.querySelectorAll("[data-load]").forEach((b) => {
    b.addEventListener("click", () => {
      if (confirm(`\u00BFCargar la partida "${b.dataset.load}"? Se perderá el progreso actual no guardado.`)) {
        Engine.loadNamedGame(b.dataset.load);
        teamFormInit[0] = teamFormInit[1] = false;
        configInit = false;
        populateTeamForms(Engine.state);
        populateConfig(Engine.state);
      }
    });
  });
  wrap.querySelectorAll("[data-del]").forEach((b) => {
    b.addEventListener("click", () => {
      if (confirm(`\u00BFEliminar la partida guardada "${b.dataset.del}"?`)) { Engine.deleteNamedGame(b.dataset.del); renderSavesList(); }
    });
  });
}

function bindSaves() {
  $("btnSaveGame").addEventListener("click", () => {
    const name = $("saveNameInput").value.trim();
    if (!name) { showToast("Escribe un nombre para la partida."); return; }
    Engine.saveNamedGame(name);
    $("saveNameInput").value = "";
    renderSavesList();
    showToast(`Partida "${name}" guardada.`);
  });
}

/* ---------- render maestro ---------- */
function render(state) {
  populateTeamForms(state);
  populateConfig(state);
  renderCategoryChips(state);
  refreshCategorySelects(state);
  if (document.getElementById("pane-preguntas").classList.contains("active")) renderQuestionTable(state);
}

document.addEventListener("DOMContentLoaded", () => {
  bindTabs();
  bindTeamForms();
  bindConfig();
  bindQuestionForm();
  bindImportExport();
  bindCorrections();
  bindSaves();
  refreshXlsxNote();
  Engine.subscribe(render);
});
