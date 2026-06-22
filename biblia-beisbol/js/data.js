/* ============================================================
   data.js — Datos por defecto del Concurso Bíblico de Béisbol
   Equipos iniciales, biblioteca de logos, categorías y banco
   de preguntas de ejemplo. Todo funciona 100% local, sin red.
   ============================================================ */

/* --- Biblioteca de logos predeterminados (SVG inline, sin red) --- */
const LOGO_LIBRARY = {
  leon: {
    label: "León de Judá",
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="logo-bg"/><path class="logo-mark" d="M50 22c-9 0-15 7-15 15 0 5 2 8 1 12-4 2-9 7-9 15 0 11 10 19 23 19s23-8 23-19c0-8-5-13-9-15-1-4 1-7 1-12 0-8-6-15-15-15zm-9 30c-2 0-3-2-3-4s1-4 3-4 3 2 3 4-1 4-3 4zm18 0c-2 0-3-2-3-4s1-4 3-4 3 2 3 4-1 4-3 4z"/></svg>`
  },
  paloma: {
    label: "Paloma",
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="logo-bg"/><circle cx="62" cy="42" r="2.4" class="logo-dot"/><path class="logo-mark" d="M24 56c7-13 21-19 33-15-3-6-2-13 3-17 2 7 7 10 13 10-2 6-8 10-14 10 8 3 13 10 13 17 0 12-13 20-27 20-13 0-24-6-25-18-6 2-13 0-16-7z"/></svg>`
  },
  corona: {
    label: "Corona",
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="logo-bg"/><path class="logo-mark" d="M22 68l4-30 14 14 10-20 10 20 14-14 4 30z"/><circle cx="50" cy="34" r="4" class="logo-dot"/><circle cx="26" cy="42" r="3" class="logo-dot"/><circle cx="74" cy="42" r="3" class="logo-dot"/></svg>`
  },
  pez: {
    label: "Pez (Ictus)",
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="logo-bg"/><path class="logo-mark" d="M18 50c12-14 30-20 46-14-3 6-3 8 0 14-3 6-3 8 0 14-16 6-34 0-46-14z"/><circle cx="38" cy="50" r="3" class="logo-dot"/></svg>`
  },
  llama: {
    label: "Llama / Fuego",
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="logo-bg"/><path class="logo-mark" d="M50 18c4 10-4 14-4 22 0 5 3 8 7 8s6-3 6-7c5 4 8 10 8 17 0 13-10 22-23 22s-22-9-22-21c0-9 5-15 9-20-1 6 1 9 4 9 4 0 5-4 4-9-2-9 1-15 11-21z"/></svg>`
  },
  escudo: {
    label: "Escudo",
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="logo-bg"/><path class="logo-mark" d="M50 16l26 10v18c0 18-11 32-26 36-15-4-26-18-26-36V26z"/><path class="logo-cut" d="M50 28l17 7v12c0 12-7 21-17 24-10-3-17-12-17-24V35z"/></svg>`
  },
  estrella: {
    label: "Estrella de Belén",
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="logo-bg"/><path class="logo-mark" d="M50 14l9 23 24 2-19 16 6 24-20-13-20 13 6-24-19-16 24-2z"/></svg>`
  },
  ancla: {
    label: "Ancla (Esperanza)",
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="logo-bg"/><path class="logo-mark" d="M50 20v14m0 0a8 8 0 100 16 8 8 0 000-16zm0 16v30m-22-8c2 10 11 18 22 18s20-8 22-18M30 40h40" stroke-width="5" fill="none" class="logo-stroke"/></svg>`
  }
};

/* --- Equipos por defecto (2 equipos) --- */
function defaultTeams() {
  return [
    {
      id: "A",
      name: "Equipo Nínive",
      color: "#FFB627",
      logo: "leon",
      score: 0,
      runs: 0,
      outs: 0,
      tokens: 0,
      bases: [false, false, false],
      flags: { shield: false, doubleScore: false, fireball: false }
    },
    {
      id: "B",
      name: "Equipo Jerusalén",
      color: "#3FA37E",
      logo: "corona",
      score: 0,
      runs: 0,
      outs: 0,
      tokens: 0,
      bases: [false, false, false],
      flags: { shield: false, doubleScore: false, fireball: false }
    }
  ];
}

/* --- Categorías por defecto --- */
const DEFAULT_CATEGORIES = [
  "Antiguo Testamento",
  "Nuevo Testamento",
  "Personajes",
  "Milagros",
  "Parábolas",
  "Números y Datos"
];

/* --- Valor -> tipo de jugada (mapeo por defecto) ---
   100 = Hit | 200 = Doble | 300 = Triple | 500 = Home Run     */
const VALUE_TO_PLAY = { 100: "hit", 200: "double", 300: "triple", 500: "homerun" };
const PLAY_TO_VALUE = { hit: 100, double: 200, triple: 300, homerun: 500 };
const PLAY_BASES = { hit: 1, double: 2, triple: 3, homerun: 4 };
const PLAY_LABELS = { hit: "Hit", double: "Doble Hit", triple: "Triple Hit", homerun: "Home Run" };

/* --- Niveles de dificultad: el equipo elige esto en su turno (no la categoría) ---
   La categoría/libro se fija ANTES del juego; la dificultad decide la jugada. */
const DIFFICULTY_LEVELS = ["Fácil", "Medio", "Difícil", "Experto"];
const DIFFICULTY_TO_VALUE = { "Fácil": 100, "Medio": 200, "Difícil": 300, "Experto": 500 };

/* --- Banco de preguntas de ejemplo ---
   Cada pregunta: id, categoria, dificultad, valor, pregunta, respuesta, pista (opcional) */
function sampleQuestions() {
  const q = [
    ["Antiguo Testamento","Fácil",100,"¿Quién construyó el arca antes del diluvio?","Noé","Su nombre significa 'descanso'."],
    ["Antiguo Testamento","Fácil",100,"¿En cuántos días creó Dios el mundo según Génesis?","En seis días","El séptimo fue de descanso."],
    ["Antiguo Testamento","Medio",200,"¿Cómo se llamaba el hermano que Caín mató?","Abel","Era pastor de ovejas."],
    ["Antiguo Testamento","Medio",200,"¿Qué profeta fue tragado por un gran pez?","Jonás","Estuvo tres días y tres noches."],
    ["Antiguo Testamento","Difícil",300,"¿Cuál fue el nombre original de Abraham?","Abram","Dios se lo cambió en Génesis 17."],
    ["Antiguo Testamento","Difícil",300,"¿Quién interpretó los sueños del Faraón en Egipto?","José","Fue vendido por sus propios hermanos."],
    ["Antiguo Testamento","Experto",500,"¿Cuántos años vagó el pueblo de Israel en el desierto?","Cuarenta años","Una generación completa no entró a Canaán."],
    ["Nuevo Testamento","Fácil",100,"¿En qué ciudad nació Jesús?","Belén","Significa 'casa de pan'."],
    ["Nuevo Testamento","Fácil",100,"¿Cuántos discípulos eligió Jesús?","Doce","Uno de ellos lo traicionó."],
    ["Nuevo Testamento","Medio",200,"¿Quién bautizó a Jesús en el río Jordán?","Juan el Bautista","Comía langostas y miel silvestre."],
    ["Nuevo Testamento","Medio",200,"¿Quién negó a Jesús tres veces?","Pedro","Lo hizo antes de que cantara el gallo."],
    ["Nuevo Testamento","Difícil",300,"¿En qué isla estuvo desterrado el apóstol Juan?","Patmos","Allí escribió el Apocalipsis."],
    ["Nuevo Testamento","Difícil",300,"¿Quién era el recaudador de impuestos que se subió a un árbol para ver a Jesús?","Zaqueo","Era de baja estatura."],
    ["Nuevo Testamento","Experto",500,"¿Cuál fue el primer milagro de Jesús según el evangelio de Juan?","Convertir el agua en vino","Ocurrió en una boda en Caná de Galilea."],
    ["Personajes","Fácil",100,"¿Quién mató al gigante Goliat?","David","Usó una honda y una piedra."],
    ["Personajes","Medio",200,"¿Quién fue vendida por sus hermanos y luego fue gobernador de Egipto?","José","Sus hermanos lo vendieron por envidia."],
    ["Personajes","Medio",200,"¿Cómo se llamaba la esposa de Abraham?","Sara","Tuvo un hijo en su vejez."],
    ["Personajes","Difícil",300,"¿Quién fue la reina que arriesgó su vida para salvar a su pueblo?","Ester","Su tío Mardoqueo la aconsejó."],
    ["Personajes","Difícil",300,"¿Quién fue el juez de Israel que perdió su fuerza al cortarle el cabello?","Sansón","Su debilidad fue Dalila."],
    ["Personajes","Experto",500,"¿Quién fue el sumo sacerdote que ungió a David como rey?","Samuel","También fue el último juez de Israel."],
    ["Milagros","Fácil",100,"¿Qué mar se abrió para que el pueblo de Israel pasara?","El Mar Rojo","Moisés extendió su vara sobre las aguas."],
    ["Milagros","Medio",200,"¿Cuántos panes y peces multiplicó Jesús para alimentar a la multitud?","Cinco panes y dos peces","Alimentó a más de cinco mil personas."],
    ["Milagros","Difícil",300,"¿A quién resucitó Jesús después de cuatro días en la tumba?","A Lázaro","Sus hermanas eran Marta y María."],
    ["Milagros","Experto",500,"¿Qué hizo Josué que detuvo el curso natural del día?","Detuvo el sol y la luna","Ocurrió durante la batalla en Gabaón."],
    ["Parábolas","Fácil",100,"¿En qué parábola un padre recibe de vuelta a su hijo perdido?","El hijo pródigo","El padre corrió a abrazarlo."],
    ["Parábolas","Medio",200,"¿Quién ayudó a un hombre herido en el camino a Jericó?","El buen samaritano","Un sacerdote y un levita pasaron de largo antes."],
    ["Parábolas","Difícil",300,"¿Qué representa la semilla de mostaza en la parábola de Jesús?","El Reino de los cielos","Crece de la semilla más pequeña a un gran árbol."],
    ["Parábolas","Experto",500,"¿Cuántas minas entregó el hombre noble a sus siervos en la parábola de las minas?","Diez minas, una a cada uno de diez siervos","Aparece en el evangelio de Lucas."],
    ["Números y Datos","Fácil",100,"¿Cuántos libros tiene la Biblia en total (versión protestante)?","66 libros","39 del Antiguo y 27 del Nuevo Testamento."],
    ["Números y Datos","Medio",200,"¿Cuántos mandamientos recibió Moisés en el Sinaí?","Diez mandamientos","Fueron escritos en tablas de piedra."],
    ["Números y Datos","Difícil",300,"¿Cuántos años tenía Matusalén cuando murió?","969 años","Es el hombre más longevo registrado en la Biblia."],
    ["Números y Datos","Experto",500,"¿Cuántos libros componen el Pentateuco y cómo se llaman?","Cinco: Génesis, Éxodo, Levítico, Números y Deuteronomio","Son atribuidos a Moisés."]
  ];
  return q.map((row, i) => ({
    id: "q" + (i + 1),
    categoria: row[0],
    dificultad: row[1],
    valor: row[2],
    pregunta: row[3],
    respuesta: row[4],
    pista: row[5] || ""
  }));
}

/* --- Catálogo de ventajas especiales (fichas) --- */
const ADVANTAGES = [
  { id: "tiempoExtra", label: "Tiempo Extra", cost: 1, desc: "Agrega 10s a la pregunta actual." },
  { id: "relevo", label: "Relevo", cost: 1, desc: "Cambia al jugador que responde (manual)." },
  { id: "roboBase", label: "Robo de Base", cost: 1, desc: "Avanza automáticamente un corredor." },
  { id: "pista", label: "Pista", cost: 1, desc: "Muestra una pista de la pregunta actual." },
  { id: "escudo", label: "Escudo", cost: 2, desc: "Anula el próximo out recibido." },
  { id: "segundaOportunidad", label: "Segunda Oportunidad", cost: 2, desc: "Reintenta la pregunta fallada." },
  { id: "dobleScore", label: "Doble Puntuación", cost: 2, desc: "La próxima respuesta correcta vale doble." },
  { id: "bolaDeFuego", label: "Bola de Fuego", cost: 3, desc: "Mejora la próxima jugada un nivel." }
];

/* --- Catálogo de sonidos (sintetizados, ver sounds.js) --- */
const SOUND_EVENTS = [
  { id: "inicio", label: "Inicio del juego" },
  { id: "cambioInning", label: "Cambio de inning" },
  { id: "hit", label: "Hit" },
  { id: "double", label: "Doble Hit" },
  { id: "triple", label: "Triple Hit" },
  { id: "homerun", label: "Home Run" },
  { id: "flyout", label: "Fly Out" },
  { id: "carrera", label: "Carrera" },
  { id: "victoria", label: "Victoria" },
  { id: "cuentaRegresiva", label: "Cuenta regresiva" }
];
