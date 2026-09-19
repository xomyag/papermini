import { useState } from 'react'
import { createMiniature, type Miniature } from './domain/miniature'
import './App.css'

function App() {
  const [miniatures, setMiniatures] = useState<Miniature[]>([])

  function addMiniature() {
    setMiniatures((current) => [...current, createMiniature()])
  }

  function deleteMiniature(id: string) {
    setMiniatures((current) => current.filter((miniature) => miniature.id !== id))
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>PaperMini</h1>
        <p>Create printable paper miniatures for tabletop games.</p>
      </header>

      <main className="app-main">
        {miniatures.length === 0 ? (
          <section className="empty-state" aria-label="Miniatures">
            <p>No miniatures added yet.</p>
            <button className="primary-button" type="button" onClick={addMiniature}>
              Add miniature
            </button>
          </section>
        ) : (
          <section aria-label="Miniatures">
            <div className="collection-actions">
              <button className="primary-button" type="button" onClick={addMiniature}>
                Add miniature
              </button>
            </div>
            <ul className="miniature-list">
              {miniatures.map((miniature) => (
                <li className="miniature-card" key={miniature.id}>
                  <div>
                    <h2>{miniature.name || 'Untitled miniature'}</h2>
                    <p>{miniature.size} · {miniature.copies} {miniature.copies === 1 ? 'copy' : 'copies'}</p>
                  </div>
                  <button type="button" onClick={() => deleteMiniature(miniature.id)}>
                    Delete
                  </button>
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
