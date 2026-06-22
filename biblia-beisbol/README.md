# Concurso Bíblico de Béisbol

Sistema interactivo para concursos bíblicos con temática de béisbol.
Funciona 100% en el navegador, sin necesidad de internet ni de instalar nada.

---

## 1. Instalación / Cómo ejecutarlo

No requiere instalación. Son archivos estáticos (HTML, CSS, JS).

**Opción A — Abrir directamente:**
Haz doble clic en `index.html`. Se abrirá en tu navegador.
⚠️ Algunos navegadores restringen `localStorage`/`BroadcastChannel` al abrir
archivos con `file://`. Si la sincronización entre pantallas no funciona,
usa la Opción B.

**Opción B — Servidor local (recomendado):**
Con Python instalado, abre una terminal en esta carpeta y ejecuta:

```
python3 -m http.server 8000
```

Luego abre `http://localhost:8000/index.html` en tu navegador.
(También funciona con cualquier otro servidor estático: `npx serve`, Live Server de VS Code, etc. Ninguno requiere internet, solo sirven los archivos locales.)

**Para el evento en vivo:**
1. Abre `index.html` → entra al **Administrador** y configura equipos, preguntas y categorías.
2. Abre el **Panel del Juez** en la computadora del operador.
3. Abre la **Pantalla Pública** y proyéctala (botón de pantalla completa de tu navegador: F11).

Las tres pantallas pueden abrirse en pestañas o ventanas distintas del
**mismo navegador** (incluso en monitores diferentes) y se mantienen
sincronizadas automáticamente en tiempo real.

---

## 1.1 Modo multi-dispositivo (un celular para el juez, una laptop para proyectar, etc.)

Por defecto (Opción A/B de arriba), la sincronización funciona solo
**dentro del mismo navegador** (pestañas/ventanas). Si quieres que el
**Juez use su celular**, la **Pantalla Pública sea otra laptop
conectada al proyector**, y el **Administrador use una tablet** — todos
viendo lo mismo en tiempo real — necesitas levantar el servidor incluido.

No requiere internet. Todos los dispositivos deben estar conectados a
la **misma red WiFi** (la del local del evento, por ejemplo).

### Pasos

1. **Instala Node.js** (una sola vez) en la computadora que hará de
   "servidor" — normalmente la del Administrador. Descárgalo gratis de
   [nodejs.org](https://nodejs.org) (elige la versión "LTS").

2. **Inicia el servidor:**
   - Windows: haz doble clic en `iniciar-servidor-windows.bat`
   - Mac: haz doble clic en `iniciar-servidor-mac.command`
     (la primera vez, si macOS lo bloquea por seguridad, haz clic
     derecho → Abrir, y confirma)
   - O desde una terminal, en esta carpeta: `node server.js`

3. La ventana que se abre te mostrará algo así:

   ```
   Desde OTROS dispositivos en la MISMA RED WIFI, abre:
     → http://192.168.1.23:8080/index.html
   ```

   Esa dirección (`http://192.168.1.23:8080`, la tuya será distinta)
   es la que vas a compartir.

4. En **cada dispositivo** (celular, tablet, otra laptop — todos
   conectados a la misma WiFi), abre esa dirección en el navegador y
   entra al panel correspondiente:
   - `http://192.168.1.23:8080/judge.html` → el dispositivo del juez
   - `http://192.168.1.23:8080/public.html` → el dispositivo que proyecta
   - `http://192.168.1.23:8080/admin.html` → el dispositivo del administrador

5. Verifica el indicador de conexión en la esquina de cada pantalla:
   **● Red** (verde) significa que ese dispositivo está sincronizado
   con los demás. **○ Local** significa que no encontró el servidor
   (revisa que esté en la misma WiFi y que escribiste bien la
   dirección).

6. **Deja la ventana del servidor abierta** durante todo el evento —
   si la cierras, los demás dispositivos se quedan sin sincronizar
   (aunque cada uno sigue funcionando de forma local hasta que el
   servidor vuelva).

## 1.2 Subirlo a Netlify (acceso por internet, gratis, desde cualquier red)

Sí se puede, y es gratis. Como Netlify no puede mantener un servidor
encendido todo el tiempo (solo "despierta" funciones por unos segundos
cuando alguien las llama), el modo de sincronización cambia un poco:
en vez de empujar los cambios al instante (como hace `server.js` en
la red local), cada pantalla **consulta cada 1.5 segundos** si hay
algo nuevo. La diferencia es casi imperceptible en uso real (medio
segundo a segundo y medio de retraso en vez de instantáneo).

No necesitas tocar nada del código — ya está preparado. Pasos:

1. **Crea una cuenta gratis** en [netlify.com](https://www.netlify.com).

2. **Sube tu código a GitHub** (gratis también, [github.com](https://github.com)):
   crea un repositorio nuevo y sube todos los archivos de esta carpeta
   (incluyendo `netlify.toml`, `package.json` y la carpeta `netlify/`).
   > ⚠️ No uses la opción de "arrastrar y soltar" (Netlify Drop) para
   > este proyecto: esa opción no instala las dependencias necesarias
   > para la sincronización (el paquete `@netlify/blobs`) y la
   > sincronización entre dispositivos no funcionará. GitHub +
   > Netlify sí instala todo automáticamente.

3. En Netlify: **Add new project → Import an existing project →**
   conecta tu cuenta de GitHub y elige el repositorio. Netlify detecta
   `netlify.toml` automáticamente — no necesitas tocar ninguna
   configuración de build. Haz clic en **Deploy**.

4. En unos minutos tendrás una dirección pública, algo como
   `https://tu-sitio-123.netlify.app`. Esa es la dirección que vas a
   compartir con cada dispositivo:
   - `https://tu-sitio-123.netlify.app/judge.html`
   - `https://tu-sitio-123.netlify.app/public.html`
   - `https://tu-sitio-123.netlify.app/admin.html`

5. El indicador de conexión (**● Red** / **○ Local**) funciona igual
   que en el modo de red local.

**Alternativa para quienes prefieren terminal, sin usar GitHub:**
instala la CLI de Netlify (`npm install -g netlify-cli`), corre
`npm install` dentro de esta carpeta, inicia sesión con
`netlify login`, y despliega con `netlify deploy --prod`. La CLI sí
empaqueta correctamente las dependencias de la función.

> **Nota:** el plan gratis de Netlify tiene límites de uso mensuales
> (generosos para un concurso de un solo evento, pero revisa
> [netlify.com/pricing](https://www.netlify.com/pricing/) si planeas
> usarlo de forma recurrente o con mucho tráfico).

> **¿Prefieres sincronización instantánea en vez de cada 1.5s?**
> `server.js` (el de la sección 1.1) también puede desplegarse en
> servicios que sí mantienen un proceso encendido, como Render o
> Railway — ahí sí funciona la versión "en vivo" (sin sondeo). Para
> un concurso en vivo en un mismo salón, normalmente no hace falta:
> el sondeo de Netlify ya se siente instantáneo en la práctica.

---

## 2. Arquitectura del proyecto

```
biblia-beisbol/
├── index.html          → pantalla de inicio / enlaces a los 3 paneles
├── public.html          → pantalla pública (para proyectar)
├── judge.html            → panel del juez (operación en vivo)
├── admin.html             → panel del administrador
├── server.js               → servidor opcional para modo multi-dispositivo en red local (ver sección 1.1)
├── netlify.toml              → configuración para desplegar en Netlify (ver sección 1.2)
├── package.json                → dependencia de la función de Netlify (@netlify/blobs)
├── netlify/functions/state.mjs   → función serverless equivalente a server.js, para Netlify
├── iniciar-servidor-windows.bat → lanzador de doble clic (Windows)
├── iniciar-servidor-mac.command → lanzador de doble clic (Mac)
├── css/
│   ├── base.css            → tokens de diseño compartidos (colores, tipografía, botones)
│   ├── public.css           → estilos de la pantalla pública
│   ├── judge.css              → estilos del panel del juez
│   └── admin.css                → estilos del panel del administrador
├── js/
│   ├── data.js          → equipos por defecto, logos, categorías, banco de preguntas de ejemplo
│   ├── state.js           → motor del juego: estado, persistencia, sincronización y TODA la lógica de reglas
│   ├── sounds.js             → efectos de sonido sintetizados (Web Audio API, sin archivos .mp3)
│   ├── csv.js                  → importar/exportar preguntas en CSV (+ gancho opcional para Excel)
│   ├── public.js                 → renderizado y animaciones de la pantalla pública
│   ├── judge.js                    → interacciones del panel del juez
│   ├── admin.js                       → interacciones del panel de administrador
│   └── vendor/                          → carpeta opcional (ver vendor/LEEME.txt) para soporte .xlsx real
```

### Cómo se sincronizan las pantallas (3 modos posibles)

**Modo 1 — mismo dispositivo (siempre activo):** un único motor
(`Engine`, definido en `state.js`) guarda el estado en `localStorage`
y lo transmite entre pestañas/ventanas del mismo navegador vía
`BroadcastChannel`. Esto funciona siempre, sin servidor.

**Modo 2 — red local con `server.js` (sección 1.1):** cada pantalla
abre una conexión en vivo (Server-Sent Events) hacia el servidor, y le
envía sus cambios por HTTP. El servidor reenvía cada cambio a todos
los dispositivos conectados al instante.

**Modo 3 — Netlify, por internet (sección 1.2):** como Netlify no
mantiene conexiones abiertas, cada pantalla pregunta cada 1.5
segundos si hay algo nuevo (`netlify/functions/state.mjs`, que guarda
el estado en Netlify Blobs en vez de en memoria).

Si no hay servidor disponible (ningún modo 2 o 3), cada dispositivo
simplemente sigue funcionando solo, en modo local (sin errores, sin
bloquearse) — por eso el indicador de conexión existe, para que sepas
en cuál modo está cada pantalla. El cliente (`js/state.js`) detecta
automáticamente cuál de los 3 modos usar — no hay que configurar nada
a mano.



### Categoría (libro) vs. Dificultad — quién elige qué
- **Antes de iniciar el juego**, en Administrador → Configuración, se marcan
  las categorías/libros que estarán habilitados para esa partida ("Libros en
  juego"). Si no se marca ninguna, se usan todas.
- **Durante el juego**, el equipo en turno ya no elige categoría — elige el
  **nivel de dificultad** (Fácil/Medio/Difícil/Experto). El sistema saca una
  pregunta al azar de esa dificultad, dentro de los libros ya fijados. Esto
  es lo que le da la capa de estrategia/riesgo: más difícil = más puntos,
  pero también más probabilidad de fallar.

### Mapeo de dificultad → jugada y puntos
Por defecto: **Fácil = Hit (100) · Medio = Doble Hit (200) · Difícil = Triple
Hit (300) · Experto = Home Run (500)**.
Se ajusta en `js/data.js` (`DIFFICULTY_TO_VALUE` y `VALUE_TO_PLAY`) si
prefieres otro esquema — ver `GUIA-DE-EDICION.md`, sección 4.

### Flujo de una pregunta
`Equipo elige dificultad → animación de sorteo (1.7s, muestra la dificultad)
→ se revela la pregunta (de un libro habilitado) y arranca el cronómetro →
Correcta (jugada automática) o Incorrecta (out + ventana de 10s de Fly Out
para el equipo defensor) → si se anotó una carrera, ventana de decisión
(cobrar puntos o convertir en ficha) → 3 outs cambian el turno → tras el
último inning, pantalla de resultado final.`

---

## 3. Funcionalidades incluidas

- ✅ 2 equipos configurables (nombre, color, logo, marcador, carreras, outs, fichas)
- ✅ Innings configurables (6 por defecto), cambio automático de turno
- ✅ Banco de preguntas por categoría/dificultad/valor, sin repetición en la misma partida
- ✅ Categorías/libros fijados antes de iniciar el juego; el equipo elige la dificultad (riesgo) en cada turno
- ✅ Importar/Exportar preguntas en CSV (Excel real opcional, ver `js/vendor/LEEME.txt`)
- ✅ Cronómetro visual (30s normal / 10s robo) con aviso sonoro en los últimos segundos
- ✅ Jugadas: Hit, Doble Hit, Triple Hit, Home Run, Out, Fly Out
- ✅ Diamante animado con bases que se iluminan y corredor visual entre bases
- ✅ Decisión de carrera: cobrar 100 pts o convertir en ficha especial
- ✅ 8 ventajas especiales (fichas): Tiempo Extra, Relevo, Robo de Base, Pista,
  Escudo, Segunda Oportunidad, Doble Puntuación, Bola de Fuego
- ✅ Sonidos sintetizados (sin archivos externos) + panel de reproducción manual
- ✅ Animaciones de jugada, cambio de inning y victoria
- ✅ Pantalla pública estilo scoreboard de estadio
- ✅ Panel del juez con botones grandes pensados para operación en vivo
- ✅ Panel de administrador: equipos, configuración, preguntas (CRUD), correcciones
  manuales de marcador/carreras/outs/fichas, guardar y recuperar partidas con nombre
- ✅ Autoguardado constante — si se cierra una pestaña por accidente, la partida continúa igual

---

## 4. Notas y decisiones de diseño

- **Sonido sin internet:** en vez de archivos `.mp3`, los efectos se generan con
  Web Audio API (`js/sounds.js`). Esto garantiza que el sistema funcione sin conexión.
  Si prefieres usar tus propios archivos de audio, puedes reemplazar las funciones
  de `RECIPES` en ese archivo por `new Audio('sonidos/hit.mp3').play()`, por ejemplo.
- **Tipografía sin Google Fonts:** se usan fuentes del sistema (Impact/Georgia/Segoe UI)
  para que el diseño cargue siempre, incluso sin internet.
- **Excel real:** la importación nativa de `.xlsx` requiere una librería externa
  (SheetJS) que no se incluye por defecto para no depender de descargas de internet.
  CSV funciona sin ninguna dependencia adicional y Excel puede exportar a CSV
  directamente. Ver `js/vendor/LEEME.txt` para activar `.xlsx` real si lo deseas.
- **Ganador:** se determina por **puntos totales**, no por carreras. Si prefieres que
  gane quien tenga más carreras, ajusta `_endGame()` en `js/state.js`.

---

## 5. Mejoras futuras sugeridas

- Soporte para más de 2 equipos (la base de datos ya usa un arreglo `teams[]`,
  pero la UI del diamante/bases está pensada para 1 equipo bateando a la vez;
  se podría extender a un sistema de "rotación" de equipos).
- Animación de múltiples corredores simultáneos en el diamante (hoy se anima
  un único corredor representativo por jugada).
- Editor visual de preguntas en el panel de administrador (hoy la edición usa
  ventanas `prompt()` del navegador por simplicidad).
- Modo "torneo" con varias partidas y tabla de posiciones.
- Exportar el marcador final como imagen o PDF al terminar la partida.
- Subir logos personalizados (imagen propia) además de la biblioteca incluida.
- Atajos de teclado en el panel del juez para operar aún más rápido.
- Historial/"deshacer última jugada" con pila de cambios.

---

## 6. Soporte

Todo el código está comentado y organizado por archivo para que puedas
modificar reglas, textos, colores o tiempos fácilmente. Los puntos de
ajuste más comunes:

| Quiero cambiar...                  | Dónde                                      |
|------------------------------------|---------------------------------------------|
| Tiempos de respuesta                | Panel Administrador → Configuración (o `js/data.js`) |
| Cantidad de innings                 | Panel Administrador → Configuración          |
| Colores del diseño                  | `css/base.css` (sección `:root`)             |
| Preguntas de ejemplo                | `js/data.js` → `sampleQuestions()`           |
| Logos disponibles                   | `js/data.js` → `LOGO_LIBRARY`                |
| Costo/efecto de ventajas especiales | `js/data.js` (`ADVANTAGES`) y `js/state.js` (`useAdvantage`) |
