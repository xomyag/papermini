import {
  clip, degrees, endPath, LineCapStyle, PDFDocument, rectangle, rgb,
  StandardFonts, popGraphicsState, pushGraphicsState,
  type PDFFont, type PDFImage, type PDFPage,
} from 'pdf-lib'
import type { Miniature } from '../domain/miniature'
import { A4_PRINT, type PrintDocument, type PositionedPrintItem } from '../domain/printDocument'
import { imagePlacement } from '../imageGeometry'
import { fitLabelText, printableGeometry } from '../printGeometry'
import { mmToPt, pdfFoldY, pdfImagePlacement, pdfItemRect, pdfLabelPlacement, pdfPageSize } from './pdfGeometry'

const dark = rgb(0.07, 0.07, 0.07)
const foldColor = rgb(0.33, 0.33, 0.33)

async function pngFromBrowserImage(source: string): Promise<string> {
  if (typeof Image === 'undefined' || typeof document === 'undefined') {
    throw new Error('This image format needs a browser to convert it for PDF export.')
  }
  const image = new Image()
  image.src = source
  try {
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    if (!canvas.width || !canvas.height) throw new Error('Image has no dimensions.')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image conversion is unavailable.')
    context.drawImage(image, 0, 0)
    // Conversion changes only the PDF's embedded bytes, never Miniature.image.source.
    return canvas.toDataURL('image/png')
  } catch {
    throw new Error('Could not convert an image for PDF export.')
  }
}

async function embedSource(pdf: PDFDocument, source: string): Promise<PDFImage> {
  if (/^data:image\/png[;,]/i.test(source)) return pdf.embedPng(source)
  if (/^data:image\/(jpeg|jpg)[;,]/i.test(source)) return pdf.embedJpg(source)
  return pdf.embedPng(await pngFromBrowserImage(source))
}

function textFits(font: PDFFont, text: string, sizePt: number, maxWidthPt: number) {
  try {
    font.encodeText(text)
    return font.widthOfTextAtSize(text, sizePt) <= maxWidthPt
  } catch {
    return false
  }
}

function vectorLabelText(font: PDFFont, text: string, widthMm: number, heightMm: number) {
  try {
    font.encodeText(text)
  } catch {
    return null
  }
  const fitted = fitLabelText(text, widthMm, heightMm)
  const maxWidthPt = mmToPt(Math.max(0, widthMm - 1))
  let sizeMm = fitted.fontSizeMm
  while (sizeMm > 1.6 && !textFits(font, fitted.text, mmToPt(sizeMm), maxWidthPt)) {
    sizeMm = Math.max(1.6, Math.round((sizeMm - 0.1) * 10) / 10)
  }
  let value = fitted.text
  while (value && !textFits(font, value, mmToPt(sizeMm), maxWidthPt)) {
    value = `${Array.from(value.replace(/…$/, '')).slice(0, -1).join('')}…`
    if (value === '…' && !textFits(font, value, mmToPt(sizeMm), maxWidthPt)) return null
  }
  return { text: value, sizePt: mmToPt(sizeMm) }
}

async function rasterLabel(pdf: PDFDocument, text: string, widthMm: number, heightMm: number, top: boolean) {
  if (typeof document === 'undefined') throw new Error('This label needs a browser to render in the PDF.')
  const fitted = fitLabelText(text, widthMm, heightMm)
  const pixelsPerMm = 12 // Raster resolution only; placement remains in physical millimeters.
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(widthMm * pixelsPerMm)
  canvas.height = Math.ceil(heightMm * pixelsPerMm)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Label rendering is unavailable.')
  context.fillStyle = top ? '#000' : '#fff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `${fitted.fontSizeMm * pixelsPerMm}px Arial, sans-serif`
  context.fillText(fitted.text, canvas.width / 2, canvas.height / 2, canvas.width - pixelsPerMm)
  return pdf.embedPng(canvas.toDataURL('image/png'))
}

async function drawLabel(
  pdf: PDFDocument, page: PDFPage, font: PDFFont, item: PositionedPrintItem,
  geometry: ReturnType<typeof printableGeometry>, side: 'front' | 'back',
  pageHeightMm: number, labelImages: Map<string, PDFImage>, miniature: Miniature,
) {
  const label = pdfLabelPlacement(side, item, geometry, pageHeightMm)
  if (!label || !geometry.labelText) return
  const top = miniature.labelPosition === 'top'
  page.drawRectangle({ ...label.rect, color: top ? rgb(1, 1, 1) : rgb(0, 0, 0) })
  const fitted = vectorLabelText(font, geometry.labelText, geometry.widthMm, geometry.labelHeightMm)
  if (fitted) {
    const textWidth = font.widthOfTextAtSize(fitted.text, fitted.sizePt)
    // Center the font's actual vertical bounds; 180-degree text is rotated, never mirrored.
    const ascent = font.heightAtSize(fitted.sizePt, { descender: false })
    const fullHeight = font.heightAtSize(fitted.sizePt, { descender: true })
    const baselineFromCenter = ascent - fullHeight / 2
    const rotated = label.rotationDeg === 180
    page.drawText(fitted.text, {
      x: label.centerX + (rotated ? textWidth / 2 : -textWidth / 2),
      y: label.centerY + (rotated ? baselineFromCenter : -baselineFromCenter),
      size: fitted.sizePt,
      font,
      color: top ? rgb(0, 0, 0) : rgb(1, 1, 1),
      rotate: degrees(label.rotationDeg),
    })
    return
  }
  // Helvetica cannot encode every browser-supported name. Rasterize just that label.
  const key = `${geometry.widthMm}:${geometry.labelHeightMm}:${top}:${geometry.labelText}`
  let image = labelImages.get(key)
  if (!image) {
    image = await rasterLabel(pdf, geometry.labelText, geometry.widthMm, geometry.labelHeightMm, top)
    labelImages.set(key, image)
  }
  const rotated = label.rotationDeg === 180
  page.drawImage(image, {
    x: label.rect.x + (rotated ? label.rect.width : 0),
    y: label.rect.y + (rotated ? label.rect.height : 0),
    width: label.rect.width, height: label.rect.height,
    rotate: degrees(label.rotationDeg),
  })
}

function drawLines(page: PDFPage, item: PositionedPrintItem, geometry: ReturnType<typeof printableGeometry>, pageHeightMm: number) {
  const rect = pdfItemRect(item, pageHeightMm)
  const inset = mmToPt(0.1)
  page.drawRectangle({
    x: rect.x + inset, y: rect.y + inset,
    width: rect.width - 2 * inset, height: rect.height - 2 * inset,
    borderColor: dark, borderWidth: mmToPt(0.2),
    borderDashArray: [mmToPt(1.5), mmToPt(0.8)],
  })
  const foldY = pdfFoldY(item, geometry, pageHeightMm)
  page.drawLine({
    start: { x: rect.x, y: foldY }, end: { x: rect.x + rect.width, y: foldY },
    color: foldColor, thickness: mmToPt(0.2),
    dashArray: [mmToPt(0.2), mmToPt(0.7)], lineCap: LineCapStyle.Round,
  })
}

/** Renders the already-positioned PrintDocument; no packing or page scaling happens here. */
export async function createPdf(printDocument: PrintDocument, miniatures: Miniature[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const sources = new Map<string, PDFImage>()
  const labelImages = new Map<string, PDFImage>()
  const miniatureById = new Map(miniatures.map((miniature) => [miniature.id, miniature]))

  for (const printPage of printDocument.pages) {
    if (printPage.widthMm !== A4_PRINT.widthMm || printPage.heightMm !== A4_PRINT.heightMm) {
      throw new Error('Print document contains a page that is not A4.')
    }
    const pageSize = pdfPageSize(printPage)
    const page = pdf.addPage([pageSize.width, pageSize.height])
    for (const item of printPage.items) {
      const miniature = miniatureById.get(item.miniatureId)
      if (!miniature) throw new Error('A miniature in the print document is missing.')
      const geometry = printableGeometry(miniature, item.copyNumber)
      if (Math.abs(geometry.widthMm - item.widthMm) > 0.001 || Math.abs(geometry.unfoldedHeightMm - item.heightMm) > 0.001) {
        throw new Error('A miniature changed after the print document was created.')
      }
      if (miniature.image) {
        let embedded = sources.get(miniature.image.source)
        if (!embedded) {
          embedded = await embedSource(pdf, miniature.image.source)
          sources.set(miniature.image.source, embedded)
        }
        const placement = imagePlacement(
          { width: geometry.widthMm, height: geometry.imageHeightMm },
          { width: miniature.image.widthPx, height: miniature.image.heightPx },
          miniature.transform,
        )
        for (const side of ['back', 'front'] as const) {
          const image = pdfImagePlacement(side, item, geometry, placement, printPage.heightMm)
          page.pushOperators(pushGraphicsState(), rectangle(image.clip.x, image.clip.y, image.clip.width, image.clip.height), clip(), endPath())
          page.drawImage(embedded, { x: image.x, y: image.y, width: image.width, height: image.height })
          page.pushOperators(popGraphicsState())
        }
      }
      await drawLabel(pdf, page, font, item, geometry, 'back', printPage.heightMm, labelImages, miniature)
      await drawLabel(pdf, page, font, item, geometry, 'front', printPage.heightMm, labelImages, miniature)
      drawLines(page, item, geometry, printPage.heightMm)
    }
  }
  return pdf.save()
}
