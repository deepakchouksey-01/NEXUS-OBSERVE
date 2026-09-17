import { cookies } from 'next/headers';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function serverApiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('nexus_access_token')?.value;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {}),
      ...(options.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (response.status === 401) {
    throw new Error('Authentication required.');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch API data.');
  }

  return response.json() as Promise<T>;
}