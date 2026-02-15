import type { WindowRow } from './supabase';
import { formatFraction } from './measurements';

interface PDFJobInfo {
  poNumber: string;
  clientName?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientZip?: string;
}

export async function generatePDFBlob(
  windows: WindowRow[],
  jobInfo: string | PDFJobInfo
): Promise<{ blob: Blob; fileName: string }> {
  const info: PDFJobInfo = typeof jobInfo === 'string'
    ? { poNumber: jobInfo }
    : jobInfo;

  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  const brandRed: [number, number, number] = [157, 34, 53];
  const lightGray: [number, number, number] = [243, 244, 246];
  const darkGray: [number, number, number] = [55, 65, 81];
  const midGray: [number, number, number] = [107, 114, 128];
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 40;
  const bottomMargin = 40;
  let y = margin;

  // Main Header
  doc.setFontSize(20);
  doc.setTextColor(...brandRed);
  doc.text('H&F Exteriors - Window Measurement Report', pageWidth / 2, y, {
    align: 'center',
  });
  y += 20;
  doc.setFontSize(12);
  doc.setTextColor(...darkGray);
  doc.text(`PO Number: ${info.poNumber}`, margin, y);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, y, {
    align: 'right',
  });
  y += 16;

  // Client info if available
  if (info.clientName) {
    doc.setFontSize(10);
    doc.setTextColor(...midGray);
    doc.text(info.clientName, margin, y);
    y += 14;
  }
  if (info.clientAddress) {
    doc.setFontSize(10);
    doc.setTextColor(...midGray);
    const addrParts = [info.clientAddress, info.clientCity, info.clientState, info.clientZip].filter(Boolean);
    doc.text(addrParts.join(', '), margin, y);
    y += 14;
  }
  y += 9;

  windows.forEach((w) => {
    const blockStartY = y;

    // Calculate block height
    let calculatedHeight = 85;
    if (w.transom_height) calculatedHeight += 30;
    if (w.notes) {
      const notesLines = doc.splitTextToSize(w.notes, pageWidth - margin * 2 - 20);
      calculatedHeight += notesLines.length * 10 + 25;
    }
    if (w.widths && w.widths.length > 0) calculatedHeight += 40;
    // Extra space for spec fields
    if (w.style || w.grid_style || w.temper || w.outside_color || w.screen) {
      calculatedHeight += 30;
    }

    if (y + calculatedHeight > pageHeight - bottomMargin) {
      doc.addPage();
      y = margin;
    }

    // Block Header
    doc.setFillColor(...brandRed);
    doc.rect(margin, y, pageWidth - margin * 2, 30, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const headerText = w.label
      ? `#${w.label} - ${w.location}`
      : `Window: ${w.location}`;
    doc.text(headerText, margin + 10, y + 20);
    y += 30;

    // Content area
    doc.setFillColor(...lightGray);
    doc.rect(margin, y, pageWidth - margin * 2, calculatedHeight - 30, 'F');
    y += 15;

    // Type and Final Size
    const halfWidth = pageWidth / 2;
    doc.setFontSize(11);
    doc.setTextColor(...midGray);
    doc.text('Type', halfWidth / 2 + margin / 2, y, { align: 'center' });
    doc.text('Final Size (Width × Height)', halfWidth + halfWidth / 2 - margin / 2, y, {
      align: 'center',
    });

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text(w.type || '—', halfWidth / 2 + margin / 2, y + 20, { align: 'center' });

    const sizeText =
      w.final_w != null && w.final_h != null
        ? `${formatFraction(w.final_w)}" × ${formatFraction(w.final_h)}"`
        : 'Not measured';
    doc.text(sizeText, halfWidth + halfWidth / 2 - margin / 2, y + 20, {
      align: 'center',
    });
    y += 40;

    // Spec fields (style, colors, etc.)
    if (w.style || w.grid_style || w.temper || w.outside_color || w.screen) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...midGray);
      const specs: string[] = [];
      if (w.style) specs.push(`Style: ${w.style}`);
      if (w.grid_style) specs.push(`Grid: ${w.grid_style}`);
      if (w.temper) specs.push(`Temper: ${w.temper}`);
      if (w.outside_color) specs.push(`Ext: ${w.outside_color}`);
      if (w.inside_color) specs.push(`Int: ${w.inside_color}`);
      if (w.screen) specs.push(`Screen: ${w.screen}`);
      doc.text(specs.join('  |  '), margin + 10, y);
      y += 20;
    }

    // Transom Info
    if (w.transom_height) {
      doc.setFontSize(10);
      doc.setTextColor(...midGray);
      doc.text('Transom', margin + 10, y);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkGray);
      doc.text(`Shape: ${w.transom_shape || '—'}`, margin + 20, y + 14);
      doc.text(`Height: ${formatFraction(w.transom_height)}"`, halfWidth, y + 14);
      y += 30;
    }

    // Notes
    if (w.notes) {
      doc.setFontSize(10);
      doc.setTextColor(...midGray);
      doc.text('Notes', margin + 10, y);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkGray);
      const notesLines = doc.splitTextToSize(w.notes, pageWidth - margin * 2 - 20);
      doc.text(notesLines, margin + 20, y + 14);
      y += notesLines.length * 10 + 15;
    }

    // Reference Measurements
    if (w.widths && w.widths.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(...midGray);
      doc.text('Reference Measurements', margin + 10, y);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkGray);
      doc.text(`Width Top: ${formatFraction(w.widths[0])}"`, margin + 20, y + 14);
      doc.text(`Width Bottom: ${formatFraction(w.widths[1])}"`, margin + 20, y + 26);
      doc.text(`Height Left: ${formatFraction(w.heights[0])}"`, pageWidth / 2, y + 14);
      doc.text(`Height Right: ${formatFraction(w.heights[1])}"`, pageWidth / 2, y + 26);
      y += 38;
    }

    y = blockStartY + calculatedHeight + 15;
  });

  const fileName = `${info.poNumber}_Window_Measurements.pdf`;
  const blob = doc.output('blob');

  return { blob, fileName };
}

export async function generatePDF(
  windows: WindowRow[],
  jobInfo: string | PDFJobInfo
): Promise<void> {
  const { blob, fileName } = await generatePDFBlob(windows, jobInfo);

  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: fileName,
        text: `Window measurements for PO ${(typeof jobInfo === 'string' ? jobInfo : jobInfo.poNumber)}`,
      });
    } catch {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
