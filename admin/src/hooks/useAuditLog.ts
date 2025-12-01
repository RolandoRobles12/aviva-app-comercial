import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT';
export type AuditModule =
  | 'USERS'
  | 'METAS'
  | 'LIGAS'
  | 'GIROS'
  | 'KIOSCOS'
  | 'BONOS'
  | 'HUBSPOT'
  | 'CONFIG'
  | 'ADMINS'
  | 'UBICACIONES'
  | 'ALERTAS';

interface AuditLogEntry {
  module: AuditModule;
  action: AuditAction;
  entityId?: string;
  entityName?: string;
  changes?: Record<string, any>;
  details?: string;
  metadata?: Record<string, any>;
}

export const useAuditLog = () => {
  const { userData } = useAuth();

  const logAction = async ({
    module,
    action,
    entityId,
    entityName,
    changes,
    details,
    metadata
  }: AuditLogEntry) => {
    try {
      if (!userData) {
        console.warn('No se puede registrar auditoría: usuario no autenticado');
        return;
      }

      const auditEntry = {
        module,
        action,
        entityId,
        entityName,
        changes,
        details,
        metadata,
        userId: userData.uid,
        userEmail: userData.email,
        userName: userData.displayName,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString() // Backup en caso de que serverTimestamp falle
      };

      await addDoc(collection(db, 'auditLogs'), auditEntry);
    } catch (error) {
      console.error('Error al registrar auditoría:', error);
      // No lanzamos el error para no interrumpir la operación principal
    }
  };

  const logCreate = (module: AuditModule, entityName: string, entityId: string, data: any) => {
    return logAction({
      module,
      action: 'CREATE',
      entityId,
      entityName,
      details: `Creado: ${entityName}`,
      metadata: { data }
    });
  };

  const logUpdate = (module: AuditModule, entityName: string, entityId: string, changes: Record<string, any>) => {
    return logAction({
      module,
      action: 'UPDATE',
      entityId,
      entityName,
      changes,
      details: `Actualizado: ${entityName}`
    });
  };

  const logDelete = (module: AuditModule, entityName: string, entityId: string) => {
    return logAction({
      module,
      action: 'DELETE',
      entityId,
      entityName,
      details: `Eliminado: ${entityName}`
    });
  };

  const logExport = (module: AuditModule, details: string, metadata?: Record<string, any>) => {
    return logAction({
      module,
      action: 'EXPORT',
      details,
      metadata
    });
  };

  return {
    logAction,
    logCreate,
    logUpdate,
    logDelete,
    logExport
  };
};
