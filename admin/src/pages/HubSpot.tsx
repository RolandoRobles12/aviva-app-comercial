import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Divider
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface User {
  id: string;
  displayName: string;
  email: string;
  hubspotOwnerId?: string;
  role: string;
}

interface HubSpotConfig {
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncTimestamp?: number;
  apiKeyConfigured: boolean;
}

const HubSpot: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<HubSpotConfig>({
    autoSyncEnabled: false,
    syncIntervalMinutes: 60,
    apiKeyConfigured: false
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          id: doc.id,
          displayName: data.displayName,
          email: data.email,
          hubspotOwnerId: data.hubspotOwnerId,
          role: data.role
        });
      });
      setUsers(usersData.filter(u => u.role !== 'SUPER_ADMIN' && u.role !== 'ADMIN'));

      // Fetch HubSpot config
      const configDoc = await getDoc(doc(db, 'system_config', 'hubspot'));
      if (configDoc.exists()) {
        setConfig(configDoc.data() as HubSpotConfig);
      }
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    try {
      setError('');
      await setDoc(doc(db, 'system_config', 'hubspot'), config);
      setSuccess('Configuración actualizada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al actualizar configuración');
      console.error(err);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      setError('');
      // Aquí se llamaría a la Cloud Function de sincronización
      // Por ahora solo simulamos la sincronización
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSuccess('Sincronización completada');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al sincronizar');
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const usersWithHubSpot = users.filter(u => u.hubspotOwnerId).length;
  const usersWithoutHubSpot = users.filter(u => !u.hubspotOwnerId).length;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Configuración de HubSpot</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Gestiona la integración con HubSpot CRM
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
          onClick={handleSyncAll}
          disabled={syncing}
        >
          {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Integración con HubSpot:</strong> Los Owner IDs se configuran por usuario en el módulo de Gestión de Usuarios.
        <br />
        <strong>Cloud Functions disponibles:</strong> syncVisitToHubSpot, batchSyncVisits, getHubSpotMetrics
      </Alert>

      {/* Estadísticas */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Usuarios Totales
              </Typography>
              <Typography variant="h4">
                {users.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircleIcon sx={{ color: 'success.dark' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Con HubSpot ID
                  </Typography>
                  <Typography variant="h4">
                    {usersWithHubSpot}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <ErrorIcon sx={{ color: 'warning.dark' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Sin HubSpot ID
                  </Typography>
                  <Typography variant="h4">
                    {usersWithoutHubSpot}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Cobertura
              </Typography>
              <Typography variant="h4">
                {users.length > 0 ? Math.round((usersWithHubSpot / users.length) * 100) : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Configuración Global */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <SettingsIcon />
          <Typography variant="h6">Configuración Global</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Intervalo de Sincronización (minutos)"
              type="number"
              fullWidth
              value={config.syncIntervalMinutes}
              onChange={(e) => setConfig({ ...config, syncIntervalMinutes: parseInt(e.target.value) })}
              inputProps={{ min: 5 }}
              helperText="Frecuencia con la que se sincronizan datos automáticamente"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Estado de la API Key
              </Typography>
              <Chip
                label={config.apiKeyConfigured ? 'Configurada' : 'No Configurada'}
                color={config.apiKeyConfigured ? 'success' : 'error'}
                icon={config.apiKeyConfigured ? <CheckCircleIcon /> : <ErrorIcon />}
              />
              <Typography variant="caption" display="block" mt={1} color="text.secondary">
                La API Key se configura en Firebase Functions Config
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Alert severity="warning">
              <strong>Para configurar la API Key de HubSpot:</strong>
              <br />
              <code>firebase functions:config:set hubspot.apikey="YOUR_TOKEN"</code>
              <br />
              <strong>Scopes requeridos:</strong> crm.objects.contacts.read/write, crm.objects.deals.read/write
            </Alert>
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={handleUpdateConfig}>
              Guardar Configuración
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Lista de Usuarios */}
      <Paper>
        <Box p={2}>
          <Typography variant="h6" gutterBottom>
            Estado de Usuarios
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Para configurar el HubSpot Owner ID de cada usuario, ve al módulo de Gestión de Usuarios
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>HubSpot Owner ID</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.displayName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Typography variant="caption">{user.role}</Typography>
                  </TableCell>
                  <TableCell>
                    {user.hubspotOwnerId ? (
                      <code>{user.hubspotOwnerId}</code>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No configurado
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.hubspotOwnerId ? (
                      <Chip
                        label="Configurado"
                        color="success"
                        size="small"
                        icon={<CheckCircleIcon />}
                      />
                    ) : (
                      <Chip
                        label="Pendiente"
                        color="warning"
                        size="small"
                        icon={<ErrorIcon />}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Información adicional */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Cloud Functions Disponibles
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  syncVisitToHubSpot
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sincroniza una visita individual con HubSpot, creando o actualizando el contacto y deal asociado.
                </Typography>
                <Typography variant="caption" display="block" mt={1}>
                  POST: {"{ visitId: 'xxx' }"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  batchSyncVisits
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sincroniza múltiples visitas en lote con HubSpot.
                </Typography>
                <Typography variant="caption" display="block" mt={1}>
                  POST: {"{ visitIds: ['xxx', 'yyy'] }"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  getHubSpotMetrics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Obtiene métricas consolidadas de HubSpot (deals, contactos, pipelines).
                </Typography>
                <Typography variant="caption" display="block" mt={1}>
                  POST: {"{ startDate?, endDate? }"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  getDealsMetrics / getContactsMetrics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Métricas específicas de deals o contactos por separado.
                </Typography>
                <Typography variant="caption" display="block" mt={1}>
                  POST: {"{ startDate?, endDate? }"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default HubSpot;
