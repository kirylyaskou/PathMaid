import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import {
  findNodeById,
  formatCampaignWikiLink,
  isOpenableCampaignNode,
  WIKI_LINK_PATTERN,
  type CampaignBucket,
  type CampaignDocument,
  type CampaignNode,
  type CampaignNodeKind,
} from '@/entities/campaign'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { useCampaignManagerStore } from '../model/store'
import { SelectionActionMenu } from './SelectionActionMenu'

type LinkableCampaignNodeKind = Extract<CampaignNodeKind, 'note' | 'npc' | 'item' | 'location'>

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

type MarkdownEditorPart = MarkdownEditorTextPart | MarkdownEditorLinkPart

interface MarkdownFileEditorProps {
  node: CampaignNode
  document: CampaignDocument
}

const MARKDOWN_COMMIT_DELAY_MS = 180

function bucketForLinkedKind(kind: LinkableCampaignNodeKind, node: CampaignNode): CampaignBucket {
  if (kind === 'note') {
    return 'notes'
  }

  if (kind === 'npc') {
    return 'npcs'
  }

  if (kind === 'item') {
    return 'items'
  }

  if (kind === 'location') {
    return 'locations'
  }

  return node.bucket
}

function topLevelBucketNode(
  nodes: CampaignNode[],
  campaignId: string,
  bucket: CampaignBucket,
): CampaignNode | null {
  return (
    nodes.find(
      (candidate) =>
        candidate.campaignId === campaignId &&
        candidate.kind === 'bucket' &&
        candidate.bucket === bucket &&
        candidate.parentId === null,
    ) ?? null
  )
}

function emptySelection(): TextSelection {
  return { start: 0, end: 0, text: '' }
}

function linkTitleFromSelection(text: string): string {
  const trimmed = text.trim()
  const wikiMatch = trimmed.match(/^\[\[([^\]\n]+)\]\](?:\([^\)\n]+\))?$/)
  const rawTitle = wikiMatch?.[1] ?? trimmed
  return (rawTitle.split('|')[0] ?? rawTitle).trim()
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

function markdownEditorParts(markdown: string, nodes: CampaignNode[]): MarkdownEditorPart[] {
  const parts: MarkdownEditorPart[] = []
  let cursor = 0

  for (const match of markdown.matchAll(WIKI_LINK_PATTERN)) {
    const start = match.index ?? 0
    const rawLink = match[0]
    const end = start + rawLink.length

    if (start > cursor) {
      parts.push({
        kind: 'text',
        key: `text-${cursor}`,
        text: markdown.slice(cursor, start),
      })
    }

    const link = parseWikiLink(rawLink, nodes)
    if (link) {
      parts.push({
        ...link,
        kind: 'link',
        key: `link-${start}-${link.targetTitle}`,
        start,
        end,
      })
    } else {
      parts.push({
        kind: 'text',
        key: `text-${start}`,
        text: rawLink,
      })
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
  const latestDraftRef = useRef(document.markdown)
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
  const editorParts = useMemo(() => markdownEditorParts(draft, nodes), [draft, nodes])
  const selectedLink = activeWikiLink(selection, nodes)

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
      if (latestDraftRef.current !== document.markdown) {
        patchDocumentMarkdown(node.id, latestDraftRef.current)
      }
    },
    [document.markdown, node.id, patchDocumentMarkdown],
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

    replaceSelectedText(formulaDraft, {
      start: selectedLink.start,
      end: selectedLink.end,
      text: selectedLink.raw,
    })
  }, [formulaDraft, replaceSelectedText, selectedLink])

  const handleFormulaKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.currentTarget.blur()
      }
    },
    [],
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
        onCreateNote={handleCreateNote}
        onCreateNpc={handleCreateNpc}
        onCreateItem={handleCreateItem}
        onCreateLocation={handleCreateLocation}
      />
      {selectedLink ? (
        <div className="flex shrink-0 items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm">
          <span className="text-xs text-muted-foreground">Formula</span>
          <Input
            value={formulaDraft}
            onChange={(event) => setFormulaDraft(event.target.value)}
            onBlur={handleFormulaCommit}
            onKeyDown={handleFormulaKeyDown}
            className="h-7 border-transparent bg-transparent px-1 font-mono text-xs shadow-none focus-visible:border-input"
            aria-label="Edit wiki link formula"
          />
        </div>
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
          'h-full min-h-0 flex-1 overflow-y-auto rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-6 whitespace-pre-wrap outline-none',
          'empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          isCreatePending && 'cursor-not-allowed opacity-60',
        )}
        onInput={handleInput}
        onMouseUp={handleSelect}
        onKeyUp={handleSelect}
        onBlur={handleBlur}
      >
        {editorParts.map((part) => {
            if (part.kind === 'text') {
              return <span key={part.key}>{part.text}</span>
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
                  updateSelection({ start: part.start, end: part.end, text: part.raw })
                  editorRef.current?.focus()
                }}
                onDoubleClick={() => {
                  if (part.node) {
                    void openNode(part.node.id)
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
