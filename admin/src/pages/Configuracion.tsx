import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  Grid,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import {
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface SystemConfig {
  // URLs críticas (actualmente hardcodeadas)
  denueApiUrl?: string;
  denueToken?: string;
  attendanceWebUrl?: string;
  aosLoginUrl?: string;
  lookerDashboardUrl?: string;
  helpUrl?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;

  // Parámetros de Búsqueda DENUE
  denueSearchRadius?: number; // en metros (actualmente inconsistente: 3000, 2000, 1500)
  denueMaxResults?: number;
  denueRequestDelay?: number; // en ms

  // Configuración de Prospección
  maxProspectosPorDia?: number;
  maxDistanciaProspecto?: number; // en metros
  tiempoMinimoEntreBusquedas?: number; // en segundos

  // Location Tracking
  locationUpdateInterval?: number; // en minutos
  locationFastestInterval?: number; // en minutos
  locationMinDisplacement?: number; // en metros
  locationTimeout?: number; // en segundos

  // Features
  enableAttendance?: boolean;
  enableMetrics?: boolean;
  enableHubSpotSync?: boolean;
  enableNotifications?: boolean;
  enableDenueSearch?: boolean;

  // Attendance
  attendanceCheckInRadius?: number;
  attendanceRequirePhoto?: boolean;
  attendanceGracePeriodMinutes?: number;

  // Imágenes
  maxImageSizeMB?: number;
  maxImageResolution?: number;
  imageCompressionQuality?: number;

  // General
  appMaintenanceMode?: boolean;
  appMinimumVersion?: string;
  forceUpdate?: boolean;
}

const Configuracion: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const docRef = doc(db, 'system_config', 'settings');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setConfig(docSnap.data() as SystemConfig);
      } else {
        // Configuración por defecto basada en valores actuales del código
        setConfig({
          // URLs actualmente hardcodeadas
          denueApiUrl: 'https://www.inegi.org.mx/app/api/denue/v1/consulta',
          attendanceWebUrl: 'https://registro-aviva.web.app/',
          aosLoginUrl: 'https://aos.cloudaviva.com/auth/azure/sign-in?returnTo=%2Fdashboard%2Fcustomer',
          lookerDashboardUrl: 'https://lookerstudio.google.com/u/0/reporting/5f4ab63e-bea9-4726-96f3-078ffd1ff9cb',
          helpUrl: 'https://ayuda.avivacredito.com',
          privacyPolicyUrl: 'https://avivacredito.com/privacidad',
          termsOfServiceUrl: 'https://avivacredito.com/terminos',

          // Parámetros DENUE (actualmente: 3000 en AvivaConfig, 2000 en ProspeccionService, 1500 en DenueService)
          denueSearchRadius: 3000,
          denueMaxResults: 50,
          denueRequestDelay: 500,

          // Prospección
          maxProspectosPorDia: 5,
          maxDistanciaProspecto: 75,
          tiempoMinimoEntreBusquedas: 8,

          // Location
          locationUpdateInterval: 15,
          locationFastestInterval: 5,
          locationMinDisplacement: 75,
          locationTimeout: 12,

          // Features
          enableAttendance: true,
          enableMetrics: true,
          enableHubSpotSync: true,
          enableNotifications: true,
          enableDenueSearch: true,

          // Attendance
          attendanceCheckInRadius: 100,
          attendanceRequirePhoto: true,
          attendanceGracePeriodMinutes: 15,

          // Imágenes
          maxImageSizeMB: 5,
          maxImageResolution: 1920,
          imageCompressionQuality: 85,

          // General
          appMaintenanceMode: false,
          appMinimumVersion: '1.0.0',
          forceUpdate: false
        });
      }
    } catch (err) {
      setError('Error al cargar la configuración');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof SystemConfig, value: any) => {
    setConfig({ ...config, [field]: value });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const docRef = doc(db, 'system_config', 'settings');
      await setDoc(docRef, {
        ...config,
        lastUpdated: new Date()
      });

      setSuccess('Configuración guardada exitosamente');
    } catch (err) {
      setError('Error al guardar la configuración');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Typography>Cargando...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Configuración del Sistema</Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          Guardar Cambios
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* URLs */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                URLs del Sistema
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="URL de Ayuda"
                  fullWidth
                  value={config.helpUrl || ''}
                  onChange={(e) => handleChange('helpUrl', e.target.value)}
                />
                <TextField
                  label="URL de Política de Privacidad"
                  fullWidth
                  value={config.privacyPolicyUrl || ''}
                  onChange={(e) => handleChange('privacyPolicyUrl', e.target.value)}
                />
                <TextField
                  label="URL de Términos de Servicio"
                  fullWidth
                  value={config.termsOfServiceUrl || ''}
                  onChange={(e) => handleChange('termsOfServiceUrl', e.target.value)}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Features */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Funcionalidades
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableAttendance || false}
                      onChange={(e) => handleChange('enableAttendance', e.target.checked)}
                    />
                  }
                  label="Habilitar Asistencia"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableMetrics || false}
                      onChange={(e) => handleChange('enableMetrics', e.target.checked)}
                    />
                  }
                  label="Habilitar Métricas"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableHubSpotSync || false}
                      onChange={(e) => handleChange('enableHubSpotSync', e.target.checked)}
                    />
                  }
                  label="Habilitar Sincronización HubSpot"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableNotifications || false}
                      onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                    />
                  }
                  label="Habilitar Notificaciones"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Attendance Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuración de Asistencia
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Radio de validación (metros)"
                  type="number"
                  fullWidth
                  value={config.attendanceCheckInRadius || 100}
                  onChange={(e) => handleChange('attendanceCheckInRadius', parseInt(e.target.value))}
                />
                <TextField
                  label="Período de gracia (minutos)"
                  type="number"
                  fullWidth
                  value={config.attendanceGracePeriodMinutes || 15}
                  onChange={(e) => handleChange('attendanceGracePeriodMinutes', parseInt(e.target.value))}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.attendanceRequirePhoto || false}
                      onChange={(e) => handleChange('attendanceRequirePhoto', e.target.checked)}
                    />
                  }
                  label="Requerir foto en check-in"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* App Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuración de la App
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Versión mínima de la app"
                    fullWidth
                    value={config.appMinimumVersion || ''}
                    onChange={(e) => handleChange('appMinimumVersion', e.target.value)}
                    placeholder="1.0.0"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.forceUpdate || false}
                        onChange={(e) => handleChange('forceUpdate', e.target.checked)}
                      />
                    }
                    label="Forzar actualización"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.appMaintenanceMode || false}
                        onChange={(e) => handleChange('appMaintenanceMode', e.target.checked)}
                        color="warning"
                      />
                    }
                    label="Modo mantenimiento"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          Guardar Todos los Cambios
        </Button>
      </Box>
    </Box>
  );
};

export default Configuracion;
