const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type ApiFetchOptions = RequestInit & {
  token?: never;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }

    throw new Error('Authentication required.');
  }

  if (!response.ok) {
    let message = 'An unexpected API error occurred.';

    try {
      const result = await response.json();

      if (
        result &&
        typeof result === 'object' &&
        'error' in result &&
        result.error &&
        typeof result.error === 'object' &&
        'message' in result.error &&
        typeof result.error.message === 'string'
      ) {
        message = result.error.message;
      }
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}