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

// 10 tabs in this exact order. Tab values are stable kebab-case ids.
const TAB_DEFS = [
  { id: 'concept', label: 'Concept' },
  { id: 'ability-mods', label: 'Ability Mods' },
  { id: 'defense', label: 'Defense' },
  { id: 'perception-skills', label: 'Perception & Skills' },
  { id: 'speeds-senses', label: 'Speeds & Senses' },
  { id: 'strikes', label: 'Strikes' },
  { id: 'spellcasting', label: 'Spellcasting' },
  { id: 'abilities', label: 'Abilities' },
  { id: 'iwr', label: 'IWR' },
  { id: 'auras-rituals', label: 'Auras & Rituals' },
] as const

export type BuilderTabId = typeof TAB_DEFS[number]['id']

export function BuilderTabs({ state, dispatch }: BuilderTabsProps) {
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
