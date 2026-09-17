'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      localStorage.removeItem('nexus_access_token');
      localStorage.removeItem('nexus_user');
      localStorage.removeItem('nexus_organization');

      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-white/5"
    >
      <LogOut size={16} />
      <span>Logout</span>
    </button>
  );
}