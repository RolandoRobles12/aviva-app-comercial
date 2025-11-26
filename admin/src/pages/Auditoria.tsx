import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Pagination
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT'
}

enum AuditModule {
  USERS = 'USERS',
  METAS = 'METAS',
  LIGAS = 'LIGAS',
  GIROS = 'GIROS',
  BONOS = 'BONOS',
  HUBSPOT = 'HUBSPOT',
  CONFIG = 'CONFIG'
}

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
  timestamp: Timestamp;
  ipAddress?: string;
}

const actionLabels: Record<AuditAction, string> = {
  [AuditAction.CREATE]: 'Creación',
  [AuditAction.UPDATE]: 'Actualización',
  [AuditAction.DELETE]: 'Eliminación',
  [AuditAction.LOGIN]: 'Inicio de sesión',
  [AuditAction.LOGOUT]: 'Cierre de sesión'
};

const actionColors: Record<AuditAction, "success" | "info" | "error" | "default" | "primary"> = {
  [AuditAction.CREATE]: 'success',
  [AuditAction.UPDATE]: 'info',
  [AuditAction.DELETE]: 'error',
  [AuditAction.LOGIN]: 'primary',
  [AuditAction.LOGOUT]: 'default'
};

const actionIcons: Record<AuditAction, React.ReactElement> = {
  [AuditAction.CREATE]: <AddIcon fontSize="small" />,
  [AuditAction.UPDATE]: <EditIcon fontSize="small" />,
  [AuditAction.DELETE]: <DeleteIcon fontSize="small" />,
  [AuditAction.LOGIN]: <PersonIcon fontSize="small" />,
  [AuditAction.LOGOUT]: <PersonIcon fontSize="small" />
};

const moduleLabels: Record<AuditModule, string> = {
  [AuditModule.USERS]: 'Usuarios',
  [AuditModule.METAS]: 'Metas',
  [AuditModule.LIGAS]: 'Ligas',
  [AuditModule.GIROS]: 'Giros',
  [AuditModule.BONOS]: 'Bonos',
  [AuditModule.HUBSPOT]: 'HubSpot',
  [AuditModule.CONFIG]: 'Configuración'
};

const Auditoria: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const logsPerPage = 20;

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filterModule, filterAction, searchTerm]);

  const fetchLogs = async () => {
    try {
      // En producción, estos logs vendrían de una colección específica 'audit_logs'
      // Por ahora, creamos datos de ejemplo
      const sampleLogs: AuditLog[] = [
        {
          id: '1',
          module: AuditModule.USERS,
          action: AuditAction.CREATE,
          userId: 'admin1',
          userName: 'Admin Usuario',
          userEmail: 'admin@avivacredito.com',
          entityId: 'user123',
          entityName: 'Juan Pérez',
          timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 30)), // 30 min ago
          ipAddress: '192.168.1.100'
        },
        {
          id: '2',
          module: AuditModule.METAS,
          action: AuditAction.UPDATE,
          userId: 'admin1',
          userName: 'Admin Usuario',
          userEmail: 'admin@avivacredito.com',
          entityId: 'meta456',
          entityName: 'Meta Semanal Julio',
          changes: { llamadasObjetivo: { from: 50, to: 60 } },
          timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 2)), // 2 hours ago
          ipAddress: '192.168.1.100'
        },
        {
          id: '3',
          module: AuditModule.LIGAS,
          action: AuditAction.CREATE,
          userId: 'admin2',
          userName: 'Otro Admin',
          userEmail: 'admin2@avivacredito.com',
          entityId: 'liga789',
          entityName: 'Liga Oro - Temporada 5',
          timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 5)), // 5 hours ago
          ipAddress: '192.168.1.101'
        },
        {
          id: '4',
          module: AuditModule.HUBSPOT,
          action: AuditAction.UPDATE,
          userId: 'admin1',
          userName: 'Admin Usuario',
          userEmail: 'admin@avivacredito.com',
          entityId: 'user123',
          entityName: 'Juan Pérez',
          changes: { hubspotOwnerId: { from: null, to: '12345678' } },
          timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24)), // 1 day ago
          ipAddress: '192.168.1.100'
        },
        {
          id: '5',
          module: AuditModule.GIROS,
          action: AuditAction.DELETE,
          userId: 'admin1',
          userName: 'Admin Usuario',
          userEmail: 'admin@avivacredito.com',
          entityId: 'giro999',
          entityName: 'Giro Test',
          timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 48)), // 2 days ago
          ipAddress: '192.168.1.100'
        }
      ];

      setLogs(sampleLogs);
      setFilteredLogs(sampleLogs);
    } catch (err) {
      console.error('Error al cargar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (filterModule !== 'ALL') {
      filtered = filtered.filter(log => log.module === filterModule);
    }

    if (filterAction !== 'ALL') {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.userName.toLowerCase().includes(term) ||
        log.userEmail.toLowerCase().includes(term) ||
        log.entityName?.toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
    setPage(1); // Reset to first page when filters change
  };

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (timestamp: Timestamp) => {
    const now = Date.now();
    const then = timestamp.toMillis();
    const diff = now - then;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  };

  // Paginación
  const startIndex = (page - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  // Estadísticas
  const statsByAction = Object.values(AuditAction).map(action => ({
    action,
    count: logs.filter(log => log.action === action).length
  }));

  const statsByModule = Object.values(AuditModule).map(module => ({
    module,
    count: logs.filter(log => log.module === module).length
  }));

  if (loading) {
    return <Typography>Cargando...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Auditoría y Logs</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Historial de cambios en el sistema
          </Typography>
        </Box>
      </Box>

      {/* Estadísticas */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Por Acción
            </Typography>
            <Grid container spacing={1}>
              {statsByAction.map(stat => (
                <Grid item key={stat.action}>
                  <Chip
                    icon={actionIcons[stat.action]}
                    label={`${actionLabels[stat.action]}: ${stat.count}`}
                    color={actionColors[stat.action]}
                    size="small"
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Por Módulo
            </Typography>
            <Grid container spacing={1}>
              {statsByModule.filter(s => s.count > 0).map(stat => (
                <Grid item key={stat.module}>
                  <Chip
                    label={`${moduleLabels[stat.module]}: ${stat.count}`}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Buscar"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Usuario, email, entidad..."
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Módulo</InputLabel>
              <Select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                label="Módulo"
              >
                <MenuItem value="ALL">Todos</MenuItem>
                {Object.entries(moduleLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Acción</InputLabel>
              <Select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                label="Acción"
              >
                <MenuItem value="ALL">Todas</MenuItem>
                {Object.entries(actionLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de logs */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha/Hora</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Módulo</TableCell>
              <TableCell>Acción</TableCell>
              <TableCell>Entidad</TableCell>
              <TableCell>Detalles</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(log.timestamp)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getRelativeTime(log.timestamp)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {log.userName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {log.userEmail}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={moduleLabels[log.module]}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    icon={actionIcons[log.action]}
                    label={actionLabels[log.action]}
                    color={actionColors[log.action]}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {log.entityName ? (
                    <Box>
                      <Typography variant="body2">{log.entityName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {log.entityId}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      N/A
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {log.changes ? (
                    <Box>
                      {Object.entries(log.changes).map(([field, change]: [string, any]) => (
                        <Typography key={field} variant="caption" display="block">
                          <strong>{field}:</strong> {change.from ?? 'null'} → {change.to}
                        </Typography>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginación */}
      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>

      {/* Nota informativa */}
      <Paper sx={{ p: 2, mt: 3, bgcolor: 'info.light' }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Nota:</strong> En producción, estos logs se almacenarían en la colección <code>audit_logs</code> de Firestore
          y se registrarían automáticamente cada vez que se realice una operación CRUD desde el panel de administración.
          Los datos mostrados son de ejemplo.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Auditoria;
