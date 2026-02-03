'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AuthModalContextType {
  isOpen: boolean;
  defaultTab: 'login' | 'register';
  redirectAfterAuth: string | null;
  openAuthModal: (opts?: { tab?: 'login' | 'register'; redirect?: string }) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType>({
  isOpen: false,
  defaultTab: 'login',
  redirectAfterAuth: null,
  openAuthModal: () => {},
  closeAuthModal: () => {},
});

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'login' | 'register'>('login');
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | null>(null);

  const openAuthModal = useCallback((opts?: { tab?: 'login' | 'register'; redirect?: string }) => {
    setDefaultTab(opts?.tab || 'login');
    setRedirectAfterAuth(opts?.redirect || null);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider value={{ isOpen, defaultTab, redirectAfterAuth, openAuthModal, closeAuthModal }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  return useContext(AuthModalContext);
}
