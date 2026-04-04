import { useState } from 'react'

interface DiceCubeAnimationProps {
  dieLabel: string    // e.g. "d20", "d6" — shown on all faces during spin
  result: number      // rolled value — shown on front face after animation ends
  onComplete?: () => void
}

export function DiceCubeAnimation({ dieLabel, result, onComplete }: DiceCubeAnimationProps) {
  const [showResult, setShowResult] = useState(false)

  function handleAnimationEnd() {
    setShowResult(true)
    onComplete?.()
  }

  return (
    <div className="dice-cube-container">
      <div className="dice-cube" onAnimationEnd={handleAnimationEnd}>
        <div className={`dice-cube-face dice-cube-face--front${showResult ? ' dice-cube-face--result' : ''}`}>
          {showResult ? result : dieLabel}
        </div>
        <div className="dice-cube-face dice-cube-face--back">{dieLabel}</div>
        <div className="dice-cube-face dice-cube-face--right">{dieLabel}</div>
        <div className="dice-cube-face dice-cube-face--left">{dieLabel}</div>
        <div className="dice-cube-face dice-cube-face--top">{dieLabel}</div>
        <div className="dice-cube-face dice-cube-face--bottom">{dieLabel}</div>
      </div>
    </div>
  )
}
