# Guía de Edición — Concurso Bíblico de Béisbol

Esta hoja es tu referencia para editar el proyecto sin romper nada.
Está dividida en: (1) qué archivo hace qué, (2) las "conexiones" entre
archivos — lo más importante —, y (3) un buscador rápido tipo
"quiero cambiar X → toco estos archivos".

> 🔑 **Regla de oro:** casi todo en este sistema se conecta por
> **texto idéntico** (un `id="algo"` en el HTML, una palabra clave como
> `"hit"` o `"escudo"`) repetido en 2 o 3 archivos. Si renombras uno y
> no el otro, esa pieza deja de funcionar **sin mostrar ningún error
> visible** — simplemente ese botón o ese dato deja de actualizarse.
> Por eso, antes de renombrar algo, usa "Buscar en todos los archivos"
> de tu editor de texto y cambia TODAS las apariciones.

---

## 1. Mapa de archivos

| Archivo | Qué controla | ¿Se edita seguido? |
|---|---|---|
| `js/data.js` | Equipos iniciales, logos, categorías iniciales, banco de preguntas de ejemplo, valor de cada jugada, lista de ventajas, lista de sonidos | ✅ Sí — es el archivo más "de contenido" |
| `js/state.js` | El motor: TODAS las reglas del juego (qué pasa al responder, al fallar, al usar una ventaja, cuándo cambia el inning, etc.) | ⚠️ Solo si quieres cambiar una *regla*, no solo un texto |
| `js/sounds.js` | Cómo suena cada efecto (sintetizado, sin archivos .mp3) | Si quieres cambiar cómo suena algo |
| `js/csv.js` | Importar/exportar preguntas en CSV | Rara vez |
| `js/public.js` / `js/judge.js` / `js/admin.js` | Cómo se *muestra* cada pantalla (toman los datos de `state.js` y los pintan en el HTML) | Si cambias el HTML, casi siempre tienes que tocar el JS que le corresponde |
| `public.html` / `judge.html` / `admin.html` / `index.html` | La estructura visible de cada pantalla | ✅ Sí — pero con cuidado con los `id=` |
| `css/base.css` | Colores, tipografía, botones — usado por las 3 pantallas | ✅ Sí — es seguro de editar, no rompe nada |
| `css/public.css` / `css/judge.css` / `css/admin.css` | Estilos específicos de cada pantalla | Seguro de editar |

**Cada `.html` carga su `.js` "gemelo"**: `public.html` ↔ `js/public.js`,
`judge.html` ↔ `js/judge.js`, `admin.html` ↔ `js/admin.js`. Si editas
la estructura de uno, el cambio que le corresponde casi siempre está
en su gemelo.

---

## 2. Colores y tipografía — `css/base.css`

Todo el diseño (las 3 pantallas) usa estas variables. **Cambiar un
color aquí lo cambia automáticamente en todos lados** — no necesitas
tocar ningún otro archivo CSS.

| Variable | Para qué se usa |
|---|---|
| `--field-night`, `--field-night-2`, `--field-night-3`, `--field-deepest` | Fondos (verde noche de estadio, de claro a oscuro) |
| `--amber` / `--amber-soft` / `--amber-dim` | Color ámbar principal (marcador, bases iluminadas, botones destacados) |
| `--leather` / `--leather-dark` | Color secundario (rojizo cuero — outs, fallos, "eliminar") |
| `--chalk` / `--chalk-dim` | Blanco hueso (texto principal / texto secundario) |
| `--grass` / `--grass-dark` | Verde éxito (respuestas correctas, ventajas activas) |
| `--danger` | Rojo de alerta (cronómetro casi en cero) |
| `--font-display` | Tipografía de títulos (estilo scoreboard, impactante) |
| `--font-serif` | Tipografía de las preguntas (estilo "Escritura") |
| `--font-mono` | Tipografía de los números del marcador |

⚠️ **Excepción:** `--team-color` **no** está definida en `base.css`.
Cada equipo tiene su propio color (lo eliges en el panel de
Administrador) y JavaScript lo inyecta dinámicamente en cada pantalla
(`public.js`, función `render()`). Por eso los bordes, el nombre y las
bases del equipo se pintan de su color sin que tengas que tocar el CSS.

---

## 3. Equipos, logos y categorías — `js/data.js`

### `defaultTeams()`
Valores **de fábrica** (solo se usan la primera vez o al presionar
"Nueva partida"). Una vez que juegas, el estado real vive en
`localStorage`, no aquí — para cambiar nombre/color/logo en una
partida en curso, usa el panel de Administrador, pestaña **Equipos**.

Campos de cada equipo: `name`, `color`, `logo`, `score`, `runs`,
`outs`, `tokens`, `bases` (arreglo de 3: 1ra/2da/3ra), `flags`
(`shield`, `doubleScore`, `fireball`).

### `LOGO_LIBRARY`
Para **agregar un logo nuevo**: solo edita este objeto en `js/data.js`
(agrega una clave nueva con su `svg`). **No necesitas tocar ningún
otro archivo** — el panel de Administrador arma la cuadrícula de logos
automáticamente a partir de esta lista.

### `DEFAULT_CATEGORIES`
Categorías solo para una partida nueva. Para agregar/quitar categorías
en una partida ya iniciada, usa Administrador → Configuración (no
edites este archivo a mitad de evento).

---

## 4. La conexión más importante: Dificultad → Jugada, y Categoría → "libros en juego"

Esto es lo que más se pregunta "¿por qué no cambió?", así que léelo con calma.
Hay **dos cosas distintas** que es fácil confundir:

- **Categoría** (a veces un libro específico, ej. "Génesis"): se fija
  **antes de iniciar el juego**, en Administrador → Configuración → "Libros
  en juego". Define DE QUÉ LIBROS pueden salir las preguntas durante toda
  la partida.
- **Dificultad** (Fácil/Medio/Difícil/Experto): la elige el equipo **en su
  turno**, en el panel del Juez. Define QUÉ JUGADA se obtiene si responde
  bien (y cuántos puntos), dentro de los libros ya fijados.

### Dificultad → jugada

En `js/data.js` hay **5 listas que deben coincidir entre sí**:

```js
DIFFICULTY_LEVELS   = ["Fácil", "Medio", "Difícil", "Experto"]
DIFFICULTY_TO_VALUE = { "Fácil": 100, "Medio": 200, "Difícil": 300, "Experto": 500 }
VALUE_TO_PLAY = { 100: "hit", 200: "double", 300: "triple", 500: "homerun" }
PLAY_TO_VALUE = { hit: 100, double: 200, triple: 300, homerun: 500 }
PLAY_BASES    = { hit: 1, double: 2, triple: 3, homerun: 4 }
PLAY_LABELS   = { hit: "Hit", double: "Doble Hit", triple: "Triple Hit", homerun: "Home Run" }
```

Cuando el equipo elige una dificultad en el panel del Juez, `js/state.js`
(`drawQuestionByDifficulty`) busca preguntas con ese campo `dificultad`
exacto, dentro de las categorías activas. Al responder **correctamente**,
el sistema mira el `valor` de la pregunta sorteada (que el panel de
Administrador ya calculó automáticamente a partir de la dificultad al
crearla — ver `qValorPreview` en `admin.html`/`admin.js`) y busca en
`VALUE_TO_PLAY` qué jugada le corresponde.

⚠️ **Si quieres cambiar esto** (por ejemplo, agregar un nivel "Imposible",
o cambiar cuántos puntos vale un Home Run), tienes que editar **las listas
de arriba** Y también:
- `admin.html` → las 4 opciones del `<select id="qDificultad">` (formulario
  "Agregar pregunta"), para que coincidan con `DIFFICULTY_LEVELS`.
- `judge.html` / `js/judge.js` → los botones de "Jugadas manuales"
  (`data-play="hit"`, etc.) si agregas una jugada nueva, no solo cambias
  valores. Los botones de dificultad del panel del Juez se arman solos
  desde `DIFFICULTY_LEVELS`, no hace falta tocarlos.
- `js/state.js`, función `_upgradePlay()` → tiene un arreglo
  `["hit", "double", "triple", "homerun"]` que define el orden de
  mejora de la ventaja "Bola de Fuego". Si agregas una jugada nueva,
  agrégala también ahí en el orden correcto.

### Categoría activa ("libros en juego")

`state.config.activeCategories` (un arreglo de nombres de categoría)
vive en `js/state.js` y se edita desde `admin.html`/`admin.js`
(casillas en la pestaña Configuración). Si está vacío, **no hay
restricción** — se usan todas las categorías existentes. La función
`availableQuestionsByDifficulty()` en `js/state.js` es la que aplica
este filtro junto con la dificultad elegida.

⚠️ Esto es independiente del campo `categoria` de cada pregunta — no
necesitas cambiar nada en `js/data.js` para usar "libros en juego";
simplemente créalos como categorías normales (Administrador →
Configuración → "Nueva categoría o libro") y luego márcalos como
activos para la partida que quieras.

---

## 5. Ventajas especiales (fichas) — 2 archivos conectados

| Archivo | Qué define |
|---|---|
| `js/data.js` → `ADVANTAGES` | El **catálogo**: id, nombre visible, costo en fichas, descripción. El panel del Juez arma los botones automáticamente desde esta lista — si solo cambias el texto o el costo, **no necesitas tocar nada más**. |
| `js/state.js` → `useAdvantage()` | El **efecto real** de cada ventaja, en un `switch` que busca por `id`. |

Los `id` que existen hoy (deben coincidir exactamente entre ambos archivos):
`tiempoExtra`, `relevo`, `roboBase`, `pista`, `escudo`,
`segundaOportunidad`, `dobleScore`, `bolaDeFuego`.

⚠️ Si **agregas** una ventaja nueva en `ADVANTAGES` con un `id` que no
existe en el `switch` de `useAdvantage()`, el botón aparecerá en
pantalla, pero al presionarlo el sistema dirá "Ventaja no
implementada" — no se cae, pero tampoco hace nada. Tienes que agregar
el `case` correspondiente en `js/state.js`.

---

## 6. Sonidos — 2 o 3 archivos conectados

| Archivo | Qué define |
|---|---|
| `js/data.js` → `SOUND_EVENTS` | Catálogo de botones del panel de "Sonidos" del Juez (id + nombre visible). |
| `js/sounds.js` → `RECIPES` | La receta real de cada sonido (tonos, duración). |
| `js/state.js` → `_fireSound("...")` | Los **momentos automáticos** en que el juego dispara un sonido durante la partida (no por botón manual). |

IDs de sonido que usa el motor automáticamente ahora mismo:
`inicio`, `cambioInning`, `flyout`, `victoria`, `carrera`, y además
`hit` / `double` / `triple` / `homerun` (estos 4 se disparan solos,
con el mismo nombre que la jugada, ver sección 4).

⚠️ Si agregas un sonido nuevo en `SOUND_EVENTS` (para el botón
manual), también necesitas agregar su receta en `RECIPES` con el
**mismo id** — si no, el botón existe pero suena silencio.

---

## 7. Las "fases" del juego — el corazón de la sincronización

`js/state.js` controla en qué **fase** (`phase`) está la partida.
Cada pantalla decide qué mostrar/ocultar mirando esa fase. Si algún
día algo "no aparece" o "no desaparece" en pantalla, casi siempre es
por aquí.

| `phase` | ¿Qué significa? | Se ve en Pantalla Pública | Se ve en Panel del Juez |
|---|---|---|---|
| `idle` | Esperando que elijan dificultad | Mensaje "Esperando selección…" | Botones de dificultad habilitados |
| `drawing` | Animación de sorteo (1.7s) | Etiqueta girando con la dificultad elegida | Botones de dificultad deshabilitados |
| `asking` | Pregunta visible, cronómetro corriendo | Tarjeta de pregunta + cronómetro | Pregunta + respuesta correcta + botones Correcta/Incorrecta |
| `flyout` | Equipo defensor tiene 10s para robar | Banner rojo arriba | Sección Fly Out con botones Correcta/Incorrecta |
| `run-decision` | Un equipo anotó, falta elegir cobrar o ficha | Aviso "decidiendo…" | Botones "Cobrar" / "Convertir en ficha" |
| `gameover` | Partida terminada | Pantalla de resultado final | Todo deshabilitado |

---

## 8. IDs por pantalla — no los renombres sin avisar al JS

Cada uno de estos `id="..."` en el HTML es leído por su archivo `.js`
gemelo. Si cambias el nombre en el HTML, **debes** cambiarlo también
en el `.js` (búscalo con Ctrl+F, aparecerá como `$("nombreDelId")`).

<details>
<summary><strong>public.html ↔ js/public.js</strong> (haz clic para expandir)</summary>

```
teamPanelA, teamPanelB, logoA, logoB, nameA, nameB,
scoreA, scoreB, runsA, runsB, outsA, outsB, tokensA, tokensB,
flagsA, flagsB, batA, batB, inningNow, inningMax, phaseBadge,
diamondSvg, base1, base2, base3, runnerDot,
questionCard, idlePrompt, qCategoria, qValor, qTexto, qPista,
drawingLabel, flyoutBanner, flyoutTeam,
runOverlay, runTeamName, gameOverOverlay, winnerName, finalScore,
timerStage, timerRingFg, timerNum, animLayer
```
</details>

<details>
<summary><strong>judge.html ↔ js/judge.js</strong></summary>

```
tbNameA, tbNameB, tbScoreA, tbScoreB, tbDotA, tbDotB,
tbInning, tbPhase, tbOuts, battingNow,
categorySection, categoryGrid,
questionSection, qjCategoria, qjValor, qjPhaseTag, qjTexto, qjRespuesta,
flyoutSection, flyoutTeamName, flyoutRespuesta,
runSection, runTeamNameJ,
advTab0, advTab1, advGrid, soundGrid, logList, toast,
btnCorrecta, btnIncorrecta, btnFlyCorrecta, btnFlyIncorrecta,
btnCobrar, btnFicha, btnManualFlyOut, btnSiguiente,
btnCambioInning, btnPauseTimer, btnStartGame
```
Además, los botones de jugada manual (Hit/Doble/Triple/Home Run) no
usan `id`, usan `class="play-btn"` + `data-play="hit"` (o `double`,
`triple`, `homerun`) — si agregas uno nuevo, debe llevar un
`data-play` que exista en `PLAY_BASES` (sección 4).
</details>

<details>
<summary><strong>admin.html ↔ js/admin.js</strong></summary>

```
adminTabs, pane-equipos, pane-config, pane-preguntas, pane-importar,
pane-correcciones, pane-partidas (cada pestaña = un data-tab),
cfgInnings, cfgNormal, cfgSteal, btnSaveConfig,
categoryChips, newCategoryInput, btnAddCategory,
btnStartGameAdmin, btnResetTimer, btnNewGame, btnResetKeepQ,
qCategoria, qDificultad, qValorPreview, qPregunta, qRespuesta, qPista, btnAddQuestion,
activeCategoryChecks, activeCatsSummary,
qFilterCategoria, qCount, qTableBody, btnResetUsed,
importFile, btnExportCSV, xlsxNote,
saveNameInput, btnSaveGame, savesList, toast
```
Los formularios de equipo (`.team-edit`) y de corrección
(`#pane-correcciones .card`) no usan `id` individuales — usan
`data-team="0"` / `data-team="1"` para saber a qué equipo pertenecen,
y clases como `.t-name`, `.t-color`, `.c-score`, etc. dentro de ellos.
</details>

---

## 9. Buscador rápido — "Quiero cambiar X"

| Quiero... | Archivo(s) a tocar |
|---|---|
| Cambiar un color del diseño | `css/base.css` (una sola variable, se aplica a todo) |
| Cambiar el texto de un botón o título | El `.html` correspondiente — busca el texto tal cual |
| Cambiar cuántos puntos vale Hit/Doble/Triple/Home Run | `js/data.js` (`DIFFICULTY_TO_VALUE`, `VALUE_TO_PLAY`, etc. — ver sección 4) |
| Cambiar qué libros/categorías están disponibles en una partida | Panel Administrador → Configuración → "Libros en juego" (sin tocar código) |
| Agregar/quitar categorías | Panel Administrador (sin tocar código) — o `js/data.js` (`DEFAULT_CATEGORIES`) solo para partidas nuevas |
| Agregar un logo de equipo nuevo | Solo `js/data.js` (`LOGO_LIBRARY`) |
| Agregar una ventaja especial nueva | `js/data.js` (`ADVANTAGES`) **+** `js/state.js` (`useAdvantage`) |
| Cambiar el costo de una ventaja existente | Solo `js/data.js` (`ADVANTAGES`) |
| Agregar/cambiar un sonido | `js/sounds.js` (`RECIPES`) y si es un botón manual nuevo, también `js/data.js` (`SOUND_EVENTS`) |
| Cambiar el tiempo del cronómetro (30s / 10s) | Panel Administrador → Configuración (sin tocar código) |
| Cambiar cuántos innings por defecto | Panel Administrador → Configuración, o `js/state.js` (`freshState()` → `config.maxInnings`) |
| Cambiar cuántos outs terminan un inning (hoy: 3, fijo) | `js/state.js` → buscar `outs >= 3` en `_afterOutCheck()` |
| Cambiar el diseño del diamante (forma, tamaño) | `public.html` (el `<svg>`) **+** `css/public.css` (`.diamond-svg`, `.base-dot`) — si renombras un `id="base1"` debes actualizarlo también en `js/public.js` |
| Cambiar quién gana (hoy: más puntos) | `js/state.js` → función `_endGame()` |
| Cambiar las preguntas de ejemplo | Panel Administrador (sin tocar código), o `js/data.js` (`sampleQuestions()`) |
| Hacer que el sistema importe `.xlsx` real | Ver `js/vendor/LEEME.txt` |
| Usar el sistema desde varios dispositivos a la vez (misma red WiFi) | Ver README, sección 1.1 — ejecutar `server.js` (ver también sección 10 de esta guía) |
| Usar el sistema desde varios dispositivos por internet (Netlify) | Ver README, sección 1.2 — desplegar con `netlify/functions/state.mjs` |

---

## 10. El servidor multi-dispositivo — `server.js` ↔ `js/state.js`

Si usas el modo multi-dispositivo (ver README, sección 1.1), hay una
conexión nueva a tener en cuenta:

| Archivo | Qué hace |
|---|---|
| `server.js` | Sirve los archivos Y mantiene el estado "oficial" cuando hay varios dispositivos. Expone dos rutas: `GET /events` (envía cambios a todos en vivo) y `POST /api/state` (recibe cambios de cualquier dispositivo). |
| `js/state.js` → `_connectServer()`, `_pushToServer()`, `_applyIncomingState()` | El lado del navegador: se conecta a `/events` al cargar, y cada vez que `save()` se ejecuta, también envía el estado al servidor. |

⚠️ Estas dos rutas (`/events` y `/api/state`) son los **únicos** nombres
que conectan `server.js` con `js/state.js`. Si renombras una ruta en
`server.js`, debes cambiar el mismo texto en `_connectServer()` /
`_pushToServer()` dentro de `js/state.js`, o los dispositivos dejarán
de sincronizarse entre sí (seguirán funcionando solos, sin avisar de
ningún error — por eso existe el indicador "● Red" / "○ Local").

El indicador de conexión (`<span id="connStatus">`) está en los 3
`.html`, pero el texto y color se actualizan automáticamente desde
`js/state.js` (función `_setConnected()`) — no necesitas tocar
`public.js`, `judge.js` ni `admin.js` para eso.

**Dato útil:** mientras el servidor está corriendo, guarda un respaldo
del estado en `data/server-state.json` dentro de la carpeta del
proyecto. Si necesitas "empezar de cero" en modo multi-dispositivo,
puedes borrar esa carpeta `data/` con el servidor apagado.

### La versión para Netlify — `netlify/functions/state.mjs`

Si despliegas en Netlify (README, sección 1.2), `server.js` **no se
usa** — Netlify no puede mantenerlo encendido. En su lugar,
`netlify/functions/state.mjs` cumple el mismo contrato
(`GET /api/state` y `POST /api/state`) pero guardando los datos en
**Netlify Blobs** en vez de en memoria, y `js/state.js` cambia
automáticamente a "modo sondeo" (consulta cada 1.5s) en vez de SSE,
porque Netlify no tiene un `/events` en vivo.

| Si cambias... | También revisa... |
|---|---|
| El nombre de la ruta `/api/state` en `netlify/functions/state.mjs` (campo `config.path`) | `js/state.js` → `_pushToServer()` y `_startPolling()` usan ese mismo texto |
| Cómo se calcula `serverRev` en `state.mjs` | Debe seguir siendo un número que solo crece, o la sincronización entre dispositivos se rompe (es la misma regla que en `server.js`) |
| El intervalo de sondeo (hoy 1.5s) | `js/state.js` → constante `POLL_MS` dentro de `_startPolling()` |

⚠️ `package.json` (en la raíz del proyecto) declara la dependencia
`@netlify/blobs` que usa esa función. Si la borras o la renombras,
el despliegue en Netlify fallará al construir la función (no afecta a
`server.js` ni al modo de un solo dispositivo, que no la usan).

---


## 11. Cosas que viven en `localStorage` (y ahora también en el servidor)

Una vez que empiezas a jugar, el estado real (marcador, preguntas
usadas, configuración, equipos editados) se guarda en el navegador
(`localStorage`), **no** en `js/data.js`. Esto significa:

- Editar `js/data.js` después de haber jugado **no cambia una partida
  en curso** — solo afecta a una partida nueva (botón "Nueva partida"
  en Administrador) o a un navegador que nunca ha abierto el sistema.
- Para borrar todo y volver a los valores de fábrica de los archivos:
  Administrador → Configuración → **"Nueva partida (borra todo)"**.
- Esto también explica por qué, si pruebas un cambio y "no se ve", a
  veces basta con presionar ese botón para forzar que recargue desde
  los archivos.
