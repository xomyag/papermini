import { creatureWidthMm, type Miniature } from './domain/miniature'

type Point = { x: number; y: number }
type Side = 'front' | 'back'

type PrintableSettings = Pick<
  Miniature,
  'size' | 'transform' | 'name' | 'labelEnabled' | 'labelPosition' | 'duplicateNumberingEnabled'
>

export function labelHeightMmForImage(imageHeightMm: number) {
  return Math.min(4, Math.max(2, imageHeightMm * 0.12))
}

export function printableGeometry(miniature: PrintableSettings, copyNumber?: number) {
  const widthMm = creatureWidthMm[miniature.size]
  const imageHeightMm = miniature.transform.heightMm
  const labelText = printableLabel(miniature, copyNumber)
  const labelHeightMm = labelText ? labelHeightMmForImage(imageHeightMm) : 0
  const sideHeightMm = imageHeightMm + labelHeightMm
  const foldY = sideHeightMm
  // The fold is the top of each upright finished side; the free outer edges are the bottoms.
  const topLabel = miniature.labelPosition === 'top'
  const frontImageY = foldY + (topLabel ? labelHeightMm : 0)
  const backImageY = topLabel ? 0 : labelHeightMm
  return {
    widthMm,
    imageHeightMm,
    labelHeightMm,
    labelText,
    sideHeightMm,
    unfoldedHeightMm: sideHeightMm * 2,
    foldY,
    back: {
      bounds: { x: 0, y: 0, width: widthMm, height: sideHeightMm },
      image: { x: 0, y: backImageY, width: widthMm, height: imageHeightMm },
      label: labelHeightMm ? {
        x: 0, y: topLabel ? imageHeightMm : 0, width: widthMm, height: labelHeightMm,
      } : null,
    },
    front: {
      bounds: { x: 0, y: foldY, width: widthMm, height: sideHeightMm },
      image: { x: 0, y: frontImageY, width: widthMm, height: imageHeightMm },
      label: labelHeightMm ? {
        x: 0, y: topLabel ? foldY : foldY + imageHeightMm, width: widthMm, height: labelHeightMm,
      } : null,
    },
  }
}

export function imageSideTransform(side: Side, geometry: ReturnType<typeof printableGeometry>) {
  const image = geometry[side].image
  // Flip only the back image vertically inside its own image rectangle.
  // Labels are placed separately in unfolded coordinates and never inherit this transform.
  return {
    translateY: side === 'back' ? image.y + image.height : image.y,
    scaleY: side === 'back' ? -1 : 1,
  }
}

export function mapImagePoint(point: Point, side: Side, geometry: ReturnType<typeof printableGeometry>): Point {
  const transform = imageSideTransform(side, geometry)
  return { x: point.x, y: transform.translateY + transform.scaleY * point.y }
}

export function labelTransform(side: Side, geometry: ReturnType<typeof printableGeometry>) {
  const area = geometry[side].label
  if (!area) return null
  // Rotate the entire back label 180 degrees around its own center for folding.
  // Rotation preserves letter shapes; no horizontal text mirror is applied.
  return {
    rotationDeg: side === 'back' ? 180 : 0,
    centerX: area.x + area.width / 2,
    centerY: area.y + area.height / 2,
  }
}

function estimatedTextWidth(text: string, fontSizeMm: number) {
  return Array.from(text).reduce((width, character) => {
    const factor = /[ ilI1.,:;!'|]/.test(character) ? 0.3 : /[MW@]/.test(character) ? 0.85 : 0.58
    return width + factor * fontSizeMm
  }, 0)
}

export function fitLabelText(text: string, widthMm: number, bandHeightMm: number) {
  const maxTextWidth = Math.max(0, widthMm - 1)
  const minimumFontSize = 1.6
  const preferredFontSize = Math.max(minimumFontSize, Math.min(2.8, bandHeightMm * 0.65))
  for (let size = preferredFontSize; size >= minimumFontSize; size = Math.round((size - 0.1) * 10) / 10) {
    if (estimatedTextWidth(text, size) <= maxTextWidth) return { text, fontSizeMm: size }
  }
  let shortened = text
  while (shortened && estimatedTextWidth(`${shortened}…`, minimumFontSize) > maxTextWidth) {
    shortened = shortened.slice(0, -1)
  }
  return { text: `${shortened}…`, fontSizeMm: minimumFontSize }
}

export function printableLabel(miniature: Pick<Miniature, 'name' | 'labelEnabled' | 'duplicateNumberingEnabled'>, copyNumber?: number) {
  const name = miniature.name.trim()
  if (!miniature.labelEnabled) return ''
  const number = miniature.duplicateNumberingEnabled && copyNumber !== undefined ? String(copyNumber) : ''
  return [name, number].filter(Boolean).join(' ')
}
