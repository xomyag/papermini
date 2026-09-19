import { describe, expect, it } from 'vitest'
import { createMiniature } from './domain/miniature'
import { fitLabelText, imageSideTransform, labelTransform, mapImagePoint, printableGeometry, printableLabel } from './printGeometry'

describe('printable miniature geometry', () => {
  it('uses only image height when no text is printed', () => {
    const miniature = { ...createMiniature(), size: 'Large' as const, transform: { ...createMiniature().transform, heightMm: 32 } }
    const geometry = printableGeometry(miniature)
    expect(geometry.widthMm).toBe(50.8)
    expect(geometry.imageHeightMm).toBe(32)
    expect(geometry.labelHeightMm).toBe(0)
    expect(geometry.sideHeightMm).toBe(32)
    expect(geometry.unfoldedHeightMm).toBe(64)
    expect(geometry.back.bounds).toEqual({ x: 0, y: 0, width: 50.8, height: 32 })
    expect(geometry.front.bounds).toEqual({ x: 0, y: 32, width: 50.8, height: 32 })
    expect(geometry.back.label).toBeNull()
    expect(geometry.front.label).toBeNull()
  })

  it.each(['top', 'bottom'] as const)('adds a dedicated label area at the %s edge of both sides', (position) => {
    const miniature = { ...createMiniature(), name: 'Goblin', labelPosition: position }
    const geometry = printableGeometry(miniature)
    const { imageHeightMm, labelHeightMm, sideHeightMm } = geometry
    expect(labelHeightMm).toBeCloseTo(25.4 * 0.12)
    expect(sideHeightMm).toBeCloseTo(imageHeightMm + labelHeightMm)
    expect(geometry.unfoldedHeightMm).toBeCloseTo(2 * sideHeightMm)
    expect(geometry.foldY).toBe(sideHeightMm)
    expect(geometry.front.image.height).toBe(imageHeightMm)
    expect(geometry.back.image.height).toBe(imageHeightMm)
    expect(geometry.front.label?.height).toBe(labelHeightMm)
    expect(geometry.back.label?.height).toBe(labelHeightMm)

    if (position === 'top') {
      expect(geometry.front.label?.y).toBe(sideHeightMm)
      expect(geometry.front.image.y).toBeCloseTo(sideHeightMm + labelHeightMm)
      expect(geometry.back.image.y).toBe(0)
      expect(geometry.back.label?.y).toBe(imageHeightMm)
    } else {
      expect(geometry.front.image.y).toBe(sideHeightMm)
      expect(geometry.front.label?.y).toBeCloseTo(sideHeightMm + imageHeightMm)
      expect(geometry.back.label?.y).toBe(0)
      expect(geometry.back.image.y).toBe(labelHeightMm)
    }
  })

  it.each(['top', 'bottom'] as const)('flips only the back image for a %s label', (position) => {
    const geometry = printableGeometry({ ...createMiniature(), name: 'Goblin', labelPosition: position })
    expect(imageSideTransform('back', geometry).scaleY).toBe(-1)
    expect(imageSideTransform('front', geometry).scaleY).toBe(1)
    for (const y of [0, 8, geometry.imageHeightMm]) {
      const back = mapImagePoint({ x: 7, y }, 'back', geometry)
      const front = mapImagePoint({ x: 7, y }, 'front', geometry)
      expect(back.x).toBe(7)
      expect(2 * geometry.foldY - back.y).toBeCloseTo(front.y)
    }
    // Label rectangles use unfolded coordinates and do not inherit the image flip.
    expect(geometry.back.label?.y).toBeGreaterThanOrEqual(0)
    expect(geometry.front.label?.y).toBeGreaterThanOrEqual(geometry.foldY)
  })

  it.each(['top', 'bottom'] as const)('rotates the %s back label 180 degrees without mirroring text', (position) => {
    const geometry = printableGeometry({ ...createMiniature(), name: 'Goblin', labelPosition: position })
    const front = labelTransform('front', geometry)
    const back = labelTransform('back', geometry)
    expect(front?.rotationDeg).toBe(0)
    expect(back?.rotationDeg).toBe(180)
    expect(front?.centerX).toBe(geometry.widthMm / 2)
    expect(back?.centerX).toBe(geometry.widthMm / 2)
    expect(front?.centerY).toBeCloseTo(geometry.front.label!.y + geometry.labelHeightMm / 2)
    expect(back?.centerY).toBeCloseTo(geometry.back.label!.y + geometry.labelHeightMm / 2)
  })

  it('reserves no label area when printing is disabled or there is no printable text', () => {
    const miniature = { ...createMiniature(), name: 'Goblin' }
    const disabledBottom = printableGeometry({ ...miniature, labelEnabled: false })
    const disabledTop = printableGeometry({ ...miniature, labelEnabled: false, labelPosition: 'top' })
    expect(disabledBottom.labelHeightMm).toBe(0)
    expect(disabledTop).toEqual(disabledBottom)
    expect(disabledTop.sideHeightMm).toBe(miniature.transform.heightMm)
    expect(printableGeometry({ ...miniature, name: '' }).labelHeightMm).toBe(0)
  })

  it('prints numbering with a name or alone when the name is empty', () => {
    const miniature = { ...createMiniature(), name: 'Goblin', duplicateNumberingEnabled: true }
    expect(printableLabel(miniature, 2)).toBe('Goblin 2')
    expect(printableLabel({ ...miniature, name: '' }, 2)).toBe('2')
    expect(printableGeometry({ ...miniature, name: '' }, 2).labelHeightMm).toBeGreaterThan(0)
    expect(printableGeometry({ ...miniature, name: '' }).labelHeightMm).toBe(0)
  })

  it('shrinks and then truncates long labels', () => {
    expect(fitLabelText('Goblin', 25.4, 3.6).text).toBe('Goblin')
    const long = fitLabelText('A very long creature name', 12.7, 3)
    expect(long.fontSizeMm).toBe(1.6)
    expect(long.text.endsWith('…')).toBe(true)
  })
})
