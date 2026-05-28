import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import {
  bucketForLinkedKind,
  campaignLinkGuesses,
  findNodeById,
  formatCampaignWikiLink,
  isOpenableCampaignNode,
  linkTitleFromSelection,
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

function parseWikiLink(rawLink: string, nodes: CampaignNode[]): ActiveWikiLink | null {
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
  const normalizedTitle = targetTitle.toLowerCase()
  const targetNode =
    nodes.find(
      (candidate) =>
        isOpenableCampaignNode(candidate) && candidate.title.toLowerCase() === normalizedTitle,
    ) ?? null

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
  const pattern = new RegExp(WIKI_LINK_PATTERN.source, WIKI_LINK_PATTERN.flags)

  for (const match of markdown.matchAll(pattern)) {
    const start = match.index ?? 0
    const end = start + match[0].length
    if (cursor >= start && cursor <= end) {
      return {
        start,
        end,
        text: match[0],
      }
    }
  }

  return null
}

function activeWikiLink(selection: TextSelection, nodes: CampaignNode[]): ActiveWikiLink | null {
  const link = parseWikiLink(selection.text, nodes)
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

function formattedTokenOffset(
  wrapper: HTMLElement,
  target: Node,
  offset: number,
  rawToken: string,
  textStart: number,
  textEnd: number,
): number {
  if (target === wrapper) {
    if (offset <= 0) {
      return 0
    }

    if (offset >= wrapper.childNodes.length) {
      return rawToken.length
    }

    return textStart
  }

  if (target.nodeType === Node.TEXT_NODE) {
    return Math.min(textEnd, textStart + Math.min(offset, target.textContent?.length ?? 0))
  }

  return offset > 0 ? rawToken.length : 0
}

function markdownEditorParts(markdown: string, nodes: CampaignNode[]): MarkdownEditorPart[] {
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

    const link = parseWikiLink(rawToken, nodes)
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

  const rawHighlight = node.dataset.campaignHighlightRaw
  if (rawHighlight) {
    return rawHighlight
  }

  const rawFormat = node.dataset.campaignFormatRaw
  if (rawFormat) {
    return rawFormat
  }

  if (node.tagName === 'BR') {
    return '\n'
  }

  const childMarkdown = Array.from(node.childNodes).map(markdownFromEditorNode).join('')
  if (node.tagName === 'DIV' || node.tagName === 'P') {
    return `${childMarkdown}\n`
  }

  return childMarkdown
}

function markdownFromEditor(root: HTMLElement): string {
  return Array.from(root.childNodes).map(markdownFromEditorNode).join('').replace(/\n$/, '')
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

  const rawHighlight = node.dataset.campaignHighlightRaw
  if (rawHighlight) {
    return rawHighlight.length
  }

  const rawFormat = node.dataset.campaignFormatRaw
  if (rawFormat) {
    return rawFormat.length
  }

  if (node.tagName === 'BR') {
    return 1
  }

  const childLength = Array.from(node.childNodes).reduce(
    (total, child) => total + nodeMarkdownLength(child),
    0,
  )

  return node.tagName === 'DIV' || node.tagName === 'P' ? childLength + 1 : childLength
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
        const rawHighlight = node.dataset.campaignHighlightRaw
        if (rawHighlight) {
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

        const rawFormat = node.dataset.campaignFormatRaw
        if (rawFormat) {
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

    const rawHighlight = node.dataset.campaignHighlightRaw
    if (rawHighlight) {
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

    const rawFormat = node.dataset.campaignFormatRaw
    if (rawFormat) {
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

    if (!resolved && (node.tagName === 'DIV' || node.tagName === 'P')) {
      markdownOffset += 1
    }
  }

  for (const child of root.childNodes) {
    visit(child)
  }

  return markdownOffset
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
  const { patchDocumentMarkdown, createNode, openNode, refreshLinksForNode, nodes, links } =
    useCampaignManagerStore(
      useShallow((state) => ({
        patchDocumentMarkdown: state.patchDocumentMarkdown,
        createNode: state.createNode,
        openNode: state.openNode,
        refreshLinksForNode: state.refreshLinksForNode,
        nodes: state.nodes,
        links: state.links,
      })),
    )
  const editorParts = useMemo(() => markdownEditorParts(draft, nodes), [draft, nodes])
  const selectedLink = activeWikiLink(selection, nodes)
  const formulaGuesses = useMemo(
    () => (selectedLink ? campaignLinkGuesses(node, nodes, links, formulaDraft) : []),
    [formulaDraft, links, node, nodes, selectedLink],
  )

  const updateSelection = useCallback((nextSelection: TextSelection) => {
    selectionRef.current = nextSelection
    setSelection(nextSelection)
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

  const handleFormulaCommit = useCallback(() => {
    if (!selectedLink || formulaDraft.trim().length === 0) {
      return
    }

    const guessedTitle = formulaGuesses[0]?.title
    const replacement = guessedTitle ? formatCampaignWikiLink(guessedTitle) : formulaDraft

    replaceSelectedText(replacement, {
      start: selectedLink.start,
      end: selectedLink.end,
      text: selectedLink.raw,
    })
  }, [formulaDraft, formulaGuesses, replaceSelectedText, selectedLink])

  const handleFormulaGuessPick = useCallback(
    (targetNode: CampaignNode) => {
      if (!selectedLink) {
        return
      }

      replaceSelectedText(formatCampaignWikiLink(targetNode.title), {
        start: selectedLink.start,
        end: selectedLink.end,
        text: selectedLink.raw,
      })
    },
    [replaceSelectedText, selectedLink],
  )

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
        <WikiLinkFormulaEditor
          value={formulaDraft}
          guesses={formulaGuesses}
          onChange={setFormulaDraft}
          onCommit={handleFormulaCommit}
          onPick={handleFormulaGuessPick}
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
          'h-full min-h-0 flex-1 overflow-y-auto rounded-md border border-input bg-background px-3 py-2 text-justify font-mono text-sm leading-6 whitespace-pre-wrap outline-none',
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
                  data-campaign-highlight-raw={part.raw}
                  className={cn(
                    'rounded-sm px-0.5 text-foreground',
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
                  <strong key={part.key} data-campaign-format-raw={part.raw}>
                    {part.text}
                  </strong>
                )
              }

              if (part.format === 'italic') {
                return (
                  <em key={part.key} data-campaign-format-raw={part.raw}>
                    {part.text}
                  </em>
                )
              }

              return (
                <s key={part.key} data-campaign-format-raw={part.raw}>
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
                  'inline rounded-sm px-0.5 font-mono text-amber-300 underline decoration-amber-400 underline-offset-4 hover:bg-amber-400/10',
                  !part.node && 'cursor-default text-amber-300/60 decoration-amber-400/40',
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
