import { Fragment } from 'react'
import { ModifierTooltip } from '@/shared/ui/ModifierTooltip'
import type { EffectiveSpeed } from '../model/use-effective-speeds'

interface CreatureSpeedLineProps {
  speeds: EffectiveSpeed[]
}

export function CreatureSpeedLine({ speeds }: CreatureSpeedLineProps) {
  if (speeds.length === 0) return null
  return (
    <>
      {speeds.map((s, idx) => (
        <Fragment key={s.type}>
          {idx > 0 && <span>, </span>}
          <SpeedItem speed={s} />
        </Fragment>
      ))}
    </>
  )
}

function SpeedItem({ speed }: { speed: EffectiveSpeed }) {
  const text =
    speed.type === 'land' ? `${speed.final} feet` : `${speed.type} ${speed.final} feet`
  const tone =
    speed.net < 0 ? 'text-pf-blood' : speed.net > 0 ? 'text-pf-threat-low' : ''

  if (!speed.hasTooltip) return <span>{text}</span>

  return (
    <ModifierTooltip
      modifiers={speed.modifiers}
      netModifier={speed.net}
      finalDisplay={String(speed.final)}
      inactiveModifiers={speed.inactiveModifiers}
      showInactive
    >
      <span className={tone}>{text}</span>
    </ModifierTooltip>
  )
}
