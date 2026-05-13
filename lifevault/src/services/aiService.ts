import type { DocumentCategory, VerificationStatus } from '@/types/database'

interface ClassificationResult {
  category: DocumentCategory
  subCategory: string
  confidence: number
}

interface ExtractedMetadata {
  documentName?: string
  issuer?: string
  documentNumber?: string
  issueDate?: string
  expiryDate?: string
  ownerName?: string
}

const CATEGORY_PATTERNS: Record<DocumentCategory, RegExp[]> = {
  identity: [/\b(passport|aadhaar|aadhar|pan\s*card|voter|driving\s*licen[sc]e|national\s*id|birth\s*certificate)\b/i],
  education: [/\b(degree|diploma|certificate|marksheet|transcript|admit\s*card|hall\s*ticket|university|school|college|board)\b/i],
  family: [/\b(marriage|wedding|divorce|adoption|birth|death|family)\b/i],
  property: [/\b(property|land|deed|title|registration|flat|apartment|house|plot|sale\s*agreement|rent\s*agreement)\b/i],
  vehicle: [/\b(vehicle|car|bike|motorcycle|registration|rc\s*book|insurance|puc|pollution)\b/i],
  medical: [/\b(medical|health|prescription|discharge|hospital|doctor|blood|diagnosis|report|lab|test\s*result)\b/i],
  pet: [/\b(pet|dog|cat|animal|veterinary|vaccination|microchip|licence|license)\b/i],
  finance: [/\b(bank|account|statement|tax|return|itr|investment|mutual\s*fund|insurance|policy|loan|credit)\b/i],
  legal: [/\b(affidavit|power\s*of\s*attorney|will|testament|court|legal|agreement|contract|notary)\b/i],
  insurance: [/\b(insurance|policy|premium|coverage|claim|nominee|maturity|endowment)\b/i],
  other: [],
}

const SUBCATEGORY_MAP: Partial<Record<DocumentCategory, Record<string, RegExp>>> = {
  identity: {
    'Aadhaar Card': /\b(aadhaar|aadhar)\b/i,
    'PAN Card': /\bpan\s*card\b/i,
    'Passport': /\bpassport\b/i,
    'Voter ID': /\bvoter\b/i,
    'Driving Licence': /\bdriving\s*licen[sc]e\b/i,
    'Birth Certificate': /\bbirth\s*certificate\b/i,
  },
  education: {
    'Degree Certificate': /\bdegree\b/i,
    'Diploma': /\bdiploma\b/i,
    'Marksheet': /\bmarksheet\b/i,
    'Transcript': /\btranscript\b/i,
    'School Certificate': /\bschool\b/i,
  },
  vehicle: {
    'RC Book': /\b(rc\s*book|registration\s*certificate)\b/i,
    'Insurance': /\binsurance\b/i,
    'PUC Certificate': /\bpuc\b/i,
  },
}

const DATE_PATTERNS = [
  /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g,
  /\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})\b/gi,
  /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})\b/gi,
]

const EXPIRY_KEYWORDS = /\b(expiry|expiration|valid\s*(?:upto?|till|through|until)|expires?\s*on|validity)\b/i
const ISSUE_KEYWORDS = /\b(issued?\s*(?:on|date)|date\s*of\s*issue|issue\s*date)\b/i
const DOC_NUMBER_PATTERNS = [
  /\b(?:no|number|num|#)[.\s:]*([A-Z0-9][A-Z0-9\-\/]{4,20})\b/i,
  /\b([A-Z]{2,4}[0-9]{6,12})\b/g,
]

export function classifyDocument(ocrText: string): ClassificationResult {
  const text = ocrText.toLowerCase()
  let bestCategory: DocumentCategory = 'other'
  let bestScore = 0
  let subCategory = 'General'

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS) as [DocumentCategory, RegExp[]][]) {
    if (category === 'other') continue
    const score = patterns.reduce((acc, pattern) => {
      const matches = text.match(pattern)
      return acc + (matches ? matches.length : 0)
    }, 0)
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }

  const subMap = SUBCATEGORY_MAP[bestCategory]
  if (subMap) {
    for (const [sub, pattern] of Object.entries(subMap)) {
      if (pattern.test(ocrText)) {
        subCategory = sub
        break
      }
    }
  }

  return { category: bestCategory, subCategory, confidence: Math.min(bestScore * 0.3, 1) }
}

export function extractMetadata(ocrText: string): ExtractedMetadata {
  const result: ExtractedMetadata = {}
  const lines = ocrText.split('\n').map(l => l.trim()).filter(Boolean)

  // Extract all dates
  const allDates: string[] = []
  for (const pattern of DATE_PATTERNS) {
    const matches = ocrText.matchAll(new RegExp(pattern.source, pattern.flags))
    for (const match of matches) allDates.push(match[1])
  }

  // Try to identify expiry vs issue dates by context
  const textLines = ocrText.split('\n')
  for (const line of textLines) {
    if (EXPIRY_KEYWORDS.test(line)) {
      for (const pattern of DATE_PATTERNS) {
        const match = line.match(pattern)
        if (match) { result.expiryDate = match[1]; break }
      }
    }
    if (ISSUE_KEYWORDS.test(line)) {
      for (const pattern of DATE_PATTERNS) {
        const match = line.match(pattern)
        if (match) { result.issueDate = match[1]; break }
      }
    }
  }

  // If only two dates found and not assigned, heuristically assign
  if (!result.issueDate && !result.expiryDate && allDates.length >= 2) {
    result.issueDate = allDates[0]
    result.expiryDate = allDates[allDates.length - 1]
  }

  // Extract document number
  for (const pattern of DOC_NUMBER_PATTERNS) {
    const match = ocrText.match(pattern)
    if (match) {
      result.documentNumber = match[1] || match[0]
      break
    }
  }

  // Try to extract name from first few lines
  const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/
  for (const line of lines.slice(0, 10)) {
    if (namePattern.test(line) && line.length < 50) {
      result.ownerName = line
      break
    }
  }

  return result
}

export function suggestTags(ocrText: string, category: DocumentCategory): string[] {
  const tags: string[] = [category]
  const text = ocrText.toLowerCase()

  const TAG_KEYWORDS: Record<string, string> = {
    'government': /\b(government|govt|ministry|department)\b/i.source,
    'expiring': /\b(expires?|expiry|valid\s*till)\b/i.source,
    'original': /\b(original)\b/i.source,
    'renewal': /\b(renew|renewal)\b/i.source,
    'tax': /\b(tax|itr|income\s*tax)\b/i.source,
    'bank': /\b(bank)\b/i.source,
    'insurance': /\b(insurance|policy)\b/i.source,
  }

  for (const [tag, pattern] of Object.entries(TAG_KEYWORDS)) {
    if (new RegExp(pattern, 'i').test(text)) tags.push(tag)
  }

  return [...new Set(tags)]
}

export function detectExpiry(ocrText: string): string | null {
  const { expiryDate } = extractMetadata(ocrText)
  return expiryDate || null
}

export function detectMismatch(documentMetadata: Record<string, unknown>, profileMetadata: Record<string, unknown>): boolean {
  const docName = String(documentMetadata.owner_name || '').toLowerCase()
  const profileName = String(profileMetadata.name || '').toLowerCase()
  if (docName && profileName && !docName.includes(profileName.split(' ')[0].toLowerCase())) {
    return true
  }
  return false
}

export function recommendCorrectionWorkflow(category: DocumentCategory, field: string): string {
  const workflows: Record<string, string> = {
    'identity-name': 'Name Correction',
    'identity-dob': 'Date of Birth Correction',
    'identity-address': 'Address Change',
    'property-ownership': 'Ownership Transfer',
    'vehicle-rc': 'RC Update',
    'education-certificate': 'Certificate Correction',
  }
  return workflows[`${category}-${field}`] || 'General Correction'
}

export function generateShareMessage(documentName: string, purpose: string, expiryDate?: string): string {
  const expiry = expiryDate ? ` This link is valid till ${expiryDate}.` : ''
  return `Hi, I am sharing my ${documentName} with you for ${purpose}.${expiry} Please find the secure link attached.`
}
