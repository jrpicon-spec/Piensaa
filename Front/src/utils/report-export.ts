interface ExportReportOptions {
  element: HTMLElement;
  filename: string;
  documentTitle: string;
}

interface ProtectedRange {
  top: number;
  bottom: number;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

export async function waitForReportRender(delay = 300): Promise<void> {
  if ('fonts' in document) {
    await document.fonts.ready;
  }
  await nextFrame();
  await nextFrame();
  await new Promise((resolve) => window.setTimeout(resolve, delay));
  await nextFrame();
}

function getProtectedRanges(element: HTMLElement, canvasHeight: number): ProtectedRange[] {
  const rootRect = element.getBoundingClientRect();
  const contentHeight = Math.max(element.scrollHeight, rootRect.height);
  const scale = canvasHeight / contentHeight;

  return Array.from(element.querySelectorAll<HTMLElement>('[data-pdf-block]'))
    .map((block) => {
      const rect = block.getBoundingClientRect();
      return {
        top: Math.max(0, (rect.top - rootRect.top) * scale),
        bottom: Math.min(canvasHeight, (rect.bottom - rootRect.top) * scale),
      };
    })
    .filter((range) => range.bottom > range.top)
    .sort((a, b) => a.top - b.top);
}

function getPageSlices(
  canvasHeight: number,
  maximumSliceHeight: number,
  protectedRanges: ProtectedRange[],
): Array<{ start: number; end: number }> {
  const slices: Array<{ start: number; end: number }> = [];
  let start = 0;

  while (start < canvasHeight) {
    const idealEnd = Math.min(canvasHeight, start + maximumSliceHeight);
    let end = idealEnd;

    if (idealEnd < canvasHeight) {
      const intersectingRange = protectedRanges.find(
        (range) => range.top < idealEnd && range.bottom > idealEnd,
      );

      if (intersectingRange) {
        const spaceBeforeBlock = intersectingRange.top - start;
        const blockHeight = intersectingRange.bottom - intersectingRange.top;
        const canMoveBlock =
          blockHeight <= maximumSliceHeight && spaceBeforeBlock >= maximumSliceHeight * 0.18;

        if (canMoveBlock) {
          end = intersectingRange.top;
        }
      }
    }

    if (end <= start + 1) {
      end = idealEnd;
    }

    slices.push({ start: Math.floor(start), end: Math.ceil(end) });
    start = end;
  }

  return slices;
}

export async function exportReportElementToPdf({
  element,
  filename,
  documentTitle,
}: ExportReportOptions): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  await waitForReportRender();

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    logging: false,
    scale: 2,
    useCORS: true,
    windowWidth: Math.max(document.documentElement.clientWidth, element.scrollWidth),
    onclone: (clonedDocument) => {
      const clonedReport = clonedDocument.getElementById(element.id);
      clonedReport?.classList.add('report-exporting');
      clonedDocument.querySelectorAll<HTMLElement>('*').forEach((node) => {
        node.style.animation = 'none';
        node.style.transition = 'none';
      });
    },
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error('El contenido del reporte no pudo renderizarse.');
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  pdf.setProperties({ title: documentTitle, author: 'RefleAct' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const footerHeight = 7;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2 - footerHeight;
  const millimetersPerPixel = printableWidth / canvas.width;
  const maximumSliceHeight = printableHeight / millimetersPerPixel;
  const protectedRanges = getProtectedRanges(element, canvas.height);
  const slices = getPageSlices(canvas.height, maximumSliceHeight, protectedRanges);

  slices.forEach((slice, index) => {
    if (index > 0) pdf.addPage('a4', 'landscape');

    const sliceHeight = slice.end - slice.start;
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;
    const context = pageCanvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar una página del PDF.');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    context.drawImage(
      canvas,
      0,
      slice.start,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    );

    const imageHeight = sliceHeight * millimetersPerPixel;
    pdf.addImage(
      pageCanvas.toDataURL('image/jpeg', 0.96),
      'JPEG',
      margin,
      margin,
      printableWidth,
      imageHeight,
      undefined,
      'FAST',
    );
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `RefleAct · Página ${index + 1} de ${slices.length}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' },
    );
  });

  const pdfBlob = pdf.output('blob');
  if (pdfBlob.size === 0) {
    throw new Error('jsPDF generó un archivo vacío.');
  }

  const downloadUrl = URL.createObjectURL(pdfBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = filename;
  downloadLink.rel = 'noopener';
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);

  try {
    downloadLink.click();
  } finally {
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
  }
}
