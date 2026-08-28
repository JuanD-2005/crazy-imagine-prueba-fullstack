const API_URL = import.meta.env.VITE_API_URL
const TOKEN_KEY = 'crazysupporthub_token'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | undefined>
}

interface ErrorResponseBody {
  message?: string | string[]
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(path, API_URL)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

/**
 * Wrapper delgado sobre fetch: adjunta el JWT si hay sesión, y si una
 * request que SÍ llevaba token responde 401, asume sesión expirada, limpia
 * el token y redirige a /login. Las requests sin token (login/register)
 * dejan el 401/409/etc. para que el caller lo maneje inline.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = getToken()
  const url = buildUrl(path, options.params)

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (response.status === 401 && token) {
    clearToken()
    if (window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
    throw new ApiError(401, 'Sesión expirada')
  }

  const contentType = response.headers.get('content-type')
  const data = contentType?.includes('application/json')
    ? ((await response.json()) as unknown)
    : undefined

  if (!response.ok) {
    const body = data as ErrorResponseBody | undefined
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? response.statusText)
    throw new ApiError(response.status, message, data)
  }

  return data as T
}
