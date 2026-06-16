function safeStorageSegment(value: string): string {
  const safe = value.trim().replace(/[\\/]+/g, '_')
  return safe.length > 0 ? safe : 'unnamed'
}

export function campaignAssetFolderPath(userId: string, assetId: string): string {
  return `${safeStorageSegment(userId)}/${safeStorageSegment(assetId)}`
}

export function campaignAssetObjectName(fileName: string): string {
  return safeStorageSegment(fileName)
}

export function campaignAssetObjectPath(
  userId: string,
  assetId: string,
  fileName: string,
): string {
  return `${campaignAssetFolderPath(userId, assetId)}/${campaignAssetObjectName(fileName)}`
}

export function assetExtensionFromRelativePath(relativePath: string): string {
  const fileName = relativePath.replace(/\\/g, '/').split('/').pop() ?? ''
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex < 0 || dotIndex === fileName.length - 1) return 'bin'
  return safeStorageSegment(fileName.slice(dotIndex + 1)).toLowerCase()
}
