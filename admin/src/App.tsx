import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import LoadingOverlay from './components/LoadingOverlay';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Metas from './pages/Metas';
import Ligas from './pages/Ligas';
import Giros from './pages/Giros';
import Kioscos from './pages/Kioscos';
import Productos from './pages/Productos';
import MapaVendedores from './pages/MapaVendedores';
import RutasPromotores from './pages/RutasPromotores';
import Administradores from './pages/Administradores';
import Auditoria from './pages/Auditoria';
import Configuracion from './pages/Configuracion';

const theme = createTheme({
  palette: {
    primary: {
      main: '#16b877', // Verde Aviva
      light: '#b0f5cd',
      dark: '#074739',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#026149', // Verde secundario Aviva
      light: '#009768',
      dark: '#074739',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F0F5FA',
      paper: '#FFFFFF',
    },
    success: {
      main: '#16b877',
      light: '#b0f5cd',
      dark: '#009768',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
    },
    info: {
      main: '#16b877',
      light: '#E8F6EC',
      dark: '#026149',
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontWeight: 800,
      fontSize: '2.5rem',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 4px 8px rgba(0,0,0,0.08)',
    '0px 8px 16px rgba(0,0,0,0.1)',
    '0px 12px 24px rgba(0,0,0,0.12)',
    '0px 16px 32px rgba(0,0,0,0.14)',
    '0px 20px 40px rgba(0,0,0,0.16)',
    '0px 24px 48px rgba(0,0,0,0.18)',
    '0px 28px 56px rgba(0,0,0,0.20)',
    '0px 32px 64px rgba(0,0,0,0.22)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 2px 4px rgba(0,0,0,0.05)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(22, 184, 119, 0.3)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #16b877 0%, #026149 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #009768 0%, #074739 100%)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
        filled: {
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          backgroundColor: '#F9FAFB',
          color: '#374151',
        },
      },
    },
  },
});

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="kioscos" element={<Kioscos />} />
        <Route path="productos" element={<Productos />} />
        <Route path="mapa" element={<MapaVendedores />} />
        <Route path="rutas" element={<RutasPromotores />} />
        <Route path="metas" element={<Metas />} />
        <Route path="ligas" element={<Ligas />} />
        <Route path="giros" element={<Giros />} />
        <Route path="administradores" element={<Administradores />} />
        <Route path="auditoria" element={<Auditoria />} />
        <Route path="config" element={<Configuracion />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <AppProvider>
              <AppRoutes />
              <ToastContainer />
              <LoadingOverlay />
            </AppProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
