import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronLeft, Save, Copy } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'
import { LevelBadge } from '@/shared/ui/level-badge'
import { PATHS } from '@/shared/routes'
import type { AppliedRoleValues } from '@engine'
import { ApplyRoleButton } from './ApplyRoleButton'
import { ExportJsonButton } from './ExportJsonButton'

interface Props {
  name: string
  level: number
  dirty: boolean
  saving: boolean
  creatureId: string
  onSave: () => void
  onApplyRole: (values: AppliedRoleValues) => void
  onClone: () => void
}

export function BuilderHeader({
  name,
  level,
  dirty,
  saving,
  creatureId,
  onSave,
  onApplyRole,
  onClone,
}: Props) {
  const { t } = useTranslation('common')
  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/40 bg-sidebar/30">
      <div className="flex items-center gap-3 min-w-0">
        <Button asChild variant="ghost" size="sm">
          <Link to={PATHS.CUSTOM_CREATURES}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t('customCreatureBuilder.header.backToList')}
          </Link>
        </Button>
        <LevelBadge level={level} size="sm" />
        <h1 className="text-base font-semibold truncate">
          {name || t('customCreatureBuilder.header.newCreature')}
        </h1>
        {dirty && (
          <span className="text-[10px] uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5">
            {t('customCreatureBuilder.header.unsavedChanges')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <ApplyRoleButton level={level} onApply={onApplyRole} />
        <Button variant="outline" size="sm" onClick={onClone}>
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          {t('customCreatureBuilder.header.cloneFromBestiary')}
        </Button>
        <ExportJsonButton creatureId={creatureId} disabled={saving} />
        <Button size="sm" onClick={onSave} disabled={!dirty || saving}>
          {saving ? (
            <>
              <Spinner className="w-3.5 h-3.5 mr-1.5" />
              {t('customCreatureBuilder.header.saving')}
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {t('customCreatureBuilder.header.save')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
