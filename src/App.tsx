import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>PaperMini</h1>
        <p>Create printable paper miniatures for tabletop games.</p>
      </header>

      <main className="app-main">
        <section className="empty-state" aria-label="Miniatures">
          <p>No miniatures added yet.</p>
          <button type="button">Add miniature</button>
        </section>
      </main>
    </div>
  )
}

export default App
