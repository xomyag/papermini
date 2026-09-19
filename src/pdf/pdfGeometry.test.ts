import { describe, expect, it } from 'vitest'
import { createMiniature } from '../domain/miniature'
import { A4_PRINT, type PositionedPrintItem } from '../domain/printDocument'
import { printableGeometry } from '../printGeometry'
import { mmToPt, pdfFoldY, pdfImagePlacement, pdfItemRect, pdfLabelPlacement, pdfPageSize } from './pdfGeometry'

const miniature = { ...createMiniature(), name: 'Goblin', duplicateNumberingEnabled: true }
const geometry = printableGeometry(miniature, 2)
const item: PositionedPrintItem = {
  miniatureId: miniature.id, copyNumber: 2,
  xMm: 7, yMm: 11, widthMm: geometry.widthMm, heightMm: geometry.unfoldedHeightMm,
}

describe('PDF physical geometry', () => {
  it('converts millimeters to points and creates exact A4 page dimensions', () => {
    expect(mmToPt(25.4)).toBe(72)
    expect(pdfPageSize({ widthMm: A4_PRINT.widthMm, heightMm: A4_PRINT.heightMm, items: [] }))
      .toEqual({ width: mmToPt(210), height: mmToPt(297) })
  })

  it('places an item and its fold using the PDF bottom-left origin', () => {
    const rect = pdfItemRect(item, A4_PRINT.heightMm)
    expect(rect.x).toBe(mmToPt(7))
    expect(rect.y).toBeCloseTo(mmToPt(297 - 11 - item.heightMm))
    expect(rect.width).toBe(72)
    expect(rect.height).toBeCloseTo(mmToPt(geometry.unfoldedHeightMm))
    expect(pdfFoldY(item, geometry, 297)).toBeCloseTo(mmToPt(297 - 11 - geometry.foldY))
  })

  it('clips both images, flips only the back bitmap in Y, and preserves front orientation', () => {
    const placement = { x: -2, y: 3, width: 30, height: 35 }
    const front = pdfImagePlacement('front', item, geometry, placement, 297)
    const back = pdfImagePlacement('back', item, geometry, placement, 297)
    expect(front.width).toBe(mmToPt(30))
    expect(front.height).toBe(mmToPt(35))
    expect(back.height).toBe(-mmToPt(35))
    expect(back.clip.height).toBe(mmToPt(geometry.imageHeightMm))
    expect(front.clip.height).toBe(mmToPt(geometry.imageHeightMm))
    expect(back.x).toBe(front.x)
    expect(back.y).toBeCloseTo(mmToPt(297 - item.yMm - geometry.back.image.y - geometry.imageHeightMm + 3 + 35))
  })

  it('positions labels independently, with 0° front and 180° back rotation', () => {
    const front = pdfLabelPlacement('front', item, geometry, 297)
    const back = pdfLabelPlacement('back', item, geometry, 297)
    expect(front?.rotationDeg).toBe(0)
    expect(back?.rotationDeg).toBe(180)
    expect(front?.rect.width).toBe(mmToPt(geometry.widthMm))
    expect(back?.rect.width).toBe(mmToPt(geometry.widthMm))
    expect(back?.centerX).toBe(front?.centerX)
  })
})
