import { describe, expect, it } from 'vitest'
import { createMiniature, type Miniature } from './miniature'
import { printableGeometry } from '../printGeometry'
import { A4_PRINT, expandCopies, layoutMiniatures, type PositionedPrintItem } from './printDocument'

function miniature(id: string, changes: Partial<Miniature> = {}): Miniature {
  return { ...createMiniature(), id, ...changes }
}

function separatedByGap(a: PositionedPrintItem, b: PositionedPrintItem, gapMm: number) {
  return a.xMm + a.widthMm + gapMm <= b.xMm || b.xMm + b.widthMm + gapMm <= a.xMm ||
    a.yMm + a.heightMm + gapMm <= b.yMm || b.yMm + b.heightMm + gapMm <= a.yMm
}

describe('A4 print document', () => {
  it('expands copies with numbering reset for each miniature', () => {
    const goblin = miniature('goblin', { copies: 4 })
    const skeleton = miniature('skeleton', { copies: 3 })
    expect(expandCopies([goblin, skeleton]).map(({ miniature: source, copyNumber }) => [source.id, copyNumber]))
      .toEqual([
        ['goblin', 1], ['goblin', 2], ['goblin', 3], ['goblin', 4],
        ['skeleton', 1], ['skeleton', 2], ['skeleton', 3],
      ])
    const document = layoutMiniatures([goblin, skeleton])
    expect(document.totalCopies).toBe(7)
    expect(document.pages.flatMap((page) => page.items).map(({ miniatureId, copyNumber }) => [miniatureId, copyNumber]))
      .toEqual([
        ['goblin', 1], ['goblin', 2], ['goblin', 3], ['goblin', 4],
        ['skeleton', 1], ['skeleton', 2], ['skeleton', 3],
      ])
  })

  it('keeps all pieces inside the safe area without overlap and respects the configured gap', () => {
    const gapMm = 3
    const document = layoutMiniatures([miniature('crowd', { copies: 40 })], { gapMm })
    expect(document.pages.length).toBeGreaterThan(1)
    for (const page of document.pages) {
      expect(page.widthMm).toBe(210)
      expect(page.heightMm).toBe(297)
      for (const item of page.items) {
        expect(item.xMm).toBeGreaterThanOrEqual(A4_PRINT.marginMm)
        expect(item.yMm).toBeGreaterThanOrEqual(A4_PRINT.marginMm)
        expect(item.xMm + item.widthMm).toBeLessThanOrEqual(page.widthMm - A4_PRINT.marginMm)
        expect(item.yMm + item.heightMm).toBeLessThanOrEqual(page.heightMm - A4_PRINT.marginMm)
      }
      for (let i = 0; i < page.items.length; i++) {
        for (let j = i + 1; j < page.items.length; j++) {
          expect(separatedByGap(page.items[i], page.items[j], gapMm)).toBe(true)
        }
      }
    }
  })

  it('places items beside each other and continues on a new row', () => {
    const items = layoutMiniatures([miniature('goblin', { copies: 8 })]).pages[0].items
    expect(items.some((item) => item.xMm > A4_PRINT.marginMm && item.yMm === A4_PRINT.marginMm)).toBe(true)
    expect(items.some((item) => item.yMm > A4_PRINT.marginMm)).toBe(true)
  })

  it('creates a new page when the shelves are full', () => {
    const document = layoutMiniatures([miniature('goblin', { copies: 36 })])
    expect(document.pages).toHaveLength(2)
    expect(document.totalCopies).toBe(36)
  })

  it('uses the existing printable geometry including labels for item height', () => {
    const labeled = miniature('labeled', { name: 'Goblin' })
    const plain = miniature('plain', { name: 'Goblin', labelEnabled: false })
    const items = layoutMiniatures([labeled, plain]).pages.flatMap((page) => page.items)
    expect(items.find((item) => item.miniatureId === 'labeled')?.heightMm)
      .toBe(printableGeometry(labeled, 1).unfoldedHeightMm)
    expect(items.find((item) => item.miniatureId === 'plain')?.heightMm)
      .toBe(printableGeometry(plain, 1).unfoldedHeightMm)
    expect(printableGeometry(labeled, 1).unfoldedHeightMm).toBeGreaterThan(printableGeometry(plain, 1).unfoldedHeightMm)
    const numberedOnly = miniature('numbered', { name: '', duplicateNumberingEnabled: true })
    expect(layoutMiniatures([numberedOnly]).pages[0].items[0].heightMm)
      .toBe(printableGeometry(numberedOnly, 1).unfoldedHeightMm)
    expect(printableGeometry(numberedOnly, 1).labelHeightMm).toBeGreaterThan(0)
  })

  it('reports oversized pieces without scaling them or creating an empty page', () => {
    const tall = miniature('tall', { size: 'Gargantuan', transform: { ...createMiniature().transform, heightMm: 200 } })
    const document = layoutMiniatures([tall])
    expect(document.pages).toEqual([])
    expect(document.totalCopies).toBe(0)
    expect(document.problems).toEqual([{
      miniatureId: 'tall', copyNumber: 1, widthMm: 101.6, heightMm: 400, reason: 'too-large-for-a4',
    }])
  })

  it('is deterministic for identical input and returns no pages for an empty collection', () => {
    const miniatures = [miniature('small', { size: 'Small', copies: 5 }), miniature('large', { size: 'Large', copies: 3 })]
    expect(layoutMiniatures(miniatures)).toEqual(layoutMiniatures(miniatures))
    expect(layoutMiniatures([])).toEqual({ pages: [], totalCopies: 0, problems: [] })
  })
})
