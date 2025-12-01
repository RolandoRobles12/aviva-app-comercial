import { useCallback } from 'react';
import { useAuditLog } from './useAuditLog';
import type { AuditModule } from './useAuditLog';

interface ExportOptions {
  filename?: string;
  module?: AuditModule;
}

export const useExport = () => {
  const { logExport } = useAuditLog();

  const exportToCSV = useCallback(<T extends Record<string, any>>(
    data: T[],
    columns: { key: keyof T; label: string }[],
    options: ExportOptions = {}
  ) => {
    try {
      if (data.length === 0) {
        throw new Error('No hay datos para exportar');
      }

      // Crear encabezados
      const headers = columns.map(col => col.label).join(',');

      // Crear filas
      const rows = data.map(item => {
        return columns.map(col => {
          const value = item[col.key];

          // Manejar valores null/undefined
          if (value === null || value === undefined) {
            return '';
          }

          // Manejar arrays y objetos
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }

          // Escapar comillas en strings
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }

          return stringValue;
        }).join(',');
      }).join('\n');

      // Combinar encabezados y filas
      const csv = `${headers}\n${rows}`;

      // Crear y descargar archivo
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const filename = options.filename || `export_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Registrar en auditoría
      if (options.module) {
        logExport(options.module, `Exportación CSV: ${filename}`, {
          rowCount: data.length,
          columnCount: columns.length
        });
      }

      return true;
    } catch (error: any) {
      console.error('Error al exportar CSV:', error);
      throw error;
    }
  }, [logExport]);

  const exportToJSON = useCallback(<T extends Record<string, any>>(
    data: T[],
    options: ExportOptions = {}
  ) => {
    try {
      if (data.length === 0) {
        throw new Error('No hay datos para exportar');
      }

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const filename = options.filename || `export_${new Date().toISOString().split('T')[0]}.json`;
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Registrar en auditoría
      if (options.module) {
        logExport(options.module, `Exportación JSON: ${filename}`, {
          rowCount: data.length
        });
      }

      return true;
    } catch (error: any) {
      console.error('Error al exportar JSON:', error);
      throw error;
    }
  }, [logExport]);

  return {
    exportToCSV,
    exportToJSON
  };
};
