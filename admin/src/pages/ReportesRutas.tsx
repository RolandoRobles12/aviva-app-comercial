import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as TrophyIcon,
  CompareArrows as CompareIcon,
  Refresh as RefreshIcon,
  Route as RouteIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  PauseCircleOutline as PauseIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface User {
  id: string;
  displayName: string;
  email: string;
  productLine?: string;
}

interface LocationPoint {
  userId: string;
  timestamp: Timestamp;
  location: { latitude: number; longitude: number };
  accuracy?: number;
}

interface SellerStats {
  userId: string;
  displayName: string;
  productLine?: string;
  productName: string;
  totalKm: number;
  totalMinutes: number;
  activeDays: number;
  pointsCount: number;
  avgKmPerDay: number;
  avgMinutesPerDay: number;
  longStops: number;        // pausas > 30 min en el día
  avgStartHour: number;     // hora promedio de primer punto del día
  avgEndHour: number;       // hora promedio de último punto del día
  color: string;
}

interface DailyActivity {
  date: string;
  km: number;
  minutes: number;
}

interface Product {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

const SELLER_COLORS = [
  '#16b877', '#2196F3', '#F44336', '#FF9800', '#9C27B0',
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
];

type QuickFilter = 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';
type CompareMetric = 'km' | 'minutes' | 'days';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatHour = (h: number): string => {
  if (h === 0) return '—';
  const hour = Math.floor(h);
  const min = Math.round((h - hour) * 60);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h12}:${min.toString().padStart(2, '0')} ${ampm}`;
};

// ── KPI Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  description?: string;
  color?: string;
}> = ({ icon, label, value, sub, description, color = '#16b877' }) => (
  <Paper sx={{ p: 2.5, height: '100%' }}>
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Box sx={{
        bgcolor: `${color}18`,
        borderRadius: 2,
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </Typography>
          {description && (
            <Tooltip title={description} placement="top" arrow>
              <InfoIcon sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
            </Tooltip>
          )}
        </Stack>
        <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.1 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">{sub}</Typography>
        )}
      </Box>
    </Stack>
  </Paper>
);

// ── Mini bar chart ───────────────────────────────────────────────────────────
const MiniBarChart: React.FC<{ data: DailyActivity[]; color: string; metric: 'km' | 'minutes' }> = ({
  data, color, metric
}) => {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => metric === 'km' ? d.km : d.minutes), 1);
  const chartHeight = 72;
  const barWidth = Math.max(4, Math.floor(280 / data.length) - 2);
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg width={data.length * (barWidth + 2)} height={chartHeight + 22} style={{ display: 'block' }}>
        {data.map((d, i) => {
          const val = metric === 'km' ? d.km : d.minutes;
          const barH = Math.max((val / maxVal) * chartHeight, val > 0 ? 3 : 0);
          const x = i * (barWidth + 2);
          const y = chartHeight - barH;
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barWidth} height={barH} fill={val > 0 ? color : '#e0e0e0'} opacity={0.85} rx={2} />
              {i % Math.ceil(data.length / 7) === 0 && (
                <text x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" fontSize={9} fill="#888">
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </Box>
  );
};

// ── Horario bar (visual de inicio–fin de jornada) ────────────────────────────
const JornadaBar: React.FC<{ startHour: number; endHour: number; color: string }> = ({
  startHour, endHour, color
}) => {
  if (startHour === 0) return <Typography variant="caption" color="text.disabled">Sin datos</Typography>;
  const workStart = 7; // eje empieza a las 7am
  const workEnd = 20;  // eje termina a las 8pm
  const total = workEnd - workStart;
  const leftPct = ((startHour - workStart) / total) * 100;
  const widthPct = ((endHour - startHour) / total) * 100;
  return (
    <Box>
      <Box sx={{ position: 'relative', height: 12, bgcolor: 'grey.100', borderRadius: 6, overflow: 'hidden', mt: 0.5 }}>
        <Box sx={{
          position: 'absolute',
          left: `${Math.max(0, leftPct)}%`,
          width: `${Math.min(100 - Math.max(0, leftPct), widthPct)}%`,
          height: '100%',
          bgcolor: color,
          borderRadius: 6,
          opacity: 0.85
        }} />
      </Box>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary">7am</Typography>
        <Typography variant="caption" color="text.secondary">8pm</Typography>
      </Stack>
    </Box>
  );
};

// ════════════════════════════════════════════════════════════════════════════
const ReportesRutas: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('thisWeek');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sellerStats, setSellerStats] = useState<SellerStats[]>([]);
  const [dailyActivity, setDailyActivity] = useState<Record<string, DailyActivity[]>>({});
  const [compareMetric, setCompareMetric] = useState<CompareMetric>('km');
  const [productFilter, setProductFilter] = useState<string>('all');

  // ── Date helpers ──────────────────────────────────────────────────────────
  const getDateRange = (filter: QuickFilter): { start: string; end: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    switch (filter) {
      case 'today': return { start: fmt(today), end: fmt(today) };
      case 'thisWeek': {
        const mon = new Date(today);
        mon.setDate(today.getDate() - today.getDay() + 1);
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return { start: fmt(mon), end: fmt(sun) };
      }
      case 'thisMonth': {
        return {
          start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
          end: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0))
        };
      }
      case 'lastMonth': {
        return {
          start: fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
          end: fmt(new Date(today.getFullYear(), today.getMonth(), 0))
        };
      }
      default: return { start: startDate, end: endDate };
    }
  };

  useEffect(() => {
    const { start, end } = getDateRange('thisWeek');
    setStartDate(start);
    setEndDate(end);
  }, []);

  useEffect(() => {
    if (quickFilter !== 'custom') {
      const { start, end } = getDateRange(quickFilter);
      setStartDate(start);
      setEndDate(end);
    }
  }, [quickFilter]);

  // ── Carga inicial: usuarios y productos ───────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      const [usersSnap, productsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'products'), orderBy('name', 'asc')))
      ]);
      const data: User[] = usersSnap.docs.map(d => ({
        id: d.id,
        displayName: d.data().displayName || 'Sin nombre',
        email: d.data().email || '',
        productLine: d.data().productLine
      }));
      setUsers(data.sort((a, b) => a.displayName.localeCompare(b.displayName)));
      setProducts(productsSnap.docs.map(d => ({
        id: d.id,
        name: d.data().name,
        code: d.data().code,
        isActive: d.data().isActive ?? true
      })));
    };
    fetchData();
  }, []);

  // ── Generación del reporte ────────────────────────────────────────────────
  const handleLoadReports = async () => {
    if (selectedUserIds.length === 0) {
      setError('Selecciona al menos un vendedor');
      return;
    }
    setLoading(true);
    setError(null);
    setSellerStats([]);
    setDailyActivity({});

    try {
      const startTs = Timestamp.fromDate(new Date(startDate + 'T00:00:00'));
      const endTs = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));

      const stats: SellerStats[] = [];
      const daily: Record<string, DailyActivity[]> = {};

      for (let i = 0; i < selectedUserIds.length; i++) {
        const userId = selectedUserIds[i];
        const user = users.find(u => u.id === userId);
        if (!user) continue;

        const locSnap = await getDocs(query(
          collection(db, 'locations'),
          where('userId', '==', userId),
          where('timestamp', '>=', startTs),
          where('timestamp', '<=', endTs)
        ));

        const points: LocationPoint[] = locSnap.docs
          .map(d => {
            const data = d.data();
            return {
              userId,
              timestamp: data.timestamp,
              location: data.location ?? { latitude: data.latitude, longitude: data.longitude },
              accuracy: data.accuracy
            } as LocationPoint;
          })
          .filter(p => p.timestamp && p.location?.latitude != null)
          .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

        // Primer paso: horario real por día (primer y último punto)
        const dailyBounds: Record<string, { start: number; end: number }> = {};
        for (const p of points) {
          const d = p.timestamp.toDate();
          const dayKey = d.toISOString().split('T')[0];
          const h = d.getHours() + d.getMinutes() / 60;
          if (!dailyBounds[dayKey]) {
            dailyBounds[dayKey] = { start: h, end: h };
          } else {
            if (h < dailyBounds[dayKey].start) dailyBounds[dayKey].start = h;
            if (h > dailyBounds[dayKey].end) dailyBounds[dayKey].end = h;
          }
        }

        // Segundo paso: km, tiempo, paradas largas
        let totalKm = 0;
        let totalMinutes = 0;
        let longStops = 0;
        const activeDaysSet = new Set<string>();
        const dailyMap: Record<string, { km: number; minutes: number }> = {};

        for (let j = 1; j < points.length; j++) {
          const prev = points[j - 1];
          const curr = points[j];
          const timeDiff = (curr.timestamp.toMillis() - prev.timestamp.toMillis()) / 1000 / 60;

          if (timeDiff < 30) {
            const dist = calculateDistance(
              prev.location.latitude, prev.location.longitude,
              curr.location.latitude, curr.location.longitude
            );
            totalKm += dist;
            totalMinutes += timeDiff;
            const dayKey = curr.timestamp.toDate().toISOString().split('T')[0];
            activeDaysSet.add(dayKey);
            if (!dailyMap[dayKey]) dailyMap[dayKey] = { km: 0, minutes: 0 };
            dailyMap[dayKey].km += dist;
            dailyMap[dayKey].minutes += timeDiff;
          } else {
            longStops++;
          }
        }

        const activeDays = activeDaysSet.size;
        const dayBoundsList = Object.values(dailyBounds);
        const avgStartHour = dayBoundsList.length > 0
          ? dayBoundsList.reduce((s, d) => s + d.start, 0) / dayBoundsList.length
          : 0;
        const avgEndHour = dayBoundsList.length > 0
          ? dayBoundsList.reduce((s, d) => s + d.end, 0) / dayBoundsList.length
          : 0;

        const productName = products.find(
          p => p.code.toLowerCase() === user.productLine?.toLowerCase()
        )?.name || user.productLine || '—';

        stats.push({
          userId,
          displayName: user.displayName,
          productLine: user.productLine,
          productName,
          totalKm: Math.round(totalKm * 10) / 10,
          totalMinutes: Math.round(totalMinutes),
          activeDays,
          pointsCount: points.length,
          avgKmPerDay: activeDays > 0 ? Math.round((totalKm / activeDays) * 10) / 10 : 0,
          avgMinutesPerDay: activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0,
          longStops,
          avgStartHour,
          avgEndHour,
          color: SELLER_COLORS[i % SELLER_COLORS.length]
        });

        // Actividad diaria para la gráfica de barras
        const startD = new Date(startDate);
        const endD = new Date(endDate);
        const dailyArr: DailyActivity[] = [];
        const cur = new Date(startD);
        while (cur <= endD) {
          const key = cur.toISOString().split('T')[0];
          dailyArr.push({
            date: key,
            km: Math.round((dailyMap[key]?.km || 0) * 10) / 10,
            minutes: Math.round(dailyMap[key]?.minutes || 0)
          });
          cur.setDate(cur.getDate() + 1);
        }
        daily[userId] = dailyArr;
      }

      setSellerStats(stats);
      setDailyActivity(daily);
    } catch (e: any) {
      setError(e.message || 'Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const totals = useMemo(() => ({
    km: sellerStats.reduce((s, x) => s + x.totalKm, 0),
    minutes: sellerStats.reduce((s, x) => s + x.totalMinutes, 0),
    sellers: sellerStats.length,
    avgDays: sellerStats.length > 0
      ? Math.round(sellerStats.reduce((s, x) => s + x.activeDays, 0) / sellerStats.length * 10) / 10
      : 0,
    avgKmPerDay: sellerStats.length > 0
      ? Math.round(sellerStats.reduce((s, x) => s + x.avgKmPerDay, 0) / sellerStats.length * 10) / 10
      : 0
  }), [sellerStats]);

  const ranked = useMemo(() => {
    return [...sellerStats].sort((a, b) => {
      if (compareMetric === 'km') return b.totalKm - a.totalKm;
      if (compareMetric === 'minutes') return b.totalMinutes - a.totalMinutes;
      return b.activeDays - a.activeDays;
    });
  }, [sellerStats, compareMetric]);

  const maxCompareValue = useMemo(() => {
    if (ranked.length === 0) return 1;
    if (compareMetric === 'km') return Math.max(...ranked.map(s => s.totalKm), 1);
    if (compareMetric === 'minutes') return Math.max(...ranked.map(s => s.totalMinutes), 1);
    return Math.max(...ranked.map(s => s.activeDays), 1);
  }, [ranked, compareMetric]);

  const getCompareValue = (s: SellerStats) => {
    if (compareMetric === 'km') return s.totalKm;
    if (compareMetric === 'minutes') return s.totalMinutes;
    return s.activeDays;
  };

  const getCompareLabel = (s: SellerStats) => {
    if (compareMetric === 'km') return `${s.totalKm} km`;
    if (compareMetric === 'minutes') return formatDuration(s.totalMinutes);
    return `${s.activeDays} días`;
  };

  // ── Filtros de producto ───────────────────────────────────────────────────
  const matchesProduct = (userProductLine: string | undefined, code: string) =>
    userProductLine?.toLowerCase() === code.toLowerCase();

  const filteredUsers = productFilter === 'all'
    ? users
    : users.filter(u => matchesProduct(u.productLine, productFilter));

  const handleProductFilterChange = (value: string) => {
    setProductFilter(value);
    const next = value === 'all'
      ? users
      : users.filter(u => matchesProduct(u.productLine, value));
    setSelectedUserIds(next.map(u => u.id));
  };

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ p: 0 }}>

      {/* ── Filtros ── */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Reportes de Campo
        </Typography>

        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} md={3}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Periodo
            </Typography>
            <ToggleButtonGroup
              value={quickFilter} exclusive
              onChange={(_, v) => v && setQuickFilter(v)}
              size="small" fullWidth
            >
              <ToggleButton value="today">Hoy</ToggleButton>
              <ToggleButton value="thisWeek">Semana</ToggleButton>
              <ToggleButton value="thisMonth">Mes</ToggleButton>
              <ToggleButton value="lastMonth">Mes ant.</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField label="Desde" type="date" size="small" fullWidth value={startDate}
              onChange={e => { setStartDate(e.target.value); setQuickFilter('custom'); }}
              InputLabelProps={{ shrink: true }} />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField label="Hasta" type="date" size="small" fullWidth value={endDate}
              onChange={e => { setEndDate(e.target.value); setQuickFilter('custom'); }}
              InputLabelProps={{ shrink: true }} />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Producto</InputLabel>
              <Select value={productFilter} label="Producto"
                onChange={e => handleProductFilterChange(e.target.value)}>
                <MenuItem value="all">Todos</MenuItem>
                {products.map(p => (
                  <MenuItem key={p.code} value={p.code}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <Stack spacing={1}>
              <Autocomplete
                multiple
                options={filteredUsers}
                value={filteredUsers.filter(u => selectedUserIds.includes(u.id))}
                onChange={(_, v) => setSelectedUserIds(v.map(u => u.id))}
                getOptionLabel={u => u.displayName}
                renderTags={(val, getProps) => val.map((u, i) => (
                  <Chip {...getProps({ index: i })} label={u.displayName.split(' ')[0]} size="small" />
                ))}
                renderInput={(params) => (
                  <TextField {...params} label="Vendedores" size="small" />
                )}
              />
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined"
                  onClick={() => setSelectedUserIds(filteredUsers.map(u => u.id))}
                  disabled={filteredUsers.length === 0}>
                  Seleccionar todos ({filteredUsers.length})
                </Button>
                {selectedUserIds.length > 0 && (
                  <Button size="small" onClick={() => setSelectedUserIds([])}>Limpiar</Button>
                )}
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Button variant="contained" onClick={handleLoadReports}
              disabled={loading || selectedUserIds.length === 0}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}>
              {loading ? 'Cargando...' : 'Generar Reporte'}
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>{error}</Alert>
        )}
      </Paper>

      {/* ── Resultados ── */}
      {sellerStats.length > 0 && (
        <>
          {/* KPIs del equipo */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <StatCard
                icon={<RouteIcon />}
                label="Km totales recorridos"
                value={`${totals.km.toFixed(1)} km`}
                sub={`entre ${totals.sellers} vendedor${totals.sellers > 1 ? 'es' : ''}`}
                description="Suma de la distancia entre cada par de puntos GPS consecutivos del periodo, excluyendo saltos de más de 30 min (pausas o pérdida de señal)."
                color="#16b877"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                icon={<TimeIcon />}
                label="Tiempo total en campo"
                value={formatDuration(totals.minutes)}
                sub={`prom. ${formatDuration(totals.minutes / Math.max(totals.sellers, 1))} por vendedor`}
                description="Suma de los intervalos de tiempo entre puntos GPS consecutivos, contando solo tramos menores a 30 min. Refleja el tiempo que el vendedor estuvo activamente en movimiento o atendiendo clientes."
                color="#2196F3"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                icon={<CalendarIcon />}
                label="Días activos promedio"
                value={`${totals.avgDays}`}
                sub="días con presencia en campo"
                description="Promedio de días distintos en los que cada vendedor registró al menos un punto GPS válido durante el periodo seleccionado. Indica cuántos días laboró en campo."
                color="#9C27B0"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                icon={<RouteIcon />}
                label="Km promedio por día"
                value={`${totals.avgKmPerDay} km`}
                sub="cobertura diaria del equipo"
                description="Promedio de kilómetros recorridos por vendedor en cada día activo. Se calcula dividiendo el total de km entre el número de días con actividad."
                color="#FF9800"
              />
            </Grid>
          </Grid>

          {/* Comparativa entre vendedores */}
          <Paper sx={{ p: 2.5, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CompareIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>Comparativa de Vendedores</Typography>
              </Stack>
              <ToggleButtonGroup
                value={compareMetric} exclusive
                onChange={(_, v) => v && setCompareMetric(v as CompareMetric)}
                size="small">
                <ToggleButton value="km">Km recorridos</ToggleButton>
                <ToggleButton value="minutes">Tiempo campo</ToggleButton>
                <ToggleButton value="days">Días activos</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            <Stack spacing={2}>
              {ranked.map((s, i) => (
                <Box key={s.userId}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.5 }}>
                    <Box sx={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      bgcolor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'grey.200',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.8rem'
                    }}>
                      {i + 1}
                    </Box>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: s.color, fontSize: '0.85rem' }}>
                      {s.displayName.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight={600} noWrap>{s.displayName}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.productName}</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={700} color="primary">
                          {getCompareLabel(s)}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(getCompareValue(s) / maxCompareValue) * 100}
                        sx={{
                          height: 8, borderRadius: 4, bgcolor: 'grey.100',
                          '& .MuiLinearProgress-bar': { bgcolor: s.color }
                        }}
                      />
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Paper>

          {/* Tarjetas por vendedor */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {sellerStats.map(s => (
              <Grid item xs={12} md={6} key={s.userId}>
                <Paper sx={{ p: 2.5 }}>
                  {/* Cabecera */}
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: s.color, fontSize: '0.9rem' }}>
                      {s.displayName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>{s.displayName}</Typography>
                      <Chip label={s.productName} size="small"
                        sx={{ height: 18, fontSize: '0.65rem', bgcolor: `${s.color}22`, color: s.color }} />
                    </Box>
                  </Stack>

                  {/* Métricas principales */}
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={4}>
                      <Tooltip title="Total de kilómetros recorridos en el periodo (tramos < 30 min)" placement="top" arrow>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Km recorridos</Typography>
                          <Typography variant="h6" fontWeight={800} sx={{ color: '#16b877' }}>
                            {s.totalKm}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Grid>
                    <Grid item xs={4}>
                      <Tooltip title="Tiempo activo en campo: suma de intervalos < 30 min entre puntos GPS consecutivos" placement="top" arrow>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Tiempo campo</Typography>
                          <Typography variant="h6" fontWeight={800} sx={{ color: '#2196F3' }}>
                            {formatDuration(s.totalMinutes)}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Grid>
                    <Grid item xs={4}>
                      <Tooltip title="Número de días distintos con al menos un registro GPS válido en el periodo" placement="top" arrow>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Días activos</Typography>
                          <Typography variant="h6" fontWeight={800} sx={{ color: '#9C27B0' }}>
                            {s.activeDays}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Grid>
                  </Grid>

                  {/* Métricas de productividad diaria */}
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Km/día prom.</Typography>
                      <Typography variant="body1" fontWeight={700}>{s.avgKmPerDay} km</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Tooltip title="Tiempo promedio por día activo">
                        <Box>
                          <Typography variant="caption" color="text.secondary">Hrs/día prom.</Typography>
                          <Typography variant="body1" fontWeight={700}>{formatDuration(s.avgMinutesPerDay)}</Typography>
                        </Box>
                      </Tooltip>
                    </Grid>
                    <Grid item xs={4}>
                      <Tooltip title="Pausas de más de 30 min detectadas">
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <PauseIcon sx={{ fontSize: 14, color: s.longStops > 3 ? '#F44336' : 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">Paradas largas</Typography>
                          </Stack>
                          <Typography variant="body1" fontWeight={700}
                            sx={{ color: s.longStops > 3 ? '#F44336' : 'text.primary' }}>
                            {s.longStops}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Grid>
                  </Grid>

                  {/* Horario promedio de jornada */}
                  <Box sx={{ mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
                      <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Horario promedio: {formatHour(s.avgStartHour)} → {formatHour(s.avgEndHour)}
                      </Typography>
                    </Stack>
                    <JornadaBar startHour={s.avgStartHour} endHour={s.avgEndHour} color={s.color} />
                  </Box>

                  {/* Gráfica de km por día */}
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                    Km por día en el periodo
                  </Typography>
                  {dailyActivity[s.userId] && (
                    <MiniBarChart data={dailyActivity[s.userId]} color={s.color} metric="km" />
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Tabla resumen */}
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <TrophyIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Resumen por Vendedor</Typography>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, whiteSpace: 'nowrap' } }}>
                    <TableCell>#</TableCell>
                    <TableCell>Vendedor</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Km totales</TableCell>
                    <TableCell align="right">Tiempo campo</TableCell>
                    <TableCell align="right">Días activos</TableCell>
                    <TableCell align="right">Km/día</TableCell>
                    <TableCell align="right">Hrs/día</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Hora promedio de primer GPS del día"><span>Inicio prom.</span></Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Hora promedio de último GPS del día"><span>Fin prom.</span></Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Pausas de más de 30 min sin movimiento"><span>Paradas largas</span></Tooltip>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ranked.map((s, i) => (
                    <TableRow key={s.userId} hover>
                      <TableCell>
                        <Typography fontWeight={700} sx={{
                          color: i === 0 ? '#B8860B' : i === 1 ? '#808080' : i === 2 ? '#8B4513' : 'text.secondary'
                        }}>
                          {i + 1}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 26, height: 26, bgcolor: s.color, fontSize: '0.75rem' }}>
                            {s.displayName.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>{s.displayName}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip label={s.productName} size="small"
                          sx={{ fontSize: '0.7rem', bgcolor: `${s.color}22`, color: s.color }} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700} color="primary">{s.totalKm} km</Typography>
                      </TableCell>
                      <TableCell align="right">{formatDuration(s.totalMinutes)}</TableCell>
                      <TableCell align="right">
                        <Chip label={s.activeDays} size="small" color={s.activeDays > 0 ? 'secondary' : 'default'} />
                      </TableCell>
                      <TableCell align="right">{s.avgKmPerDay} km</TableCell>
                      <TableCell align="right">{formatDuration(s.avgMinutesPerDay)}</TableCell>
                      <TableCell align="right">{formatHour(s.avgStartHour)}</TableCell>
                      <TableCell align="right">{formatHour(s.avgEndHour)}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600}
                          sx={{ color: s.longStops > 3 ? '#F44336' : 'text.secondary' }}>
                          {s.longStops}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {sellerStats.length === 0 && !loading && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <TrendingUpIcon sx={{ fontSize: 70, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Reportes de actividad en campo
          </Typography>
          <Typography color="text.secondary">
            Selecciona el periodo, filtra por producto y elige los vendedores. Luego presiona "Generar Reporte".
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ReportesRutas;
