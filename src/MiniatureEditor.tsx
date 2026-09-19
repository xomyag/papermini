import { useState } from 'react'
import { creatureWidthMm, parseCopies, type CreatureSize, type LabelPosition, type Miniature } from './domain/miniature'
import MiniatureImageInput from './MiniatureImageInput'
import MiniatureCanvasEditor from './MiniatureCanvasEditor'
import PrintableMiniature from './PrintableMiniature'
import { printableGeometry } from './printGeometry'

type Props = {
  miniature: Miniature
  onChange: (changes: Partial<Miniature>) => void
  onDone: () => void
}

const PREVIEW_PX_PER_MM = 8

function MiniatureEditor({ miniature, onChange, onDone }: Props) {
  const [copiesInput, setCopiesInput] = useState(String(miniature.copies))
  const copiesValid = parseCopies(copiesInput) !== null
  const previewCopyNumber = miniature.duplicateNumberingEnabled ? 1 : undefined
  const printable = printableGeometry(miniature, previewCopyNumber)

  function changeCopies(value: string) {
    setCopiesInput(value)
    const copies = parseCopies(value)
    if (copies !== null) onChange({ copies })
  }

  return (
    <section className="editor" aria-label="Edit miniature">
      <div className="editor-heading">
        <h2>Edit miniature</h2>
        <button className="primary-button" type="button" onClick={onDone} disabled={!copiesValid}>
          Done
        </button>
      </div>
      <div className="editor-fields">
        <label>
          Name
          <input type="text" value={miniature.name} onChange={(event) => onChange({ name: event.target.value })} />
        </label>
        <label>
          Creature size
          <select value={miniature.size} onChange={(event) => onChange({ size: event.target.value as CreatureSize })}>
            {Object.keys(creatureWidthMm).map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <label>
          Copies
          <input
            type="number"
            min="1"
            step="1"
            required
            value={copiesInput}
            aria-invalid={!copiesValid}
            aria-describedby={!copiesValid ? 'copies-error' : undefined}
            onChange={(event) => changeCopies(event.target.value)}
          />
          {!copiesValid && <span className="field-error" id="copies-error">Enter a positive whole number.</span>}
        </label>
      </div>
      <fieldset className="print-options">
        <legend>Print options</legend>
        <div className="print-option-grid">
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={miniature.duplicateNumberingEnabled}
              onChange={(event) => onChange({ duplicateNumberingEnabled: event.target.checked })}
            />
            Number duplicates
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={miniature.labelEnabled}
              onChange={(event) => onChange({ labelEnabled: event.target.checked })}
            />
            Print name
          </label>
          <label className="print-label-position">
            Label position
            <select
              value={miniature.labelPosition}
              disabled={!miniature.labelEnabled && !miniature.duplicateNumberingEnabled}
              onChange={(event) => onChange({ labelPosition: event.target.value as LabelPosition })}
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
            </select>
          </label>
        </div>
      </fieldset>
      <MiniatureImageInput
        image={miniature.image}
        onChange={(image) => onChange({
          image,
          ...(image && image.source !== miniature.image?.source ? {
            transform: { ...miniature.transform, offsetX: 0, offsetY: 0, scale: 1 },
          } : {}),
        })}
      />
      {miniature.image && (
        <MiniatureCanvasEditor
          miniature={{ ...miniature, image: miniature.image }}
          onChange={(changes) => onChange({ transform: { ...miniature.transform, ...changes } })}
        />
      )}
      <section className="printable-preview" aria-label="Printable preview">
        <h3>Printable preview</h3>
        <p>{printable.widthMm.toFixed(1)} × {printable.unfoldedHeightMm.toFixed(1)} mm unfolded</p>
        <div className="printable-preview-viewport">
          <PrintableMiniature
            miniature={miniature}
            copyNumber={previewCopyNumber}
            previewPxPerMm={PREVIEW_PX_PER_MM}
          />
        </div>
      </section>
      <button className="primary-button" type="button" onClick={onDone} disabled={!copiesValid}>
        Done
      </button>
    </section>
  )
}

export default MiniatureEditor
