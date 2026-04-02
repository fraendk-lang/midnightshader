const API_BASE_URL = 'http://localhost:4000'

type ErrorJson = { error?: string }

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const data = (await res.json()) as ErrorJson
      msg = data.error ?? msg
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }

  return (res.status === 204 ? (undefined as unknown as T) : ((await res.json()) as T))
}

