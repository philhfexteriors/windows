import type { WindowRow } from './supabase';

export interface ParsedSpreadsheet {
  poNumber: string | null;
  clientName: string | null;
  address: string | null;
  windows: Partial<Omit<WindowRow, 'id' | 'po_number' | 'created_at' | 'updated_at'>>[];
}

// Column header aliases — maps our internal field to possible header text
const HEADER_MAP: Record<string, string[]> = {
  label: ['label', 'window', 'win', '#', 'no', 'number'],
  width: ['width', 'width inches', 'w', 'width (inches)'],
  height: ['height', 'height inches', 'h', 'height (inches)'],
  transomHeight: ['transom height', 'transom height inches', 'transom h'],
  transomShape: ['transom shape', 'transom'],
  style: ['style'],
  gridStyle: ['grid style', 'grid', 'grids'],
  temper: ['temper', 'tempered', 'glass'],
  outsideColor: ['outside color', 'ext color', 'exterior color', 'outside', 'ext'],
  insideColor: ['inside color', 'int color', 'interior color', 'inside', 'int'],
  screen: ['screen', 'screens'],
  notes: ['notes', 'note', 'comments', 'comment'],
};

export async function parseSpreadsheet(file: File): Promise<ParsedSpreadsheet> {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Convert sheet to array of arrays for easier processing
  const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: true,
  });

  // 1. Find the header row by looking for a row that contains "Label" and "Width"
  let headerRowIdx = -1;
  let columnMap: Record<string, number> = {};

  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const row = rows[r];
    if (!row) continue;

    const cellValues = row.map((c) =>
      c != null ? String(c).toLowerCase().trim() : ''
    );

    // Check if this row has "label" somewhere
    const hasLabel = cellValues.some((v) =>
      HEADER_MAP.label.some((alias) => v === alias)
    );
    // Check if this row has something width-related
    const hasWidth = cellValues.some((v) =>
      HEADER_MAP.width.some((alias) => v === alias || v.includes('width'))
    );

    if (hasLabel && hasWidth) {
      headerRowIdx = r;

      // Map columns by matching header text to our field names
      for (let c = 0; c < cellValues.length; c++) {
        const val = cellValues[c];
        if (!val) continue;

        for (const [field, aliases] of Object.entries(HEADER_MAP)) {
          if (columnMap[field] !== undefined) continue; // already found
          if (aliases.some((alias) => val === alias || val.includes(alias))) {
            columnMap[field] = c;
            break;
          }
        }
      }
      break;
    }
  }

  // If we didn't find a header row, try a fallback: assume columns are in standard order
  if (headerRowIdx === -1) {
    // Look for first row with a numeric value in column A that could be a label
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const firstCell = row[0];
      if (firstCell != null && !isNaN(Number(firstCell)) && Number(firstCell) > 0) {
        headerRowIdx = r - 1; // Assume header is one row above
        break;
      }
    }

    // Default column order matching the spreadsheet screenshot
    columnMap = {
      label: 0,
      width: 1,
      height: 2,
      transomHeight: 3,
      transomShape: 4,
      style: 5,
      gridStyle: 6,
      temper: 7,
      outsideColor: 8,
      insideColor: 9,
      screen: 10,
      notes: 11,
    };
  }

  // 2. Try to extract PO/client info from rows above the header
  let clientName: string | null = null;
  let address: string | null = null;
  let poNumber: string | null = null;

  for (let r = 0; r < headerRowIdx; r++) {
    const row = rows[r];
    if (!row) continue;

    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (val == null) continue;
      const str = String(val).trim();
      const lower = str.toLowerCase();

      // Look for "PO" or "PO#" or "PO Number" labels
      if (lower.includes('po') && c + 1 < row.length && row[c + 1] != null) {
        poNumber = String(row[c + 1]).trim();
      }
      // Look for "Client" or "Customer" labels
      if ((lower.includes('client') || lower.includes('customer')) && c + 1 < row.length && row[c + 1] != null) {
        clientName = String(row[c + 1]).trim();
      }
      // Look for "Address" labels
      if (lower.includes('address') && c + 1 < row.length && row[c + 1] != null) {
        address = String(row[c + 1]).trim();
      }
    }

    // Also check if the first cell of early rows is a name-like value (fallback for client)
    if (!clientName && row[0] != null) {
      const first = String(row[0]).trim();
      // If it looks like a name (has letters, not a header keyword)
      if (
        first.length > 2 &&
        /[a-zA-Z]/.test(first) &&
        !['windows', 'label', 'width', 'height'].some((k) =>
          first.toLowerCase().includes(k)
        )
      ) {
        clientName = first;
      }
    }
  }

  // Use client name as PO fallback
  if (!poNumber && clientName) {
    poNumber = clientName;
  }

  // 3. Parse window data starting from the row after the header
  const windows: ParsedSpreadsheet['windows'] = [];
  const dataStartRow = headerRowIdx + 1;

  for (let r = dataStartRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    const getCol = (field: string): string => {
      const idx = columnMap[field];
      if (idx === undefined || idx >= row.length) return '';
      const val = row[idx];
      if (val == null) return '';
      return String(val).trim();
    };

    const label = getCol('label');
    const width = getCol('width');
    const height = getCol('height');

    // Skip rows with no label, no width, and no height (empty rows)
    if (!label && !width && !height) continue;

    const transomHeightRaw = getCol('transomHeight');
    const transomShapeRaw = getCol('transomShape');
    const styleRaw = getCol('style');
    const gridStyleRaw = getCol('gridStyle');
    const temperRaw = getCol('temper');
    const outsideColorRaw = getCol('outsideColor');
    const insideColorRaw = getCol('insideColor');
    const screenRaw = getCol('screen');
    const notesRaw = getCol('notes');

    // Parse transom height
    let transomHeight: number | null = null;
    if (transomHeightRaw) {
      const parsed = parseFloat(transomHeightRaw);
      if (!isNaN(parsed) && parsed > 0) transomHeight = parsed;
    }

    // Normalize transom shape
    const transomShape =
      !transomShapeRaw || transomShapeRaw.toLowerCase() === 'none'
        ? null
        : transomShapeRaw;

    // Normalize style — map "Half Round" to "Half-Round" for app type matching
    const style = styleRaw || null;
    const windowType = styleRaw === 'Half Round' ? 'Half-Round' : '';

    windows.push({
      label: label || null,
      location: label ? `Window ${label}` : '',
      type: windowType,
      approx_width: width || null,
      approx_height: height || null,
      widths: [],
      heights: [],
      final_w: null,
      final_h: null,
      transom_shape: transomShape,
      transom_height: transomHeight,
      style: style,
      grid_style: noneToNull(gridStyleRaw),
      temper: noneToNull(temperRaw),
      outside_color: outsideColorRaw || null,
      inside_color: insideColorRaw || null,
      screen: noneToNull(screenRaw),
      notes: notesRaw || '',
      status: 'pending' as const,
    });
  }

  return { poNumber, clientName, address, windows };
}

function noneToNull(val: string | null | undefined): string | null {
  if (!val || val.toLowerCase() === 'none') return null;
  return val;
}
