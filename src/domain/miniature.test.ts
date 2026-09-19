import { describe, expect, it } from 'vitest'
import { createMiniature, creatureWidthMm, parseCopies } from './miniature'

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

describe('parseCopies', () => {
  it('accepts positive whole numbers', () => {
    expect(parseCopies('1')).toBe(1)
    expect(parseCopies('12')).toBe(12)
  })

  it.each(['', '0', '-1', '1.5', 'NaN', 'Infinity', '1e3', '9007199254740992'])(
    'rejects invalid copy count %s',
    (value) => {
      expect(parseCopies(value)).toBeNull()
    },
  )
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
