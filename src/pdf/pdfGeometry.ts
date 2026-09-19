import type { PositionedPrintItem, PrintPage } from '../domain/printDocument'
import type { printableGeometry } from '../printGeometry'
import { labelTransform } from '../printGeometry'

type PrintableGeometry = ReturnType<typeof printableGeometry>
type Side = 'front' | 'back'
type RectMm = { x: number; y: number; width: number; height: number }

export const mmToPt = (mm: number) => mm * 72 / 25.4

export function pdfPageSize(page: PrintPage) {
  return { width: mmToPt(page.widthMm), height: mmToPt(page.heightMm) }
}

export function pdfRectFromTopLeft(rect: RectMm, pageHeightMm: number) {
  return {
    x: mmToPt(rect.x),
    y: mmToPt(pageHeightMm - rect.y - rect.height),
    width: mmToPt(rect.width),
    height: mmToPt(rect.height),
  }
}

export function pdfItemRect(item: PositionedPrintItem, pageHeightMm: number) {
  return pdfRectFromTopLeft({ x: item.xMm, y: item.yMm, width: item.widthMm, height: item.heightMm }, pageHeightMm)
}

export function pdfImagePlacement(
  side: Side,
  item: PositionedPrintItem,
  geometry: PrintableGeometry,
  imagePlacement: RectMm,
  pageHeightMm: number,
) {
  const area = geometry[side].image
  const clip = pdfRectFromTopLeft({
    x: item.xMm + area.x,
    y: item.yMm + area.y,
    width: area.width,
    height: area.height,
  }, pageHeightMm)
  const x = mmToPt(item.xMm + area.x + imagePlacement.x)
  if (side === 'back') {
    // A negative PDF image height flips only the bitmap in Y, matching the SVG back image.
    return {
      clip,
      x,
      y: mmToPt(pageHeightMm - item.yMm - area.y - area.height + imagePlacement.y + imagePlacement.height),
      width: mmToPt(imagePlacement.width),
      height: -mmToPt(imagePlacement.height),
    }
  }
  return {
    clip,
    x,
    y: mmToPt(pageHeightMm - item.yMm - area.y - imagePlacement.y - imagePlacement.height),
    width: mmToPt(imagePlacement.width),
    height: mmToPt(imagePlacement.height),
  }
}

export function pdfLabelPlacement(side: Side, item: PositionedPrintItem, geometry: PrintableGeometry, pageHeightMm: number) {
  const area = geometry[side].label
  const orientation = labelTransform(side, geometry)
  if (!area || !orientation) return null
  return {
    rect: pdfRectFromTopLeft({
      x: item.xMm + area.x,
      y: item.yMm + area.y,
      width: area.width,
      height: area.height,
    }, pageHeightMm),
    centerX: mmToPt(item.xMm + orientation.centerX),
    centerY: mmToPt(pageHeightMm - item.yMm - orientation.centerY),
    rotationDeg: orientation.rotationDeg,
  }
}

export function pdfFoldY(item: PositionedPrintItem, geometry: PrintableGeometry, pageHeightMm: number) {
  return mmToPt(pageHeightMm - item.yMm - geometry.foldY)
}
