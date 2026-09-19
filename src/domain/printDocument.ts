import type { Miniature } from './miniature'
import { printableGeometry } from '../printGeometry'

export const A4_PRINT = {
  widthMm: 210,
  heightMm: 297,
  marginMm: 7,
  defaultGapMm: 2,
} as const

export type PositionedPrintItem = {
  miniatureId: string
  copyNumber: number
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
}

export type PrintPage = {
  widthMm: number
  heightMm: number
  items: PositionedPrintItem[]
}

export type LayoutProblem = {
  miniatureId: string
  copyNumber?: number
  widthMm?: number
  heightMm?: number
  reason: 'too-large-for-a4' | 'invalid-copies'
}

export type PrintDocument = {
  pages: PrintPage[]
  totalCopies: number
  problems: LayoutProblem[]
}

type ExpandedCopy = { miniature: Miniature; copyNumber: number; inputOrder: number }
type Shelf = { yMm: number; heightMm: number; nextXMm: number }
type WorkingPage = PrintPage & { shelves: Shelf[] }

export function expandCopies(miniatures: Miniature[]): ExpandedCopy[] {
  const copies: ExpandedCopy[] = []
  for (const miniature of miniatures) {
    if (!Number.isSafeInteger(miniature.copies) || miniature.copies < 1) continue
    for (let copyNumber = 1; copyNumber <= miniature.copies; copyNumber++) {
      copies.push({ miniature, copyNumber, inputOrder: copies.length })
    }
  }
  return copies
}

function tryPlace(page: WorkingPage, item: Omit<PositionedPrintItem, 'xMm' | 'yMm'>, gapMm: number) {
  const rightMm = A4_PRINT.widthMm - A4_PRINT.marginMm
  const bottomMm = A4_PRINT.heightMm - A4_PRINT.marginMm

  for (const shelf of page.shelves) {
    if (item.heightMm <= shelf.heightMm && shelf.nextXMm + item.widthMm <= rightMm) {
      page.items.push({ ...item, xMm: shelf.nextXMm, yMm: shelf.yMm })
      shelf.nextXMm += item.widthMm + gapMm
      return true
    }
  }

  const lastShelf = page.shelves.at(-1)
  const yMm = lastShelf ? lastShelf.yMm + lastShelf.heightMm + gapMm : A4_PRINT.marginMm
  if (yMm + item.heightMm > bottomMm) return false

  page.items.push({ ...item, xMm: A4_PRINT.marginMm, yMm })
  page.shelves.push({ yMm, heightMm: item.heightMm, nextXMm: A4_PRINT.marginMm + item.widthMm + gapMm })
  return true
}

export function layoutMiniatures(miniatures: Miniature[], options: { gapMm?: number } = {}): PrintDocument {
  const gapMm = options.gapMm ?? A4_PRINT.defaultGapMm
  if (!Number.isFinite(gapMm) || gapMm < 0) throw new RangeError('Gap must be a non-negative millimeter value.')

  const problems: LayoutProblem[] = miniatures
    .filter((miniature) => !Number.isSafeInteger(miniature.copies) || miniature.copies < 1)
    .map((miniature) => ({ miniatureId: miniature.id, reason: 'invalid-copies' }))
  const usableWidthMm = A4_PRINT.widthMm - 2 * A4_PRINT.marginMm
  const usableHeightMm = A4_PRINT.heightMm - 2 * A4_PRINT.marginMm

  const candidates = expandCopies(miniatures).map(({ miniature, copyNumber, inputOrder }) => {
    const geometry = printableGeometry(miniature, copyNumber)
    return {
      miniatureId: miniature.id,
      copyNumber,
      widthMm: geometry.widthMm,
      heightMm: geometry.unfoldedHeightMm,
      inputOrder,
    }
  })
  candidates.sort((a, b) =>
    b.widthMm * b.heightMm - a.widthMm * a.heightMm || a.inputOrder - b.inputOrder,
  )

  const pages: WorkingPage[] = []
  for (const candidate of candidates) {
    const item = {
      miniatureId: candidate.miniatureId,
      copyNumber: candidate.copyNumber,
      widthMm: candidate.widthMm,
      heightMm: candidate.heightMm,
    }
    if (item.widthMm > usableWidthMm || item.heightMm > usableHeightMm) {
      problems.push({ ...item, reason: 'too-large-for-a4' })
      continue
    }

    let placed = pages.some((page) => tryPlace(page, item, gapMm))
    if (!placed) {
      const page: WorkingPage = { widthMm: A4_PRINT.widthMm, heightMm: A4_PRINT.heightMm, items: [], shelves: [] }
      placed = tryPlace(page, item, gapMm)
      if (placed) pages.push(page)
    }
  }

  return {
    pages: pages.map(({ widthMm, heightMm, items }) => ({ widthMm, heightMm, items })),
    totalCopies: pages.reduce((count, page) => count + page.items.length, 0),
    problems,
  }
}
