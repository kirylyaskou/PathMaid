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
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let disposed = false
    let objectUrl: string | null = null

    async function loadImage() {
      setFailed(false)
      if (!assetId) {
        setImageUrl(null)
        return
      }

      try {
        const asset = await getCampaignAsset(assetId)
        if (!asset) {
          setImageUrl(null)
          setFailed(true)
          return
        }

        const bytes = await readCampaignAssetBytes(asset.relativePath)
        objectUrl = assetBytesToObjectUrl(bytes, asset.mimeType)

        if (disposed) {
          URL.revokeObjectURL(objectUrl)
          return
        }

        setImageUrl(objectUrl)
      } catch (error) {
        console.error('Campaign asset image failed to load', error)
        setImageUrl(null)
        setFailed(true)
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
    return failed ? (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-border/50 bg-muted/30 px-3 text-center text-xs text-muted-foreground">
        Image failed to load
      </div>
    ) : null
  }

  return <img src={imageUrl} alt={alt} className={className} />
}
