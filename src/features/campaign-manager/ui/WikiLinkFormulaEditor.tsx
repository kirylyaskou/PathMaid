import type { KeyboardEvent } from 'react'
import type { CampaignNode } from '@/entities/campaign'
import { Input } from '@/shared/ui/input'

interface WikiLinkFormulaEditorProps {
  value: string
  guesses: CampaignNode[]
  onChange: (value: string) => void
  onCommit: () => void
  onPick: (node: CampaignNode) => void
}

export function WikiLinkFormulaEditor({
  value,
  guesses,
  onChange,
  onCommit,
  onPick,
}: WikiLinkFormulaEditorProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    const guessedNode = guesses[0]
    if (guessedNode) {
      event.preventDefault()
      onPick(guessedNode)
      return
    }

    event.currentTarget.blur()
  }

  return (
    <div className="relative flex shrink-0 items-center gap-2 rounded-md border border-pf-gold/30 bg-pf-gold/10 px-3 py-2 text-sm shadow-sm">
      <span className="text-xs font-medium text-pf-gold">Formula</span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
        className="h-7 border-transparent bg-transparent px-1 font-mono text-xs shadow-none focus-visible:border-pf-gold/60"
        aria-label="Edit wiki link formula"
      />
      {guesses.length > 0 ? (
        <div className="absolute top-full right-3 left-16 z-20 mt-1 overflow-hidden rounded-md border border-pf-gold/30 bg-popover shadow-lg">
          {guesses.map((guess) => (
            <button
              key={guess.id}
              type="button"
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(event) => {
                event.preventDefault()
                onPick(guess)
              }}
            >
              <span className="truncate font-medium">{guess.title}</span>
              <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                {guess.kind}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
