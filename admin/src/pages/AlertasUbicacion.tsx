import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
  Tab,
  Tabs,
  Tooltip
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  LocationAlert,
  AlertSeverity,
  AlertStatus
} from '../types/location';
import {
  alertTypeLabels,
  alertSeverityLabels,
  alertStatusLabels
} from '../types/location';

const AlertasUbicacion: React.FC = () => {
  const [alerts, setAlerts] = useState<LocationAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<LocationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<LocationAlert | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    filterAlerts();
  }, [alerts, tabValue]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const q = query(
        collection(db, 'locationAlerts'),
        orderBy('detectedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const alertsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LocationAlert[];

      setAlerts(alertsData);
    } catch (err: any) {
      console.error('Error fetching alerts:', err);
      setError(err.message || 'Error al cargar alertas');
    } finally {
      setLoading(false);
    }
  };

  const filterAlerts = () => {
    let filtered = alerts;

    switch (tabValue) {
      case 0: // Todas
        break;
      case 1: // Activas
        filtered = alerts.filter(a => a.status === 'ACTIVE');
        break;
      case 2: // Resueltas
        filtered = alerts.filter(a => a.status === 'RESOLVED');
        break;
      case 3: // Descartadas
        filtered = alerts.filter(a => a.status === 'DISMISSED');
        break;
    }

    setFilteredAlerts(filtered);
  };

  const handleOpenDetails = (alert: LocationAlert) => {
    setSelectedAlert(alert);
    setNotes(alert.notes || '');
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedAlert(null);
    setNotes('');
  };

  const handleResolve = async (status: 'RESOLVED' | 'DISMISSED') => {
    if (!selectedAlert) return;

    try {
      setError(null);

      await updateDoc(doc(db, 'locationAlerts', selectedAlert.id), {
        status,
        resolvedAt: Timestamp.now(),
        notes: notes || null
      });

      setSuccess(`Alerta ${status === 'RESOLVED' ? 'resuelta' : 'descartada'} exitosamente`);
      handleCloseDetails();
      fetchAlerts();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating alert:', err);
      setError(err.message || 'Error al actualizar alerta');
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'INFO':
        return <InfoIcon fontSize="small" />;
      case 'WARNING':
        return <WarningIcon fontSize="small" />;
      case 'CRITICAL':
        return <WarningIcon fontSize="small" color="error" />;
    }
  };

  const getSeverityColor = (severity: AlertSeverity): 'info' | 'warning' | 'error' => {
    switch (severity) {
      case 'INFO':
        return 'info';
      case 'WARNING':
        return 'warning';
      case 'CRITICAL':
        return 'error';
    }
  };

  const getStatusColor = (status: AlertStatus): 'error' | 'success' | 'default' => {
    switch (status) {
      case 'ACTIVE':
        return 'error';
      case 'RESOLVED':
        return 'success';
      case 'DISMISSED':
        return 'default';
    }
  };

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return '-';
    return timestamp.toDate().toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Cargando alertas...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Alertas de Ubicación
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitoreo de vendedores estáticos fuera de su ubicación asignada
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(_e, v) => setTabValue(v)}>
          <Tab label={`Todas (${alerts.length})`} />
          <Tab label={`Activas (${alerts.filter(a => a.status === 'ACTIVE').length})`} />
          <Tab label={`Resueltas (${alerts.filter(a => a.status === 'RESOLVED').length})`} />
          <Tab label={`Descartadas (${alerts.filter(a => a.status === 'DISMISSED').length})`} />
        </Tabs>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Usuario</TableCell>
              <TableCell>Kiosco</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Distancia</TableCell>
              <TableCell>Detectada</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAlerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No hay alertas para mostrar
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredAlerts.map(alert => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {alert.userName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {alert.userEmail}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {alert.kioskName ? (
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {alert.kioskName}
                        </Typography>
                        {alert.productType && (
                          <Chip label={alert.productType} size="small" sx={{ mt: 0.5 }} />
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {alert.assignedLocationName || 'No asignado'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getSeverityIcon(alert.severity)}
                      label={alertTypeLabels[alert.alertType]}
                      size="small"
                      color={getSeverityColor(alert.severity)}
                    />
                  </TableCell>
                  <TableCell>
                    {alert.alertType === 'OUT_OF_BOUNDS' ? (
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {Math.round(alert.distanceFromAssigned)}m
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          (permitido: {Math.round(alert.allowedRadius)}m)
                        </Typography>
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(alert.detectedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={alertStatusLabels[alert.status]}
                      color={getStatusColor(alert.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleOpenDetails(alert)}
                    >
                      Ver Detalles
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de detalles */}
      <Dialog open={detailsDialogOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        <DialogTitle>Detalles de Alerta</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box sx={{ pt: 2 }}>
              <Alert severity={getSeverityColor(selectedAlert.severity)} sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  {alertTypeLabels[selectedAlert.alertType]}
                </Typography>
                <Typography variant="body2">
                  {selectedAlert.alertType === 'OUT_OF_BOUNDS' &&
                    `Vendedor detectado a ${Math.round(selectedAlert.distanceFromAssigned)}m de su ubicación asignada (permitido: ${Math.round(selectedAlert.allowedRadius)}m)`}
                  {selectedAlert.alertType === 'NO_CONFIG' &&
                    'Vendedor estático sin ubicación asignada configurada'}
                  {selectedAlert.alertType === 'GPS_DISABLED' &&
                    'GPS desactivado o sin permisos'}
                </Typography>
              </Alert>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Usuario:
                </Typography>
                <Typography variant="body2">
                  {selectedAlert.userName} ({selectedAlert.userEmail})
                </Typography>
              </Box>

              {selectedAlert.kioskName && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Kiosco Asignado:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {selectedAlert.kioskName}
                  </Typography>
                  {selectedAlert.productType && (
                    <Chip label={selectedAlert.productType} size="small" sx={{ mt: 0.5 }} />
                  )}
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Ubicación Detectada:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    Lat: {selectedAlert.detectedLocation.latitude.toFixed(6)}, Lng:{' '}
                    {selectedAlert.detectedLocation.longitude.toFixed(6)}
                  </Typography>
                  <Tooltip title="Ver en Google Maps">
                    <IconButton
                      size="small"
                      onClick={() =>
                        openInGoogleMaps(
                          selectedAlert.detectedLocation.latitude,
                          selectedAlert.detectedLocation.longitude
                        )
                      }
                    >
                      <LocationOnIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Precisión: {Math.round(selectedAlert.detectedLocationAccuracy)}m
                </Typography>
              </Box>

              {selectedAlert.assignedLocationName && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Ubicación Asignada:
                  </Typography>
                  <Typography variant="body2">{selectedAlert.assignedLocationName}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">
                      Lat: {selectedAlert.assignedLocation.latitude.toFixed(6)}, Lng:{' '}
                      {selectedAlert.assignedLocation.longitude.toFixed(6)}
                    </Typography>
                    <Tooltip title="Ver en Google Maps">
                      <IconButton
                        size="small"
                        onClick={() =>
                          openInGoogleMaps(
                            selectedAlert.assignedLocation.latitude,
                            selectedAlert.assignedLocation.longitude
                          )
                        }
                      >
                        <LocationOnIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Detectada:
                </Typography>
                <Typography variant="body2">{formatDate(selectedAlert.detectedAt)}</Typography>
              </Box>

              {selectedAlert.status !== 'ACTIVE' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {selectedAlert.status === 'RESOLVED' ? 'Resuelta:' : 'Descartada:'}
                  </Typography>
                  <Typography variant="body2">{formatDate(selectedAlert.resolvedAt)}</Typography>
                </Box>
              )}

              {selectedAlert.status === 'ACTIVE' && (
                <TextField
                  label="Notas (opcional)"
                  fullWidth
                  multiline
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Agregar notas sobre la resolución..."
                  sx={{ mt: 2 }}
                />
              )}

              {selectedAlert.notes && selectedAlert.status !== 'ACTIVE' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Notas:
                  </Typography>
                  <Typography variant="body2">{selectedAlert.notes}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Cerrar</Button>
          {selectedAlert?.status === 'ACTIVE' && (
            <>
              <Button
                onClick={() => handleResolve('DISMISSED')}
                startIcon={<CancelIcon />}
                color="inherit"
              >
                Descartar
              </Button>
              <Button
                onClick={() => handleResolve('RESOLVED')}
                startIcon={<CheckCircleIcon />}
                variant="contained"
                color="success"
              >
                Resolver
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertasUbicacion;
