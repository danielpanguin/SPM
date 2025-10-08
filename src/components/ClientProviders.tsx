'use client';

import { UserProvider } from '@/hooks/useAuth';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <UserProvider>{children}</UserProvider>;
}