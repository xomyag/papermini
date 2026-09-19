import { miniatureHeightLimitsMm, type Miniature } from './domain/miniature'

type Point = { x: number; y: number }
type Size = { width: number; height: number }
type ImageTransform = Miniature['transform']

const MIN_SCALE = 0.1
const MAX_SCALE = 8

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function imageSize(crop: Size, original: Size, scale: number): Size {
  // Cover fit at scale 1; the user's scale multiplies that fit without changing aspect ratio.
  const baseFit = Math.max(crop.width / original.width, crop.height / original.height)
  return { width: original.width * baseFit * scale, height: original.height * baseFit * scale }
}

export function positionFromOffsets(crop: Size, rendered: Size, transform: ImageTransform): Point {
  // Offsets are fractions of crop dimensions from the centered cover-fit image origin.
  return {
    x: (crop.width - rendered.width) / 2 + transform.offsetX * crop.width,
    y: (crop.height - rendered.height) / 2 + transform.offsetY * crop.height,
  }
}

export function offsetsFromPosition(position: Point, crop: Size, rendered: Size): Point {
  return {
    x: (position.x - (crop.width - rendered.width) / 2) / crop.width,
    y: (position.y - (crop.height - rendered.height) / 2) / crop.height,
  }
}

export function zoomAtPoint(
  crop: Size,
  original: Size,
  transform: ImageTransform,
  pointer: Point,
  zoomFactor: number,
) {
  const oldSize = imageSize(crop, original, transform.scale)
  const oldPosition = positionFromOffsets(crop, oldSize, transform)
  const scale = clamp(transform.scale * zoomFactor, MIN_SCALE, MAX_SCALE)
  const ratio = scale / transform.scale
  const newSize = imageSize(crop, original, scale)
  // Keep the source-image point under the pointer fixed as the image grows or shrinks.
  const newPosition = {
    x: pointer.x - (pointer.x - oldPosition.x) * ratio,
    y: pointer.y - (pointer.y - oldPosition.y) * ratio,
  }
  const offsets = offsetsFromPosition(newPosition, crop, newSize)
  return { scale, offsetX: offsets.x, offsetY: offsets.y }
}

export function heightMmFromPixels(heightPx: number, pixelsPerMm: number) {
  return Math.round(clamp(heightPx / pixelsPerMm, miniatureHeightLimitsMm.min, miniatureHeightLimitsMm.max) * 10) / 10
}
