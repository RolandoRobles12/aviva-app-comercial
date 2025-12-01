import { useState } from 'react';
import {
  collection,
  query,
  limit,
  startAfter,
  getDocs,
  orderBy,
  QueryConstraint,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';

interface UsePaginationOptions {
  collectionName: string;
  pageSize?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: QueryConstraint[];
}

export const usePagination = <T extends DocumentData>({
  collectionName,
  pageSize = 50,
  orderByField = 'createdAt',
  orderDirection = 'desc',
  filters = []
}: UsePaginationOptions) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPage = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const collectionRef = collection(db, collectionName);
      const constraints: QueryConstraint[] = [
        ...filters,
        orderBy(orderByField, orderDirection),
        limit(pageSize)
      ];

      if (page > 1 && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);

      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as unknown as T));

      setData(items);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
      setCurrentPage(page);

      // Estimación del total (Firestore no provee count directo en queries)
      if (page === 1) {
        const allSnapshot = await getDocs(query(collectionRef, ...filters));
        setTotalCount(allSnapshot.size);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
      console.error('Error en paginación:', err);
    } finally {
      setLoading(false);
    }
  };

  const nextPage = () => {
    if (hasMore && !loading) {
      fetchPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1 && !loading) {
      // Firestore no soporta prev directamente, recargar desde inicio
      fetchPage(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page > 0 && page <= Math.ceil(totalCount / pageSize)) {
      fetchPage(page);
    }
  };

  const refresh = () => {
    fetchPage(currentPage);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    hasMore,
    nextPage,
    prevPage,
    goToPage,
    refresh,
    fetchPage
  };
};
