import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import type { Dispatch } from 'react'
import type { BuilderState, BuilderAction } from '../model/builderReducer'
import { ConceptTab } from './tabs/ConceptTab'
import { AbilityModsTab } from './tabs/AbilityModsTab'
import { DefenseTab } from './tabs/DefenseTab'
import { PerceptionSkillsTab } from './tabs/PerceptionSkillsTab'
import { SpeedsSensesTab } from './tabs/SpeedsSensesTab'

export interface BuilderTabsProps {
  state: BuilderState
  dispatch: Dispatch<BuilderAction>
}

// D-18: 10 tabs in this exact order. Tab values are stable kebab-case ids.
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

function Placeholder({ label }: { label: string }) {
  return (
    <div className="p-4">
      <h2 className="text-base font-semibold mb-3">{label}</h2>
      <p className="text-sm text-muted-foreground">
        Tab content pending (plans 59-06 / 59-07).
      </p>
    </div>
  )
}

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
        <Placeholder label="Strikes" />
      </TabsContent>
      <TabsContent value="spellcasting" className="flex-1 overflow-y-auto">
        <Placeholder label="Spellcasting" />
      </TabsContent>
      <TabsContent value="abilities" className="flex-1 overflow-y-auto">
        <Placeholder label="Abilities" />
      </TabsContent>
      <TabsContent value="iwr" className="flex-1 overflow-y-auto">
        <Placeholder label="IWR" />
      </TabsContent>
      <TabsContent value="auras-rituals" className="flex-1 overflow-y-auto">
        <Placeholder label="Auras & Rituals" />
      </TabsContent>
    </Tabs>
  )
}
