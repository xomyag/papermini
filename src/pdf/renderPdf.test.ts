import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { createMiniature } from '../domain/miniature'
import { A4_PRINT, layoutMiniatures } from '../domain/printDocument'
import { mmToPt } from './pdfGeometry'
import { createPdf } from './renderPdf'

describe('PDF export', () => {
  it('generates an inspectable multi-page A4 PDF from the same PrintDocument', async () => {
    const miniature = {
      ...createMiniature(), id: 'goblin', name: 'Goblin', copies: 36,
      duplicateNumberingEnabled: true,
    }
    const printDocument = layoutMiniatures([miniature])
    const bytes = await createPdf(printDocument, [miniature])
    const pdf = await PDFDocument.load(bytes)

    expect(printDocument.pages).toHaveLength(2)
    expect(pdf.getPageCount()).toBe(printDocument.pages.length)
    for (const page of pdf.getPages()) {
      expect(page.getWidth()).toBe(mmToPt(A4_PRINT.widthMm))
      expect(page.getHeight()).toBe(mmToPt(A4_PRINT.heightMm))
    }
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('embeds a transparent PNG without changing the original image source', async () => {
    const source = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLytQAAAABJRU5ErkJggg=='
    const miniature = {
      ...createMiniature(), id: 'png', name: 'Ghost',
      image: { source, widthPx: 1, heightPx: 1 },
    }
    const printDocument = layoutMiniatures([miniature])
    const bytes = await createPdf(printDocument, [miniature])
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1)
    expect(miniature.image.source).toBe(source)
  })
})
