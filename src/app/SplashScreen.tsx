import { useState, useEffect, useCallback } from 'react'
import { initDatabase } from '@/shared/api'
import { useEncounterBuilderStore } from '@/features/encounter-builder'
import { Button } from '@/shared/ui/button'
import { AlertCircle } from 'lucide-react'

type SplashStatus = 'init' | 'migrating' | 'ready' | 'error'

interface SplashScreenProps {
  onReady: () => void
}

const LOADING_MESSAGES = [
  "Never split the party. NEVER SPLIT THE PARTY.",
  "When the DM asks 'Are you sure?', you should always say 'No.'",
  "Be cautious and intelligent. This does not have save files.",
  "Just because you CAN do it, doesn't mean you should — but it does mean you probably will.",
  "DMs are always hungry. Bring them food and they may have mercy on your character.",
  "The DM's role is to play WITH the players, not against them. As far as you know.",
  "There are no wrong paths. Just paths your DM hasn't prepared for.",
  "Don't be afraid of a tactical retreat. Cowardice is preferable to death. Usually.",
  "No matter how much fun you're having, remember you're not the only one at the table.",
  "The dice don't hate you. They're just indifferent.",
  "Every failed roll is just an opportunity for creative problem-solving.",
  "The monster manual is a suggestion, not a limitation.",
  "If the floor is lava, the ceiling is probably also lava.",
  "Asking 'can I pet the monster?' is always a valid action.",
  "The tavern is on fire. Again.",
  "Remember: an 18 Charisma means YOU still have to do the talking.",
  "Your character sheet is a work of fiction. A beautiful, optimized fiction.",
  "The map is not the territory. The DM's notes are also not the territory.",
  "Inventory management is a skill check in real life too.",
  "Not all who wander are lost. Some of them just failed their Perception check.",
  "The dice remember your hubris.",
  "It's not a fumble, it's a dramatic complication.",
  "Every campaign ends eventually. The question is how many TPKs until then.",
  "Roll for initiative. Roll for everything. Roll to breathe if necessary.",
  "Critical failures build character. Yours and your character's.",
]

const FACE_TRANSFORMS: string[] = [
  'rotateX(90deg) translateZ(70px)',
  'rotateY(0deg) rotateX(30deg) translateZ(80px)',
  'rotateY(72deg) rotateX(30deg) translateZ(80px)',
  'rotateY(144deg) rotateX(30deg) translateZ(80px)',
  'rotateY(216deg) rotateX(30deg) translateZ(80px)',
  'rotateY(288deg) rotateX(30deg) translateZ(80px)',
  'rotateY(36deg) rotateX(-30deg) translateZ(80px)',
  'rotateY(108deg) rotateX(-30deg) translateZ(80px)',
  'rotateY(180deg) rotateX(-30deg) translateZ(80px)',
  'rotateY(252deg) rotateX(-30deg) translateZ(80px)',
  'rotateY(324deg) rotateX(-30deg) translateZ(80px)',
  'rotateX(-90deg) translateZ(70px)',
]

function D20Spinner() {
  return (
    <div style={{ perspective: '600px' }} className="w-40 h-40">
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          animation: 'spin-d20 8s infinite linear',
        }}
      >
        {FACE_TRANSFORMS.map((transform, i) => (
          <div
            key={i}
            className="absolute inset-0 w-16 h-14 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
              transform,
              background: 'oklch(0.14 0.025 50 / 0.85)',
              border: '1px solid oklch(0.75 0.18 75 / 0.5)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function SplashScreen({ onReady }: SplashScreenProps) {
  const [status, setStatus] = useState<SplashStatus>('init')
  const [error, setError] = useState<string | null>(null)
  const [fading, setFading] = useState(false)
  const [msgIndex, setMsgIndex] = useState(() =>
    Math.floor(Math.random() * LOADING_MESSAGES.length)
  )
  const [msgVisible, setMsgVisible] = useState(true)

  const initialize = useCallback(async () => {
    setStatus('init')
    setError(null)
    try {
      setStatus('migrating')
      const minDelay = new Promise((r) => setTimeout(r, 2000))
      await Promise.all([
        (async () => {
          await initDatabase()
          await useEncounterBuilderStore.getState().loadConfig()
        })(),
        minDelay,
      ])
      setStatus('ready')
      setFading(true)
      setTimeout(onReady, 150)
    } catch (err) {
      console.error('[SplashScreen] Init failed:', err)
      setStatus('error')
      setError(
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : JSON.stringify(err)
      )
    }
  }, [onReady])

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (status !== 'init' && status !== 'migrating') return
    const interval = setInterval(() => {
      setMsgVisible(false)
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length)
        setMsgVisible(true)
      }, 400)
    }, 3000)
    return () => clearInterval(interval)
  }, [status])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-150"
      style={{ opacity: fading ? 0 : 1 }}
    >
      <div className="flex flex-col items-center gap-6 p-8">
        <h1 className="text-[28px] font-semibold leading-[1.1] text-pf-gold">
          PathBuddy
        </h1>

        {status === 'error' ? (
          <div
            className="flex flex-col items-center gap-4 rounded-lg bg-card p-8"
            role="alert"
          >
            <AlertCircle className="h-6 w-6 text-destructive" />
            <h2 className="text-xl font-semibold text-foreground">
              Failed to initialize database
            </h2>
            <p className="text-base text-muted-foreground">
              {error} — restart the app or contact support.
            </p>
            <Button onClick={initialize}>Retry Initialization</Button>
          </div>
        ) : (
          <>
            <D20Spinner />
            <p
              className="text-sm text-muted-foreground text-center max-w-xs transition-opacity duration-400"
              style={{ opacity: msgVisible ? 1 : 0 }}
              aria-live="polite"
            >
              {LOADING_MESSAGES[msgIndex]}
            </p>
            <div className="w-48 h-0.5 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-pf-gold/40 animate-pulse w-full" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
