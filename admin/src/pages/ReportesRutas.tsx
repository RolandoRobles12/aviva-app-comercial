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
  Divider,
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
  InputLabel
} from '@mui/material';
import {
  DirectionsRun as RunIcon,
  AccessTime as TimeIcon,
  Map as MapIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as TrophyIcon,
  CompareArrows as CompareIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp
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
  speed?: number;
}

interface SellerStats {
  userId: string;
  displayName: string;
  productLine?: string;
  totalKm: number;
  totalMinutes: number;
  avgSpeedKmh: number;
  activeDays: number;
  pointsCount: number;
  maxSpeedKmh: number;
  color: string;
}

interface DailyActivity {
  date: string;
  km: number;
  minutes: number;
}

const SELLER_COLORS = [
  '#16b877', '#2196F3', '#F44336', '#FF9800', '#9C27B0',
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'
];

type QuickFilter = 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}> = ({ icon, label, value, sub, color = '#16b877' }) => (
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
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.1 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </Box>
    </Stack>
  </Paper>
);

// Mini bar chart using SVG
const MiniBarChart: React.FC<{ data: DailyActivity[]; color: string; metric: 'km' | 'minutes' }> = ({
  data,
  color,
  metric
}) => {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => metric === 'km' ? d.km : d.minutes), 1);
  const chartHeight = 80;
  const barWidth = Math.max(4, Math.floor(280 / data.length) - 2);

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg width={data.length * (barWidth + 2)} height={chartHeight + 24} style={{ display: 'block' }}>
        {data.map((d, i) => {
          const val = metric === 'km' ? d.km : d.minutes;
          const barH = (val / maxVal) * chartHeight;
          const x = i * (barWidth + 2);
          const y = chartHeight - barH;
          const label = d.date.slice(5); // MM-DD
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={color}
                opacity={0.85}
                rx={2}
              />
              {i % Math.ceil(data.length / 7) === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 18}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#666"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </Box>
  );
};

const ReportesRutas: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('thisWeek');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sellerStats, setSellerStats] = useState<SellerStats[]>([]);
  const [dailyActivity, setDailyActivity] = useState<Record<string, DailyActivity[]>>({});
  const [compareMetric, setCompareMetric] = useState<'km' | 'minutes' | 'speed'>('km');
  const [productFilter, setProductFilter] = useState<string>('all');

  const getDateRange = (filter: QuickFilter): { start: string; end: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    switch (filter) {
      case 'today':
        return { start: fmt(today), end: fmt(today) };
      case 'thisWeek': {
        const mon = new Date(today);
        mon.setDate(today.getDate() - today.getDay() + 1);
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return { start: fmt(mon), end: fmt(sun) };
      }
      case 'thisMonth': {
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: fmt(first), end: fmt(last) };
      }
      case 'lastMonth': {
        const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const last = new Date(today.getFullYear(), today.getMonth(), 0);
        return { start: fmt(first), end: fmt(last) };
      }
      default:
        return { start: startDate, end: endDate };
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

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'));
      const data: User[] = snap.docs.map(d => ({
        id: d.id,
        displayName: d.data().displayName || 'Sin nombre',
        email: d.data().email || '',
        productLine: d.data().productLine
      }));
      setUsers(data.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    };
    fetchUsers();
  }, []);

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
          where('userId', '==', userId)
        ));

        const points: LocationPoint[] = locSnap.docs
          .map(d => {
            const data = d.data();
            return {
              userId,
              timestamp: data.timestamp,
              location: data.location,
              accuracy: data.accuracy,
              speed: data.speed
            } as LocationPoint;
          })
          .filter(p => {
            const t = p.timestamp.toMillis();
            return t >= startTs.toMillis() && t <= endTs.toMillis();
          })
          .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

        // Calcular estadísticas
        let totalKm = 0;
        let totalMinutes = 0;
        let maxSpeed = 0;
        const activeDaysSet = new Set<string>();
        const dailyMap: Record<string, { km: number; minutes: number }> = {};

        for (let j = 1; j < points.length; j++) {
          const prev = points[j - 1];
          const curr = points[j];
          const dist = calculateDistance(
            prev.location.latitude, prev.location.longitude,
            curr.location.latitude, curr.location.longitude
          );
          const timeDiff = (curr.timestamp.toMillis() - prev.timestamp.toMillis()) / 1000 / 60;

          // Solo contar si es un intervalo razonable (< 30 min de diferencia)
          if (timeDiff < 30) {
            totalKm += dist;
            totalMinutes += timeDiff;

            const dayKey = curr.timestamp.toDate().toISOString().split('T')[0];
            activeDaysSet.add(dayKey);
            if (!dailyMap[dayKey]) dailyMap[dayKey] = { km: 0, minutes: 0 };
            dailyMap[dayKey].km += dist;
            dailyMap[dayKey].minutes += timeDiff;
          }

          if (curr.speed && curr.speed > 0) {
            const speedKmh = curr.speed * 3.6;
            if (speedKmh < 120) maxSpeed = Math.max(maxSpeed, speedKmh); // filtrar GPS glitches
          }
        }

        const avgSpeedKmh = totalMinutes > 0 ? (totalKm / (totalMinutes / 60)) : 0;

        stats.push({
          userId,
          displayName: user.displayName,
          productLine: user.productLine,
          totalKm: Math.round(totalKm * 10) / 10,
          totalMinutes: Math.round(totalMinutes),
          avgSpeedKmh: Math.round(avgSpeedKmh * 10) / 10,
          activeDays: activeDaysSet.size,
          pointsCount: points.length,
          maxSpeedKmh: Math.round(maxSpeed * 10) / 10,
          color: SELLER_COLORS[i % SELLER_COLORS.length]
        });

        // Construir array de actividad diaria
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

  const formatDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Totales generales
  const totals = useMemo(() => ({
    km: sellerStats.reduce((s, x) => s + x.totalKm, 0),
    minutes: sellerStats.reduce((s, x) => s + x.totalMinutes, 0),
    sellers: sellerStats.length,
    avgSpeed: sellerStats.length > 0
      ? sellerStats.reduce((s, x) => s + x.avgSpeedKmh, 0) / sellerStats.length
      : 0
  }), [sellerStats]);

  // Ranking
  const ranked = useMemo(() => {
    return [...sellerStats].sort((a, b) => {
      if (compareMetric === 'km') return b.totalKm - a.totalKm;
      if (compareMetric === 'minutes') return b.totalMinutes - a.totalMinutes;
      return b.avgSpeedKmh - a.avgSpeedKmh;
    });
  }, [sellerStats, compareMetric]);

  const maxCompareValue = useMemo(() => {
    if (ranked.length === 0) return 1;
    if (compareMetric === 'km') return Math.max(...ranked.map(s => s.totalKm), 1);
    if (compareMetric === 'minutes') return Math.max(...ranked.map(s => s.totalMinutes), 1);
    return Math.max(...ranked.map(s => s.avgSpeedKmh), 1);
  }, [ranked, compareMetric]);

  const getCompareValue = (s: SellerStats) => {
    if (compareMetric === 'km') return s.totalKm;
    if (compareMetric === 'minutes') return s.totalMinutes;
    return s.avgSpeedKmh;
  };

  const getCompareLabel = (s: SellerStats) => {
    if (compareMetric === 'km') return `${s.totalKm} km`;
    if (compareMetric === 'minutes') return formatDuration(s.totalMinutes);
    return `${s.avgSpeedKmh} km/h`;
  };

  const uniqueProductLines = [...new Set(users.map(u => u.productLine).filter(Boolean))];

  const filteredUsers = productFilter === 'all'
    ? users
    : users.filter(u => u.productLine === productFilter);

  return (
    <Box sx={{ p: 0 }}>
      {/* Filtros */}
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
              value={quickFilter}
              exclusive
              onChange={(_, v) => v && setQuickFilter(v)}
              size="small"
              fullWidth
            >
              <ToggleButton value="today">Hoy</ToggleButton>
              <ToggleButton value="thisWeek">Semana</ToggleButton>
              <ToggleButton value="thisMonth">Mes</ToggleButton>
              <ToggleButton value="lastMonth">Mes ant.</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              label="Desde"
              type="date"
              size="small"
              fullWidth
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setQuickFilter('custom'); }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              label="Hasta"
              type="date"
              size="small"
              fullWidth
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setQuickFilter('custom'); }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Producto</InputLabel>
              <Select
                value={productFilter}
                label="Producto"
                onChange={e => setProductFilter(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="AVIVA_TU_NEGOCIO">Aviva Tu Negocio</MenuItem>
                <MenuItem value="CONSTRURAMA">Construrama</MenuItem>
                {uniqueProductLines
                  .filter(p => p !== 'AVIVA_TU_NEGOCIO' && p !== 'CONSTRURAMA')
                  .map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)
                }
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <Autocomplete
              multiple
              options={filteredUsers}
              value={filteredUsers.filter(u => selectedUserIds.includes(u.id))}
              onChange={(_, v) => setSelectedUserIds(v.map(u => u.id))}
              getOptionLabel={u => u.displayName}
              renderTags={(val, getProps) => val.map((u, i) => (
                <Chip
                  key={u.id}
                  label={u.displayName.split(' ')[0]}
                  {...getProps({ index: i })}
                  size="small"
                />
              ))}
              renderInput={(params) => (
                <TextField {...params} label="Vendedores" size="small" />
              )}
            />
          </Grid>

          <Grid item xs={12} md={12}>
            <Button
              variant="contained"
              onClick={handleLoadReports}
              disabled={loading || selectedUserIds.length === 0}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
              sx={{ mr: 1 }}
            >
              {loading ? 'Cargando...' : 'Generar Reporte'}
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Resultados */}
      {sellerStats.length > 0 && (
        <>
          {/* KPIs globales */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <StatCard
                icon={<RunIcon />}
                label="Total km recorridos"
                value={`${totals.km.toFixed(1)}`}
                sub="kilómetros en el periodo"
                color="#16b877"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                icon={<TimeIcon />}
                label="Tiempo en campo"
                value={formatDuration(totals.minutes)}
                sub={`${sellerStats.length} vendedor${sellerStats.length > 1 ? 'es' : ''}`}
                color="#2196F3"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                icon={<SpeedIcon />}
                label="Velocidad promedio"
                value={`${totals.avgSpeed.toFixed(1)}`}
                sub="km/h promedio"
                color="#FF9800"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                icon={<TrendingUpIcon />}
                label="Días activos"
                value={`${Math.max(...sellerStats.map(s => s.activeDays), 0)}`}
                sub="máximo días en el periodo"
                color="#9C27B0"
              />
            </Grid>
          </Grid>

          {/* Comparativa entre vendedores */}
          <Paper sx={{ p: 2.5, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CompareIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Comparativa de Vendedores
                </Typography>
              </Stack>
              <ToggleButtonGroup
                value={compareMetric}
                exclusive
                onChange={(_, v) => v && setCompareMetric(v)}
                size="small"
              >
                <ToggleButton value="km">Km</ToggleButton>
                <ToggleButton value="minutes">Tiempo</ToggleButton>
                <ToggleButton value="speed">Velocidad</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            <Stack spacing={2}>
              {ranked.map((s, i) => (
                <Box key={s.userId}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.5 }}>
                    <Box sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'grey.200',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      flexShrink: 0
                    }}>
                      {i + 1}
                    </Box>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: s.color, fontSize: '0.85rem' }}>
                      {s.displayName.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {s.displayName}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="primary">
                          {getCompareLabel(s)}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(getCompareValue(s) / maxCompareValue) * 100}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'grey.100',
                          '& .MuiLinearProgress-bar': { bgcolor: s.color }
                        }}
                      />
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Paper>

          {/* Actividad por día — por vendedor */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {sellerStats.map(s => (
              <Grid item xs={12} md={6} key={s.userId}>
                <Paper sx={{ p: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: s.color, fontSize: '0.85rem' }}>
                      {s.displayName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>{s.displayName}</Typography>
                      {s.productLine && (
                        <Chip
                          label={s.productLine === 'CONSTRURAMA' ? 'Construrama' : 'Aviva Tu Negocio'}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                  </Stack>

                  <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Km recorridos</Typography>
                      <Typography variant="h6" fontWeight={800} color="primary">{s.totalKm}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Tiempo campo</Typography>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#2196F3' }}>
                        {formatDuration(s.totalMinutes)}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Días activos</Typography>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#9C27B0' }}>
                        {s.activeDays}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                    Km por día
                  </Typography>
                  {dailyActivity[s.userId] && (
                    <MiniBarChart
                      data={dailyActivity[s.userId]}
                      color={s.color}
                      metric="km"
                    />
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Tabla resumen detallada */}
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <TrophyIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Tabla Detallada</Typography>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Vendedor</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Km totales</TableCell>
                    <TableCell align="right">Tiempo campo</TableCell>
                    <TableCell align="right">Vel. promedio</TableCell>
                    <TableCell align="right">Vel. máxima</TableCell>
                    <TableCell align="right">Días activos</TableCell>
                    <TableCell align="right">Puntos GPS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ranked.map((s, i) => (
                    <TableRow key={s.userId} hover>
                      <TableCell>
                        <Typography fontWeight={700} color={
                          i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'text.secondary'
                        }>
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
                        <Chip
                          label={s.productLine === 'CONSTRURAMA' ? 'Construrama' : 'Aviva TN'}
                          size="small"
                          sx={{
                            bgcolor: s.productLine === 'CONSTRURAMA' ? '#FF9800' : '#16b877',
                            color: 'white',
                            fontSize: '0.7rem'
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700} color="primary">{s.totalKm} km</Typography>
                      </TableCell>
                      <TableCell align="right">{formatDuration(s.totalMinutes)}</TableCell>
                      <TableCell align="right">{s.avgSpeedKmh} km/h</TableCell>
                      <TableCell align="right">{s.maxSpeedKmh} km/h</TableCell>
                      <TableCell align="right">
                        <Chip label={s.activeDays} size="small" color="secondary" />
                      </TableCell>
                      <TableCell align="right">{s.pointsCount}</TableCell>
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
            Reportes de rendimiento en campo
          </Typography>
          <Typography color="text.secondary">
            Selecciona vendedores y un periodo para generar el reporte con km recorridos,
            tiempo en campo, velocidad y comparativas estilo Strava.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ReportesRutas;
