import { Fragment } from 'react'
import { ModifierTooltip } from '@/shared/ui/ModifierTooltip'
import type { EffectiveSpeed } from '../model/use-effective-speeds'
import type { SpeedsLoc } from '@/shared/i18n'

interface CreatureSpeedLineProps {
  speeds: EffectiveSpeed[]
  speedsLoc?: SpeedsLoc
}

export function CreatureSpeedLine({ speeds, speedsLoc }: CreatureSpeedLineProps) {
  if (speeds.length === 0) return null
  return (
    <>
      {speeds.map((s, idx) => (
        <Fragment key={s.type}>
          {idx > 0 && <span>, </span>}
          <SpeedItem speed={s} speedsLoc={speedsLoc} />
        </Fragment>
      ))}
    </>
  )
}

function SpeedItem({ speed, speedsLoc }: { speed: EffectiveSpeed; speedsLoc?: SpeedsLoc }) {
  // RU override carries the pre-formatted label (e.g. "25 футов") from the parser.
  // When absent, fall back to EN formatting. Engine numeric value drives the tooltip.
  const locText = speedsLoc?.[speed.type as keyof SpeedsLoc]
  const text = locText ?? (speed.type === 'land' ? `${speed.final} feet` : `${speed.type} ${speed.final} feet`)
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
