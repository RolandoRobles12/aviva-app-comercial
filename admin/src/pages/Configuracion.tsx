import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper,
  Chip,
  Alert
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PublicIcon from '@mui/icons-material/Public';
import SettingsIcon from '@mui/icons-material/Settings';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ImageIcon from '@mui/icons-material/Image';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import SecurityIcon from '@mui/icons-material/Security';
import {
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuditLog } from '../hooks/useAuditLog';
import { useApp } from '../contexts/AppContext';

interface SystemConfig {
  // URLs críticas
  denueApiUrl?: string;
  denueToken?: string;
  attendanceWebUrl?: string;
  aosLoginUrl?: string;
  lookerDashboardUrl?: string;
  helpUrl?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;

  // Parámetros de Búsqueda DENUE
  denueSearchRadius?: number;
  denueMaxResults?: number;
  denueRequestDelay?: number;

  // Configuración de Prospección
  maxProspectosPorDia?: number;
  maxDistanciaProspecto?: number;
  tiempoMinimoEntreBusquedas?: number;

  // Location Tracking
  locationUpdateInterval?: number;
  locationFastestInterval?: number;
  locationMinDisplacement?: number;
  locationTimeout?: number;

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

const defaultConfig: SystemConfig = {
  denueApiUrl: 'https://www.inegi.org.mx/app/api/denue/v1/consulta',
  attendanceWebUrl: 'https://registro-aviva.web.app/',
  aosLoginUrl: 'https://aos.cloudaviva.com/auth/azure/sign-in?returnTo=%2Fdashboard%2Fcustomer',
  lookerDashboardUrl: 'https://lookerstudio.google.com/u/0/reporting/5f4ab63e-bea9-4726-96f3-078ffd1ff9cb',
  helpUrl: 'https://ayuda.avivacredito.com',
  privacyPolicyUrl: 'https://avivacredito.com/privacidad',
  termsOfServiceUrl: 'https://avivacredito.com/terminos',
  denueSearchRadius: 3000,
  denueMaxResults: 50,
  denueRequestDelay: 500,
  maxProspectosPorDia: 5,
  maxDistanciaProspecto: 75,
  tiempoMinimoEntreBusquedas: 8,
  locationUpdateInterval: 15,
  locationFastestInterval: 5,
  locationMinDisplacement: 75,
  locationTimeout: 12,
  enableAttendance: true,
  enableMetrics: true,
  enableHubSpotSync: true,
  enableNotifications: true,
  enableDenueSearch: true,
  attendanceCheckInRadius: 100,
  attendanceRequirePhoto: true,
  attendanceGracePeriodMinutes: 15,
  maxImageSizeMB: 5,
  maxImageResolution: 1920,
  imageCompressionQuality: 85,
  appMaintenanceMode: false,
  appMinimumVersion: '1.0.0',
  forceUpdate: false
};

const Configuracion: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const { logUpdate } = useAuditLog();
  const { showToast } = useApp();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const docRef = doc(db, 'system_config', 'settings');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as SystemConfig;
        setConfig(data);
        setOriginalConfig(data);
      } else {
        setConfig(defaultConfig);
        setOriginalConfig(defaultConfig);
      }
    } catch (err) {
      showToast('Error al cargar la configuración', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof SystemConfig, value: any) => {
    setConfig({ ...config, [field]: value });
  };

  const hasChanges = () => {
    return JSON.stringify(config) !== JSON.stringify(originalConfig);
  };

  const getChanges = () => {
    const changes: Record<string, any> = {};
    Object.keys(config).forEach((key) => {
      const configKey = key as keyof SystemConfig;
      if (config[configKey] !== originalConfig[configKey]) {
        changes[key] = {
          old: originalConfig[configKey],
          new: config[configKey]
        };
      }
    });
    return changes;
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const changes = getChanges();
      const docRef = doc(db, 'system_config', 'settings');
      await setDoc(docRef, {
        ...config,
        lastUpdated: new Date()
      });

      await logUpdate('CONFIG', 'Configuración del Sistema', 'settings', changes);

      setOriginalConfig(config);
      showToast('Configuración guardada exitosamente', 'success');
    } catch (err) {
      showToast('Error al guardar la configuración', 'error');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Cargando configuración...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Configuración del Sistema
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona todos los parámetros de configuración de la aplicación
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving || !hasChanges()}
          size="large"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </Box>

      {hasChanges() && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Hay cambios sin guardar. Presiona "Guardar Cambios" para aplicarlos.
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<PublicIcon />} label="URLs y APIs" />
          <Tab icon={<LocationOnIcon />} label="DENUE y Prospección" />
          <Tab icon={<LocationOnIcon />} label="Tracking de Ubicación" />
          <Tab icon={<SettingsIcon />} label="Funcionalidades" />
          <Tab icon={<SecurityIcon />} label="Asistencia" />
          <Tab icon={<ImageIcon />} label="Imágenes" />
          <Tab icon={<PhoneAndroidIcon />} label="App Móvil" />
        </Tabs>
      </Paper>

      {/* Tab 0: URLs y APIs */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  URLs Principales
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configura las URLs que utiliza la aplicación móvil
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="URL de Ayuda"
                      fullWidth
                      value={config.helpUrl || ''}
                      onChange={(e) => handleChange('helpUrl', e.target.value)}
                      helperText="Enlace a la documentación de ayuda"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="URL de Política de Privacidad"
                      fullWidth
                      value={config.privacyPolicyUrl || ''}
                      onChange={(e) => handleChange('privacyPolicyUrl', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="URL de Términos de Servicio"
                      fullWidth
                      value={config.termsOfServiceUrl || ''}
                      onChange={(e) => handleChange('termsOfServiceUrl', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="URL de Asistencia Web"
                      fullWidth
                      value={config.attendanceWebUrl || ''}
                      onChange={(e) => handleChange('attendanceWebUrl', e.target.value)}
                      helperText="Página web para registro de asistencia"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="URL de Login AOS"
                      fullWidth
                      value={config.aosLoginUrl || ''}
                      onChange={(e) => handleChange('aosLoginUrl', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="URL del Dashboard Looker"
                      fullWidth
                      value={config.lookerDashboardUrl || ''}
                      onChange={(e) => handleChange('lookerDashboardUrl', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  API DENUE (INEGI)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configuración de la API del Directorio Estadístico Nacional de Unidades Económicas
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="URL de la API"
                      fullWidth
                      value={config.denueApiUrl || ''}
                      onChange={(e) => handleChange('denueApiUrl', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Token de API (si aplica)"
                      fullWidth
                      type="password"
                      value={config.denueToken || ''}
                      onChange={(e) => handleChange('denueToken', e.target.value)}
                      helperText="Dejar vacío si no se requiere token"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: DENUE y Prospección */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Parámetros de Búsqueda DENUE
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <TextField
                    label="Radio de búsqueda"
                    type="number"
                    fullWidth
                    value={config.denueSearchRadius || 3000}
                    onChange={(e) => handleChange('denueSearchRadius', parseInt(e.target.value))}
                    InputProps={{ endAdornment: 'metros' }}
                    helperText="Distancia máxima para búsqueda de negocios"
                  />
                  <TextField
                    label="Máximo de resultados"
                    type="number"
                    fullWidth
                    value={config.denueMaxResults || 50}
                    onChange={(e) => handleChange('denueMaxResults', parseInt(e.target.value))}
                    helperText="Número máximo de negocios a retornar"
                  />
                  <TextField
                    label="Delay entre requests"
                    type="number"
                    fullWidth
                    value={config.denueRequestDelay || 500}
                    onChange={(e) => handleChange('denueRequestDelay', parseInt(e.target.value))}
                    InputProps={{ endAdornment: 'ms' }}
                    helperText="Tiempo de espera entre llamadas a la API"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Límites de Prospección
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <TextField
                    label="Máximo de prospectos por día"
                    type="number"
                    fullWidth
                    value={config.maxProspectosPorDia || 5}
                    onChange={(e) => handleChange('maxProspectosPorDia', parseInt(e.target.value))}
                    helperText="Límite diario de prospectos que puede crear un usuario"
                  />
                  <TextField
                    label="Distancia máxima del prospecto"
                    type="number"
                    fullWidth
                    value={config.maxDistanciaProspecto || 75}
                    onChange={(e) => handleChange('maxDistanciaProspecto', parseInt(e.target.value))}
                    InputProps={{ endAdornment: 'metros' }}
                    helperText="Distancia máxima permitida desde la ubicación del usuario"
                  />
                  <TextField
                    label="Tiempo mínimo entre búsquedas"
                    type="number"
                    fullWidth
                    value={config.tiempoMinimoEntreBusquedas || 8}
                    onChange={(e) => handleChange('tiempoMinimoEntreBusquedas', parseInt(e.target.value))}
                    InputProps={{ endAdornment: 'segundos' }}
                    helperText="Cooldown entre búsquedas consecutivas"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Tracking de Ubicación */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuración de Tracking de Ubicación
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Controla la frecuencia y precisión del seguimiento de ubicación en tiempo real
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Intervalo de actualización"
                      type="number"
                      fullWidth
                      value={config.locationUpdateInterval || 15}
                      onChange={(e) => handleChange('locationUpdateInterval', parseInt(e.target.value))}
                      InputProps={{ endAdornment: 'minutos' }}
                      helperText="Frecuencia de actualización de ubicación"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Intervalo más rápido"
                      type="number"
                      fullWidth
                      value={config.locationFastestInterval || 5}
                      onChange={(e) => handleChange('locationFastestInterval', parseInt(e.target.value))}
                      InputProps={{ endAdornment: 'minutos' }}
                      helperText="Frecuencia máxima de actualización"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Desplazamiento mínimo"
                      type="number"
                      fullWidth
                      value={config.locationMinDisplacement || 75}
                      onChange={(e) => handleChange('locationMinDisplacement', parseInt(e.target.value))}
                      InputProps={{ endAdornment: 'metros' }}
                      helperText="Distancia mínima para activar actualización"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Timeout de ubicación"
                      type="number"
                      fullWidth
                      value={config.locationTimeout || 12}
                      onChange={(e) => handleChange('locationTimeout', parseInt(e.target.value))}
                      InputProps={{ endAdornment: 'segundos' }}
                      helperText="Tiempo máximo de espera para obtener ubicación"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Funcionalidades */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Activar/Desactivar Funcionalidades
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Control de características disponibles en la aplicación móvil
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.enableAttendance || false}
                            onChange={(e) => handleChange('enableAttendance', e.target.checked)}
                          />
                        }
                        label="Asistencia"
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        Registro de entrada y salida
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.enableMetrics || false}
                            onChange={(e) => handleChange('enableMetrics', e.target.checked)}
                          />
                        }
                        label="Métricas"
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        Visualización de estadísticas
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.enableHubSpotSync || false}
                            onChange={(e) => handleChange('enableHubSpotSync', e.target.checked)}
                          />
                        }
                        label="Sincronización HubSpot"
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        Envío de datos a HubSpot CRM
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.enableNotifications || false}
                            onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                          />
                        }
                        label="Notificaciones"
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        Push notifications
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.enableDenueSearch || false}
                            onChange={(e) => handleChange('enableDenueSearch', e.target.checked)}
                          />
                        }
                        label="Búsqueda DENUE"
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        Búsqueda de negocios en INEGI
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 4: Asistencia */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuración de Asistencia
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Parámetros para el sistema de registro de asistencia
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Radio de check-in"
                      type="number"
                      fullWidth
                      value={config.attendanceCheckInRadius || 100}
                      onChange={(e) => handleChange('attendanceCheckInRadius', parseInt(e.target.value))}
                      InputProps={{ endAdornment: 'metros' }}
                      helperText="Distancia máxima desde el kiosco para registrar asistencia"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Período de gracia"
                      type="number"
                      fullWidth
                      value={config.attendanceGracePeriodMinutes || 15}
                      onChange={(e) => handleChange('attendanceGracePeriodMinutes', parseInt(e.target.value))}
                      InputProps={{ endAdornment: 'minutos' }}
                      helperText="Tiempo adicional permitido para entrada"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.attendanceRequirePhoto || false}
                            onChange={(e) => handleChange('attendanceRequirePhoto', e.target.checked)}
                          />
                        }
                        label="Requerir foto en check-in"
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        Obligar a tomar foto al registrar entrada
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 5: Imágenes */}
      {activeTab === 5 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuración de Imágenes
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Límites y calidad de las imágenes subidas desde la app
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Tamaño máximo"
                      type="number"
                      fullWidth
                      value={config.maxImageSizeMB || 5}
                      onChange={(e) => handleChange('maxImageSizeMB', parseInt(e.target.value))}
                      InputProps={{ endAdornment: 'MB' }}
                      helperText="Tamaño máximo de archivo"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Resolución máxima"
                      type="number"
                      fullWidth
                      value={config.maxImageResolution || 1920}
                      onChange={(e) => handleChange('maxImageResolution', parseInt(e.target.value))}
                      InputProps={{ endAdornment: 'px' }}
                      helperText="Ancho máximo en píxeles"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Calidad de compresión"
                      type="number"
                      fullWidth
                      value={config.imageCompressionQuality || 85}
                      onChange={(e) => handleChange('imageCompressionQuality', parseInt(e.target.value))}
                      InputProps={{ endAdornment: '%' }}
                      helperText="0-100: mayor valor = mejor calidad"
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 6: App Móvil */}
      {activeTab === 6 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Control de Aplicación Móvil
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Gestiona versiones y estado de la aplicación Android
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Versión mínima requerida"
                      fullWidth
                      value={config.appMinimumVersion || ''}
                      onChange={(e) => handleChange('appMinimumVersion', e.target.value)}
                      placeholder="1.0.0"
                      helperText="Versión mínima que puede usar la app"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.forceUpdate || false}
                            onChange={(e) => handleChange('forceUpdate', e.target.checked)}
                          />
                        }
                        label="Forzar actualización"
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        Obligar a actualizar antes de usar la app
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, bgcolor: config.appMaintenanceMode ? 'warning.light' : 'grey.50' }}>
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
                      <Typography variant="caption" color="text.secondary" display="block">
                        Deshabilita el acceso a la app
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {config.appMaintenanceMode && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    ⚠️ MODO MANTENIMIENTO ACTIVO - Los usuarios no podrán acceder a la aplicación móvil
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Box mt={4} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {hasChanges() ? (
            <Chip label="Cambios sin guardar" color="warning" size="small" />
          ) : (
            'Configuración guardada ✓'
          )}
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving || !hasChanges()}
        >
          {saving ? 'Guardando...' : 'Guardar Todos los Cambios'}
        </Button>
      </Box>
    </Box>
  );
};

export default Configuracion;
