import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { applyRole, ROLE_PRESETS } from '@engine'
import type { RoleId } from '@engine'

interface Props {
  roleId: RoleId
  level: number
  onCancel: () => void
  onConfirm: () => void
}

const ROLE_LABELS: Record<RoleId, string> = {
  brute: 'Brute',
  soldier: 'Soldier',
  skirmisher: 'Skirmisher',
  sniper: 'Sniper',
  spellcaster: 'Spellcaster',
  skillParagon: 'Skill Paragon',
  magicalStriker: 'Magical Striker',
}

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export function ApplyRoleConfirmDialog({ roleId, level, onCancel, onConfirm }: Props) {
  const preset = ROLE_PRESETS[roleId]
  const values = applyRole(roleId, level)

  // Build a list of field→(tier, value) rows reflecting ONLY the keys the preset defines.
  const rows: { label: string; tier: string; value: string }[] = []

  const addRow = (
    label: string,
    tier: string | undefined,
    value: string | number | undefined,
  ) => {
    if (tier !== undefined && value !== undefined) {
      rows.push({ label, tier, value: String(value) })
    }
  }

  addRow('Perception', preset.perception, values.perception)
  addRow('AC', preset.ac, values.ac)
  addRow('HP', preset.hp, values.hp)
  addRow('Fort', preset.saves?.fort, values.fort)
  addRow('Ref', preset.saves?.ref, values.ref)
  addRow('Will', preset.saves?.will, values.will)
  addRow('Strike attack', preset.strikeAttackBonus, values.strikeAttackBonus)
  addRow('Strike damage', preset.strikeDamage, values.strikeDamage?.formula)
  addRow('Spell DC', preset.spellDC, values.spellDC)
  addRow('Spell attack', preset.spellAttack, values.spellAttack)
  addRow('Skill (applied to existing skills)', preset.skill, values.skill)

  const abilityRows: { label: string; tier: string; value: number }[] = []
  if (preset.abilities) {
    const abilityEntries = Object.entries(preset.abilities) as Array<[AbilityKey, string]>
    for (const [k, t] of abilityEntries) {
      const v = values.abilityMods[k]
      if (v !== undefined) {
        abilityRows.push({ label: `${k.toUpperCase()} mod`, tier: t, value: v })
      }
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(o) => {
        if (!o) onCancel()
      }}
    >
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{`Apply role "${ROLE_LABELS[roleId]}"?`}</AlertDialogTitle>
          <AlertDialogDescription>
            This will overwrite the following fields at level {level}. Other fields (traits,
            IWR, auras, free-text abilities, added skills' names) are left untouched.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-[50vh] overflow-y-auto space-y-1 pr-2">
          {abilityRows.length > 0 && (
            <div className="pt-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Ability mods
              </div>
              {abilityRows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between text-sm py-0.5"
                >
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-mono">
                    {r.tier} = {r.value >= 0 ? `+${r.value}` : r.value}
                  </span>
                </div>
              ))}
            </div>
          )}
          {rows.length > 0 && (
            <div className="pt-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Stats
              </div>
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between text-sm py-0.5"
                >
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-mono">
                    {r.tier} = {r.value}
                  </span>
                </div>
              ))}
            </div>
          )}
          {abilityRows.length === 0 && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              This role has no overrides for this level.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Apply Role</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
