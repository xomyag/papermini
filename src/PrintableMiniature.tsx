import { useId } from 'react'
import type { Miniature } from './domain/miniature'
import { imagePlacement } from './imageGeometry'
import { fitLabelText, imageSideTransform, labelTransform, printableGeometry } from './printGeometry'

type Props = {
  miniature: Miniature
  copyNumber?: number
  previewPxPerMm: number
}

function PrintableMiniature({ miniature, copyNumber, previewPxPerMm }: Props) {
  const geometry = printableGeometry(miniature, copyNumber)
  const { widthMm, imageHeightMm, unfoldedHeightMm, foldY } = geometry
  const clipId = useId().replaceAll(':', '')
  const image = miniature.image
  const imageBounds = image && imagePlacement(
    { width: widthMm, height: imageHeightMm },
    { width: image.widthPx, height: image.heightPx },
    miniature.transform,
  )
  const fittedLabel = geometry.labelText
    ? fitLabelText(geometry.labelText, widthMm, geometry.labelHeightMm)
    : null
  const isTopLabel = miniature.labelPosition === 'top'

  function renderImage(side: 'front' | 'back') {
    const transform = imageSideTransform(side, geometry)
    return (
      <g key={`${side}-image`} transform={`translate(0 ${transform.translateY}) scale(1 ${transform.scaleY})`}>
        <g clipPath={`url(#${clipId})`}>
          {image && imageBounds && (
            <image
              href={image.source}
              x={imageBounds.x}
              y={imageBounds.y}
              width={imageBounds.width}
              height={imageBounds.height}
              preserveAspectRatio="none"
            />
          )}
        </g>
      </g>
    )
  }

  function renderLabel(side: 'front' | 'back') {
    const area = geometry[side].label
    const orientation = labelTransform(side, geometry)
    if (!area || !fittedLabel || !orientation) return null
    return (
      <g
        key={`${side}-label`}
        transform={`rotate(${orientation.rotationDeg} ${orientation.centerX} ${orientation.centerY})`}
      >
        <rect
          x={area.x}
          y={area.y}
          width={area.width}
          height={area.height}
          fill={isTopLabel ? '#fff' : '#000'}
        />
        <text
          x={widthMm / 2}
          y={area.y + area.height / 2}
          fill={isTopLabel ? '#000' : '#fff'}
          fontFamily="Arial, sans-serif"
          fontSize={fittedLabel.fontSizeMm}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {fittedLabel.text}
        </text>
      </g>
    )
  }

  return (
    <svg
      className="printable-miniature"
      width={widthMm * previewPxPerMm}
      height={unfoldedHeightMm * previewPxPerMm}
      viewBox={`0 0 ${widthMm} ${unfoldedHeightMm}`}
      role="img"
      aria-label={`Printable ${miniature.name || 'miniature'} front and back`}
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <rect x={0} y={0} width={widthMm} height={imageHeightMm} />
        </clipPath>
      </defs>
      {/* Image and label orientation are independent: the back image flips in Y,
          while its complete label area rotates 180 degrees without mirroring text. */}
      {renderImage('back')}
      {renderImage('front')}
      {renderLabel('back')}
      {renderLabel('front')}
      <rect
        x={0.1}
        y={0.1}
        width={widthMm - 0.2}
        height={unfoldedHeightMm - 0.2}
        fill="none"
        stroke="#111"
        strokeWidth={0.2}
        strokeDasharray="1.5 0.8"
      />
      <line
        x1={0}
        y1={foldY}
        x2={widthMm}
        y2={foldY}
        stroke="#555"
        strokeWidth={0.2}
        strokeDasharray="0.2 0.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default PrintableMiniature
