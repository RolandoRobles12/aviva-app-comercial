import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import CategoryIcon from '@mui/icons-material/Category';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HistoryIcon from '@mui/icons-material/History';
import StoreIcon from '@mui/icons-material/Store';
import MapIcon from '@mui/icons-material/Map';
import RouteIcon from '@mui/icons-material/Route';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Breadcrumbs from './Breadcrumbs';

const DRAWER_WIDTH = 270;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/', category: 'main' },
  { text: 'Usuarios', icon: <PeopleIcon />, path: '/usuarios', category: 'main' },
  { text: 'Kioscos', icon: <StoreIcon />, path: '/kioscos', category: 'main' },
  { text: 'Mapa en Vivo', icon: <MapIcon />, path: '/mapa', category: 'main' },
  { text: 'Rutas Promotores', icon: <RouteIcon />, path: '/rutas', category: 'main' },
  { text: 'Metas', icon: <TrendingUpIcon />, path: '/metas', category: 'gamification' },
  { text: 'Ligas', icon: <EmojiEventsIcon />, path: '/ligas', category: 'gamification' },
  { text: 'Giros', icon: <CategoryIcon />, path: '/giros', category: 'config' },
  { text: 'Administradores', icon: <AdminPanelSettingsIcon />, path: '/administradores', category: 'config' },
  { text: 'Auditoría', icon: <HistoryIcon />, path: '/auditoria', category: 'config' },
  { text: 'Configuración', icon: <SettingsIcon />, path: '/config', category: 'config' }
];

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    await signOut();
    handleMenuClose();
    navigate('/login');
  };

  const renderMenuItem = (item: typeof menuItems[0]) => (
    <ListItem key={item.text} disablePadding sx={{ px: 1.5, mb: 0.5 }}>
      <ListItemButton
        selected={location.pathname === item.path}
        onClick={() => {
          navigate(item.path);
          setMobileOpen(false);
        }}
        sx={{
          borderRadius: 2,
          transition: 'all 0.2s',
          '&.Mui-selected': {
            background: 'linear-gradient(135deg, #16b877 0%, #026149 100%)',
            color: 'white',
            boxShadow: '0px 4px 12px rgba(22, 184, 119, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #009768 0%, #074739 100%)',
            },
            '& .MuiListItemIcon-root': {
              color: 'white',
            },
          },
          '&:hover': {
            bgcolor: 'rgba(22, 184, 119, 0.08)',
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{
            fontSize: '0.9rem',
            fontWeight: location.pathname === item.path ? 600 : 500
          }}
        />
      </ListItemButton>
    </ListItem>
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#FAFBFC' }}>
      <Toolbar sx={{
        background: 'linear-gradient(135deg, #16b877 0%, #026149 100%)',
        color: 'white',
        minHeight: '70px !important'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.4rem',
              background: 'linear-gradient(135deg, #16b877 0%, #026149 100%)',
              color: 'white',
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            A
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: '1.1rem' }}>
              Aviva Admin
            </Typography>
            <Typography variant="caption" noWrap sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
              Panel de Control
            </Typography>
          </Box>
        </Box>
      </Toolbar>
      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
            Principal
          </Typography>
        </Box>
        {menuItems.filter(item => item.category === 'main').map(renderMenuItem)}

        <Box sx={{ px: 2, py: 1, mt: 3 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
            Gamificación
          </Typography>
        </Box>
        {menuItems.filter(item => item.category === 'gamification').map(renderMenuItem)}

        <Box sx={{ px: 2, py: 1, mt: 3 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
            Administración
          </Typography>
        </Box>
        {menuItems.filter(item => item.category === 'config').map(renderMenuItem)}
      </Box>

      <Divider />
      <Box sx={{ p: 2 }}>
        <Box sx={{ bgcolor: 'rgba(22, 184, 119, 0.08)', p: 2, borderRadius: 2, border: '1px solid rgba(22, 184, 119, 0.15)' }}>
          <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>
            Versión 2.0
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            © 2024 Aviva Crédito
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: 'linear-gradient(135deg, #16b877 0%, #026149 100%)' }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Panel Administrativo
          </Typography>
          <IconButton onClick={handleMenuOpen}>
            <Avatar src={user?.photoURL || undefined} alt={user?.displayName || 'User'} sx={{ width: 38, height: 38, border: '2px solid white' }} />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem disabled>
              <Typography variant="body2">{user?.email}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleSignOut}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Cerrar sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}>
          {drawer}
        </Drawer>
        <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }} open>
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Toolbar />
        <Breadcrumbs />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
