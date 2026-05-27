import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react'
import { ChevronRight, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Card, CardContent } from '@/shared/ui/card'
import { createCampaignAsset, saveCampaignAssetBytes, setCampaignCover } from '@/shared/api'
import { useCampaignManagerStore } from '../model/store'
import type { Campaign } from '@/entities/campaign'
import { CampaignAssetImage } from './CampaignAssetImage'
import { CampaignWorkspace } from './CampaignWorkspace'

const DESCRIPTION_FALLBACK = 'No description yet.'

function extensionFromFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex >= 0 && dotIndex < fileName.length - 1
    ? fileName.slice(dotIndex + 1)
    : 'bin'
}

interface CampaignCardProps {
  campaign: Campaign
  isUploadingCover: boolean
  onOpen: () => void
  onDelete: () => void
  onUploadCover: (campaignId: string, file: File) => void
}

function CampaignCard({
  campaign,
  isUploadingCover,
  onOpen,
  onDelete,
  onUploadCover,
}: CampaignCardProps) {
  const description = campaign.description.trim() || DESCRIPTION_FALLBACK
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const handleCoverChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file || isUploadingCover) {
        return
      }

      onUploadCover(campaign.id, file)
    },
    [campaign.id, isUploadingCover, onUploadCover],
  )
  const handleCoverDrop = useCallback(
    (event: DragEvent<HTMLButtonElement>) => {
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (!file || isUploadingCover) {
        return
      }

      onUploadCover(campaign.id, file)
    },
    [campaign.id, isUploadingCover, onUploadCover],
  )
  const handleCoverDragOver = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }, [])

  return (
    <Card className="relative overflow-hidden rounded-md py-0 pr-11">
      <div className="h-1.5" style={{ backgroundColor: campaign.accentColor }} />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleCoverChange}
      />
      <button
        type="button"
        className="group relative block h-28 w-full overflow-hidden bg-muted text-left outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait"
        disabled={isUploadingCover}
        onClick={() => coverInputRef.current?.click()}
        onDrop={handleCoverDrop}
        onDragOver={handleCoverDragOver}
        aria-label={`Upload cover for ${campaign.name}`}
      >
        {campaign.coverAssetId ? (
          <CampaignAssetImage
            assetId={campaign.coverAssetId}
            alt={`${campaign.name} cover`}
            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <span className="flex h-full items-center justify-center border-b border-dashed border-border/70 text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-background/80 px-3 py-2 text-xs font-semibold text-foreground backdrop-blur">
          <span>Cover</span>
          {isUploadingCover ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
        </span>
      </button>
      <CardContent className="flex min-h-32 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {campaign.name}
            </span>
            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
              {description}
            </span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Delete ${campaign.name}`}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </CardContent>
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center border-l border-border/60 bg-background/35 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onOpen}
        aria-label={`Open ${campaign.name}`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </Card>
  )
}

export function CampaignLibrary() {
  const [newCampaignName, setNewCampaignName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [uploadingCampaignCoverId, setUploadingCampaignCoverId] = useState<string | null>(null)
  const isCreatingRef = useRef(false)
  const {
    campaigns,
    activeCampaignId,
    loading,
    loadCampaigns,
    createNewCampaign,
    deleteExistingCampaign,
    openCampaign,
    closeCampaign,
  } = useCampaignManagerStore(
    useShallow((state) => ({
      campaigns: state.campaigns,
      activeCampaignId: state.activeCampaignId,
      loading: state.loading,
      loadCampaigns: state.loadCampaigns,
      createNewCampaign: state.createNewCampaign,
      deleteExistingCampaign: state.deleteExistingCampaign,
      openCampaign: state.openCampaign,
      closeCampaign: state.closeCampaign,
    })),
  )

  useEffect(() => {
    void loadCampaigns()
  }, [loadCampaigns])

  const handleCreate = useCallback(async () => {
    const title = newCampaignName.trim()
    if (!title || isCreatingRef.current) {
      return
    }

    isCreatingRef.current = true
    setIsCreating(true)

    try {
      const id = await createNewCampaign(title)
      setNewCampaignName('')
      await openCampaign(id)
    } finally {
      isCreatingRef.current = false
      setIsCreating(false)
    }
  }, [createNewCampaign, newCampaignName, openCampaign])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void handleCreate()
    },
    [handleCreate],
  )

  const handleUploadCampaignCover = useCallback(
    async (campaignId: string, file: File) => {
      if (uploadingCampaignCoverId) {
        return
      }

      setUploadingCampaignCoverId(campaignId)

      try {
        const assetId = `campaign-asset-${crypto.randomUUID()}`
        const extension = extensionFromFileName(file.name)
        const bytes = new Uint8Array(await file.arrayBuffer())
        const relativePath = await saveCampaignAssetBytes({
          campaignId,
          assetId,
          extension,
          bytes,
        })

        await createCampaignAsset({
          id: assetId,
          campaignId,
          kind: 'campaign-cover',
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          relativePath,
        })
        await setCampaignCover(campaignId, assetId)
        await loadCampaigns()
      } finally {
        setUploadingCampaignCoverId(null)
      }
    },
    [loadCampaigns, uploadingCampaignCoverId],
  )

  if (activeCampaignId) {
    return <CampaignWorkspace onBack={closeCampaign} />
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Campaign Manager</h1>
          <p className="text-xs text-muted-foreground">Manage campaign workspaces and notes.</p>
        </div>
        <form className="flex min-w-0 items-center gap-2" onSubmit={handleSubmit}>
          <Input
            value={newCampaignName}
            onChange={(event) => setNewCampaignName(event.target.value)}
            placeholder="New campaign name"
            className="w-64"
            disabled={isCreating}
          />
          <Button size="sm" type="submit" disabled={!newCampaignName.trim() || isCreating}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </form>
      </div>

      {campaigns.length === 0 && !loading ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
          No campaigns yet. Create one to start building your library.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                isUploadingCover={uploadingCampaignCoverId !== null}
                onOpen={() => void openCampaign(campaign.id)}
                onDelete={() => void deleteExistingCampaign(campaign.id)}
                onUploadCover={(campaignId, file) => {
                  void handleUploadCampaignCover(campaignId, file)
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
