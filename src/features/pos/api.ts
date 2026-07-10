import type { ApiResponse } from './types'

export async function apiJson<T>(
  url: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(url, init)
  const data = await response.json()
  return data as ApiResponse<T>
}

export function jsonRequest(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}
