const EXPORT_SCALE = 2
const TRANSPARENT_COLORS = new Set(['transparent', 'rgba(0, 0, 0, 0)', 'rgb(0 0 0 / 0)'])

function isSecurityError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'SecurityError') return true
  if (!(error instanceof Error)) return false
  return /tainted canvases|failed to execute 'toblob'|securityerror/i.test(error.message)
}

function isVisibleElement(element: Element): boolean {
  const computed = window.getComputedStyle(element)
  return computed.display !== 'none' && computed.visibility !== 'hidden' && computed.opacity !== '0'
}

function isPaintableColor(color: string): boolean {
  return Boolean(color) && !TRANSPARENT_COLORS.has(color)
}

function cssPixels(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function canvasFont(computed: CSSStyleDeclaration): string {
  return [
    computed.fontStyle,
    computed.fontVariant,
    computed.fontWeight,
    computed.fontSize,
    computed.fontFamily,
  ].filter(Boolean).join(' ')
}

function createCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = width * EXPORT_SCALE
  canvas.height = height * EXPORT_SCALE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available.')
  context.scale(EXPORT_SCALE, EXPORT_SCALE)
  return [canvas, context]
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  context.beginPath()
  context.moveTo(x + r, y)
  context.lineTo(x + width - r, y)
  context.quadraticCurveTo(x + width, y, x + width, y + r)
  context.lineTo(x + width, y + height - r)
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  context.lineTo(x + r, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - r)
  context.lineTo(x, y + r)
  context.quadraticCurveTo(x, y, x + r, y)
  context.closePath()
}

function paintElementBox(
  context: CanvasRenderingContext2D,
  element: Element,
  rootRect: DOMRect,
): void {
  if (!(element instanceof HTMLElement) || !isVisibleElement(element)) return

  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const computed = window.getComputedStyle(element)
  const x = rect.left - rootRect.left
  const y = rect.top - rootRect.top
  const radius = cssPixels(computed.borderTopLeftRadius)

  if (isPaintableColor(computed.backgroundColor)) {
    context.save()
    context.fillStyle = computed.backgroundColor
    roundedRect(context, x, y, rect.width, rect.height, radius)
    context.fill()
    context.restore()
  }

  const borderWidth = cssPixels(computed.borderTopWidth)
  if (
    borderWidth > 0 &&
    computed.borderTopStyle !== 'none' &&
    isPaintableColor(computed.borderTopColor)
  ) {
    context.save()
    context.strokeStyle = computed.borderTopColor
    context.lineWidth = borderWidth
    roundedRect(
      context,
      x + borderWidth / 2,
      y + borderWidth / 2,
      rect.width - borderWidth,
      rect.height - borderWidth,
      Math.max(0, radius - borderWidth / 2),
    )
    context.stroke()
    context.restore()
  }
}

function paintTextNode(
  context: CanvasRenderingContext2D,
  node: Text,
  rootRect: DOMRect,
): void {
  const text = node.textContent ?? ''
  if (text.trim().length === 0 || !node.parentElement || !isVisibleElement(node.parentElement)) return

  const computed = window.getComputedStyle(node.parentElement)
  context.save()
  context.fillStyle = computed.color
  context.font = canvasFont(computed)
  context.textBaseline = 'top'

  const range = document.createRange()
  try {
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index]
      if (char === '\n' || char === '\r') continue
      range.setStart(node, index)
      range.setEnd(node, index + 1)
      const rect = range.getBoundingClientRect()
      if (rect.width === 0 && char.trim().length === 0) continue
      context.fillText(char, rect.left - rootRect.left, rect.top - rootRect.top)
    }
  } finally {
    range.detach()
    context.restore()
  }
}

function paintNode(
  context: CanvasRenderingContext2D,
  node: Node,
  rootRect: DOMRect,
): void {
  if (node instanceof Text) {
    paintTextNode(context, node, rootRect)
    return
  }
  if (!(node instanceof Element) || !isVisibleElement(node)) return

  paintElementBox(context, node, rootRect)
  for (const child of Array.from(node.childNodes)) {
    paintNode(context, child, rootRect)
  }
}

function inlineComputedStyles(source: Element, target: Element): void {
  if (target instanceof HTMLElement || target instanceof SVGElement) {
    const computed = window.getComputedStyle(source)
    for (const property of computed) {
      target.style.setProperty(
        property,
        computed.getPropertyValue(property),
        computed.getPropertyPriority(property),
      )
    }
  }

  const sourceChildren = Array.from(source.children)
  const targetChildren = Array.from(target.children)
  sourceChildren.forEach((child, index) => {
    const targetChild = targetChildren[index]
    if (targetChild) inlineComputedStyles(child, targetChild)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to render custom item card image.'))
    image.src = src
  })
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }
      reject(new Error('Failed to encode custom item card as PNG.'))
    }, 'image/png')
  })
}

function getElementExportSize(element: HTMLElement): { rect: DOMRect; width: number; height: number } {
  const rect = element.getBoundingClientRect()
  const width = Math.ceil(rect.width)
  const height = Math.ceil(rect.height)
  if (width <= 0 || height <= 0) {
    throw new Error('Custom item card is not visible.')
  }
  return { rect, width, height }
}

async function renderElementToPngWithSvg(element: HTMLElement): Promise<Blob> {
  const { width, height } = getElementExportSize(element)

  const clone = element.cloneNode(true) as HTMLElement
  inlineComputedStyles(element, clone)
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')

  const serialized = new XMLSerializer().serializeToString(clone)
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width * EXPORT_SCALE}" height="${height * EXPORT_SCALE}" viewBox="0 0 ${width} ${height}">`,
    `<foreignObject width="${width}" height="${height}">`,
    serialized,
    '</foreignObject>',
    '</svg>',
  ].join('')

  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = await loadImage(url)
    const [canvas, context] = createCanvas(width, height)
    context.drawImage(image, 0, 0, width, height)
    return await canvasToPngBlob(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function renderElementToPngWithCanvas(element: HTMLElement): Promise<Blob> {
  const { rect, width, height } = getElementExportSize(element)
  const [canvas, context] = createCanvas(width, height)
  paintNode(context, element, rect)
  return await canvasToPngBlob(canvas)
}

async function renderElementToPng(element: HTMLElement): Promise<Blob> {
  try {
    return await renderElementToPngWithSvg(element)
  } catch (error) {
    if (!isSecurityError(error)) throw error
    return await renderElementToPngWithCanvas(element)
  }
}

export async function copyCustomItemCardToClipboard(element: HTMLElement): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Image clipboard export is not supported in this WebView.')
  }

  const blob = await renderElementToPng(element)
  await navigator.clipboard.write([
    new ClipboardItem({ [blob.type]: blob }),
  ])
}
