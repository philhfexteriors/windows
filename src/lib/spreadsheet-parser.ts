import type { WindowRow } from './supabase';

export interface ParsedSpreadsheet {
  poNumber: string | null;
  clientName: string | null;
  address: string | null;
  windows: Partial<Omit<WindowRow, 'id' | 'po_number' | 'created_at' | 'updated_at'>>[];
}

export async function parseSpreadsheet(file: File): Promise<ParsedSpreadsheet> {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Parse header info from rows 3-4 (0-indexed: rows 2-3)
  const clientName = getCellValue(sheet, 'A', 3) || null;  // Row 4, Col A
  const address = getCellValue(sheet, 'C', 3) || null;     // Row 4, Col C

  // Try to extract PO from client name (e.g., "Miller7349" -> "Miller7349")
  const poNumber = clientName;

  // Parse window data starting from row 12 (0-indexed: row 11)
  const windows: ParsedSpreadsheet['windows'] = [];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  for (let row = 11; row <= range.e.r; row++) {
    const label = getCellValue(sheet, 'A', row);
    const width = getCellValue(sheet, 'B', row);

    // Skip rows with no label and no width
    if (!label && !width) continue;

    const heightRaw = getCellValue(sheet, 'C', row);
    const transomHeightRaw = getCellValue(sheet, 'D', row);
    const transomShapeRaw = getCellValue(sheet, 'E', row);
    const style = getCellValue(sheet, 'F', row);
    const gridStyle = getCellValue(sheet, 'G', row);
    const temper = getCellValue(sheet, 'H', row);
    const outsideColor = getCellValue(sheet, 'I', row);
    const insideColor = getCellValue(sheet, 'J', row);
    const screen = getCellValue(sheet, 'K', row);
    const notes = getCellValue(sheet, 'L', row);

    // Parse transom height to number if present
    let transomHeight: number | null = null;
    if (transomHeightRaw) {
      const parsed = parseFloat(transomHeightRaw);
      if (!isNaN(parsed) && parsed > 0) transomHeight = parsed;
    }

    // Normalize transom shape
    const transomShape =
      !transomShapeRaw || transomShapeRaw === 'None' ? null : transomShapeRaw;

    windows.push({
      label: label || null,
      location: label ? `Window ${label}` : '',
      type: style === 'Half Round' ? 'Half-Round' : '',
      approx_width: width || null,
      approx_height: heightRaw || null,
      widths: [],
      heights: [],
      final_w: null,
      final_h: null,
      transom_shape: transomShape,
      transom_height: transomHeight,
      style: style || null,
      grid_style: noneToNull(gridStyle),
      temper: noneToNull(temper),
      outside_color: outsideColor || null,
      inside_color: insideColor || null,
      screen: noneToNull(screen),
      notes: notes || '',
      status: 'pending' as const,
    });
  }

  return { poNumber, clientName, address, windows };
}

function getCellValue(
  sheet: Record<string, unknown>,
  col: string,
  row: number
): string {
  const cellAddress = `${col}${row + 1}`; // XLSX uses 1-indexed rows
  const cell = sheet[cellAddress] as { v?: unknown } | undefined;
  if (!cell || cell.v === undefined || cell.v === null) return '';
  return String(cell.v).trim();
}

function noneToNull(val: string | null | undefined): string | null {
  if (!val || val === 'None') return null;
  return val;
}
