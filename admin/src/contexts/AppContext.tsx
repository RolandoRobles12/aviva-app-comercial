import React, { createContext, useContext, useState, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import type { ToastSeverity } from '../hooks/useToast';

interface AppContextType {
  // Toast management
  showToast: (message: string, severity?: ToastSeverity, duration?: number) => string;
  toasts: Array<{ id: string; message: string; severity: ToastSeverity; duration?: number }>;
  removeToast: (id: string) => void;

  // Global loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Cache management
  cache: Map<string, { data: any; timestamp: number }>;
  getCachedData: (key: string, maxAge?: number) => any | null;
  setCachedData: (key: string, data: any) => void;
  clearCache: (key?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, showToast, removeToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [cache] = useState(new Map<string, { data: any; timestamp: number }>());

  const getCachedData = useCallback((key: string, maxAge: number = 5 * 60 * 1000) => {
    const cached = cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > maxAge) {
      cache.delete(key);
      return null;
    }

    return cached.data;
  }, [cache]);

  const setCachedData = useCallback((key: string, data: any) => {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }, [cache]);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      cache.delete(key);
    } else {
      cache.clear();
    }
  }, [cache]);

  const value: AppContextType = {
    showToast,
    toasts,
    removeToast,
    isLoading,
    setIsLoading,
    cache,
    getCachedData,
    setCachedData,
    clearCache
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
