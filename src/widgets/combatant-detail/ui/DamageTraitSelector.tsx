import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { DAMAGE_GROUPS, MATERIAL_GROUP } from '@/shared/lib/damage-colors'
import type { DamageType } from '@engine'

interface DamageEntry {
  damageType: DamageType
  amount: number
}

interface DamageTraitSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  damageEntries: DamageEntry[]
  materials: string[]
  onToggleDamageType: (trait: DamageType) => void
  onToggleMaterial: (trait: string) => void
  onClearAll: () => void
}

export function DamageTraitSelector({
  open,
  onOpenChange,
  damageEntries,
  materials,
  onToggleDamageType,
  onToggleMaterial,
  onClearAll,
}: DamageTraitSelectorProps) {
  const { t } = useTranslation('common')

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center justify-between">
            <span>{t('combatantDetail.addDamageTraits')}</span>
            {(damageEntries.length > 0 || materials.length > 0) && (
              <button
                onClick={onClearAll}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 font-normal"
              >
                <X className="w-3 h-3" />
                {t('combatantDetail.clearAll')}
              </button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          {DAMAGE_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.traits.map((trait) => {
                  const active = damageEntries.some((e) => e.damageType === trait)
                  return (
                    <button
                      key={trait}
                      data-selected={active}
                      onClick={() => onToggleDamageType(trait)}
                      className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${group.color}`}
                    >
                      {trait}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="border-t border-border/30 pt-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {MATERIAL_GROUP.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MATERIAL_GROUP.traits.map((trait) => {
                const active = materials.includes(trait)
                return (
                  <button
                    key={trait}
                    data-selected={active}
                    onClick={() => onToggleMaterial(trait)}
                    className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${MATERIAL_GROUP.color}`}
                  >
                    {trait}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
