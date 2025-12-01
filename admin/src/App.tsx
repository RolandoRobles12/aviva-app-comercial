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
import HubSpot from './pages/HubSpot';
import Kioscos from './pages/Kioscos';
import Administradores from './pages/Administradores';
import Auditoria from './pages/Auditoria';
import Configuracion from './pages/Configuracion';
import UbicacionesConfig from './pages/UbicacionesConfig';
import AlertasUbicacion from './pages/AlertasUbicacion';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
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
        <Route path="metas" element={<Metas />} />
        <Route path="ligas" element={<Ligas />} />
        <Route path="giros" element={<Giros />} />
        <Route path="hubspot" element={<HubSpot />} />
        <Route path="kioscos" element={<Kioscos />} />
        <Route path="administradores" element={<Administradores />} />
        <Route path="auditoria" element={<Auditoria />} />
        <Route path="ubicaciones" element={<UbicacionesConfig />} />
        <Route path="alertas-ubicacion" element={<AlertasUbicacion />} />
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
