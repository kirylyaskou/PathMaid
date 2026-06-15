import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useMemo } from 'react'
import type { CampaignLink, CampaignNode } from '@/entities/campaign'
import { Button } from '@/shared/ui/button'
import { ScrollArea } from '@/shared/ui/scroll-area'

interface RefsRailProps {
  nodes: CampaignNode[]
  links: CampaignLink[]
  activeNodeId: string | null
  onOpen: (nodeId: string) => void
}

interface RefButtonListProps {
  refs: CampaignNode[]
  emptyText: string
  onOpen: (nodeId: string) => void
}

interface ActiveRefs {
  outboundRefs: CampaignNode[]
  inboundRefs: CampaignNode[]
}

function RefButtonList({ refs, emptyText, onOpen }: RefButtonListProps) {
  if (refs.length === 0) {
    return <div className="px-1 text-xs text-muted-foreground">{emptyText}</div>
  }

  return (
    <div className="space-y-1">
      {refs.map((node) => (
        <Button
          key={node.id}
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => onOpen(node.id)}
        >
          <span className="truncate">{node.title}</span>
        </Button>
      ))}
    </div>
  )
}

export function RefsRail({ nodes, links, activeNodeId, onOpen }: RefsRailProps) {
  const { outboundRefs, inboundRefs } = useMemo<ActiveRefs>(
    () => {
      const refs: ActiveRefs = { outboundRefs: [], inboundRefs: [] }
      if (!activeNodeId) {
        return refs
      }

      const nodeById = new Map(nodes.map((node) => [node.id, node]))
      for (const link of links) {
        if (link.sourceNodeId === activeNodeId) {
          const target = nodeById.get(link.targetNodeId)
          if (target) {
            refs.outboundRefs.push(target)
          }
        } else if (link.targetNodeId === activeNodeId) {
          const source = nodeById.get(link.sourceNodeId)
          if (source) {
            refs.inboundRefs.push(source)
          }
        }
      }

      return refs
    },
    [activeNodeId, links, nodes],
  )

  return (
    <ScrollArea className="h-full border-l border-border/50 p-3">
      <section>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          <ArrowUpRight className="h-3.5 w-3.5" />
          Links
        </div>
        <RefButtonList refs={outboundRefs} emptyText="No links from this file." onOpen={onOpen} />
      </section>
      <section className="mt-5">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          <ArrowDownLeft className="h-3.5 w-3.5" />
          Backlinks
        </div>
        <RefButtonList refs={inboundRefs} emptyText="No backlinks yet." onOpen={onOpen} />
      </section>
    </ScrollArea>
  )
}
