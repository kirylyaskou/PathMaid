import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import {
  bucketForLinkedKind,
  campaignLinkGuesses,
  findNodeById,
  formatCampaignWikiLink,
  linkTitleFromSelection,
  nodesByTitle,
  topLevelBucketNode,
  WIKI_LINK_PATTERN,
  type CampaignDocument,
  type CampaignNode,
  type LinkableCampaignNodeKind,
} from '@/entities/campaign'
import { cn } from '@/shared/lib/utils'
import { useCampaignManagerStore } from '../model/store'
import { SelectionActionMenu, type SelectionHighlightColor } from './SelectionActionMenu'
import { WikiLinkFormulaEditor } from './WikiLinkFormulaEditor'

interface TextSelection {
  start: number
  end: number
  text: string
}

interface ActiveWikiLink {
  start: number
  end: number
  raw: string
  targetTitle: string
  label: string
  node: CampaignNode | null
}

interface MarkdownEditorTextPart {
  kind: 'text'
  key: string
  text: string
}

interface MarkdownEditorLinkPart extends ActiveWikiLink {
  kind: 'link'
  key: string
}

interface MarkdownEditorHighlightPart {
  kind: 'highlight'
  key: string
  raw: string
  text: string
  color: SelectionHighlightColor
}

interface MarkdownEditorFormatPart {
  kind: 'format'
  key: string
  raw: string
  text: string
  format: 'bold' | 'italic' | 'strike'
}

type TextFormatKind = MarkdownEditorFormatPart['format']

type MarkdownEditorPart =
  | MarkdownEditorTextPart
  | MarkdownEditorLinkPart
  | MarkdownEditorHighlightPart
  | MarkdownEditorFormatPart

interface MarkdownFileEditorProps {
  node: CampaignNode
  document: CampaignDocument
}

interface WikiLinkFormulaSectionProps {
  node: CampaignNode
  nodes: CampaignNode[]
  selectedLink: ActiveWikiLink
  formulaDraft: string
  onFormulaDraftChange: (value: string) => void
  onReplaceSelectedLink: (replacement: string, selection: TextSelection) => void
}

const MARKDOWN_COMMIT_DELAY_MS = 180
const HIGHLIGHT_TOKEN_PATTERN = /^==(?:\{(red|green|yellow|blue)\})?([^=\n][^\n]*?)==$/
const BOLD_TOKEN_PATTERN = /^\*\*((?=\S)[\s\S]*?)\*\*$/
const ITALIC_TOKEN_PATTERN = /^\*((?=\S)[\s\S]*?)\*$/
const STRIKE_TOKEN_PATTERN = /^~~((?=\S)[\s\S]*?)~~$/
const MARKDOWN_TOKEN_PATTERN =
  /\[\[([^\]\n]+)\]\](?:\(([^\)\n]+)\))?|==(?:\{(?:red|green|yellow|blue)\})?([^=\n][^\n]*?)==|~~((?=\S)[\s\S]*?)~~|\*\*((?=\S)[\s\S]*?)\*\*|\*((?=\S)[\s\S]*?)\*/g

const HIGHLIGHT_CLASS_BY_COLOR: Record<SelectionHighlightColor, string> = {
  red: 'bg-red-400/25',
  green: 'bg-emerald-400/25',
  yellow: 'bg-amber-300/25',
  blue: 'bg-sky-400/25',
}

function emptySelection(): TextSelection {
  return { start: 0, end: 0, text: '' }
}

function parseWikiLink(
  rawLink: string,
  titleMap: ReadonlyMap<string, CampaignNode>,
): ActiveWikiLink | null {
  const match = rawLink.match(/^\[\[([^\]\n]+)\]\](?:\(([^\)\n]+)\))?$/)
  if (!match) {
    return null
  }

  const raw = match[1] ?? ''
  const aliasLabel = match[2]
  const [targetTitleRaw, labelRaw] = raw.split('|')
  const targetTitle = targetTitleRaw?.trim() ?? ''
  if (!targetTitle) {
    return null
  }

  const label = (aliasLabel ?? labelRaw ?? targetTitleRaw ?? '').trim()
  const targetNode = titleMap.get(targetTitle.toLowerCase()) ?? null

  return {
    start: 0,
    end: rawLink.length,
    raw: rawLink,
    targetTitle,
    label,
    node: targetNode,
  }
}

function wikiTokenSelection(markdown: string, cursor: number): TextSelection | null {
  const start = markdown.lastIndexOf('[[', cursor)
  if (start < 0) {
    return null
  }

  const linkEnd = markdown.indexOf(']]', start + 2)
  if (linkEnd < 0) {
    return null
  }

  let end = linkEnd + 2
  if (markdown[end] === '(') {
    const aliasEnd = markdown.indexOf(')', end + 1)
    if (aliasEnd > -1) {
      end = aliasEnd + 1
    }
  }

  const text = markdown.slice(start, end)
  const pattern = new RegExp(`^${WIKI_LINK_PATTERN.source}$`)
  return cursor <= end && pattern.test(text) ? { start, end, text } : null
}

function activeWikiLink(
  selection: TextSelection,
  titleMap: ReadonlyMap<string, CampaignNode>,
): ActiveWikiLink | null {
  const link = parseWikiLink(selection.text, titleMap)
  if (!link) {
    return null
  }

  return {
    ...link,
    start: selection.start,
    end: selection.end,
  }
}

function parseHighlightToken(rawToken: string): { text: string; color: SelectionHighlightColor } | null {
  const match = rawToken.match(HIGHLIGHT_TOKEN_PATTERN)
  if (!match) {
    return null
  }

  return {
    color: (match[1] as SelectionHighlightColor | undefined) ?? 'yellow',
    text: match[2] ?? '',
  }
}

function parseFormatToken(
  rawToken: string,
): Pick<MarkdownEditorFormatPart, 'format' | 'text'> | null {
  const boldMatch = rawToken.match(BOLD_TOKEN_PATTERN)
  if (boldMatch) {
    return { format: 'bold', text: boldMatch[1] ?? '' }
  }

  const strikeMatch = rawToken.match(STRIKE_TOKEN_PATTERN)
  if (strikeMatch) {
    return { format: 'strike', text: strikeMatch[1] ?? '' }
  }

  const italicMatch = rawToken.match(ITALIC_TOKEN_PATTERN)
  if (italicMatch) {
    return { format: 'italic', text: italicMatch[1] ?? '' }
  }

  return null
}

function highlightTokenTextStart(rawToken: string): number {
  const colorEnd = rawToken.startsWith('=={') ? rawToken.indexOf('}') : -1
  return colorEnd > -1 ? colorEnd + 1 : 2
}

function formatTokenTextStart(rawToken: string): number {
  return rawToken.startsWith('**') || rawToken.startsWith('~~') ? 2 : 1
}

function formatTokenTextEnd(rawToken: string): number {
  return rawToken.length - formatTokenTextStart(rawToken)
}

function highlightToken(color: SelectionHighlightColor, text: string): string {
  return text.length > 0 ? `=={${color}}${text}==` : ''
}

function formatToken(format: TextFormatKind, text: string): string {
  if (text.length === 0) {
    return ''
  }

  if (format === 'bold') {
    return `**${text}**`
  }

  if (format === 'italic') {
    return `*${text}*`
  }

  return `~~${text}~~`
}

function isHighlightColor(value: string | undefined): value is SelectionHighlightColor {
  return value === 'red' || value === 'green' || value === 'yellow' || value === 'blue'
}

function isTextFormatKind(value: string | undefined): value is TextFormatKind {
  return value === 'bold' || value === 'italic' || value === 'strike'
}

function isBlockElement(node: Node): node is HTMLElement {
  return node instanceof HTMLElement && (node.tagName === 'DIV' || node.tagName === 'P')
}

function nodeTextLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.length ?? 0
  }

  if (!(node instanceof HTMLElement)) {
    return 0
  }

  if (node.tagName === 'BR') {
    return 1
  }

  return Array.from(node.childNodes).reduce((total, child) => total + nodeTextLength(child), 0)
}

function textOffsetWithin(wrapper: HTMLElement, target: Node, offset: number): number {
  if (target === wrapper) {
    return Array.from(wrapper.childNodes)
      .slice(0, offset)
      .reduce((total, child) => total + nodeTextLength(child), 0)
  }

  let textOffset = 0
  let resolved = false

  const visit = (node: Node): void => {
    if (resolved) {
      return
    }

    if (node === target) {
      textOffset += node.nodeType === Node.TEXT_NODE ? Math.min(offset, nodeTextLength(node)) : 0
      resolved = true
      return
    }

    if (node.nodeType === Node.TEXT_NODE || node instanceof HTMLElement) {
      if (node.contains(target)) {
        for (const child of node.childNodes) {
          visit(child)
        }
        return
      }

      textOffset += nodeTextLength(node)
    }
  }

  for (const child of wrapper.childNodes) {
    visit(child)
  }

  return textOffset
}

function formattedTokenOffset(
  wrapper: HTMLElement,
  target: Node,
  offset: number,
  rawToken: string,
  textStart: number,
  textEnd: number,
): number {
  if (target === wrapper) {
    if (offset >= wrapper.childNodes.length) {
      return rawToken.length
    }

    return Math.min(textEnd, textStart + textOffsetWithin(wrapper, target, offset))
  }

  if (wrapper.contains(target)) {
    return Math.min(textEnd, textStart + textOffsetWithin(wrapper, target, offset))
  }

  return offset > 0 ? rawToken.length : textStart
}

function markdownEditorParts(
  markdown: string,
  titleMap: ReadonlyMap<string, CampaignNode>,
): MarkdownEditorPart[] {
  const parts: MarkdownEditorPart[] = []
  let cursor = 0

  for (const match of markdown.matchAll(MARKDOWN_TOKEN_PATTERN)) {
    const start = match.index ?? 0
    const rawToken = match[0]
    const end = start + rawToken.length

    if (start > cursor) {
      parts.push({
        kind: 'text',
        key: `text-${cursor}`,
        text: markdown.slice(cursor, start),
      })
    }

    const link = parseWikiLink(rawToken, titleMap)
    if (link) {
      parts.push({
        ...link,
        kind: 'link',
        key: `link-${start}-${link.targetTitle}`,
        start,
        end,
      })
    } else {
      const highlight = parseHighlightToken(rawToken)
      const format = parseFormatToken(rawToken)

      if (highlight) {
        parts.push({
          kind: 'highlight',
          key: `highlight-${start}`,
          raw: rawToken,
          text: highlight.text,
          color: highlight.color,
        })
      } else if (format) {
        parts.push({
          ...format,
          kind: 'format',
          key: `format-${start}`,
          raw: rawToken,
        })
      } else {
        parts.push({
          kind: 'text',
          key: `text-${start}`,
          text: rawToken,
        })
      }
    }

    cursor = end
  }

  if (cursor < markdown.length) {
    parts.push({
      kind: 'text',
      key: `text-${cursor}`,
      text: markdown.slice(cursor),
    })
  }

  return parts
}

function splitFormattedTokenReplacement(
  markdown: string,
  selection: TextSelection,
  formatSelection: (text: string) => string,
): { targetSelection: TextSelection; replacement: string } | null {
  for (const match of markdown.matchAll(MARKDOWN_TOKEN_PATTERN)) {
    const start = match.index ?? 0
    const rawToken = match[0]
    const end = start + rawToken.length

    const highlight = parseHighlightToken(rawToken)
    if (highlight) {
      const contentStart = start + highlightTokenTextStart(rawToken)
      const contentEnd = end - 2
      if (selection.start < contentStart || selection.end > contentEnd) {
        continue
      }

      const selectedText = markdown.slice(selection.start, selection.end)
      const before = markdown.slice(contentStart, selection.start)
      const after = markdown.slice(selection.end, contentEnd)
      return {
        targetSelection: { start, end, text: highlight.text },
        replacement:
          highlightToken(highlight.color, before) +
          formatSelection(selectedText) +
          highlightToken(highlight.color, after),
      }
    }

    const format = parseFormatToken(rawToken)
    if (format) {
      const contentStart = start + formatTokenTextStart(rawToken)
      const contentEnd = start + formatTokenTextEnd(rawToken)
      if (selection.start < contentStart || selection.end > contentEnd) {
        continue
      }

      const selectedText = markdown.slice(selection.start, selection.end)
      const before = markdown.slice(contentStart, selection.start)
      const after = markdown.slice(selection.end, contentEnd)
      return {
        targetSelection: { start, end, text: format.text },
        replacement:
          formatToken(format.format, before) +
          formatSelection(selectedText) +
          formatToken(format.format, after),
      }
    }
  }

  return null
}

function markdownFromEditorNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (!(node instanceof HTMLElement)) {
    return ''
  }

  const rawLink = node.dataset.campaignWikiRaw
  if (rawLink) {
    return rawLink
  }

  if (node.tagName === 'BR') {
    return '\n'
  }

  const childMarkdown = Array.from(node.childNodes).map(markdownFromEditorNode).join('')
  const highlightColor = node.dataset.campaignHighlightColor
  if (isHighlightColor(highlightColor)) {
    return highlightToken(highlightColor, childMarkdown)
  }

  const formatKind = node.dataset.campaignFormatKind
  if (isTextFormatKind(formatKind)) {
    return formatToken(formatKind, childMarkdown)
  }

  if (isBlockElement(node)) {
    return `${childMarkdown}\n`
  }

  return childMarkdown
}

function markdownFromEditor(root: HTMLElement): string {
  let markdown = ''

  for (const child of root.childNodes) {
    if (isBlockElement(child) && markdown.length > 0 && !markdown.endsWith('\n')) {
      markdown += '\n'
    }

    markdown += markdownFromEditorNode(child)
  }

  return markdown.replace(/\n$/, '')
}

function nodeMarkdownEndsWithNewline(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.endsWith('\n') ?? false
  }

  if (!(node instanceof HTMLElement)) {
    return false
  }

  if (node.tagName === 'BR' || isBlockElement(node)) {
    return true
  }

  const element = node as HTMLElement
  const lastChild = element.childNodes.item(element.childNodes.length - 1)
  return lastChild ? nodeMarkdownEndsWithNewline(lastChild) : false
}

function nodeMarkdownLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.length ?? 0
  }

  if (!(node instanceof HTMLElement)) {
    return 0
  }

  const rawLink = node.dataset.campaignWikiRaw
  if (rawLink) {
    return rawLink.length
  }

  const highlightColor = node.dataset.campaignHighlightColor
  if (isHighlightColor(highlightColor)) {
    return highlightToken(highlightColor, Array.from(node.childNodes).map(markdownFromEditorNode).join(''))
      .length
  }

  const formatKind = node.dataset.campaignFormatKind
  if (isTextFormatKind(formatKind)) {
    return formatToken(formatKind, Array.from(node.childNodes).map(markdownFromEditorNode).join(''))
      .length
  }

  if (node.tagName === 'BR') {
    return 1
  }

  const childLength = Array.from(node.childNodes).reduce(
    (total, child) => total + nodeMarkdownLength(child),
    0,
  )

  return isBlockElement(node) ? childLength + 1 : childLength
}

function markdownOffsetForDomPosition(root: HTMLElement, target: Node, offset: number): number {
  let markdownOffset = 0
  let resolved = false

  const visit = (node: Node): void => {
    if (resolved) {
      return
    }

    if (node === target) {
      if (node.nodeType === Node.TEXT_NODE) {
        markdownOffset += Math.min(offset, node.textContent?.length ?? 0)
      } else if (node instanceof HTMLElement) {
        const highlightColor = node.dataset.campaignHighlightColor
        if (isHighlightColor(highlightColor)) {
          const rawHighlight = highlightToken(highlightColor, node.textContent ?? '')
          markdownOffset += formattedTokenOffset(
            node,
            target,
            offset,
            rawHighlight,
            highlightTokenTextStart(rawHighlight),
            rawHighlight.length - 2,
          )
          resolved = true
          return
        }

        const formatKind = node.dataset.campaignFormatKind
        if (isTextFormatKind(formatKind)) {
          const rawFormat = formatToken(formatKind, node.textContent ?? '')
          markdownOffset += formattedTokenOffset(
            node,
            target,
            offset,
            rawFormat,
            formatTokenTextStart(rawFormat),
            rawFormat.length - formatTokenTextStart(rawFormat),
          )
          resolved = true
          return
        }

        const children = Array.from(node.childNodes).slice(0, offset)
        markdownOffset += children.reduce((total, child) => total + nodeMarkdownLength(child), 0)
      }
      resolved = true
      return
    }

    if (node.nodeType === Node.TEXT_NODE) {
      markdownOffset += node.textContent?.length ?? 0
      return
    }

    if (!(node instanceof HTMLElement)) {
      return
    }

    const rawLink = node.dataset.campaignWikiRaw
    if (rawLink) {
      if (node.contains(target)) {
        markdownOffset += offset > 0 ? rawLink.length : 0
        resolved = true
        return
      }

      markdownOffset += rawLink.length
      return
    }

    const highlightColor = node.dataset.campaignHighlightColor
    if (isHighlightColor(highlightColor)) {
      const rawHighlight = highlightToken(highlightColor, node.textContent ?? '')
      if (node.contains(target)) {
        markdownOffset += formattedTokenOffset(
          node,
          target,
          offset,
          rawHighlight,
          highlightTokenTextStart(rawHighlight),
          rawHighlight.length - 2,
        )
        resolved = true
        return
      }

      markdownOffset += rawHighlight.length
      return
    }

    const formatKind = node.dataset.campaignFormatKind
    if (isTextFormatKind(formatKind)) {
      const rawFormat = formatToken(formatKind, node.textContent ?? '')
      if (node.contains(target)) {
        markdownOffset += formattedTokenOffset(
          node,
          target,
          offset,
          rawFormat,
          formatTokenTextStart(rawFormat),
          rawFormat.length - formatTokenTextStart(rawFormat),
        )
        resolved = true
        return
      }

      markdownOffset += rawFormat.length
      return
    }

    if (node.tagName === 'BR') {
      markdownOffset += 1
      return
    }

    for (const child of node.childNodes) {
      visit(child)
    }

    if (!resolved && isBlockElement(node)) {
      markdownOffset += 1
    }
  }

  let rootEndsWithNewline = true
  for (const child of root.childNodes) {
    if (resolved) {
      break
    }

    if (isBlockElement(child) && markdownOffset > 0 && !rootEndsWithNewline) {
      markdownOffset += 1
    }

    visit(child)
    if (!resolved) {
      rootEndsWithNewline = nodeMarkdownEndsWithNewline(child)
    }
  }

  return markdownOffset
}

function WikiLinkFormulaSection({
  node,
  nodes,
  selectedLink,
  formulaDraft,
  onFormulaDraftChange,
  onReplaceSelectedLink,
}: WikiLinkFormulaSectionProps) {
  const links = useCampaignManagerStore(useShallow((state) => state.links))
  const formulaGuesses = useMemo(
    () => campaignLinkGuesses(node, nodes, links, formulaDraft),
    [formulaDraft, links, node, nodes],
  )

  const handleFormulaCommit = useCallback(() => {
    if (formulaDraft.trim().length === 0) {
      return
    }

    const guessedTitle = formulaGuesses[0]?.title
    const replacement = guessedTitle ? formatCampaignWikiLink(guessedTitle) : formulaDraft

    onReplaceSelectedLink(replacement, {
      start: selectedLink.start,
      end: selectedLink.end,
      text: selectedLink.raw,
    })
  }, [formulaDraft, formulaGuesses, onReplaceSelectedLink, selectedLink])

  const handleFormulaGuessPick = useCallback(
    (targetNode: CampaignNode) => {
      onReplaceSelectedLink(formatCampaignWikiLink(targetNode.title), {
        start: selectedLink.start,
        end: selectedLink.end,
        text: selectedLink.raw,
      })
    },
    [onReplaceSelectedLink, selectedLink],
  )

  return (
    <WikiLinkFormulaEditor
      value={formulaDraft}
      guesses={formulaGuesses}
      onChange={onFormulaDraftChange}
      onCommit={handleFormulaCommit}
      onPick={handleFormulaGuessPick}
    />
  )
}

export function MarkdownFileEditor({ node, document }: MarkdownFileEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const isCreatePendingRef = useRef(false)
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formatShortcutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestDraftRef = useRef(document.markdown)
  const formatShortcutPendingRef = useRef(false)
  const selectionRef = useRef<TextSelection>(emptySelection())
  const [draft, setDraft] = useState(document.markdown)
  const [editorRenderVersion, setEditorRenderVersion] = useState(0)
  const [selection, setSelection] = useState<TextSelection>(emptySelection())
  const [formulaDraft, setFormulaDraft] = useState('')
  const [isCreatePending, setIsCreatePending] = useState(false)
  const { patchDocumentMarkdown, createNode, openNode, refreshLinksForNode, nodes } =
    useCampaignManagerStore(
      useShallow((state) => ({
        patchDocumentMarkdown: state.patchDocumentMarkdown,
        createNode: state.createNode,
        openNode: state.openNode,
        refreshLinksForNode: state.refreshLinksForNode,
        nodes: state.nodes,
      })),
    )
  const titleMap = useMemo(() => nodesByTitle(nodes), [nodes])
  const editorParts = useMemo(() => markdownEditorParts(draft, titleMap), [draft, titleMap])
  const selectedLink = useMemo(() => activeWikiLink(selection, titleMap), [selection, titleMap])

  const updateSelection = useCallback((nextSelection: TextSelection) => {
    selectionRef.current = nextSelection
    setSelection((currentSelection) =>
      currentSelection.start === nextSelection.start &&
      currentSelection.end === nextSelection.end &&
      currentSelection.text === nextSelection.text
        ? currentSelection
        : nextSelection,
    )
  }, [])

  const rebuildEditorView = useCallback(() => {
    setEditorRenderVersion((version) => version + 1)
  }, [])

  const focusEditorSoon = useCallback(() => {
    window.requestAnimationFrame(() => editorRef.current?.focus())
  }, [])

  useEffect(() => {
    setFormulaDraft(selectedLink?.raw ?? '')
  }, [selectedLink?.raw])

  const commitMarkdown = useCallback(
    (markdown: string) => {
      latestDraftRef.current = markdown
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current)
      }

      commitTimerRef.current = setTimeout(() => {
        commitTimerRef.current = null
        patchDocumentMarkdown(node.id, latestDraftRef.current)
      }, MARKDOWN_COMMIT_DELAY_MS)
    },
    [node.id, patchDocumentMarkdown],
  )

  const flushMarkdown = useCallback(() => {
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current)
      commitTimerRef.current = null
    }
    patchDocumentMarkdown(node.id, latestDraftRef.current)
  }, [node.id, patchDocumentMarkdown])

  const clearFormatShortcut = useCallback(() => {
    formatShortcutPendingRef.current = false
    if (formatShortcutTimerRef.current) {
      clearTimeout(formatShortcutTimerRef.current)
      formatShortcutTimerRef.current = null
    }
  }, [])

  const readEditorSelection = useCallback((): TextSelection => {
    const editor = editorRef.current
    const domSelection = window.getSelection()

    if (
      !editor ||
      !domSelection ||
      domSelection.rangeCount === 0 ||
      !domSelection.anchorNode ||
      !domSelection.focusNode ||
      !editor.contains(domSelection.anchorNode) ||
      !editor.contains(domSelection.focusNode)
    ) {
      return selectionRef.current
    }

    const anchor = markdownOffsetForDomPosition(
      editor,
      domSelection.anchorNode,
      domSelection.anchorOffset,
    )
    const focus = markdownOffsetForDomPosition(editor, domSelection.focusNode, domSelection.focusOffset)
    const start = Math.min(anchor, focus)
    const end = Math.max(anchor, focus)
    const currentMarkdown = latestDraftRef.current

    if (start === end) {
      return wikiTokenSelection(currentMarkdown, start) ?? emptySelection()
    }

    return {
      start,
      end,
      text: currentMarkdown.slice(start, end),
    }
  }, [])

  useEffect(() => {
    setDraft(document.markdown)
    latestDraftRef.current = document.markdown
    updateSelection(emptySelection())
    rebuildEditorView()
  }, [node.id, rebuildEditorView, updateSelection])

  useEffect(() => {
    if (document.markdown !== latestDraftRef.current) {
      setDraft(document.markdown)
      latestDraftRef.current = document.markdown
      rebuildEditorView()
    }
  }, [document.markdown, rebuildEditorView])

  useEffect(
    () => () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current)
      }
      clearFormatShortcut()
      if (latestDraftRef.current !== document.markdown) {
        patchDocumentMarkdown(node.id, latestDraftRef.current)
      }
    },
    [clearFormatShortcut, document.markdown, node.id, patchDocumentMarkdown],
  )

  const replaceSelectedText = useCallback(
    (replacement: string, targetSelection = selectionRef.current) => {
      const currentMarkdown = latestDraftRef.current
      const nextMarkdown =
        currentMarkdown.slice(0, targetSelection.start) +
        replacement +
        currentMarkdown.slice(targetSelection.end)

      setDraft(nextMarkdown)
      rebuildEditorView()
      latestDraftRef.current = nextMarkdown
      flushMarkdown()
      void refreshLinksForNode(node.id)
      updateSelection(emptySelection())
      focusEditorSoon()
    },
    [flushMarkdown, focusEditorSoon, node.id, rebuildEditorView, refreshLinksForNode, updateSelection],
  )

  const handleSelect = useCallback(() => {
    updateSelection(readEditorSelection())
  }, [readEditorSelection, updateSelection])

  const handleInput = useCallback(() => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    const nextMarkdown = markdownFromEditor(editor)
    latestDraftRef.current = nextMarkdown
    commitMarkdown(nextMarkdown)
    updateSelection(readEditorSelection())
  }, [commitMarkdown, readEditorSelection, updateSelection])

  const handleLink = useCallback(() => {
    if (isCreatePendingRef.current) {
      return
    }

    const currentSelection = readEditorSelection()
    updateSelection(currentSelection)

    const title = linkTitleFromSelection(currentSelection.text)
    if (title) {
      replaceSelectedText(formatCampaignWikiLink(title), currentSelection)
    }
  }, [readEditorSelection, replaceSelectedText, updateSelection])

  const applyTextFormat = useCallback(
    (formatSelection: (text: string) => string) => {
      const currentSelection = readEditorSelection()
      updateSelection(currentSelection)

      if (currentSelection.text.trim().length > 0) {
        const splitReplacement = splitFormattedTokenReplacement(
          latestDraftRef.current,
          currentSelection,
          formatSelection,
        )

        if (splitReplacement) {
          replaceSelectedText(splitReplacement.replacement, splitReplacement.targetSelection)
          return
        }

        replaceSelectedText(formatSelection(currentSelection.text), currentSelection)
      }
    },
    [readEditorSelection, replaceSelectedText, updateSelection],
  )

  const handleHighlight = useCallback(
    (color: SelectionHighlightColor) => {
      applyTextFormat((text) => highlightToken(color, text))
    },
    [applyTextFormat],
  )

  const handleBold = useCallback(() => {
    applyTextFormat((text) => formatToken('bold', text))
  }, [applyTextFormat])

  const handleItalic = useCallback(() => {
    applyTextFormat((text) => formatToken('italic', text))
  }, [applyTextFormat])

  const handleStrike = useCallback(() => {
    applyTextFormat((text) => formatToken('strike', text))
  }, [applyTextFormat])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.altKey || isCreatePendingRef.current) {
        return
      }

      const key = event.key.toLowerCase()
      if (formatShortcutPendingRef.current) {
        if (key === 'b' || key === 'i' || key === 's') {
          event.preventDefault()
          clearFormatShortcut()

          if (key === 'b') {
            handleBold()
          } else if (key === 'i') {
            handleItalic()
          } else {
            handleStrike()
          }
          return
        }

        clearFormatShortcut()
      }

      if (!(event.ctrlKey || event.metaKey)) {
        return
      }

      if (key === 't') {
        event.preventDefault()
        clearFormatShortcut()
        formatShortcutPendingRef.current = true
        formatShortcutTimerRef.current = setTimeout(clearFormatShortcut, 1500)
        return
      }

      if (key === 'b') {
        event.preventDefault()
        handleBold()
        return
      }

      if (key === 'i') {
        event.preventDefault()
        handleItalic()
        return
      }

      if (key === 's') {
        event.preventDefault()
        handleStrike()
      }
    },
    [clearFormatShortcut, handleBold, handleItalic, handleStrike],
  )

  const createLinked = useCallback(
    async (kind: LinkableCampaignNodeKind) => {
      if (isCreatePendingRef.current) {
        return
      }

      const currentSelection = readEditorSelection()
      updateSelection(currentSelection)

      const title = linkTitleFromSelection(currentSelection.text)

      if (title.length === 0) {
        return
      }

      const bucket = bucketForLinkedKind(kind, node)
      const parent = topLevelBucketNode(nodes, node.campaignId, bucket)
      const fallbackParent = node.parentId ? findNodeById(nodes, node.parentId) : node

      isCreatePendingRef.current = true
      setIsCreatePending(true)

      try {
        await createNode({
          campaignId: node.campaignId,
          parentId: parent?.id ?? fallbackParent?.id ?? node.id,
          kind,
          bucket,
          title,
          openAfterCreate: false,
        })
        replaceSelectedText(formatCampaignWikiLink(title), currentSelection)
      } catch {
        toast.error('Failed to create campaign file')
      } finally {
        isCreatePendingRef.current = false
        setIsCreatePending(false)
      }
    },
    [createNode, node, nodes, readEditorSelection, replaceSelectedText, updateSelection],
  )

  const handleCreateNote = useCallback(() => {
    void createLinked('note')
  }, [createLinked])

  const handleCreateNpc = useCallback(() => {
    void createLinked('npc')
  }, [createLinked])

  const handleCreateItem = useCallback(() => {
    void createLinked('item')
  }, [createLinked])

  const handleCreateLocation = useCallback(() => {
    void createLinked('location')
  }, [createLinked])

  const handleEditWikiLink = useCallback(
    (part: MarkdownEditorLinkPart) => {
      updateSelection({ start: part.start, end: part.end, text: part.raw })
      editorRef.current?.focus()
    },
    [updateSelection],
  )

  const handleOpenWikiLink = useCallback(
    (part: MarkdownEditorLinkPart) => {
      if (part.node) {
        void openNode(part.node.id)
      }
    },
    [openNode],
  )

  const handleBlur = useCallback(() => {
    const editor = editorRef.current
    if (editor) {
      const nextMarkdown = markdownFromEditor(editor)
      latestDraftRef.current = nextMarkdown
      setDraft(nextMarkdown)
      rebuildEditorView()
    }

    flushMarkdown()
    if (latestDraftRef.current.includes('[[')) {
      void refreshLinksForNode(node.id)
    }
  }, [flushMarkdown, node.id, rebuildEditorView, refreshLinksForNode])

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 overflow-hidden">
      <SelectionActionMenu
        selectedText={selection.text}
        isPending={isCreatePending}
        onLink={handleLink}
        onHighlight={handleHighlight}
        onBold={handleBold}
        onItalic={handleItalic}
        onStrike={handleStrike}
        onCreateNote={handleCreateNote}
        onCreateNpc={handleCreateNpc}
        onCreateItem={handleCreateItem}
        onCreateLocation={handleCreateLocation}
      />
      {selectedLink ? (
        <WikiLinkFormulaSection
          node={node}
          nodes={nodes}
          selectedLink={selectedLink}
          formulaDraft={formulaDraft}
          onFormulaDraftChange={setFormulaDraft}
          onReplaceSelectedLink={replaceSelectedText}
        />
      ) : null}
      <div
        key={`${node.id}-${editorRenderVersion}`}
        ref={editorRef}
        contentEditable={!isCreatePending}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        tabIndex={0}
        data-placeholder="Write markdown here. Select text to add links or create campaign files."
        className={cn(
          'h-full min-h-0 flex-1 overflow-y-auto rounded-md border border-border/70 bg-card/90 px-4 py-3 text-left font-mono text-sm leading-7 whitespace-pre-wrap shadow-inner shadow-black/5 outline-none selection:bg-pf-gold/25 dark:shadow-black/20',
          'empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          isCreatePending && 'cursor-not-allowed opacity-60',
        )}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={handleSelect}
        onKeyUp={handleSelect}
        onBlur={handleBlur}
      >
        {editorParts.map((part) => {
            if (part.kind === 'text') {
              return <span key={part.key}>{part.text}</span>
            }

            if (part.kind === 'highlight') {
              return (
                <mark
                  key={part.key}
                  data-campaign-highlight-color={part.color}
                  className={cn(
                    'rounded-sm px-1 py-0.5 text-foreground',
                    HIGHLIGHT_CLASS_BY_COLOR[part.color],
                  )}
                >
                  {part.text}
                </mark>
              )
            }

            if (part.kind === 'format') {
              if (part.format === 'bold') {
                return (
                  <strong key={part.key} data-campaign-format-kind={part.format}>
                    {part.text}
                  </strong>
                )
              }

              if (part.format === 'italic') {
                return (
                  <em key={part.key} data-campaign-format-kind={part.format}>
                    {part.text}
                  </em>
                )
              }

              return (
                <s key={part.key} data-campaign-format-kind={part.format}>
                  {part.text}
                </s>
              )
            }

            return (
              <button
                key={part.key}
                type="button"
                contentEditable={false}
                data-campaign-wiki-raw={part.raw}
                aria-disabled={!part.node}
                title={part.node ? part.raw : `${part.targetTitle} is not created yet`}
                className={cn(
                  'inline rounded-sm bg-pf-gold/10 px-1 font-mono font-medium text-pf-gold underline decoration-pf-gold/50 underline-offset-4 transition-colors hover:bg-pf-gold/20',
                  !part.node && 'cursor-default bg-muted/40 text-muted-foreground decoration-muted-foreground/40',
                )}
                onMouseDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  handleOpenWikiLink(part)
                }}
                onContextMenu={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  handleEditWikiLink(part)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleOpenWikiLink(part)
                    return
                  }

                  if (event.key === 'F2') {
                    event.preventDefault()
                    handleEditWikiLink(part)
                  }
                }}
              >
                {part.label}
              </button>
            )
          })}
      </div>
    </div>
  )
}
