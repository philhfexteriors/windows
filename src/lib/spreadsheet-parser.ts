import type { WindowRow } from './supabase';

export interface ParsedSpreadsheet {
  poNumber: string | null;
  clientName: string | null;
  address: string | null;
  windows: Partial<Omit<WindowRow, 'id' | 'po_number' | 'created_at' | 'updated_at'>>[];
}

// Column header aliases — maps our internal field to possible header text
const HEADER_MAP: Record<string, string[]> = {
  quantity: ['quantity', 'quanity', 'qty', 'count', 'qty.', 'qty #'],
  label: ['label', 'window #', 'win #', 'window no', 'window number'],
  width: ['width', 'width inches', 'w', 'width (inches)'],
  height: ['height', 'height inches', 'h', 'height (inches)'],
  transomHeight: ['transom height', 'transom height inches', 'transom h'],
  transomShape: ['transom shape'],
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

  // 1. Find the header row — look for a row containing "Width" or "Height"
  let headerRowIdx = -1;
  let columnMap: Record<string, number> = {};

  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const row = rows[r];
    if (!row) continue;

    const cellValues = row.map((c) =>
      c != null ? String(c).toLowerCase().trim() : ''
    );

    // Check if this row has something width-related
    const hasWidth = cellValues.some((v) =>
      HEADER_MAP.width.some((alias) => v === alias || v.includes('width'))
    );
    // Check if this row has something height-related
    const hasHeight = cellValues.some((v) =>
      HEADER_MAP.height.some((alias) => v === alias || v.includes('height'))
    );

    if (hasWidth && hasHeight) {
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

  // If we still didn't find a header row, fallback
  if (headerRowIdx === -1) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const firstCell = row[0];
      if (firstCell != null && !isNaN(Number(firstCell)) && Number(firstCell) > 0) {
        headerRowIdx = r - 1;
        break;
      }
    }

    // Default column order
    columnMap = {
      quantity: 0,
      width: 1,
      height: 2,
      style: 3,
      gridStyle: 4,
      notes: 5,
    };
  }

  // 2. Try to extract PO/client info from rows above the header
  let clientName: string | null = null;
  let address: string | null = null;
  let poNumber: string | null = null;

  for (let r = 0; r < Math.max(headerRowIdx, 0); r++) {
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
      if (
        (lower.includes('client') || lower.includes('customer')) &&
        c + 1 < row.length &&
        row[c + 1] != null
      ) {
        clientName = String(row[c + 1]).trim();
      }
      // Look for "Address" labels
      if (lower.includes('address') && c + 1 < row.length && row[c + 1] != null) {
        address = String(row[c + 1]).trim();
      }
    }

    // Check for address in a later column of the same row as client name
    if (!address && row.length > 2 && row[2] != null) {
      const val = String(row[2]).trim();
      // If it looks like an address (has numbers and letters, long enough)
      if (val.length > 10 && /\d/.test(val) && /[a-zA-Z]/.test(val)) {
        address = val;
      }
    }

    // Fallback: check if the first cell looks like a name
    if (!clientName && row[0] != null) {
      const first = String(row[0]).trim();
      if (
        first.length > 2 &&
        /[a-zA-Z]/.test(first) &&
        !['windows', 'label', 'width', 'height', 'vinyl', 'brand', 'manufacturer'].some(
          (k) => first.toLowerCase().includes(k)
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
  const hasQuantityCol = columnMap.quantity !== undefined;
  const hasLabelCol = columnMap.label !== undefined;
  let windowCounter = 1;

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

    const width = getCol('width');
    const height = getCol('height');
    const labelRaw = getCol('label');
    const quantityRaw = getCol('quantity');

    // Skip rows with no width and no height
    if (!width && !height) continue;

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

    // Normalize style
    const style = styleRaw || null;
    const windowType = styleRaw === 'Half Round' ? 'Half-Round' : '';

    // Determine how many windows to create from this row
    let qty = 1;
    if (hasQuantityCol && quantityRaw) {
      const parsed = parseInt(quantityRaw, 10);
      if (!isNaN(parsed) && parsed > 0) qty = parsed;
    }

    // Create window entries (expand by quantity)
    for (let q = 0; q < qty; q++) {
      // Generate label: use explicit label col if available, otherwise auto-number
      let label: string | null;
      if (hasLabelCol && labelRaw) {
        label = qty > 1 ? `${labelRaw}-${q + 1}` : labelRaw;
      } else {
        label = String(windowCounter);
        windowCounter++;
      }

      windows.push({
        label,
        location: `Window ${label}`,
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
  }

  return { poNumber, clientName, address, windows };
}

function noneToNull(val: string | null | undefined): string | null {
  if (!val || val.toLowerCase() === 'none') return null;
  return val;
}
