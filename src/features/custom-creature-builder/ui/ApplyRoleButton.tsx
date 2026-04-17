import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Button } from '@/shared/ui/button'
import { applyRole, ROLE_PRESETS } from '@engine'
import type { AppliedRoleValues, RoleId } from '@engine'
import { ApplyRoleConfirmDialog } from './ApplyRoleConfirmDialog'

interface Props {
  level: number
  onApply: (values: AppliedRoleValues) => void
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

const ALL_ROLES = Object.keys(ROLE_PRESETS) as RoleId[]

export function ApplyRoleButton({ level, onApply }: Props) {
  const [pendingRole, setPendingRole] = useState<RoleId | null>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Apply Role
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          {ALL_ROLES.map((r) => (
            <DropdownMenuItem key={r} onClick={() => setPendingRole(r)}>
              {ROLE_LABELS[r]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {pendingRole && (
        <ApplyRoleConfirmDialog
          roleId={pendingRole}
          level={level}
          onCancel={() => setPendingRole(null)}
          onConfirm={() => {
            const values = applyRole(pendingRole, level)
            onApply(values)
            setPendingRole(null)
          }}
        />
      )}
    </>
  )
}
