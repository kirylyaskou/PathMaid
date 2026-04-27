import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import type { Dispatch } from 'react'
import type { BuilderState, BuilderAction } from '../model/builderReducer'
import { ConceptTab } from './tabs/ConceptTab'
import { AbilityModsTab } from './tabs/AbilityModsTab'
import { DefenseTab } from './tabs/DefenseTab'
import { PerceptionSkillsTab } from './tabs/PerceptionSkillsTab'
import { SpeedsSensesTab } from './tabs/SpeedsSensesTab'
import { StrikesTab } from './tabs/StrikesTab'
import { SpellcastingTab } from './tabs/SpellcastingTab'
import { AbilitiesTab } from './tabs/AbilitiesTab'
import { IwrTab } from './tabs/IwrTab'
import { AurasRitualsTab } from './tabs/AurasRitualsTab'

export interface BuilderTabsProps {
  state: BuilderState
  dispatch: Dispatch<BuilderAction>
}

// Tab ids are stable kebab-case strings used as Radix Tabs values.
export type BuilderTabId =
  | 'concept'
  | 'ability-mods'
  | 'defense'
  | 'perception-skills'
  | 'speeds-senses'
  | 'strikes'
  | 'spellcasting'
  | 'abilities'
  | 'iwr'
  | 'auras-rituals'

export function BuilderTabs({ state, dispatch }: BuilderTabsProps) {
  const { t } = useTranslation('common')

  // Labels are i18n-reactive so they must live in useMemo, not module scope.
  const TAB_DEFS = useMemo(
    () => [
      { id: 'concept' as BuilderTabId, label: t('customCreatureBuilder.tabs.concept') },
      { id: 'ability-mods' as BuilderTabId, label: t('customCreatureBuilder.tabs.abilityMods') },
      { id: 'defense' as BuilderTabId, label: t('customCreatureBuilder.tabs.defense') },
      { id: 'perception-skills' as BuilderTabId, label: t('customCreatureBuilder.tabs.perceptionSkills') },
      { id: 'speeds-senses' as BuilderTabId, label: t('customCreatureBuilder.tabs.speedsSenses') },
      { id: 'strikes' as BuilderTabId, label: t('customCreatureBuilder.tabs.strikes') },
      { id: 'spellcasting' as BuilderTabId, label: t('customCreatureBuilder.tabs.spellcasting') },
      { id: 'abilities' as BuilderTabId, label: t('customCreatureBuilder.tabs.abilities') },
      { id: 'iwr' as BuilderTabId, label: t('customCreatureBuilder.tabs.iwr') },
      { id: 'auras-rituals' as BuilderTabId, label: t('customCreatureBuilder.tabs.aurasRituals') },
    ],
    [t],
  )

  return (
    <Tabs defaultValue="concept" className="flex-1 flex flex-col">
      <TabsList className="flex-wrap h-auto gap-1 px-2 py-2 bg-muted/30">
        {TAB_DEFS.map((t) => (
          <TabsTrigger
            key={t.id}
            value={t.id}
            className="text-xs data-[state=active]:text-primary"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="concept" className="flex-1 overflow-y-auto">
        <ConceptTab state={state} dispatch={dispatch} />
      </TabsContent>
      <TabsContent value="ability-mods" className="flex-1 overflow-y-auto">
        <AbilityModsTab state={state} dispatch={dispatch} />
      </TabsContent>
      <TabsContent value="defense" className="flex-1 overflow-y-auto">
        <DefenseTab state={state} dispatch={dispatch} />
      </TabsContent>
      <TabsContent value="perception-skills" className="flex-1 overflow-y-auto">
        <PerceptionSkillsTab state={state} dispatch={dispatch} />
      </TabsContent>
      <TabsContent value="speeds-senses" className="flex-1 overflow-y-auto">
        <SpeedsSensesTab state={state} dispatch={dispatch} />
      </TabsContent>
      <TabsContent value="strikes" className="flex-1 overflow-y-auto">
        <StrikesTab state={state} dispatch={dispatch} />
      </TabsContent>
      <TabsContent value="spellcasting" className="flex-1 overflow-y-auto">
        <SpellcastingTab state={state} dispatch={dispatch} />
      </TabsContent>
      <TabsContent value="abilities" className="flex-1 overflow-y-auto">
        <AbilitiesTab state={state} dispatch={dispatch} />
      </TabsContent>
      <TabsContent value="iwr" className="flex-1 overflow-y-auto">
        <IwrTab state={state} dispatch={dispatch} />
      </TabsContent>
      <TabsContent value="auras-rituals" className="flex-1 overflow-y-auto">
        <AurasRitualsTab state={state} dispatch={dispatch} />
      </TabsContent>
    </Tabs>
  )
}
