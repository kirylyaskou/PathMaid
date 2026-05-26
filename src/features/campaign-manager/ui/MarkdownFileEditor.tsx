import { useCallback, useRef, useState } from 'react'
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

function bucketForLinkedKind(kind: LinkableCampaignNodeKind, node: CampaignNode): CampaignBucket {
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

export function MarkdownFileEditor({ node, document }: MarkdownFileEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [selection, setSelection] = useState<TextSelection>({ start: 0, end: 0, text: '' })
  const { patchDocumentMarkdown, createNode, nodes } = useCampaignManagerStore(
    useShallow((state) => ({
      patchDocumentMarkdown: state.patchDocumentMarkdown,
      createNode: state.createNode,
      nodes: state.nodes,
    })),
  )

  const handleSelect = useCallback(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    setSelection({
      start,
      end,
      text: document.markdown.slice(start, end),
    })
  }, [document.markdown])

  const replaceSelectedText = useCallback(
    (replacement: string) => {
      const nextMarkdown =
        document.markdown.slice(0, selection.start) +
        replacement +
        document.markdown.slice(selection.end)

      patchDocumentMarkdown(node.id, nextMarkdown)
      setSelection({ start: 0, end: 0, text: '' })
      textareaRef.current?.focus()
    },
    [document.markdown, node.id, patchDocumentMarkdown, selection.end, selection.start],
  )

  const handleLink = useCallback(() => {
    replaceSelectedText(formatCampaignWikiLink(selection.text))
  }, [replaceSelectedText, selection.text])

  const createLinked = useCallback(
    (kind: LinkableCampaignNodeKind) => {
      const title = selection.text.trim()

      if (title.length === 0) {
        return
      }

      const bucket = bucketForLinkedKind(kind, node)
      const parent = topLevelBucketNode(nodes, node.campaignId, bucket)
      const fallbackParent = node.parentId ? findNodeById(nodes, node.parentId) : node

      void createNode({
        campaignId: node.campaignId,
        parentId: parent?.id ?? fallbackParent?.id ?? node.id,
        kind,
        bucket,
        title,
      })
      replaceSelectedText(formatCampaignWikiLink(title))
    },
    [createNode, node, nodes, replaceSelectedText, selection.text],
  )

  const handleCreateNote = useCallback(() => {
    createLinked('note')
  }, [createLinked])

  const handleCreateNpc = useCallback(() => {
    createLinked('npc')
  }, [createLinked])

  const handleCreateItem = useCallback(() => {
    createLinked('item')
  }, [createLinked])

  const handleCreateLocation = useCallback(() => {
    createLinked('location')
  }, [createLinked])

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      patchDocumentMarkdown(node.id, event.target.value)
    },
    [node.id, patchDocumentMarkdown],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <SelectionActionMenu
        selectedText={selection.text}
        onLink={handleLink}
        onCreateNote={handleCreateNote}
        onCreateNpc={handleCreateNpc}
        onCreateItem={handleCreateItem}
        onCreateLocation={handleCreateLocation}
      />
      <Textarea
        ref={textareaRef}
        value={document.markdown}
        onChange={handleChange}
        onSelect={handleSelect}
        placeholder="Write markdown here. Select text to add links or create campaign files."
        className="min-h-0 flex-1 resize-none font-mono text-sm leading-6"
      />
    </div>
  )
}
