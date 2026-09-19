import { describe, expect, it } from 'vitest'
import { createMiniature, creatureWidthMm } from './miniature'

describe('creature widths', () => {
  it('uses the exact supported widths in millimeters', () => {
    expect(creatureWidthMm).toEqual({
      Small: 12.7,
      Medium: 25.4,
      Large: 50.8,
      Huge: 76.2,
      Gargantuan: 101.6,
    })
  })
})

describe('createMiniature', () => {
  it('sets the default values', () => {
    const miniature = createMiniature()

    expect(miniature).toEqual({
      id: expect.any(String),
      name: '',
      size: 'Medium',
      transform: {
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        heightMm: 25.4,
      },
      copies: 1,
      duplicateNumberingEnabled: false,
      labelEnabled: true,
      labelPosition: 'bottom',
    })
    expect(miniature.id).not.toBe('')
    expect(miniature.imageData).toBeUndefined()
  })
})
