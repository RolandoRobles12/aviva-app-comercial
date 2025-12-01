import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid
} from '@mui/material';
import { collection, query, orderBy, limit as firestoreLimit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import type { AuditAction, AuditModule } from '../hooks/useAuditLog';

interface AuditLog {
  id: string;
  module: AuditModule;
  action: AuditAction;
  userId: string;
  userName: string;
  userEmail: string;
  entityId?: string;
  entityName?: string;
  changes?: Record<string, any>;
  timestamp: any;
  details?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

const actionLabels: Record<AuditAction, string> = {
  'CREATE': 'Creación',
  'UPDATE': 'Actualización',
  'DELETE': 'Eliminación',
  'LOGIN': 'Inicio de sesión',
  'LOGOUT': 'Cierre de sesión',
  'EXPORT': 'Exportación',
  'IMPORT': 'Importación'
};

const actionColors: Record<AuditAction, "success" | "info" | "error" | "default" | "primary" | "warning"> = {
  'CREATE': 'success',
  'UPDATE': 'info',
  'DELETE': 'error',
  'LOGIN': 'primary',
  'LOGOUT': 'default',
  'EXPORT': 'warning',
  'IMPORT': 'warning'
};

const moduleLabels: Record<AuditModule, string> = {
  'USERS': 'Usuarios',
  'METAS': 'Metas',
  'LIGAS': 'Ligas',
  'GIROS': 'Giros',
  'KIOSCOS': 'Kioscos',
  'BONOS': 'Bonos',
  'HUBSPOT': 'HubSpot',
  'CONFIG': 'Configuración',
  'ADMINS': 'Administradores',
  'UBICACIONES': 'Ubicaciones',
  'ALERTAS': 'Alertas'
};

const Auditoria: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const logsQuery = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        firestoreLimit(500)
      );

      const snapshot = await getDocs(logsQuery);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLog[];

      setLogs(data);
    } catch (error) {
      console.error('Error al cargar logs de auditoría:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterModule !== 'ALL' && log.module !== filterModule) {
      return false;
    }
    if (filterAction !== 'ALL' && log.action !== filterAction) {
      return false;
    }
    return true;
  });

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      label: 'Fecha',
      sortable: true,
      render: (value: any) => {
        try {
          let date: Date;
          if (value?.toDate) {
            date = value.toDate();
          } else if (typeof value === 'string') {
            date = new Date(value);
          } else {
            return 'N/A';
          }
          return date.toLocaleString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return 'N/A';
        }
      },
      width: 180
    },
    {
      key: 'module',
      label: 'Módulo',
      sortable: true,
      render: (value: AuditModule) => (
        <Chip
          label={moduleLabels[value] || value}
          size="small"
          variant="outlined"
        />
      ),
      width: 140
    },
    {
      key: 'action',
      label: 'Acción',
      sortable: true,
      render: (value: AuditAction) => (
        <Chip
          label={actionLabels[value] || value}
          color={actionColors[value] || 'default'}
          size="small"
        />
      ),
      width: 140
    },
    {
      key: 'entityName',
      label: 'Entidad',
      sortable: true,
      render: (value: string | undefined) => value || '-'
    },
    {
      key: 'userName',
      label: 'Usuario',
      sortable: true,
      render: (value: string, row: AuditLog) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {value || 'Desconocido'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.userEmail}
          </Typography>
        </Box>
      ),
      width: 200
    },
    {
      key: 'details',
      label: 'Detalles',
      sortable: false,
      render: (value: string | undefined, row: AuditLog) => {
        if (value) return value;
        if (row.changes) {
          const changesCount = Object.keys(row.changes).length;
          return `${changesCount} cambio(s)`;
        }
        return '-';
      }
    }
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Registro de Auditoría
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Historial de acciones realizadas en el sistema ({logs.length} registros)
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Filtrar por módulo</InputLabel>
            <Select
              value={filterModule}
              label="Filtrar por módulo"
              onChange={(e) => setFilterModule(e.target.value)}
            >
              <MenuItem value="ALL">Todos los módulos</MenuItem>
              {Object.entries(moduleLabels).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Filtrar por acción</InputLabel>
            <Select
              value={filterAction}
              label="Filtrar por acción"
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <MenuItem value="ALL">Todas las acciones</MenuItem>
              {Object.entries(actionLabels).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <DataTable
        data={filteredLogs}
        columns={columns}
        searchFields={['userName', 'userEmail', 'entityName', 'details']}
        exportEnabled={true}
        exportFilename={`auditoria_${new Date().toISOString().split('T')[0]}`}
        loading={loading}
      />
    </Box>
  );
};

export default Auditoria;
