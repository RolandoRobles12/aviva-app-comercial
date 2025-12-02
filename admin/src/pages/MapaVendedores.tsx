import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Tooltip,
  Badge,
  Stack,
  alpha,
  useTheme,
  ListItemButton,
  Collapse,
  InputAdornment
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  MyLocation as MyLocationIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle,
  Warning,
  Info
} from '@mui/icons-material';
import { GoogleMap, useLoadScript, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import {
  collection,
  query,
  onSnapshot,
  where,
  Timestamp,
  GeoPoint,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';

// IMPORTANTE: libraries debe ser constante fuera del componente
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ['places', 'geometry'];

// Configuración del mapa
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_CENTER = { lat: 19.4326, lng: -99.1332 }; // Ciudad de México

// Colores con claves que coinciden con los status
const COLORS = {
  active_in_zone: '#10B981',    // Verde
  out_of_zone: '#EF4444',       // Rojo
  in_transit: '#3B82F6',        // Azul
  inactive: '#9CA3AF',          // Gris
  kiosk: '#8B5CF6',             // Morado
  radiusCircle: 'rgba(16, 185, 129, 0.15)'
};

// Tipos
interface VendorData {
  id: string;
  displayName: string;
  email: string;
  photoUrl?: string;
  currentLocation: GeoPoint;
  lastLocationUpdate: Timestamp;
  status: 'active_in_zone' | 'out_of_zone' | 'in_transit' | 'inactive';
  assignedKioskId?: string;
  assignedKioskName?: string;
  distanceFromKiosk?: number;
  allowedRadius?: number;
}

interface KioskData {
  id: string;
  name: string;
  location: GeoPoint;
  address: string;
  city: string;
  state: string;
  radiusMeters: number;
}

const createVendorIcon = (status: string): string => {
  const color = COLORS[status as keyof typeof COLORS] || COLORS.inactive;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${color}" opacity="0.3"/>
      <circle cx="16" cy="16" r="10" fill="${color}"/>
      <circle cx="16" cy="16" r="4" fill="white"/>
    </svg>
  `)}`;
};

const createKioskIcon = (): string => {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="24" height="24" rx="4" fill="${COLORS.kiosk}" opacity="0.9"/>
      <path d="M14 16 L14 28 M20 16 L20 28 M26 16 L26 28 M14 22 L26 22" stroke="white" stroke-width="2" fill="none"/>
    </svg>
  `)}`;
};

const MapaVendedores: React.FC = () => {
  const theme = useTheme();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [kiosks, setKiosks] = useState<KioskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorData | null>(null);
  const [selectedKiosk, setSelectedKiosk] = useState<KioskData | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showKiosks, setShowKiosks] = useState(true);
  const [showRadiusCircles, setShowRadiusCircles] = useState(true);
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Cargar kioscos
  useEffect(() => {
    const loadKiosks = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'kiosks'));
        const kioskData: KioskData[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Sin nombre',
            location: data.location || data.coordinates || new GeoPoint(19.4326, -99.1332),
            address: data.address || 'Sin dirección',
            city: data.city || '',
            state: data.state || '',
            radiusMeters: data.radiusMeters || data.radiusOverride || 100
          };
        });
        setKiosks(kioskData);
        console.log('✅ Kiosks loaded:', kioskData.length);
      } catch (err) {
        console.error('❌ Error loading kiosks:', err);
      }
    };
    loadKiosks();
  }, []);

  // Cargar vendedores
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'users'), where('isActive', '==', true));

    const unsubscribe = onSnapshot(q,
      async (snapshot) => {
        try {
          const vendorsList: VendorData[] = [];

          for (const doc of snapshot.docs) {
            const data = doc.data();
            if (!data.lastLocation) continue;

            // Determinar estado
            let status: VendorData['status'] = 'inactive';
            const lastUpdate = data.lastLocationUpdate?.toDate();

            if (lastUpdate && (Date.now() - lastUpdate.getTime()) <= 30 * 60 * 1000) {
              if (data.assignedKioskId) {
                const kiosk = kiosks.find(k => k.id === data.assignedKioskId);
                if (kiosk) {
                  const distance = calculateDistance(data.lastLocation, kiosk.location);
                  status = distance <= kiosk.radiusMeters ? 'active_in_zone' : 'out_of_zone';
                } else {
                  status = 'in_transit';
                }
              } else {
                status = 'in_transit';
              }
            }

            // Calcular distancia
            let distanceFromKiosk: number | undefined;
            let allowedRadius: number | undefined;
            if (data.assignedKioskId && kiosks.length > 0) {
              const kiosk = kiosks.find(k => k.id === data.assignedKioskId);
              if (kiosk) {
                distanceFromKiosk = calculateDistance(data.lastLocation, kiosk.location);
                allowedRadius = kiosk.radiusMeters;
              }
            }

            vendorsList.push({
              id: doc.id,
              displayName: data.displayName || 'Sin nombre',
              email: data.email || '',
              photoUrl: data.photoUrl || data.profileImageUrl,
              currentLocation: data.lastLocation,
              lastLocationUpdate: data.lastLocationUpdate || Timestamp.now(),
              status,
              assignedKioskId: data.assignedKioskId,
              assignedKioskName: kiosks.find(k => k.id === data.assignedKioskId)?.name,
              distanceFromKiosk,
              allowedRadius
            });
          }

          setVendors(vendorsList);
          setLoading(false);
          setError(null);
          console.log('✅ Vendors loaded:', vendorsList.length);
        } catch (err: any) {
          console.error('❌ Error processing vendors:', err);
          setError('Error al procesar vendedores');
          setLoading(false);
        }
      },
      (err) => {
        console.error('❌ Error listening:', err);
        setError('Error al escuchar actualizaciones');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [kiosks]);

  const calculateDistance = (point1: GeoPoint, point2: GeoPoint): number => {
    const R = 6371000;
    const lat1 = (point1.latitude * Math.PI) / 180;
    const lat2 = (point2.latitude * Math.PI) / 180;
    const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matches = vendor.displayName.toLowerCase().includes(search) ||
                       vendor.email.toLowerCase().includes(search) ||
                       vendor.assignedKioskName?.toLowerCase().includes(search);
        if (!matches) return false;
      }
      if (showOnlyActive && vendor.status === 'inactive') return false;
      return true;
    });
  }, [vendors, searchQuery, showOnlyActive]);

  const stats = useMemo(() => {
    const inZone = filteredVendors.filter(v => v.status === 'active_in_zone').length;
    const outZone = filteredVendors.filter(v => v.status === 'out_of_zone').length;
    const transit = filteredVendors.filter(v => v.status === 'in_transit').length;
    return { total: filteredVendors.length, inZone, outZone, transit };
  }, [filteredVendors]);

  const centerMap = useCallback(() => {
    if (!mapRef || filteredVendors.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    filteredVendors.forEach(v => bounds.extend({ lat: v.currentLocation.latitude, lng: v.currentLocation.longitude }));
    if (showKiosks) {
      kiosks.forEach(k => bounds.extend({ lat: k.location.latitude, lng: k.location.longitude }));
    }
    mapRef.fitBounds(bounds);
  }, [mapRef, filteredVendors, kiosks, showKiosks]);

  if (loadError) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>Error al cargar Google Maps</Typography>
          <Typography paragraph>{loadError.message}</Typography>
          <Typography variant="subtitle2">Verifica:</Typography>
          <ul>
            <li>Que la API Key esté configurada correctamente</li>
            <li>Que las APIs estén habilitadas en Google Cloud Console</li>
          </ul>
        </Alert>
      </Box>
    );
  }

  if (!isLoaded) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
        <Typography variant="body1" sx={{ mt: 2 }}>Cargando Google Maps...</Typography>
      </Box>
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography variant="h6" gutterBottom>⚠️ API Key no configurada</Typography>
          <Typography paragraph>
            Necesitas configurar tu API Key de Google Maps.
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Paso 1: En PowerShell ACTUAL, ejecuta:</Typography>
            <Box component="code" sx={{ display: 'block', p: 1, bgcolor: 'grey.900', color: 'white', borderRadius: 1 }}>
              $env:VITE_GOOGLE_MAPS_API_KEY = "tu_api_key"
            </Box>
          </Paper>
          <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
            <Typography variant="subtitle2" gutterBottom>Paso 2: Reinicia el servidor:</Typography>
            <Box component="code" sx={{ display: 'block', p: 1, bgcolor: 'grey.900', color: 'white', borderRadius: 1 }}>
              npm run dev
            </Box>
          </Paper>
          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Nota:</strong> El comando <code>setx</code> solo funciona para sesiones FUTURAS.
            Debes usar <code>$env:</code> en la sesión actual.
          </Alert>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{
      margin: -3,
      height: 'calc(100vh - 64px)',
      display: 'flex',
      position: 'relative',
      bgcolor: 'background.default'
    }}>
      {/* Barra superior de estadísticas */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: 16,
          left: sidebarOpen ? 376 : 16,
          right: 16,
          zIndex: 1000,
          px: 3,
          py: 2,
          transition: 'left 0.3s'
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="caption" color="text.secondary">Total</Typography>
              <Typography variant="h5" fontWeight={700}>{stats.total}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircle sx={{ color: COLORS.active_in_zone, fontSize: 20 }} />
                <Box>
                  <Typography variant="caption">En Zona</Typography>
                  <Typography variant="h6" fontWeight={600} color={COLORS.active_in_zone}>{stats.inZone}</Typography>
                </Box>
              </Stack>
            </Box>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Warning sx={{ color: COLORS.out_of_zone, fontSize: 20 }} />
                <Box>
                  <Typography variant="caption">Fuera</Typography>
                  <Typography variant="h6" fontWeight={600} color={COLORS.out_of_zone}>{stats.outZone}</Typography>
                </Box>
              </Stack>
            </Box>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Info sx={{ color: COLORS.in_transit, fontSize: 20 }} />
                <Box>
                  <Typography variant="caption">Tránsito</Typography>
                  <Typography variant="h6" fontWeight={600} color={COLORS.in_transit}>{stats.transit}</Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refrescar">
              <IconButton onClick={() => window.location.reload()} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Centrar mapa">
              <IconButton onClick={centerMap} size="small">
                <MyLocationIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={sidebarOpen ? 'Ocultar panel' : 'Mostrar panel'}>
              <IconButton onClick={() => setSidebarOpen(!sidebarOpen)} size="small">
                {sidebarOpen ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Panel lateral */}
      <Collapse orientation="horizontal" in={sidebarOpen}>
        <Paper
          elevation={2}
          sx={{
            width: 360,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRight: 1,
            borderColor: 'divider',
            overflow: 'hidden'
          }}
        >
          {/* Header sticky del panel */}
          <Box sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            bgcolor: 'background.paper',
            flexShrink: 0
          }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Vendedores ({filteredVendors.length})
              </Typography>

              <TextField
                fullWidth
                size="small"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 2 }}
              />

              <Stack spacing={1}>
                <FormControlLabel
                  control={<Switch checked={showOnlyActive} onChange={(e) => setShowOnlyActive(e.target.checked)} />}
                  label={<Typography variant="body2">Solo activos</Typography>}
                />
                <FormControlLabel
                  control={<Switch checked={showKiosks} onChange={(e) => setShowKiosks(e.target.checked)} />}
                  label={<Typography variant="body2">Mostrar kioscos</Typography>}
                />
                <FormControlLabel
                  control={<Switch checked={showRadiusCircles} onChange={(e) => setShowRadiusCircles(e.target.checked)} />}
                  label={<Typography variant="body2">Mostrar radios</Typography>}
                />
              </Stack>
            </Box>

            <Divider />
          </Box>

          {/* Lista scrollable de vendedores */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <List dense>
              {filteredVendors.map(vendor => (
                <ListItem key={vendor.id} disablePadding>
                  <ListItemButton
                    selected={selectedVendor?.id === vendor.id}
                    onClick={() => {
                      setSelectedVendor(vendor);
                      if (mapRef) {
                        mapRef.panTo({ lat: vendor.currentLocation.latitude, lng: vendor.currentLocation.longitude });
                        mapRef.setZoom(15);
                      }
                    }}
                    sx={{
                      '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          <Box sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: COLORS[vendor.status],
                            border: '2px solid white'
                          }} />
                        }
                      >
                        <Avatar src={vendor.photoUrl} sx={{ width: 40, height: 40 }}>
                          {vendor.displayName[0]?.toUpperCase()}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={vendor.displayName}
                      secondary={vendor.assignedKioskName || 'Sin kiosco'}
                      primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Paper>
      </Collapse>

      {/* Contenedor del Mapa */}
      <Box sx={{
        flex: 1,
        minWidth: 0,
        position: 'relative',
        height: '100%'
      }}>
        {loading && (
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            bgcolor: 'rgba(255,255,255,0.95)',
            p: 3,
            borderRadius: 2,
            boxShadow: 3
          }}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress />
              <Typography>Cargando datos...</Typography>
            </Stack>
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ position: 'absolute', top: 100, left: 20, right: 20, zIndex: 1000 }}>
            {error}
          </Alert>
        )}
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={MAP_CENTER}
          zoom={6}
          options={{
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true
          }}
          onLoad={setMapRef}
        >
          {/* Kioscos */}
          {showKiosks && kiosks.map(kiosk => (
            <React.Fragment key={kiosk.id}>
              <Marker
                position={{ lat: kiosk.location.latitude, lng: kiosk.location.longitude }}
                icon={{
                  url: createKioskIcon(),
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20)
                }}
                onClick={() => setSelectedKiosk(kiosk)}
              />
              {showRadiusCircles && (
                <Circle
                  center={{ lat: kiosk.location.latitude, lng: kiosk.location.longitude }}
                  radius={kiosk.radiusMeters}
                  options={{
                    fillColor: COLORS.radiusCircle,
                    fillOpacity: 0.2,
                    strokeColor: COLORS.active_in_zone,
                    strokeOpacity: 0.5,
                    strokeWeight: 2
                  }}
                />
              )}
            </React.Fragment>
          ))}

          {/* Vendedores */}
          {filteredVendors.map(vendor => (
            <Marker
              key={vendor.id}
              position={{ lat: vendor.currentLocation.latitude, lng: vendor.currentLocation.longitude }}
              icon={{
                url: createVendorIcon(vendor.status),
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 16)
              }}
              onClick={() => setSelectedVendor(vendor)}
              animation={vendor.status === 'out_of_zone' ? google.maps.Animation.BOUNCE : undefined}
            />
          ))}

          {/* Info Window Vendedor */}
          {selectedVendor && (
            <InfoWindow
              position={{ lat: selectedVendor.currentLocation.latitude, lng: selectedVendor.currentLocation.longitude }}
              onCloseClick={() => setSelectedVendor(null)}
            >
              <Box sx={{ minWidth: 200, maxWidth: 300 }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar src={selectedVendor.photoUrl} sx={{ width: 48, height: 48 }}>
                      {selectedVendor.displayName[0]?.toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>{selectedVendor.displayName}</Typography>
                      <Typography variant="caption" color="text.secondary">{selectedVendor.email}</Typography>
                    </Box>
                  </Stack>
                  <Chip
                    label={
                      selectedVendor.status === 'active_in_zone' ? 'En Zona' :
                      selectedVendor.status === 'out_of_zone' ? 'Fuera de Zona' :
                      selectedVendor.status === 'in_transit' ? 'En Tránsito' : 'Inactivo'
                    }
                    size="small"
                    sx={{ bgcolor: COLORS[selectedVendor.status], color: 'white', fontWeight: 600 }}
                  />
                  {selectedVendor.assignedKioskName && (
                    <Typography variant="body2">
                      <strong>Kiosco:</strong> {selectedVendor.assignedKioskName}
                    </Typography>
                  )}
                  {selectedVendor.distanceFromKiosk !== undefined && (
                    <Typography variant="body2">
                      <strong>Distancia:</strong> {Math.round(selectedVendor.distanceFromKiosk)}m
                      {selectedVendor.allowedRadius && ` / ${selectedVendor.allowedRadius}m`}
                    </Typography>
                  )}
                  <Typography variant="caption">
                    {selectedVendor.lastLocationUpdate.toDate().toLocaleString('es-MX')}
                  </Typography>
                </Stack>
              </Box>
            </InfoWindow>
          )}

          {/* Info Window Kiosco */}
          {selectedKiosk && (
            <InfoWindow
              position={{ lat: selectedKiosk.location.latitude, lng: selectedKiosk.location.longitude }}
              onCloseClick={() => setSelectedKiosk(null)}
            >
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="subtitle1" fontWeight={700}>{selectedKiosk.name}</Typography>
                <Typography variant="body2">{selectedKiosk.address}</Typography>
                <Typography variant="caption">{selectedKiosk.city}, {selectedKiosk.state}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Radio:</strong> {selectedKiosk.radiusMeters}m
                </Typography>
              </Box>
            </InfoWindow>
          )}
        </GoogleMap>
      </Box>
    </Box>
  );
};

export default MapaVendedores;
