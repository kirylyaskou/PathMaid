import { useEffect, useState } from 'react'
import {
  assetBytesToObjectUrl,
  getCampaignAsset,
  readCampaignAssetBytes,
} from '@/shared/api'

interface CampaignAssetImageProps {
  assetId: string | null
  alt: string
  className?: string
}

export function CampaignAssetImage({ assetId, alt, className }: CampaignAssetImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    let objectUrl: string | null = null

    async function loadImage() {
      if (!assetId) {
        setImageUrl(null)
        return
      }

      try {
        const asset = await getCampaignAsset(assetId)
        if (!asset) {
          setImageUrl(null)
          return
        }

        const bytes = await readCampaignAssetBytes(asset.relativePath)
        objectUrl = assetBytesToObjectUrl(bytes, asset.mimeType)

        if (disposed) {
          URL.revokeObjectURL(objectUrl)
          return
        }

        setImageUrl(objectUrl)
      } catch {
        setImageUrl(null)
      }
    }

    void loadImage()

    return () => {
      disposed = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [assetId])

  if (!imageUrl) {
    return null
  }

  return <img src={imageUrl} alt={alt} className={className} />
}
