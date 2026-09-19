import { useEffect, useRef, useState } from 'react'
import { Group, Image as KonvaImage, Layer, Rect, Stage } from 'react-konva'
import { creatureWidthMm, miniatureHeightLimitsMm, type Miniature } from './domain/miniature'
import { heightMmFromPixels, imagePlacement, offsetsFromPosition, zoomAtPoint } from './imageGeometry'

type Props = {
  miniature: Miniature & { image: NonNullable<Miniature['image']> }
  onChange: (changes: Partial<Miniature['transform']>) => void
}

function MiniatureCanvasEditor({ miniature, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [loaded, setLoaded] = useState<{ source: string; element: HTMLImageElement } | null>(null)
  const [loadError, setLoadError] = useState(false)
  const { image, transform } = miniature

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let active = true
    const element = new window.Image()
    element.onload = () => {
      if (active) {
        setLoaded({ source: image.source, element })
        setLoadError(false)
      }
    }
    element.onerror = () => { if (active) setLoadError(true) }
    element.src = image.source
    return () => { active = false }
  }, [image.source])

  const widthMm = creatureWidthMm[miniature.size]
  const pixelsPerMm = Math.min(6, containerWidth / widthMm)
  const crop = { width: widthMm * pixelsPerMm, height: transform.heightMm * pixelsPerMm }
  const original = { width: image.widthPx, height: image.heightPx }
  const placement = imagePlacement(crop, original, transform)
  const canvasImage = loaded?.source === image.source ? loaded.element : null

  return (
    <div className="canvas-editor">
      <p className="canvas-dimensions">{widthMm.toFixed(1)} × {transform.heightMm.toFixed(1)} mm</p>
      <p className="canvas-instructions">Drag the image to position it. Use the wheel to zoom. Drag the bottom edge to change height.</p>
      <div className="canvas-container" ref={containerRef}>
        {containerWidth > 0 && canvasImage && (
          <Stage
            width={crop.width}
            height={crop.height + 16}
            onWheel={(event) => {
              event.evt.preventDefault()
              const pointer = event.target.getStage()?.getPointerPosition()
              if (!pointer) return
              const zoomFactor = Math.exp(-event.evt.deltaY * 0.001)
              onChange(zoomAtPoint(crop, original, transform, pointer, zoomFactor))
            }}
          >
            <Layer>
              <Group clipX={0} clipY={0} clipWidth={crop.width} clipHeight={crop.height}>
                <Rect width={crop.width} height={crop.height} fill="#fff" />
                <KonvaImage
                  image={canvasImage}
                  x={placement.x}
                  y={placement.y}
                  width={placement.width}
                  height={placement.height}
                  draggable
                  onDragMove={(event) => {
                    const offsets = offsetsFromPosition(event.target.position(), crop, placement)
                    onChange({ offsetX: offsets.x, offsetY: offsets.y })
                  }}
                />
              </Group>
              <Rect width={crop.width} height={crop.height} stroke="#71717a" strokeWidth={1} listening={false} />
              <Group
                y={crop.height}
                draggable
                dragBoundFunc={(next) => ({
                  x: 0,
                  y: Math.min(
                    miniatureHeightLimitsMm.max * pixelsPerMm,
                    Math.max(miniatureHeightLimitsMm.min * pixelsPerMm, next.y),
                  ),
                })}
                onDragMove={(event) => {
                  onChange({ heightMm: heightMmFromPixels(event.target.y(), pixelsPerMm) })
                }}
              >
                <Rect x={0} y={-4} width={crop.width} height={14} fill="#e4e4e7" stroke="#18181b" strokeWidth={1} />
              </Group>
            </Layer>
          </Stage>
        )}
        {loadError && <p className="field-error" role="alert">The image could not be displayed.</p>}
      </div>
    </div>
  )
}

export default MiniatureCanvasEditor
