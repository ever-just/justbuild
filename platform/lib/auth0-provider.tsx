'use client';

import { UserProvider } from '@auth0/nextjs-auth0/client';
import { ReactNode } from 'react';

interface Auth0ProviderProps {
  children: ReactNode;
}

export default function Auth0Provider({ children }: Auth0ProviderProps) {
  // Explicit type casting for React 19 compatibility with Auth0 UserProvider
  const ProviderComponent = UserProvider as React.ComponentType<{ children: ReactNode }>;
  return <ProviderComponent>{children}</ProviderComponent>;
}