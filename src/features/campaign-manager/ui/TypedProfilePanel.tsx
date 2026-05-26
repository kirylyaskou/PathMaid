import type { CampaignDocument, CampaignNode } from '@/entities/campaign'

interface TypedProfilePanelProps {
  node: CampaignNode
  document: CampaignDocument
}

export function TypedProfilePanel({ node, document }: TypedProfilePanelProps) {
  if (node.kind !== 'npc' && node.kind !== 'item' && node.kind !== 'location') {
    return null
  }

  return (
    <aside className="w-64 shrink-0 border-l border-border/50 p-4">
      <h2 className="text-sm font-semibold">Profile</h2>
      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
        <p className="capitalize">Kind: {node.kind}</p>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">
          {document.profileJson}
        </pre>
      </div>
    </aside>
  )
}
