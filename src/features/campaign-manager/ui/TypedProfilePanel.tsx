import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import type { CampaignDocument, CampaignNode } from '@/entities/campaign'
import {
  createCampaignAsset,
  saveCampaignAssetBytes,
  setCampaignDocumentCover,
} from '@/shared/api'
import { Button } from '@/shared/ui/button'
import { useCampaignManagerStore } from '../model/store'

interface TypedProfilePanelProps {
  node: CampaignNode
  document: CampaignDocument
}

export function TypedProfilePanel({ node, document }: TypedProfilePanelProps) {
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const refreshDocument = useCampaignManagerStore((state) => state.refreshDocument)

  const uploadCover = useCallback(
    async (file: File) => {
      if (isUploadingCover) {
        return
      }

      setIsUploadingCover(true)

      try {
        const assetId = `campaign-asset-${crypto.randomUUID()}`
        const extension = file.name.split('.').pop() || 'bin'
        const bytes = new Uint8Array(await file.arrayBuffer())
        const relativePath = await saveCampaignAssetBytes({
          campaignId: node.campaignId,
          assetId,
          extension,
          bytes,
        })

        await createCampaignAsset({
          id: assetId,
          campaignId: node.campaignId,
          kind: 'node-cover',
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          relativePath,
        })
        await setCampaignDocumentCover(node.id, assetId)
        await refreshDocument(node.id)
      } finally {
        setIsUploadingCover(false)
      }
    },
    [isUploadingCover, node.campaignId, node.id, refreshDocument],
  )

  const handleCoverChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) {
        return
      }

      void uploadCover(file)
    },
    [uploadCover],
  )

  if (node.kind !== 'npc' && node.kind !== 'item' && node.kind !== 'location') {
    return null
  }

  return (
    <aside className="w-64 shrink-0 border-l border-border/50 p-4">
      <h2 className="text-sm font-semibold">Profile</h2>
      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
        <p className="capitalize">Kind: {node.kind}</p>
        <div className="space-y-2 rounded-md border border-border/50 p-3">
          <p className="break-all text-xs">
            {document.coverAssetId ? `Cover: ${document.coverAssetId}` : 'No cover image'}
          </p>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleCoverChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploadingCover}
            onClick={() => coverInputRef.current?.click()}
          >
            Upload cover
          </Button>
        </div>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">
          {document.profileJson}
        </pre>
      </div>
    </aside>
  )
}
