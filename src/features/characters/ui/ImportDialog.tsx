import { useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Textarea } from '@/shared/ui/textarea'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { createCustomCreature, upsertCharacter } from '@/shared/api'
import { useTranslation } from 'react-i18next'
import { fetchPathbuilderExport, parsePathbuilderExportText } from '../lib/pathbuilder-import'
import { pathbuilderToCreatureStatBlock } from '../lib/pathbuilder-to-creature'

type ImportMode = 'character' | 'creature'
type ImportTab = 'file' | 'paste' | 'link'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (name: string) => void
}

export function ImportDialog({ open, onOpenChange, onSuccess }: ImportDialogProps) {
  const { t } = useTranslation('common')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<ImportTab>('file')
  const [mode, setMode] = useState<ImportMode>('character')
  const [pasteValue, setPasteValue] = useState('')
  const [linkValue, setLinkValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  function reset() {
    setPasteValue('')
    setLinkValue('')
    setError(null)
    setImporting(false)
    setDragOver(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  async function persistPathbuilderExport(rawInput: string) {
    const exp = parsePathbuilderExportText(rawInput)
    if (mode === 'creature') {
      const statBlock = await pathbuilderToCreatureStatBlock(exp.build)
      await createCustomCreature(statBlock, 'foundry_clone')
    } else {
      await upsertCharacter(exp.build)
    }
    reset()
    onOpenChange(false)
    onSuccess(exp.build.name)
  }

  async function importJson(rawInput: string) {
    setError(null)
    setImporting(true)
    try {
      await persistPathbuilderExport(rawInput)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Not a valid Pathbuilder export')
    } finally {
      setImporting(false)
    }
  }

  async function importLink(rawInput: string) {
    setError(null)
    setImporting(true)
    try {
      const exp = await fetchPathbuilderExport(rawInput)
      if (mode === 'creature') {
        const statBlock = await pathbuilderToCreatureStatBlock(exp.build)
        await createCustomCreature(statBlock, 'foundry_clone')
      } else {
        await upsertCharacter(exp.build)
      }
      reset()
      onOpenChange(false)
      onSuccess(exp.build.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import Pathbuilder link')
    } finally {
      setImporting(false)
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => importJson(ev.target?.result as string)
    reader.readAsText(file)
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => importJson(ev.target?.result as string)
    reader.readAsText(file)
  }

  function handleImportClick() {
    if (activeTab === 'file') {
      fileInputRef.current?.click()
    } else if (activeTab === 'paste') {
      importJson(pasteValue)
    } else {
      importLink(linkValue)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{t('importCharacter.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label>{t('importCharacter.modeLabel', { defaultValue: 'Import as' })}</Label>
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as ImportMode)}
            className="grid grid-cols-2 gap-2"
          >
            <Label className="rounded-md border border-border/60 px-3 py-2 text-xs">
              <RadioGroupItem value="character" />
              {t('importCharacter.modeCharacter', { defaultValue: 'Character' })}
            </Label>
            <Label className="rounded-md border border-border/60 px-3 py-2 text-xs">
              <RadioGroupItem value="creature" />
              {t('importCharacter.modeCreature', { defaultValue: 'Creature' })}
            </Label>
          </RadioGroup>
        </div>

        <Tabs
          defaultValue="file"
          onValueChange={(value) => {
            setActiveTab(value as ImportTab)
            setError(null)
          }}
          className="flex flex-col flex-1 overflow-y-auto min-h-0"
        >
          <TabsList className="w-full">
            <TabsTrigger value="file" className="flex-1">{t('importCharacter.tabFile')}</TabsTrigger>
            <TabsTrigger value="paste" className="flex-1">{t('importCharacter.tabPaste')}</TabsTrigger>
            <TabsTrigger value="link" className="flex-1">
              {t('importCharacter.tabLink', { defaultValue: 'Link' })}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="file" className="mt-3">
            <div
              className={`border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-border/50 hover:border-border/80'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{t('importCharacter.dropHint')}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{t('importCharacter.orClick')}</p>
            </div>
            <input
              type="file"
              accept=".json"
              className="hidden"
              ref={fileInputRef}
              onChange={onFileChange}
            />
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          </TabsContent>
          <TabsContent value="paste" className="mt-3">
            <Textarea
              placeholder={t('importCharacter.pastePlaceholder')}
              className="h-48 max-h-72 font-mono text-xs resize-none overflow-y-auto"
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
            />
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          </TabsContent>
          <TabsContent value="link" className="mt-3">
            <Input
              placeholder={t('importCharacter.linkPlaceholder', { defaultValue: '1470240' })}
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {t('importCharacter.linkHint', { defaultValue: 'Enter the Pathbuilder character id. Full json.php?id=... links are also supported.' })}
            </p>
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('common.close')}
          </Button>
          <Button onClick={handleImportClick} disabled={importing}>
            {importing && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {t('importCharacter.importButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
