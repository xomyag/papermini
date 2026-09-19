export const creatureWidthMm = {
  Small: 12.7,
  Medium: 25.4,
  Large: 50.8,
  Huge: 76.2,
  Gargantuan: 101.6,
} as const

export type CreatureSize = keyof typeof creatureWidthMm

export type LabelPosition = 'top' | 'bottom'

export type MiniatureImage = {
  source: string
  widthPx: number
  heightPx: number
}

export type Miniature = {
  id: string
  name: string
  size: CreatureSize
  image?: MiniatureImage
  transform: {
    // Unitless displacement from the centered cover-fit position, measured as fractions of crop width/height.
    // 0 is centered; negative/positive values shift left/right or up/down. No canvas pixels are stored here.
    offsetX: number
    offsetY: number
    scale: number
    heightMm: number
  }
  copies: number
  duplicateNumberingEnabled: boolean
  labelEnabled: boolean
  labelPosition: LabelPosition
}

export const miniatureHeightLimitsMm = { min: 10, max: 200 } as const

export function parseCopies(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null

  const copies = Number(value)
  return Number.isSafeInteger(copies) ? copies : null
}

export function createMiniature(): Miniature {
  return {
    id: crypto.randomUUID(),
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
  }
}
