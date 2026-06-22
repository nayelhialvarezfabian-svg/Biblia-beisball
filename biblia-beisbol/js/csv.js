/* ============================================================
   csv.js — Importar / Exportar preguntas en CSV (sin internet)
   Si el administrador coloca la librería SheetJS en
   js/vendor/xlsx.full.min.js, este módulo la detecta y permite
   además importar/exportar archivos .xlsx reales. Sin esa
   librería, el sistema funciona perfectamente solo con CSV.
   ============================================================ */

const CSVTools = (() => {
  const HEADERS = ["categoria", "dificultad", "valor", "pregunta", "respuesta", "pista"];

  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else if (c === "\r") { /* ignore */ }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  }

  function rowsToQuestions(rows) {
    if (!rows.length) return [];
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = {};
    HEADERS.forEach((h) => { idx[h] = header.indexOf(h); });
    const dataRows = idx.categoria === 0 || header.includes("categoria") ? rows.slice(1) : rows;
    return dataRows.map((r) => ({
      categoria: (r[idx.categoria] || "General").trim(),
      dificultad: (r[idx.dificultad] || "Medio").trim(),
      valor: parseInt(r[idx.valor], 10) || 100,
      pregunta: (r[idx.pregunta] || "").trim(),
      respuesta: (r[idx.respuesta] || "").trim(),
      pista: (r[idx.pista] || "").trim()
    })).filter((q) => q.pregunta && q.respuesta);
  }

  function csvEscape(val) {
    const s = String(val == null ? "" : val);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function questionsToCSV(questions) {
    const lines = [HEADERS.join(",")];
    questions.forEach((q) => {
      lines.push(HEADERS.map((h) => csvEscape(q[h])).join(","));
    });
    return lines.join("\n");
  }

  function downloadCSV(questions, filename) {
    const csv = questionsToCSV(questions);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "preguntas.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function hasXLSXSupport() {
    return typeof window.XLSX !== "undefined";
  }

  function importFile(file, callback) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") && hasXLSXSupport()) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = window.XLSX.read(e.target.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        callback(rowsToQuestions(rows));
      };
      reader.readAsArrayBuffer(file);
    } else if (name.endsWith(".xlsx") && !hasXLSXSupport()) {
      callback(null, "Para importar archivos .xlsx reales agrega la librería SheetJS en js/vendor/xlsx.full.min.js (ver README). Mientras tanto, exporta tu Excel como CSV y vuelve a intentar.");
    } else {
      const reader = new FileReader();
      reader.onload = (e) => callback(rowsToQuestions(parseCSV(e.target.result)));
      reader.readAsText(file, "utf-8");
    }
  }

  return { parseCSV, rowsToQuestions, questionsToCSV, downloadCSV, importFile, hasXLSXSupport, HEADERS };
})();
