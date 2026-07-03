export type ExecutivePdfRow = {
  section: string
  index?: number
  content: string
}

export type ExecutivePdfOptions = {
  eyebrow: string
  title: string
  subject: string
  summary: string
  dateLabel: string
  rows: ExecutivePdfRow[]
}

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN_X = 54
const BODY_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const PAPER = '0.965 0.949 0.910'
const INK = '0.110 0.102 0.082'
const MUTED = '0.392 0.365 0.318'
const BRASS = '0.690 0.486 0.173'
const LINE = '0.800 0.714 0.545'
const CHAMBER = '0.078 0.071 0.055'

function toWinAnsi(value: string): string {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[•·]/g, '-')
    .replace(/→/g, '->')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
}

function escapePdf(value: string): string {
  return toWinAnsi(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrapText(value: string, width = 92): string[] {
  const words = toWinAnsi(value).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > width && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function fillRect(x: number, y: number, width: number, height: number, rgb: string) {
  return `${rgb} rg\n${x} ${y} ${width} ${height} re f`
}

function strokeLine(x1: number, y1: number, x2: number, y2: number, rgb = LINE, width = 0.7) {
  return `${rgb} RG\n${width} w\n${x1} ${y1} m ${x2} ${y2} l S`
}

function textBlock(x: number, y: number, lines: string[], options?: {
  color?: string
  font?: 'F1' | 'F2' | 'F3'
  size?: number
  leading?: number
}) {
  const font = options?.font ?? 'F1'
  const size = options?.size ?? 9.5
  const leading = options?.leading ?? 12
  const color = options?.color ?? INK
  return [
    `${color} rg`,
    'BT',
    `/${font} ${size} Tf`,
    `${x} ${y} Td`,
    `${leading} TL`,
    ...lines.map(line => `(${escapePdf(line.slice(0, 170))}) Tj T*`),
    'ET',
  ].join('\n')
}

function labelFor(row: ExecutivePdfRow) {
  return `${row.section}${row.index && row.index > 1 ? ` ${row.index}` : ''}`
}

function rowBlocks(rows: ExecutivePdfRow[]) {
  return rows.flatMap((row) => {
    const lines = wrapText(row.content, 92)
    const chunks: Array<{ label: string; lines: string[]; height: number }> = []
    for (let index = 0; index < lines.length; index += 7) {
      const chunk = lines.slice(index, index + 7)
      chunks.push({
        label: index === 0 ? labelFor(row) : `${labelFor(row)} cont.`,
        lines: chunk,
        height: 42 + chunk.length * 12.4,
      })
    }
    return chunks
  })
}

function renderCover(options: ExecutivePdfOptions) {
  const subjectLines = wrapText(options.subject, 34).slice(0, 3)
  const summaryLines = wrapText(options.summary || 'Sessão registrada sem síntese executiva.', 66).slice(0, 5)
  const titleLines = wrapText(options.title, 44).slice(0, 2)

  return [
    fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, CHAMBER),
    strokeLine(MARGIN_X, 700, PAGE_WIDTH - MARGIN_X, 700, BRASS, 1.4),
    textBlock(MARGIN_X, 650, ['BOARD OS'], { color: BRASS, font: 'F3', size: 8, leading: 10 }),
    textBlock(MARGIN_X, 626, titleLines, { color: '0.890 0.850 0.760', font: 'F1', size: 12, leading: 15 }),
    textBlock(MARGIN_X, 548, subjectLines, { color: '0.970 0.955 0.925', font: 'F2', size: 27, leading: 32 }),
    strokeLine(MARGIN_X, 448, MARGIN_X + 132, 448, BRASS, 0.9),
    textBlock(MARGIN_X, 414, summaryLines, { color: '0.835 0.805 0.750', font: 'F1', size: 11, leading: 15 }),
    textBlock(MARGIN_X, 142, [options.eyebrow.toUpperCase(), options.dateLabel], { color: '0.610 0.575 0.505', font: 'F1', size: 8, leading: 11 }),
  ].join('\n')
}

function renderBodyPages(options: ExecutivePdfOptions) {
  const blocks = rowBlocks(options.rows)
  const pages: Array<Array<{ label: string; lines: string[]; height: number }>> = []
  let current: Array<{ label: string; lines: string[]; height: number }> = []
  let y = 624

  blocks.forEach((block) => {
    if (current.length && y - block.height < 86) {
      pages.push(current)
      current = []
      y = 624
    }
    current.push(block)
    y -= block.height + 16
  })
  if (current.length || !pages.length) pages.push(current)

  return pages.map((page, pageIndex) => {
    const stream: string[] = [
      fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, PAPER),
      strokeLine(MARGIN_X, 724, PAGE_WIDTH - MARGIN_X, 724, BRASS, 0.9),
      textBlock(MARGIN_X, 704, [`${String(pageIndex + 1).padStart(2, '0')} / ${options.title}`], { color: BRASS, font: 'F3', size: 7.5, leading: 10 }),
      textBlock(PAGE_WIDTH - 162, 704, ['BOARD OS'], { color: MUTED, font: 'F1', size: 7.5, leading: 10 }),
      textBlock(MARGIN_X, 672, wrapText(pageIndex === 0 ? options.summary : options.subject, 72).slice(0, pageIndex === 0 ? 3 : 1), {
        color: INK,
        font: 'F2',
        size: pageIndex === 0 ? 13.5 : 12,
        leading: pageIndex === 0 ? 17 : 15,
      }),
    ]

    let cursorY = 610
    page.forEach((block) => {
      const top = cursorY
      const bottom = cursorY - block.height
      stream.push(strokeLine(MARGIN_X, top + 8, PAGE_WIDTH - MARGIN_X, top + 8, '0.830 0.780 0.680', 0.45))
      stream.push(strokeLine(MARGIN_X, bottom + 8, MARGIN_X, top - 4, BRASS, 1.3))
      stream.push(textBlock(MARGIN_X + 16, top - 12, [block.label.toUpperCase()], { color: MUTED, font: 'F3', size: 6.8, leading: 8 }))
      stream.push(textBlock(MARGIN_X + 16, top - 31, block.lines, { color: INK, font: 'F1', size: 9.2, leading: 12.4 }))
      cursorY -= block.height + 16
    })

    stream.push(strokeLine(MARGIN_X, 54, PAGE_WIDTH - MARGIN_X, 54, '0.830 0.780 0.680', 0.45))
    stream.push(textBlock(MARGIN_X, 35, [`Board OS - ${options.subject}`], { color: MUTED, font: 'F1', size: 7.5, leading: 9 }))
    stream.push(textBlock(PAGE_WIDTH - 90, 35, [`Página ${pageIndex + 2}`], { color: MUTED, font: 'F1', size: 7.5, leading: 9 }))
    return stream.join('\n')
  })
}

export function renderExecutivePdf(options: ExecutivePdfOptions): Buffer {
  const streams = [renderCover(options), ...renderBodyPages(options)]
  const objects: string[] = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')

  const pageObjectIds: number[] = []
  for (const stream of streams) {
    const pageObjectId = objects.length + 1
    const contentObjectId = pageObjectId + 1
    pageObjectIds.push(pageObjectId)
    objects.push(`<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentObjectId} 0 R >>`)
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`)
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(pdf, 'latin1')
}
