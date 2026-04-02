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

function D20Die() {
  return (
    <div className="d20">
      <div className="die">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i + 1} className="face">
            <span>{i + 1}</span>
          </div>
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
        setMsgIndex((i) => {
          let next = Math.floor(Math.random() * (LOADING_MESSAGES.length - 1))
          if (next >= i) next++
          return next
        })
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
            <D20Die />
            <p
              className="text-sm text-muted-foreground text-center max-w-xs transition-opacity duration-400"
              style={{ opacity: msgVisible ? 1 : 0 }}
              aria-live="polite"
            >
              {LOADING_MESSAGES[msgIndex]}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
