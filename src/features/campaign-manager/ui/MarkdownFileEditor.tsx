import { useCallback, useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  findNodeById,
  formatCampaignWikiLink,
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

export function MarkdownFileEditor({ node, document }: MarkdownFileEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const isCreatePendingRef = useRef(false)
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestDraftRef = useRef(document.markdown)
  const [draft, setDraft] = useState(document.markdown)
  const [selection, setSelection] = useState<TextSelection>({ start: 0, end: 0, text: '' })
  const [isCreatePending, setIsCreatePending] = useState(false)
  const { patchDocumentMarkdown, createNode, nodes } = useCampaignManagerStore(
    useShallow((state) => ({
      patchDocumentMarkdown: state.patchDocumentMarkdown,
      createNode: state.createNode,
      nodes: state.nodes,
    })),
  )

  useEffect(() => {
    setDraft(document.markdown)
    latestDraftRef.current = document.markdown
    setSelection({ start: 0, end: 0, text: '' })
  }, [node.id])

  useEffect(() => {
    if (document.markdown !== latestDraftRef.current) {
      setDraft(document.markdown)
      latestDraftRef.current = document.markdown
    }
  }, [document.markdown])

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
      setSelection(wikiTokenSelection(draft, start) ?? { start: 0, end: 0, text: '' })
      return
    }

    setSelection({
      start,
      end,
      text: draft.slice(start, end),
    })
  }, [draft])

  const replaceSelectedText = useCallback(
    (replacement: string) => {
      const nextMarkdown =
        draft.slice(0, selection.start) +
        replacement +
        draft.slice(selection.end)

      setDraft(nextMarkdown)
      latestDraftRef.current = nextMarkdown
      flushMarkdown()
      setSelection({ start: 0, end: 0, text: '' })
      textareaRef.current?.focus()
    },
    [draft, flushMarkdown, selection.end, selection.start],
  )

  const handleLink = useCallback(() => {
    if (isCreatePendingRef.current) {
      return
    }

    replaceSelectedText(formatCampaignWikiLink(selection.text))
  }, [replaceSelectedText, selection.text])

  const createLinked = useCallback(
    async (kind: LinkableCampaignNodeKind) => {
      if (isCreatePendingRef.current) {
        return
      }

      const title = selection.text.trim()

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
        })
        replaceSelectedText(formatCampaignWikiLink(title))
      } finally {
        isCreatePendingRef.current = false
        setIsCreatePending(false)
      }
    },
    [createNode, node, nodes, replaceSelectedText, selection.text],
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
        setSelection(nextSelection)
      }
    },
    [commitMarkdown],
  )

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
      <Textarea
        ref={textareaRef}
        value={draft}
        disabled={isCreatePending}
        onChange={handleChange}
        onSelect={handleSelect}
        onBlur={flushMarkdown}
        placeholder="Write markdown here. Select text to add links or create campaign files."
        className="h-full min-h-0 flex-1 resize-none overflow-y-auto field-sizing-fixed font-mono text-sm leading-6"
      />
    </div>
  )
}
