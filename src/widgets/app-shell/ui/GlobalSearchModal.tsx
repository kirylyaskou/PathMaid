import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command'
import { getVisibleNavItems } from '@/shared/config'
import { useAdvancedSettingsStore } from '@/shared/model'
import type { GlobalSearchResult, EntityKind } from '@/shared/api'
import { useGlobalSearch } from '../model/use-global-search'

interface GlobalSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: GlobalSearchResult) => void
}

const KIND_ORDER: EntityKind[] = ['creature', 'spell', 'item', 'condition', 'hazard', 'action', 'feat']

export function GlobalSearchModal({ open, onOpenChange, onSelect }: GlobalSearchModalProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const customContentEnabled = useAdvancedSettingsStore((s) => s.customContent)

  const { results } = useGlobalSearch(query)
  const navItems = useMemo(
    () => getVisibleNavItems(customContentEnabled),
    [customContentEnabled],
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const groupedResults = useMemo(() => {
    const map = new Map<EntityKind, GlobalSearchResult[]>()
    for (const r of results) {
      const arr = map.get(r.kind) ?? []
      arr.push(r)
      map.set(r.kind, arr)
    }
    return map
  }, [results])

  const groupHeading = (kind: EntityKind): string => {
    const keyMap: Record<EntityKind, string> = {
      creature: t('commandPalette.globalSearch.groups.creatures'),
      spell: t('commandPalette.globalSearch.groups.spells'),
      item: t('commandPalette.globalSearch.groups.items'),
      condition: t('commandPalette.globalSearch.groups.conditions'),
      hazard: t('commandPalette.globalSearch.groups.hazards'),
      action: t('commandPalette.globalSearch.groups.actions'),
      feat: t('commandPalette.globalSearch.groups.feats'),
    }
    return keyMap[kind]
  }

  const runCommand = (command: () => void) => {
    onOpenChange(false)
    command()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* shouldFilter={false} is required on <Command> to prevent cmdk from synchronously
          filtering async results, which would produce empty lists */}
      <Command shouldFilter={false}>
        <CommandInput
          placeholder={t('commandPalette.globalSearch.placeholder')}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>{t('commandPalette.globalSearch.noResults')}</CommandEmpty>

          {query.trim() === '' && (
            <CommandGroup heading={t('commandPalette.pagesGroup')}>
              {navItems.map((page) => (
                <CommandItem
                  key={page.href}
                  onSelect={() => runCommand(() => navigate(page.href))}
                >
                  <page.icon className="mr-2 h-4 w-4" />
                  {t(page.labelKey as never, page.label)}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {query.trim() !== '' &&
            KIND_ORDER.map((kind) => {
              const items = groupedResults.get(kind)
              if (!items?.length) return null
              return (
                <CommandGroup key={kind} heading={groupHeading(kind)}>
                  {items.map((result) => (
                    <CommandItem
                      key={`${result.kind}:${result.id}`}
                      onSelect={() => {
                        onOpenChange(false)
                        onSelect(result)
                      }}
                    >
                      <span>{result.name}</span>
                      {result.subtitle && (
                        <span className="ml-2 text-xs text-muted-foreground">{result.subtitle}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
