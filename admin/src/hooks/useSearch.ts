import { useState, useMemo, useCallback } from 'react';

interface UseSearchOptions<T> {
  data: T[];
  searchFields: (keyof T)[];
  debounceMs?: number;
}

export const useSearch = <T extends Record<string, any>>({
  data,
  searchFields,
  debounceMs = 300
}: UseSearchOptions<T>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // Debounce del término de búsqueda
  const updateSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);

    const timer = setTimeout(() => {
      setDebouncedTerm(term);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [debounceMs]);

  // Filtrar datos basado en el término de búsqueda
  const filteredData = useMemo(() => {
    if (!debouncedTerm.trim()) {
      return data;
    }

    const lowerTerm = debouncedTerm.toLowerCase();

    return data.filter(item => {
      return searchFields.some(field => {
        const value = item[field];

        if (value === null || value === undefined) {
          return false;
        }

        // Manejar arrays
        if (Array.isArray(value)) {
          return value.some((v: any) =>
            String(v).toLowerCase().includes(lowerTerm)
          );
        }

        // Manejar objetos
        if (typeof value === 'object') {
          return JSON.stringify(value).toLowerCase().includes(lowerTerm);
        }

        // Manejar primitivos
        return String(value).toLowerCase().includes(lowerTerm);
      });
    });
  }, [data, debouncedTerm, searchFields]);

  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedTerm('');
  };

  return {
    searchTerm,
    setSearchTerm: updateSearchTerm,
    filteredData,
    clearSearch,
    hasActiveSearch: debouncedTerm.length > 0
  };
};
