import { describe, expect, it } from 'vitest'
import { heightMmFromPixels, imageSize, offsetsFromPosition, positionFromOffsets, zoomAtPoint } from './imageGeometry'
import type { Miniature } from './domain/miniature'

const transform: Miniature['transform'] = { offsetX: 0, offsetY: 0, scale: 1, heightMm: 25.4 }

describe('image geometry', () => {
  it('cover-fits without distortion and applies user scale on top', () => {
    expect(imageSize({ width: 100, height: 150 }, { width: 200, height: 100 }, 1))
      .toEqual({ width: 300, height: 150 })
    expect(imageSize({ width: 100, height: 150 }, { width: 200, height: 100 }, 2))
      .toEqual({ width: 600, height: 300 })
    expect(imageSize({ width: 100, height: 150 }, { width: 200, height: 100 }, 0.1))
      .toEqual({ width: 30, height: 15 })
  })

  it('converts unitless centered offsets to and from crop pixels', () => {
    const crop = { width: 100, height: 100 }
    const rendered = { width: 200, height: 200 }
    expect(positionFromOffsets(crop, rendered, transform)).toEqual({ x: -50, y: -50 })
    expect(positionFromOffsets(crop, rendered, { ...transform, offsetX: 0.25, offsetY: -0.25 }))
      .toEqual({ x: -25, y: -75 })
    expect(offsetsFromPosition({ x: -25, y: -75 }, crop, rendered))
      .toEqual({ x: 0.25, y: -0.25 })
    expect(positionFromOffsets(crop, { width: 50, height: 50 }, { ...transform, offsetX: 1, offsetY: -1 }))
      .toEqual({ x: 125, y: -75 })
    expect(offsetsFromPosition({ x: 125, y: -75 }, crop, { width: 50, height: 50 }))
      .toEqual({ x: 1, y: -1 })
  })

  it('keeps the pointer over the same image point while zooming and enforces a minimum scale', () => {
    const crop = { width: 100, height: 100 }
    const original = { width: 200, height: 200 }
    const zoomed = zoomAtPoint(crop, original, transform, { x: 25, y: 50 }, 2)
    expect(zoomed).toEqual({ scale: 2, offsetX: 0.25, offsetY: 0 })
    const zoomedOut = zoomAtPoint(crop, original, transform, { x: 50, y: 50 }, 0.5)
    expect(zoomedOut).toEqual({ scale: 0.5, offsetX: 0, offsetY: 0 })
    expect(zoomAtPoint(crop, original, transform, { x: 50, y: 50 }, 0.01).scale).toBe(0.1)
    expect(zoomAtPoint(crop, original, { ...transform, offsetX: 2 }, { x: 25, y: 50 }, 2).offsetX)
      .toBe(4.25)
  })

  it('converts height pixels to bounded millimeters', () => {
    expect(heightMmFromPixels(160, 5)).toBe(32)
    expect(heightMmFromPixels(5, 5)).toBe(10)
    expect(heightMmFromPixels(2000, 5)).toBe(200)
  })
})
