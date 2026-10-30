// Cliente HTTP da API. O endereço vem de VITE_API_URL (arquivo .env na raiz do projeto).

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Params = Record<string, string | number | null | undefined>

export function buildUrl(path: string, params: Params = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return `${BASE_URL}/api${path}${query ? `?${query}` : ''}`
}

export async function apiGet<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> {
  const response = await fetch(buildUrl(path, params), { signal })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, body?.detail ?? 'Não foi possível carregar os dados.')
  }
  return response.json() as Promise<T>
}
