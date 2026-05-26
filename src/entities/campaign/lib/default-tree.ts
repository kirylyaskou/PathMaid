import type { CampaignBucket, CampaignNode } from '../model/types'

interface CampaignBucketDefinition {
  bucket: CampaignBucket
  title: string
}

export const CAMPAIGN_BUCKETS: CampaignBucketDefinition[] = [
  { bucket: 'notes', title: 'Notes' },
  { bucket: 'tables', title: 'Tables' },
  { bucket: 'npcs', title: 'NPCs' },
  { bucket: 'items', title: 'Items' },
  { bucket: 'locations', title: 'Locations' },
]

export function bucketNodeId(campaignId: string, bucket: CampaignBucket): string {
  return `campaign-node-${campaignId}-${bucket}`
}

export function createBucketNodes(campaignId: string, now: string): CampaignNode[] {
  return CAMPAIGN_BUCKETS.map(({ bucket, title }, index) => ({
    id: bucketNodeId(campaignId, bucket),
    campaignId,
    parentId: null,
    kind: 'bucket',
    bucket,
    title,
    sortOrder: index,
    isSystem: true,
    createdAt: now,
    updatedAt: now,
  }))
}
