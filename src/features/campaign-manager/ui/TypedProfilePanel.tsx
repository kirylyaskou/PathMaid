import { ChevronLeft, ChevronRight, ClipboardCopy, ImagePlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import type { CampaignAsset, CampaignDocument, CampaignNode } from '@/entities/campaign'
import {
  addCampaignNodeArtwork,
  createCampaignAsset,
  getCampaignAsset,
  listCampaignNodeArtworkAssets,
  readCampaignAssetBytes,
  saveCampaignAssetBytes,
  setCampaignDocumentCover,
  recordError,
} from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { useCampaignManagerStore } from '../model/store'
import { CampaignAssetImage } from './CampaignAssetImage'

function extensionFromFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex >= 0 && dotIndex < fileName.length - 1
    ? fileName.slice(dotIndex + 1)
    : 'bin'
}

function uniqueAssets(assets: CampaignAsset[]): CampaignAsset[] {
  const seen = new Set<string>()
  return assets.filter((asset) => {
    if (seen.has(asset.id)) {
      return false
    }

    seen.add(asset.id)
    return true
  })
}

async function clipboardBlobFromImage(asset: CampaignAsset, bytes: Uint8Array): Promise<Blob> {
  const sourceBlob = new Blob([bytes], { type: asset.mimeType || 'application/octet-stream' })
  if (sourceBlob.type === 'image/png') {
    return sourceBlob
  }

  const url = URL.createObjectURL(sourceBlob)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Failed to decode campaign artwork'))
      image.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Failed to create image canvas')
    }

    context.drawImage(image, 0, 0)
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to encode campaign artwork'))
      }, 'image/png')
    })
    return pngBlob
  } finally {
    URL.revokeObjectURL(url)
  }
}

interface TypedProfilePanelProps {
  node: CampaignNode
  document: CampaignDocument
}

export function TypedProfilePanel({ node, document }: TypedProfilePanelProps) {
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [isCopyingArtwork, setIsCopyingArtwork] = useState(false)
  const [artworks, setArtworks] = useState<CampaignAsset[]>([])
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const patchDocumentCover = useCampaignManagerStore((state) => state.patchDocumentCover)
  const activeArtwork = useMemo(
    () =>
      (document.coverAssetId
        ? artworks.find((asset) => asset.id === document.coverAssetId)
        : null) ??
      artworks[0] ??
      null,
    [artworks, document.coverAssetId],
  )
  const activeArtworkIndex = activeArtwork
    ? artworks.findIndex((asset) => asset.id === activeArtwork.id)
    : -1

  const loadArtworkAssets = useCallback(async () => {
    const [listedArtworks, coverAsset] = await Promise.all([
      listCampaignNodeArtworkAssets(node.id),
      document.coverAssetId ? getCampaignAsset(document.coverAssetId) : Promise.resolve(null),
    ])

    return uniqueAssets([...(coverAsset ? [coverAsset] : []), ...listedArtworks])
  }, [document.coverAssetId, node.id])

  const loadArtworks = useCallback(async () => {
    setArtworks(await loadArtworkAssets())
  }, [loadArtworkAssets])

  useEffect(() => {
    let disposed = false

    void loadArtworkAssets()
      .then((nextArtworks) => {
        if (!disposed) {
          setArtworks(nextArtworks)
        }
      })
      .catch((error) => {
        if (!disposed) {
          void recordError('campaign.artworkLoad', 'Failed to load campaign artworks', error)
          toast.error('Failed to load artworks')
        }
      })

    return () => {
      disposed = true
    }
  }, [loadArtworkAssets])

  const selectArtwork = useCallback(
    async (assetId: string) => {
      if (assetId === document.coverAssetId) {
        return
      }

      await setCampaignDocumentCover(node.id, assetId)
      patchDocumentCover(node.id, assetId)
    },
    [document.coverAssetId, node.id, patchDocumentCover],
  )

  const selectArtworkByDelta = useCallback(
    (delta: number) => {
      if (artworks.length === 0 || activeArtworkIndex < 0) {
        return
      }

      const nextIndex = (activeArtworkIndex + delta + artworks.length) % artworks.length
      const nextArtwork = artworks[nextIndex]
      if (nextArtwork) {
        void selectArtwork(nextArtwork.id).catch((error: unknown) => {
          void recordError('campaign.artworkSwitch', 'Failed to switch campaign artwork', error)
          toast.error('Failed to switch artwork')
        })
      }
    },
    [activeArtworkIndex, artworks, selectArtwork],
  )

  const uploadCover = useCallback(
    async (files: File[]) => {
      if (isUploadingCover) {
        return
      }

      setIsUploadingCover(true)

      try {
        let firstAssetId: string | null = null

        for (const file of files) {
          const assetId = `campaign-asset-${crypto.randomUUID()}`
          const extension = extensionFromFileName(file.name)
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
          await addCampaignNodeArtwork(node.id, assetId)
          firstAssetId ??= assetId
        }

        if (firstAssetId && !document.coverAssetId) {
          await setCampaignDocumentCover(node.id, firstAssetId)
          patchDocumentCover(node.id, firstAssetId)
        }

        await loadArtworks()
        toast(files.length === 1 ? 'Artwork uploaded' : `${files.length} artworks uploaded`)
      } catch (error) {
        void recordError('campaign.coverUpload', 'Failed to upload campaign artwork', error)
        toast.error('Failed to upload artwork')
      } finally {
        setIsUploadingCover(false)
      }
    },
    [
      document.coverAssetId,
      isUploadingCover,
      loadArtworks,
      node.campaignId,
      node.id,
      patchDocumentCover,
    ],
  )

  const handleCoverChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? [])
      event.target.value = ''
      if (files.length === 0) {
        return
      }

      void uploadCover(files)
    },
    [uploadCover],
  )

  const handleCopyArtwork = useCallback(async () => {
    if (!activeArtwork || isCopyingArtwork) {
      return
    }

    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      toast.error('Image clipboard is not supported here')
      return
    }

    setIsCopyingArtwork(true)
    try {
      const bytes = await readCampaignAssetBytes(activeArtwork.relativePath)
      const blob = await clipboardBlobFromImage(activeArtwork, bytes)
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      toast('Artwork copied')
    } catch (error) {
      void recordError('campaign.artworkCopy', 'Failed to copy campaign artwork to clipboard', error)
      toast.error('Failed to copy artwork')
    } finally {
      setIsCopyingArtwork(false)
    }
  }, [activeArtwork, isCopyingArtwork])

  if (node.kind !== 'npc' && node.kind !== 'item' && node.kind !== 'location') {
    return null
  }

  return (
    <aside className="w-64 shrink-0 border-l border-border/50 p-4">
      <h2 className="text-sm font-semibold">Profile</h2>
      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
        <p className="capitalize">Kind: {node.kind}</p>
        <div className="space-y-2 rounded-md border border-border/50 p-3">
          {activeArtwork ? (
            <CampaignAssetImage
              assetId={activeArtwork.id}
              alt={`${node.title} artwork`}
              className="aspect-[4/3] w-full rounded-md object-cover"
            />
          ) : (
            <p className="text-xs">No artwork</p>
          )}
          {artworks.length > 1 ? (
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Previous artwork"
                onClick={() => selectArtworkByDelta(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs">
                {activeArtworkIndex + 1} / {artworks.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Next artwork"
                onClick={() => selectArtworkByDelta(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
          {artworks.length > 1 ? (
            <div className="grid grid-cols-4 gap-1">
              {artworks.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  aria-label={`Select ${asset.fileName}`}
                  className={cn(
                    'overflow-hidden rounded-sm border border-border/50',
                    activeArtwork?.id === asset.id && 'border-amber-400',
                  )}
                  onClick={() => {
                    void selectArtwork(asset.id).catch((error: unknown) => {
                      void recordError('campaign.artworkSwitch', 'Failed to switch campaign artwork', error)
                      toast.error('Failed to switch artwork')
                    })
                  }}
                >
                  <CampaignAssetImage
                    assetId={asset.id}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleCoverChange}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploadingCover}
              onClick={() => coverInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              Add art
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!activeArtwork || isCopyingArtwork}
              onClick={() => void handleCopyArtwork()}
            >
              <ClipboardCopy className="h-4 w-4" />
              Copy
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
