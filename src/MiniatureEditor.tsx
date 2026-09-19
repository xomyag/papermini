import { useState } from 'react'
import { creatureWidthMm, parseCopies, type CreatureSize, type LabelPosition, type Miniature } from './domain/miniature'

type Props = {
  miniature: Miniature
  onChange: (changes: Partial<Miniature>) => void
  onDone: () => void
}

function MiniatureEditor({ miniature, onChange, onDone }: Props) {
  const [copiesInput, setCopiesInput] = useState(String(miniature.copies))
  const copiesValid = parseCopies(copiesInput) !== null

  function changeCopies(value: string) {
    setCopiesInput(value)
    const copies = parseCopies(value)
    if (copies !== null) onChange({ copies })
  }

  return (
    <section className="editor" aria-label="Edit miniature">
      <h2>Edit miniature</h2>
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
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={miniature.duplicateNumberingEnabled}
            onChange={(event) => onChange({ duplicateNumberingEnabled: event.target.checked })}
          />
          Duplicate numbering
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={miniature.labelEnabled}
            onChange={(event) => onChange({ labelEnabled: event.target.checked })}
          />
          Creature name label
        </label>
        <label>
          Label position
          <select
            value={miniature.labelPosition}
            onChange={(event) => onChange({ labelPosition: event.target.value as LabelPosition })}
          >
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
          </select>
        </label>
      </div>
      <button className="primary-button" type="button" onClick={onDone} disabled={!copiesValid}>
        Done
      </button>
    </section>
  )
}

export default MiniatureEditor
