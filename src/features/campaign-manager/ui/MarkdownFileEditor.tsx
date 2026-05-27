import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import {
  findNodeById,
  formatCampaignWikiLink,
  nodesByTitle,
  WIKI_LINK_PATTERN,
  type CampaignBucket,
  type CampaignDocument,
  type CampaignNode,
  type CampaignNodeKind,
} from '@/entities/campaign'
import { Textarea } from '@/shared/ui/textarea'
import { useCampaignManagerStore } from '../model/store'
import { SelectionActionMenu } from './SelectionActionMenu'

type LinkableCampaignNodeKind = Extract<CampaignNodeKind, 'note' | 'npc' | 'item' | 'location'>

interface TextSelection {
  start: number
  end: number
  text: string
}

interface MarkdownPreviewTextPart {
  kind: 'text'
  key: string
  text: string
}

interface MarkdownPreviewLinkPart {
  kind: 'link'
  key: string
  targetTitle: string
  label: string
  node: CampaignNode | null
}

type MarkdownPreviewPart = MarkdownPreviewTextPart | MarkdownPreviewLinkPart

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

function wikiTokenSelection(markdown: string, cursor: number): TextSelection | null {
  const closedBeforeCursor = markdown.slice(Math.max(0, cursor - 2), cursor) === ']]'
  const closeIndex = closedBeforeCursor ? cursor - 2 : markdown.indexOf(']]', cursor)
  const openIndex = markdown.lastIndexOf('[[', closedBeforeCursor ? closeIndex : cursor)

  if (openIndex < 0) {
    return null
  }

  const end = closeIndex < 0 ? cursor : closeIndex + 2
  const textEnd = closeIndex < 0 ? cursor : closeIndex
  if (textEnd <= openIndex + 2) {
    return null
  }

  const text = markdown.slice(openIndex + 2, textEnd)
  if (text.includes('[[') || text.includes(']]') || text.includes('\n')) {
    return null
  }

  return {
    start: openIndex,
    end,
    text,
  }
}

function emptySelection(): TextSelection {
  return { start: 0, end: 0, text: '' }
}

function markdownPreviewParts(markdown: string, nodes: CampaignNode[]): MarkdownPreviewPart[] {
  const titleMap = nodesByTitle(nodes)
  const parts: MarkdownPreviewPart[] = []
  let cursor = 0

  for (const match of markdown.matchAll(WIKI_LINK_PATTERN)) {
    const index = match.index ?? 0
    if (index > cursor) {
      parts.push({
        kind: 'text',
        key: `text-${cursor}`,
        text: markdown.slice(cursor, index),
      })
    }

    const raw = match[1] ?? ''
    const aliasLabel = match[2]
    const [targetTitleRaw, labelRaw] = raw.split('|')
    const targetTitle = targetTitleRaw?.trim() ?? ''
    const label = (aliasLabel ?? labelRaw ?? targetTitleRaw ?? '').trim()
    if (targetTitle) {
      parts.push({
        kind: 'link',
        key: `link-${index}-${targetTitle}`,
        targetTitle,
        label,
        node: titleMap.get(targetTitle.toLowerCase()) ?? null,
      })
    }

    cursor = index + match[0].length
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

function linkTitleFromSelection(text: string): string {
  const trimmed = text.trim()
  const wikiMatch = trimmed.match(/^\[\[([^\]\n]+)\]\](?:\([^\)\n]+\))?$/)
  const rawTitle = wikiMatch?.[1] ?? trimmed
  return (rawTitle.split('|')[0] ?? rawTitle).trim()
}

interface MarkdownPreviewProps {
  parts: MarkdownPreviewPart[]
  placeholder: string
  onEdit: () => void
  onOpen: (nodeId: string) => void
}

function MarkdownPreview({ parts, placeholder, onEdit, onOpen }: MarkdownPreviewProps) {
  return (
    <div
      role="textbox"
      tabIndex={0}
      aria-label="Markdown preview"
      className="h-full min-h-0 flex-1 overflow-y-auto rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-6 whitespace-pre-wrap"
      onClick={onEdit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onEdit()
        }
      }}
    >
      {parts.length === 0 ? (
        <span className="text-muted-foreground">{placeholder}</span>
      ) : (
        parts.map((part) => {
          if (part.kind === 'text') {
            return <span key={part.key}>{part.text}</span>
          }

          return (
            <button
              key={part.key}
              type="button"
              disabled={!part.node}
              title={part.node ? part.targetTitle : `${part.targetTitle} is not created yet`}
              className="inline rounded-sm px-0.5 text-amber-300 underline decoration-amber-400 underline-offset-4 hover:bg-amber-400/10 disabled:cursor-default disabled:text-amber-300/60 disabled:decoration-amber-400/40"
              onClick={(event) => {
                event.stopPropagation()
                if (part.node) {
                  onOpen(part.node.id)
                }
              }}
            >
              {part.label}
            </button>
          )
        })
      )}
    </div>
  )
}

export function MarkdownFileEditor({ node, document }: MarkdownFileEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const isCreatePendingRef = useRef(false)
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestDraftRef = useRef(document.markdown)
  const selectionRef = useRef<TextSelection>(emptySelection())
  const [draft, setDraft] = useState(document.markdown)
  const [selection, setSelection] = useState<TextSelection>(emptySelection())
  const [isCreatePending, setIsCreatePending] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
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
  const previewParts = useMemo(() => markdownPreviewParts(draft, nodes), [draft, nodes])

  const updateSelection = useCallback((nextSelection: TextSelection) => {
    selectionRef.current = nextSelection
    setSelection(nextSelection)
  }, [])

  useEffect(() => {
    setDraft(document.markdown)
    latestDraftRef.current = document.markdown
    updateSelection(emptySelection())
    setIsEditing(false)
  }, [node.id, updateSelection])

  useEffect(() => {
    if (document.markdown !== latestDraftRef.current) {
      setDraft(document.markdown)
      latestDraftRef.current = document.markdown
    }
  }, [document.markdown])

  useEffect(() => {
    if (!isEditing) {
      return
    }

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
  }, [isEditing])

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

  const handleSelect = useCallback(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    if (start === end) {
      updateSelection(wikiTokenSelection(draft, start) ?? emptySelection())
      return
    }

    updateSelection({
      start,
      end,
      text: draft.slice(start, end),
    })
  }, [draft, updateSelection])

  const replaceSelectedText = useCallback(
    (replacement: string) => {
      const currentSelection = selectionRef.current
      const nextMarkdown =
        draft.slice(0, currentSelection.start) +
        replacement +
        draft.slice(currentSelection.end)

      setDraft(nextMarkdown)
      latestDraftRef.current = nextMarkdown
      flushMarkdown()
      void refreshLinksForNode(node.id)
      updateSelection(emptySelection())
      setIsEditing(false)
    },
    [draft, flushMarkdown, node.id, refreshLinksForNode, updateSelection],
  )

  const handleLink = useCallback(() => {
    if (isCreatePendingRef.current) {
      return
    }

    const title = linkTitleFromSelection(selectionRef.current.text)
    if (title) {
      replaceSelectedText(formatCampaignWikiLink(title))
    }
  }, [replaceSelectedText])

  const createLinked = useCallback(
    async (kind: LinkableCampaignNodeKind) => {
      if (isCreatePendingRef.current) {
        return
      }

      const title = linkTitleFromSelection(selectionRef.current.text)

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
        replaceSelectedText(formatCampaignWikiLink(title))
      } catch {
        toast.error('Failed to create campaign file')
      } finally {
        isCreatePendingRef.current = false
        setIsCreatePending(false)
      }
    },
    [createNode, node, nodes, replaceSelectedText],
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

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextMarkdown = event.target.value
      setDraft(nextMarkdown)
      commitMarkdown(nextMarkdown)

      const nextSelection = wikiTokenSelection(nextMarkdown, event.target.selectionStart)
      if (nextSelection) {
        updateSelection(nextSelection)
      }
    },
    [commitMarkdown, updateSelection],
  )

  const handleEdit = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleBlur = useCallback(() => {
    flushMarkdown()
    if (latestDraftRef.current.includes('[[')) {
      void refreshLinksForNode(node.id)
    }
    setIsEditing(false)
  }, [flushMarkdown, node.id, refreshLinksForNode])

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
      {isEditing ? (
        <Textarea
          ref={textareaRef}
          value={draft}
          disabled={isCreatePending}
          onChange={handleChange}
          onSelect={handleSelect}
          onBlur={handleBlur}
          placeholder="Write markdown here. Select text to add links or create campaign files."
          className="h-full min-h-0 flex-1 resize-none overflow-y-auto field-sizing-fixed font-mono text-sm leading-6"
        />
      ) : (
        <MarkdownPreview
          parts={previewParts}
          placeholder="Write markdown here. Select text to add links or create campaign files."
          onEdit={handleEdit}
          onOpen={openNode}
        />
      )}
    </div>
  )
}
