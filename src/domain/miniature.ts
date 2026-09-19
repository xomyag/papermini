export const creatureWidthMm = {
  Small: 12.7,
  Medium: 25.4,
  Large: 50.8,
  Huge: 76.2,
  Gargantuan: 101.6,
} as const

export type CreatureSize = keyof typeof creatureWidthMm

export type LabelPosition = 'top' | 'bottom'

export type Miniature = {
  id: string
  name: string
  size: CreatureSize
  imageData?: string
  transform: {
    // Unitless offsets from center: 0 is centered; negative and positive values shift along each axis.
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
