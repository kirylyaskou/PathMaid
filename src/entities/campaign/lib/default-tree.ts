import type { CampaignBucket, CampaignNode } from '../model/types'

interface CampaignBucketDefinition {
  bucket: CampaignBucket
  title: string
  sortOrder: number
}

export const CAMPAIGN_BUCKETS: CampaignBucketDefinition[] = [
  { bucket: 'notes', title: 'Notes', sortOrder: 0 },
  { bucket: 'tables', title: 'Tables', sortOrder: 1 },
  { bucket: 'npcs', title: 'NPCs', sortOrder: 2 },
  { bucket: 'items', title: 'Items', sortOrder: 3 },
  { bucket: 'locations', title: 'Locations', sortOrder: 4 },
]

export function bucketNodeId(campaignId: string, bucket: CampaignBucket): string {
  return `campaign-node-${campaignId}-${bucket}`
}

export function createBucketNodes(campaignId: string, now: string): CampaignNode[] {
  return CAMPAIGN_BUCKETS.map(({ bucket, title, sortOrder }) => ({
    id: bucketNodeId(campaignId, bucket),
    campaignId,
    parentId: null,
    kind: 'bucket',
    bucket,
    title,
    sortOrder,
    isSystem: true,
    createdAt: now,
    updatedAt: now,
  }))
}
