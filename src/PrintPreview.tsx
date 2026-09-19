import type { Miniature } from './domain/miniature'
import { A4_PRINT, layoutMiniatures } from './domain/printDocument'
import PrintableMiniature from './PrintableMiniature'

type Props = {
  miniatures: Miniature[]
  onBack: () => void
}

const A4_PREVIEW_PX_PER_MM = 2.5

function PrintPreview({ miniatures, onBack }: Props) {
  const document = layoutMiniatures(miniatures)
  const miniatureById = new Map(miniatures.map((miniature) => [miniature.id, miniature]))

  return (
    <section className="print-preview" aria-label="Print Preview">
      <div className="print-preview-heading">
        <h2>Print Preview</h2>
        <button type="button" onClick={onBack}>Back to collection</button>
      </div>
      <p>{document.pages.length} {document.pages.length === 1 ? 'page' : 'pages'} · {document.totalCopies} printable {document.totalCopies === 1 ? 'copy' : 'copies'}</p>

      {document.problems.length > 0 && (
        <div className="layout-problems" role="alert">
          <h3>Items that cannot be placed</h3>
          <ul>
            {document.problems.map((problem, index) => {
              const name = miniatureById.get(problem.miniatureId)?.name || 'Untitled miniature'
              return (
                <li key={`${problem.miniatureId}-${problem.copyNumber ?? 'invalid'}-${index}`}>
                  {problem.reason === 'too-large-for-a4'
                    ? `${name}, copy ${problem.copyNumber}: ${problem.widthMm?.toFixed(1)} × ${problem.heightMm?.toFixed(1)} mm cannot fit within the ${A4_PRINT.marginMm} mm A4 margins.`
                    : `${name}: copy count must be a positive whole number.`}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {document.pages.length === 0 && <p>No miniature copies fit on A4 at their current size.</p>}
      <div className="a4-pages">
        {document.pages.map((page, pageIndex) => (
          <section className="a4-page-section" key={pageIndex} aria-label={`Page ${pageIndex + 1} of ${document.pages.length}`}>
            <h3>Page {pageIndex + 1} of {document.pages.length}</h3>
            <div className="a4-page-viewport">
              <div
                className="a4-page"
                style={{
                  width: page.widthMm * A4_PREVIEW_PX_PER_MM,
                  height: page.heightMm * A4_PREVIEW_PX_PER_MM,
                }}
              >
                {page.items.map((item) => {
                  const miniature = miniatureById.get(item.miniatureId)
                  if (!miniature) return null
                  return (
                    <div
                      className="a4-page-item"
                      key={`${item.miniatureId}-${item.copyNumber}`}
                      style={{
                        left: item.xMm * A4_PREVIEW_PX_PER_MM,
                        top: item.yMm * A4_PREVIEW_PX_PER_MM,
                      }}
                    >
                      <PrintableMiniature
                        miniature={miniature}
                        copyNumber={item.copyNumber}
                        previewPxPerMm={A4_PREVIEW_PX_PER_MM}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}

export default PrintPreview
