import { useState } from 'react'
import { createMiniature, type Miniature } from './domain/miniature'
import MiniatureEditor from './MiniatureEditor'
import PrintPreview from './PrintPreview'
import './App.css'

function App() {
  const [miniatures, setMiniatures] = useState<Miniature[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const editingMiniature = miniatures.find((miniature) => miniature.id === editingId)

  function addMiniature() {
    const miniature = createMiniature()
    setMiniatures((current) => [...current, miniature])
    setEditingId(miniature.id)
  }

  function deleteMiniature(id: string) {
    setMiniatures((current) => current.filter((miniature) => miniature.id !== id))
  }

  function updateMiniature(id: string, changes: Partial<Miniature>) {
    setMiniatures((current) => current.map((miniature) =>
      miniature.id === id ? { ...miniature, ...changes } : miniature,
    ))
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>PaperMini</h1>
        <p>Create printable paper miniatures for tabletop games.</p>
      </header>

      <main className="app-main">
        {showPrintPreview && miniatures.length > 0 ? (
          <PrintPreview miniatures={miniatures} onBack={() => setShowPrintPreview(false)} />
        ) : editingMiniature ? (
          <MiniatureEditor
            key={editingMiniature.id}
            miniature={editingMiniature}
            onChange={(changes) => updateMiniature(editingMiniature.id, changes)}
            onDone={() => setEditingId(null)}
          />
        ) : miniatures.length === 0 ? (
          <section className="empty-state" aria-label="Miniatures">
            <p>No miniatures added yet.</p>
            <button className="primary-button" type="button" onClick={addMiniature}>
              Add miniature
            </button>
          </section>
        ) : (
          <section aria-label="Miniatures">
            <div className="collection-actions">
              <button type="button" onClick={() => setShowPrintPreview(true)}>
                Print Preview
              </button>
              <button className="primary-button" type="button" onClick={addMiniature}>
                Add miniature
              </button>
            </div>
            <ul className="miniature-list">
              {miniatures.map((miniature, index) => (
                <li className="miniature-card" key={miniature.id}>
                  <div className="card-summary">
                    <div className="card-thumbnail">
                      {miniature.image ? (
                        <img src={miniature.image.source} alt="" />
                      ) : (
                        <span>No image<br />Mini {index + 1}</span>
                      )}
                    </div>
                    <div className="card-details">
                      <h2>{miniature.name || 'Untitled miniature'}</h2>
                      <p>{miniature.size} · {miniature.copies} {miniature.copies === 1 ? 'copy' : 'copies'}</p>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button type="button" onClick={() => setEditingId(miniature.id)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteMiniature(miniature.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
