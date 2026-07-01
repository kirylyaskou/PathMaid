import type { AuthErrorCode, TypedAuthError } from '@/shared/api/cloud/auth'

type Translate = (key: string, options?: Record<string, unknown>) => string

const AUTH_ERROR_CODES: readonly AuthErrorCode[] = [
  'invalid_credentials',
  'email_not_confirmed',
  'user_already_exists',
  'invalid_email',
  'weak_password',
  'email_link_expired',
  'auth_callback_failed',
  'signup_disabled',
  'user_banned',
  'rate_limited',
  'network',
  'server',
  'not_configured',
  'unknown',
]

export interface AuthErrorToast {
  title: string
  description?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function readAuthErrorCode(code: string | undefined): AuthErrorCode | undefined {
  return AUTH_ERROR_CODES.includes(code as AuthErrorCode) ? code as AuthErrorCode : undefined
}

function authErrorFromUnknown(err: unknown): Partial<TypedAuthError> {
  if (!isRecord(err)) {
    return { message: err instanceof Error ? err.message : String(err) }
  }

  const code = readString(err.code)

  return {
    code: readAuthErrorCode(code),
    message: readString(err.message),
    providerCode: readString(err.providerCode) ?? code,
    status: readNumber(err.status),
  }
}

function cleanBackendMessage(message: string | undefined): string | undefined {
  if (!message) return undefined
  const compact = message.replace(/\s+/g, ' ').trim()
  return compact.length > 220 ? `${compact.slice(0, 217)}...` : compact
}

export function getAuthErrorToast(err: unknown, t: Translate): AuthErrorToast {
  const authError = authErrorFromUnknown(err)
  const code = authError.code ?? 'unknown'
  const title = t(`auth.errors.${code}`, { defaultValue: t('auth.errors.unknown') })
  const detail = t(`auth.errorDetails.${code}`, { defaultValue: '' })
  const backendMessage = cleanBackendMessage(authError.message)
  const meta = [
    authError.providerCode && authError.providerCode !== code ? authError.providerCode : undefined,
    authError.status ? `HTTP ${authError.status}` : undefined,
  ].filter(Boolean).join(', ')
  const backend = backendMessage
    ? t('auth.errorDetails.backend', {
      message: backendMessage,
      meta: meta ? ` (${meta})` : '',
    })
    : ''
  const description = [detail, backend].filter(Boolean).join('\n')

  return {
    title,
    ...(description ? { description } : {}),
  }
}
