/**
 * Elle CSV üretme/çözme yardımcıları — kütüphane yok (sadeleştirilmiş kapsam).
 * Üretim: alanlar gerektiğinde tırnaklanır; indirme UTF-8 BOM'lu blob ile yapılır
 * (Excel'in Türkçe karakterleri doğru açması için).
 * Çözme: BOM temizlenir, ayraç virgül/noktalı virgül toleranslıdır, tırnaklı
 * alanlar ("" kaçışıyla) desteklenir.
 */

/** Excel'in UTF-8 algılaması için dosya başına eklenen bayt sırası imi. */
const UTF8_BOM = String.fromCharCode(0xfeff);

/** Alanı CSV için kaçışlar: ayraç/tırnak/yeni satır içeriyorsa tırnaklar. */
function escapeCsvField(value: string): string {
  return /[",;\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Satır dizilerini CSV metnine çevirir (virgül ayraçlı, CRLF satır sonlu). */
export function buildCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
}

/** CSV satırlarını UTF-8 BOM'lu dosya olarak indirir (blob + a[download]). */
export function downloadCsv(filename: string, rows: string[][]): void {
  const blob = new Blob([UTF8_BOM, buildCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** İlk satıra bakıp ayracı seçer: noktalı virgül virgülden çoksa ';' kabul edilir. */
function detectDelimiter(firstLine: string): ',' | ';' {
  const commas = firstLine.split(',').length - 1;
  const semicolons = firstLine.split(';').length - 1;
  return semicolons > commas ? ';' : ',';
}

/**
 * CSV metnini satır dizilerine çözer. BOM temizlenir, CRLF/LF kabul edilir,
 * tamamen boş satırlar atlanır. Tırnak içinde ayraç ve yeni satır korunur.
 */
export function parseCsv(text: string): string[][] {
  const content = text.startsWith(UTF8_BOM) ? text.slice(1) : text;
  const firstLineEnd = content.indexOf('\n');
  const delimiter = detectDelimiter(
    firstLineEnd === -1 ? content : content.slice(0, firstLineEnd),
  );

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"'; // "" → tek tırnak kaçışı
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}
