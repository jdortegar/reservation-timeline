/**
 * Export timeline as PNG/PDF image
 * Uses dom-to-image-more library for better support of modern CSS
 */

// Helper to ensure fonts and images are loaded
async function ensureResourcesLoaded(element: HTMLElement): Promise<void> {
  if (typeof document === 'undefined') return;
  
  try {
    await document.fonts.ready;
  } catch (e) {
    // Fonts API not available, continue anyway
  }
  
  // Wait for images to load
  const images = element.querySelectorAll('img');
  const imagePromises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      setTimeout(resolve, 5000);
    });
  });
  
  await Promise.all(imagePromises);
  await new Promise((resolve) => setTimeout(resolve, 100));
}

// Helper to pre-process element for better style preservation
function preprocessElementForDomToImage(element: HTMLElement): void {
  const allElements = element.querySelectorAll('*');
  
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const computed = window.getComputedStyle(htmlEl);
    
    // Apply critical computed styles as inline to ensure they're captured
    const criticalProps = [
      'background-color',
      'color',
      'border',
      'border-color',
      'border-width',
      'border-style',
      'border-radius',
      'padding',
      'margin',
      'font-family',
      'font-size',
      'font-weight',
      'line-height',
      'display',
      'position',
      'top',
      'left',
      'width',
      'height',
      'opacity',
      'box-shadow',
    ];
    
    criticalProps.forEach((prop) => {
      const value = computed.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'normal' && value !== 'rgba(0, 0, 0, 0)') {
        htmlEl.style.setProperty(prop, value);
      }
    });
  });
}

export async function exportTimelineAsPNG(
  element: HTMLElement,
  filename: string = 'timeline.png',
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Export can only be used in the browser');
  }

  await ensureResourcesLoaded(element);
  preprocessElementForDomToImage(element);
  
  const domtoimage = await import('dom-to-image-more');
  const dataUrl = await domtoimage.toPng(element, {
    quality: 1.0,
    bgcolor: '#ffffff',
    width: element.scrollWidth,
    height: element.scrollHeight,
    cacheBust: true,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportTimelineAsPDF(
  element: HTMLElement,
  filename: string = 'timeline.pdf',
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Export can only be used in the browser');
  }

  await ensureResourcesLoaded(element);
  preprocessElementForDomToImage(element);
  
  const domtoimage = await import('dom-to-image-more');
  const { jsPDF } = await import('jspdf');

  const dataUrl = await domtoimage.toPng(element, {
    quality: 1.0,
    bgcolor: '#ffffff',
    width: element.scrollWidth,
    height: element.scrollHeight,
    cacheBust: true,
  });

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = element.scrollWidth;
  const imgHeight = element.scrollHeight;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  const imgX = (pdfWidth - imgWidth * ratio) / 2;
  const imgY = 0;

  pdf.addImage(
    dataUrl,
    'PNG',
    imgX,
    imgY,
    imgWidth * ratio,
    imgHeight * ratio,
  );
  pdf.save(filename);
}

