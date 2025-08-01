'use client';

import { UserProvider } from '@auth0/nextjs-auth0/client';
import { ReactNode } from 'react';

interface Auth0ProviderProps {
  children: ReactNode;
}

export default function Auth0Provider({ children }: Auth0ProviderProps) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  );
}