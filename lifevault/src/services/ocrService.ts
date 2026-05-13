export interface OCRResult {
  text: string
  confidence: number
}

async function getTesseract() {
  const { default: Tesseract } = await import('tesseract.js')
  return Tesseract
}

export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  const Tesseract = await getTesseract()
  const result = await Tesseract.recognize(file, 'eng', {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })
  return {
    text: result.data.text.trim(),
    confidence: result.data.confidence,
  }
}

export async function extractTextFromPDF(file: File, onProgress?: (progress: number) => void): Promise<OCRResult> {
  try {
    const Tesseract = await getTesseract()
    const url = URL.createObjectURL(file)
    const result = await Tesseract.recognize(url, 'eng', {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100))
        }
      },
    })
    URL.revokeObjectURL(url)
    return { text: result.data.text.trim(), confidence: result.data.confidence }
  } catch {
    return { text: '', confidence: 0 }
  }
}

export async function processDocument(file: File, onProgress?: (progress: number) => void): Promise<OCRResult> {
  if (file.type.startsWith('image/')) return extractTextFromImage(file, onProgress)
  if (file.type === 'application/pdf') return extractTextFromPDF(file, onProgress)
  return { text: '', confidence: 0 }
}
