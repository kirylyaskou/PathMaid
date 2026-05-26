import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Card, CardContent } from '@/shared/ui/card'
import { useCampaignManagerStore } from '../model/store'
import type { Campaign } from '@/entities/campaign'
import { CampaignWorkspace } from './CampaignWorkspace'

const DESCRIPTION_FALLBACK = 'No description yet.'

interface CampaignCardProps {
  campaign: Campaign
  onOpen: () => void
  onDelete: () => void
}

function CampaignCard({ campaign, onOpen, onDelete }: CampaignCardProps) {
  const description = campaign.description.trim() || DESCRIPTION_FALLBACK

  return (
    <Card className="relative overflow-hidden rounded-md py-0">
      <div className="h-1.5" style={{ backgroundColor: campaign.accentColor }} />
      <CardContent className="flex min-h-32 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
            <span className="block truncate text-sm font-semibold hover:text-primary hover:underline">
              {campaign.name}
            </span>
            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
              {description}
            </span>
          </button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Delete ${campaign.name}`}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="mt-auto w-fit" onClick={onOpen}>
          Open
        </Button>
      </CardContent>
    </Card>
  )
}

export function CampaignLibrary() {
  const [newCampaignName, setNewCampaignName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
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
                onOpen={() => void openCampaign(campaign.id)}
                onDelete={() => void deleteExistingCampaign(campaign.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
