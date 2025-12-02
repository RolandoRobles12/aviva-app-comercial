import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Drawer,
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
  Card,
  CardContent,
  Grid,
  Stack,
  alpha,
  useTheme,
  ListItemButton
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  MyLocation as MyLocationIcon,
  Store as StoreIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  TrendingUp,
  Warning,
  CheckCircle
} from '@mui/icons-material';
import { GoogleMap, useLoadScript, Marker, Circle, Polyline, InfoWindow } from '@react-google-maps/api';
import {
  collection,
  query,
  onSnapshot,
  where,
  Timestamp,
  GeoPoint,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  VendorMapData,
  KioskMapData,
  MapFilters,
  VendorStatus,
  MapStats,
  RoutePoint
} from '../types/map';
import {
  DEFAULT_MAP_COLORS,
  vendorStatusLabels,
  createVendorMarkerIcon,
  createKioskMarkerIcon
} from '../types/map';

// IMPORTANTE: libraries debe ser constante fuera del componente
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ['places', 'geometry'];

// Configuración del mapa
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_CENTER = { lat: 19.4326, lng: -99.1332 }; // Ciudad de México
const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

const MapaVendedores: React.FC = () => {
  const theme = useTheme();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  // Estado
  const [vendors, setVendors] = useState<VendorMapData[]>([]);
  const [kiosks, setKiosks] = useState<KioskMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<VendorMapData | null>(null);
  const [selectedKiosk, setSelectedKiosk] = useState<KioskMapData | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filtros
  const [filters, setFilters] = useState<MapFilters>({
    productTypes: [],
    states: [],
    cities: [],
    vendorStatuses: [],
    showOnlyActive: false, // Cambiado a false para mostrar todos por defecto
    vendorTypes: [],
    dateRange: null,
    showLiveData: true,
    showKiosks: true,
    showRoutes: false, // Desactivado por defecto para mejor performance
    showRadiusCircles: true,
    searchQuery: ''
  });

  // Cargar kioscos
  useEffect(() => {
    const loadKiosks = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'kiosks'));
        const kioskData: KioskMapData[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Sin nombre',
            productType: data.productType || 'unknown',
            location: data.location || data.coordinates || new GeoPoint(19.4326, -99.1332),
            address: data.address || 'Sin dirección',
            city: data.city || 'Sin ciudad',
            state: data.state || 'Sin estado',
            radiusMeters: data.radiusMeters || data.radiusOverride || 100,
            isActive: data.isActive !== false,
            status: data.status || 'ACTIVE',
            assignedVendors: 0,
            activeVendorsNow: 0,
            averageCheckInsPerDay: data.averageCheckInsPerDay || 0
          };
        });
        setKiosks(kioskData);
        console.log('Kiosks loaded:', kioskData.length);
      } catch (err) {
        console.error('Error loading kiosks:', err);
        setError('Error al cargar kioscos');
      }
    };

    loadKiosks();
  }, []);

  // Cargar y escuchar vendedores en tiempo real
  useEffect(() => {
    setLoading(true);

    const q = query(
      collection(db, 'users'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const vendorsList: VendorMapData[] = [];

          for (const doc of snapshot.docs) {
            const data = doc.data();

            // Solo incluir usuarios con ubicación
            if (!data.lastLocation) continue;

            // Determinar estado del vendedor
            const status = determineVendorStatus(data, kiosks);

            // Calcular distancia del kiosco si tiene asignado
            let distanceFromKiosk: number | undefined;
            let allowedRadius: number | undefined;
            if (data.assignedKioskId && kiosks.length > 0) {
              const kiosk = kiosks.find(k => k.id === data.assignedKioskId);
              if (kiosk) {
                distanceFromKiosk = calculateDistance(data.lastLocation, kiosk.location);
                allowedRadius = kiosk.radiusMeters;
              }
            }

            const vendor: VendorMapData = {
              id: doc.id,
              uid: data.uid || '',
              displayName: data.displayName || 'Sin nombre',
              email: data.email || '',
              photoUrl: data.photoUrl || data.profileImageUrl,
              currentLocation: data.lastLocation,
              lastLocationUpdate: data.lastLocationUpdate || Timestamp.now(),
              locationAccuracy: data.lastLocationAccuracy,
              status,
              vendorType: data.role === 'EMBAJADOR_AVIVA_TU_COMPRA' ? 'fixed_location' : 'route',
              productType: Array.isArray(data.productTypes) && data.productTypes.length > 0 ? data.productTypes[0] : 'unknown',
              productLine: data.productLine || '',
              assignedKioskId: data.assignedKioskId,
              assignedKioskName: kiosks.find(k => k.id === data.assignedKioskId)?.name,
              todayRoute: undefined, // Se carga bajo demanda
              isInAllowedZone: status === 'active_in_zone',
              distanceFromKiosk,
              allowedRadius,
              lastCheckIn: data.lastCheckIn,
              checkInCount: 0,
              role: data.role || '',
              isActive: data.isActive !== false && data.status === 'ACTIVE'
            };

            vendorsList.push(vendor);
          }

          setVendors(vendorsList);
          setLoading(false);
          setError(null);
          console.log('Vendors loaded:', vendorsList.length);
        } catch (err) {
          console.error('Error processing vendors:', err);
          setError('Error al procesar vendedores');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to vendors:', err);
        setError('Error al escuchar actualizaciones: ' + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [autoRefresh, kiosks]);

  // Determinar estado del vendedor
  const determineVendorStatus = (userData: any, kiosksList: KioskMapData[]): VendorStatus => {
    if (!userData.isActive || userData.status !== 'ACTIVE') {
      return 'inactive';
    }

    const lastUpdate = userData.lastLocationUpdate?.toDate();
    if (!lastUpdate || (Date.now() - lastUpdate.getTime()) > 30 * 60 * 1000) {
      return 'inactive'; // Sin actualización en 30 minutos
    }

    // Si tiene kiosco asignado, verificar si está en zona
    if (userData.assignedKioskId) {
      const kiosk = kiosksList.find(k => k.id === userData.assignedKioskId);
      if (kiosk && userData.lastLocation) {
        const distance = calculateDistance(userData.lastLocation, kiosk.location);
        if (distance <= kiosk.radiusMeters) {
          return 'active_in_zone';
        } else {
          return 'out_of_zone';
        }
      }
    }

    // Vendedor en ruta
    return 'in_transit';
  };

  // Calcular distancia entre dos puntos (Haversine)
  const calculateDistance = (point1: GeoPoint, point2: GeoPoint): number => {
    const R = 6371000; // Radio de la Tierra en metros
    const lat1Rad = (point1.latitude * Math.PI) / 180;
    const lat2Rad = (point2.latitude * Math.PI) / 180;
    const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLonRad / 2) *
        Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filtrar vendedores
  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      // Filtro de búsqueda
      if (filters.searchQuery) {
        const search = filters.searchQuery.toLowerCase();
        const matchesSearch =
          vendor.displayName.toLowerCase().includes(search) ||
          vendor.email.toLowerCase().includes(search) ||
          vendor.assignedKioskName?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Filtro de tipos de producto
      if (filters.productTypes.length > 0 && !filters.productTypes.includes(vendor.productType)) {
        return false;
      }

      // Filtro de estados de vendedor
      if (filters.vendorStatuses.length > 0 && !filters.vendorStatuses.includes(vendor.status)) {
        return false;
      }

      // Filtro de solo activos
      if (filters.showOnlyActive && !vendor.isActive) {
        return false;
      }

      // Filtro de tipos de vendedor
      if (filters.vendorTypes.length > 0 && !filters.vendorTypes.includes(vendor.vendorType)) {
        return false;
      }

      return true;
    });
  }, [vendors, filters]);

  // Filtrar kioscos
  const filteredKiosks = useMemo(() => {
    if (!filters.showKiosks) return [];
    return kiosks.filter(kiosk => {
      if (filters.productTypes.length > 0 && !filters.productTypes.includes(kiosk.productType)) {
        return false;
      }
      if (filters.states.length > 0 && !filters.states.includes(kiosk.state)) {
        return false;
      }
      if (filters.cities.length > 0 && !filters.cities.includes(kiosk.city)) {
        return false;
      }
      return true;
    });
  }, [kiosks, filters]);

  // Calcular estadísticas
  const stats: MapStats = useMemo(() => {
    const activeVendors = filteredVendors.filter(v => v.status !== 'inactive').length;
    const vendorsInZone = filteredVendors.filter(v => v.status === 'active_in_zone').length;
    const vendorsOutOfZone = filteredVendors.filter(v => v.status === 'out_of_zone').length;
    const inactiveVendors = filteredVendors.filter(v => v.status === 'inactive').length;

    const distances = filteredVendors
      .filter(v => v.distanceFromKiosk !== undefined)
      .map(v => v.distanceFromKiosk!);
    const averageDistance = distances.length > 0
      ? distances.reduce((a, b) => a + b, 0) / distances.length
      : 0;

    return {
      totalVendors: filteredVendors.length,
      activeVendors,
      vendorsInZone,
      vendorsOutOfZone,
      inactiveVendors,
      totalKiosks: filteredKiosks.length,
      averageDistance,
      lastUpdate: new Date()
    };
  }, [filteredVendors, filteredKiosks]);

  // Centrar mapa en vendedores
  const centerMapOnVendors = useCallback(() => {
    if (!mapRef || (filteredVendors.length === 0 && filteredKiosks.length === 0)) return;

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    filteredVendors.forEach(vendor => {
      bounds.extend({
        lat: vendor.currentLocation.latitude,
        lng: vendor.currentLocation.longitude
      });
      hasPoints = true;
    });

    filteredKiosks.forEach(kiosk => {
      bounds.extend({
        lat: kiosk.location.latitude,
        lng: kiosk.location.longitude
      });
      hasPoints = true;
    });

    if (hasPoints) {
      mapRef.fitBounds(bounds);
    }
  }, [mapRef, filteredVendors, filteredKiosks]);

  // Refrescar datos
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setAutoRefresh(prev => !prev);
  }, []);

  if (loadError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error al cargar Google Maps: {loadError.message}
          <br /><br />
          <strong>Solución:</strong> Verifica que:
          <ul>
            <li>La variable VITE_GOOGLE_MAPS_API_KEY esté configurada</li>
            <li>La API Key sea válida</li>
            <li>Las APIs estén habilitadas en Google Cloud Console</li>
          </ul>
        </Alert>
      </Box>
    );
  }

  if (!isLoaded) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Cargando Google Maps...
        </Typography>
      </Box>
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="h6" gutterBottom>
            API Key de Google Maps no configurada
          </Typography>
          <Typography paragraph>
            Para usar el mapa, necesitas configurar la variable de entorno con tu API Key de Google Maps.
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Opción 1: Variable de entorno temporal (PowerShell)
          </Typography>
          <Box component="code" sx={{ display: 'block', bgcolor: 'grey.100', p: 1, borderRadius: 1, mb: 2 }}>
            $env:VITE_GOOGLE_MAPS_API_KEY = "tu_api_key_aqui"; npm run dev
          </Box>
          <Typography variant="subtitle2" gutterBottom>
            Opción 2: Archivo .env
          </Typography>
          <Typography variant="body2">
            Crea un archivo <code>.env</code> en la carpeta admin con:
          </Typography>
          <Box component="code" sx={{ display: 'block', bgcolor: 'grey.100', p: 1, borderRadius: 1, mt: 1 }}>
            VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', display: 'flex', position: 'relative' }}>
      {/* Barra de estadísticas */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: filtersPanelOpen ? 380 : 16,
          right: 16,
          zIndex: 1000,
          transition: 'left 0.3s'
        }}
      >
        <Paper elevation={3} sx={{ px: 3, py: 2, borderRadius: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Total Vendedores
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {stats.totalVendors}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        En Zona
                      </Typography>
                      <Typography variant="h6" fontWeight={600} color="success.main">
                        {stats.vendorsInZone}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Warning sx={{ color: 'error.main', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Fuera de Zona
                      </Typography>
                      <Typography variant="h6" fontWeight={600} color="error.main">
                        {stats.vendorsOutOfZone}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TrendingUp sx={{ color: 'info.main', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        En Tránsito
                      </Typography>
                      <Typography variant="h6" fontWeight={600} color="info.main">
                        {stats.activeVendors - stats.vendorsInZone}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </Grid>
            <Grid item>
              <Stack direction="row" spacing={1}>
                <Tooltip title="Refrescar datos">
                  <IconButton onClick={handleRefresh} disabled={loading}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Centrar en vendedores">
                  <IconButton onClick={centerMapOnVendors}>
                    <MyLocationIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={filtersPanelOpen ? 'Ocultar filtros' : 'Mostrar filtros'}>
                  <IconButton onClick={() => setFiltersPanelOpen(!filtersPanelOpen)}>
                    <FilterIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Panel de filtros lateral */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={filtersPanelOpen}
        sx={{
          width: 360,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 360,
            position: 'relative',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default'
          }
        }}
      >
        <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Filtros y Vendedores
            </Typography>
            <IconButton size="small" onClick={() => setFiltersPanelOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Búsqueda */}
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar vendedor..."
            value={filters.searchQuery}
            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            sx={{ mb: 2 }}
          />

          {/* Filtros rápidos */}
          <Stack spacing={1} sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={filters.showOnlyActive}
                  onChange={(e) => setFilters(prev => ({ ...prev, showOnlyActive: e.target.checked }))}
                />
              }
              label="Solo activos"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={filters.showKiosks}
                  onChange={(e) => setFilters(prev => ({ ...prev, showKiosks: e.target.checked }))}
                />
              }
              label="Mostrar kioscos"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={filters.showRadiusCircles}
                  onChange={(e) => setFilters(prev => ({ ...prev, showRadiusCircles: e.target.checked }))}
                />
              }
              label="Mostrar radios"
            />
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Lista de vendedores */}
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Vendedores ({filteredVendors.length})
          </Typography>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <List dense>
              {filteredVendors.map(vendor => (
                <ListItem
                  key={vendor.id}
                  disablePadding
                  sx={{ mb: 0.5 }}
                >
                  <ListItemButton
                    selected={selectedVendor?.id === vendor.id}
                    onClick={() => {
                      setSelectedVendor(vendor);
                      if (mapRef) {
                        mapRef.panTo({
                          lat: vendor.currentLocation.latitude,
                          lng: vendor.currentLocation.longitude
                        });
                        mapRef.setZoom(15);
                      }
                    }}
                    sx={{
                      borderRadius: 2,
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.1)
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: DEFAULT_MAP_COLORS.vendorMarkers[vendor.status],
                              border: '2px solid white'
                            }}
                          />
                        }
                      >
                        <Avatar src={vendor.photoUrl} alt={vendor.displayName}>
                          {vendor.displayName[0]?.toUpperCase() || '?'}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={vendor.displayName}
                      secondary={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography variant="caption" component="span">
                            {vendorStatusLabels[vendor.status]}
                          </Typography>
                          {vendor.assignedKioskName && (
                            <>
                              <Typography variant="caption" component="span">
                                •
                              </Typography>
                              <Typography variant="caption" component="span">
                                {vendor.assignedKioskName}
                              </Typography>
                            </>
                          )}
                        </Stack>
                      }
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
              {filteredVendors.length === 0 && !loading && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No hay vendedores que coincidan con los filtros
                  </Typography>
                </Box>
              )}
            </List>
          </Box>
        </Box>
      </Drawer>

      {/* Mapa */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              p: 3,
              borderRadius: 2
            }}
          >
            <Stack alignItems="center" spacing={2}>
              <CircularProgress />
              <Typography variant="body2">Cargando vendedores...</Typography>
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
          options={MAP_OPTIONS}
          onLoad={setMapRef}
        >
          {/* Marcadores de kioscos */}
          {filteredKiosks.map(kiosk => (
            <React.Fragment key={kiosk.id}>
              <Marker
                position={{
                  lat: kiosk.location.latitude,
                  lng: kiosk.location.longitude
                }}
                icon={{
                  url: createKioskMarkerIcon(),
                  scaledSize: new google.maps.Size(50, 50),
                  anchor: new google.maps.Point(25, 25)
                }}
                onClick={() => setSelectedKiosk(kiosk)}
              />
              {filters.showRadiusCircles && (
                <Circle
                  center={{
                    lat: kiosk.location.latitude,
                    lng: kiosk.location.longitude
                  }}
                  radius={kiosk.radiusMeters}
                  options={{
                    fillColor: DEFAULT_MAP_COLORS.radiusCircles,
                    fillOpacity: 0.2,
                    strokeColor: DEFAULT_MAP_COLORS.vendorMarkers.active_in_zone,
                    strokeOpacity: 0.6,
                    strokeWeight: 2
                  }}
                />
              )}
            </React.Fragment>
          ))}

          {/* Marcadores de vendedores */}
          {filteredVendors.map(vendor => (
            <Marker
              key={vendor.id}
              position={{
                lat: vendor.currentLocation.latitude,
                lng: vendor.currentLocation.longitude
              }}
              icon={{
                url: createVendorMarkerIcon(vendor.status),
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 20)
              }}
              onClick={() => setSelectedVendor(vendor)}
              animation={vendor.status === 'out_of_zone' ? google.maps.Animation.BOUNCE : undefined}
            />
          ))}

          {/* Info Window para vendedor seleccionado */}
          {selectedVendor && (
            <InfoWindow
              position={{
                lat: selectedVendor.currentLocation.latitude,
                lng: selectedVendor.currentLocation.longitude
              }}
              onCloseClick={() => setSelectedVendor(null)}
            >
              <Card elevation={0} sx={{ minWidth: 250, maxWidth: 300 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar src={selectedVendor.photoUrl} sx={{ width: 48, height: 48 }}>
                        {selectedVendor.displayName[0]?.toUpperCase() || '?'}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {selectedVendor.displayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedVendor.email}
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip
                      label={vendorStatusLabels[selectedVendor.status]}
                      size="small"
                      sx={{
                        bgcolor: DEFAULT_MAP_COLORS.vendorMarkers[selectedVendor.status],
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                    {selectedVendor.assignedKioskName && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Kiosco Asignado:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {selectedVendor.assignedKioskName}
                        </Typography>
                      </Box>
                    )}
                    {selectedVendor.distanceFromKiosk !== undefined && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Distancia:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {Math.round(selectedVendor.distanceFromKiosk)}m
                          {selectedVendor.allowedRadius && (
                            <Typography component="span" variant="caption" color="text.secondary">
                              {' '}/ {selectedVendor.allowedRadius}m permitidos
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Última actualización:
                      </Typography>
                      <Typography variant="body2">
                        {selectedVendor.lastLocationUpdate.toDate().toLocaleString('es-MX', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </InfoWindow>
          )}

          {/* Info Window para kiosco seleccionado */}
          {selectedKiosk && (
            <InfoWindow
              position={{
                lat: selectedKiosk.location.latitude,
                lng: selectedKiosk.location.longitude
              }}
              onCloseClick={() => setSelectedKiosk(null)}
            >
              <Card elevation={0} sx={{ minWidth: 250, maxWidth: 300 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <StoreIcon color="primary" />
                      <Typography variant="subtitle1" fontWeight={700}>
                        {selectedKiosk.name}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {selectedKiosk.address}
                    </Typography>
                    <Typography variant="caption">
                      {selectedKiosk.city}, {selectedKiosk.state}
                    </Typography>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Radio permitido:
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedKiosk.radiusMeters}m
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </InfoWindow>
          )}
        </GoogleMap>
      </Box>
    </Box>
  );
};

export default MapaVendedores;
