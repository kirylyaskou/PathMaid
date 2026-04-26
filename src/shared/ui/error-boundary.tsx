import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Render the boundary fallback through useTranslation when possible.
 * Class components cannot host hooks directly, so this functional child
 * does the i18n lookup. If i18n itself failed to initialise, t() returns
 * the key path string — which is still readable as a fallback.
 */
function BoundaryFallback({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 text-center p-8">
      <p className="text-2xl font-bold text-destructive">
        {t('errors.boundary.title')}
      </p>
      <p className="text-sm text-muted-foreground font-mono max-w-lg break-all">
        {message}
      </p>
      <button
        className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={onRetry}
      >
        {t('errors.boundary.tryAgain')}
      </button>
    </div>
  )
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <BoundaryFallback
          message={this.state.error.message}
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}
