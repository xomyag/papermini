import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import type { MiniatureImage } from './domain/miniature'

type Props = {
  image?: MiniatureImage
  onChange: (image: MiniatureImage | undefined) => void
}

function readImage(file: File): Promise<MiniatureImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read failed'))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('read failed'))
        return
      }

      const source = reader.result
      const preview = new Image()
      preview.onerror = () => reject(new Error('decode failed'))
      preview.onload = () => {
        if (preview.naturalWidth === 0 || preview.naturalHeight === 0) {
          reject(new Error('invalid dimensions'))
          return
        }
        resolve({ source, widthPx: preview.naturalWidth, heightPx: preview.naturalHeight })
      }
      preview.src = source
    }
    reader.readAsDataURL(file)
  })
}

function MiniatureImageInput({ image, onChange }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const loadFile = useCallback(async (file: File) => {
    const currentRequest = ++requestId.current
    setError('')

    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.')
      return
    }

    try {
      const loadedImage = await readImage(file)
      if (currentRequest === requestId.current) onChange(loadedImage)
    } catch {
      if (currentRequest === requestId.current) setError('The image could not be loaded.')
    }
  }, [onChange])

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const target = event.target
      if (target instanceof HTMLElement && (
        target.isContentEditable || target.closest('input, textarea, select, [contenteditable]')
      )) return

      const item = Array.from(event.clipboardData?.items ?? []).find(
        (candidate) => candidate.kind === 'file' && candidate.type.startsWith('image/'),
      )
      const file = item?.getAsFile()
      if (!file) return

      event.preventDefault()
      void loadFile(file)
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [loadFile])

  useEffect(() => () => { requestId.current++ }, [])

  function hasDraggedImage(event: DragEvent<HTMLDivElement>) {
    return Array.from(event.dataTransfer.items).some(
      (item) => item.kind === 'file' && item.type.startsWith('image/'),
    )
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const files = Array.from(event.dataTransfer.files)
    const file = files.find((candidate) => candidate.type.startsWith('image/')) ?? files[0]
    if (file) void loadFile(file)
  }

  function removeImage() {
    requestId.current++
    setError('')
    onChange(undefined)
  }

  return (
    <div className="image-field">
      <span className="image-field-title">Image</span>
      <div
        className={`image-drop-area${isDragging ? ' is-dragging' : ''}`}
        onDragOver={(event) => {
          if (hasDraggedImage(event)) {
            event.preventDefault()
            setIsDragging(true)
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false)
        }}
        onDrop={handleDrop}
      >
        {image ? (
          <img className="image-preview" src={image.source} alt="Miniature source" />
        ) : (
          <p>Drop an image here, choose a file, or paste an image.</p>
        )}
        <div className="image-actions">
          <label className="image-file-button">
            {image ? 'Replace image' : 'Choose image'}
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) void loadFile(file)
                event.currentTarget.value = ''
              }}
            />
          </label>
          {image && <button type="button" onClick={removeImage}>Remove image</button>}
        </div>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  )
}

export default MiniatureImageInput
