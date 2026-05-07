# Panel Administrativo Aviva - Web

Panel web de administración para gestionar la aplicación Android de Aviva Crédito.

## Descripción

Interfaz web administrativa construida con React + TypeScript + Vite que permite gestionar:

- Usuarios, roles y administradores
- Kioscos, productos y ubicaciones
- Ligas, bonos y giros
- Metas comerciales
- HubSpot - Métricas y sincronización
- Mapa y rutas de vendedores en tiempo real
- Auditoría y configuración del sistema

## Inicio Rápido

### Requisitos

- Node.js 18+
- npm o yarn
- Firebase CLI configurado

### Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Compilar para producción
npm run build
```

## Tecnologías

- **React 18** - Framework UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **Material-UI v5** - Componentes UI
- **React Router v6** - Navegación
- **Firebase SDK v10** - Backend (Auth, Firestore, Functions)
- **Google Maps API** - Mapas en tiempo real

## Estructura del Proyecto

```
admin/
├── src/
│   ├── components/          # Componentes reutilizables
│   ├── contexts/            # React Contexts (Auth, etc)
│   ├── pages/               # Páginas principales
│   │   ├── Dashboard.tsx
│   │   ├── Usuarios.tsx
│   │   ├── Administradores.tsx
│   │   ├── Kioscos.tsx
│   │   ├── Productos.tsx
│   │   ├── MapaVendedores.tsx
│   │   ├── RutasPromotores.tsx
│   │   ├── ZonasVendedores.tsx
│   │   ├── Visitas.tsx
│   │   ├── Metas.tsx
│   │   ├── MetasComerciales.tsx
│   │   ├── Ligas.tsx
│   │   ├── Bonos.tsx
│   │   ├── Giros.tsx
│   │   ├── HubSpotMetrics.tsx
│   │   ├── HubSpotProperties.tsx
│   │   ├── Auditoria.tsx
│   │   ├── AlertasUbicacion.tsx
│   │   └── Configuracion.tsx
│   ├── types/               # Definiciones TypeScript
│   ├── utils/               # Utilidades
│   ├── App.tsx              # Componente principal con rutas
│   └── main.tsx             # Entry point
├── public/                  # Assets estáticos
└── dist/                    # Build de producción
```

## Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz de `admin/`:

```env
# Firebase
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Google Maps (para mapa de vendedores y rutas)
VITE_GOOGLE_MAPS_API_KEY=tu_google_maps_api_key
```

## Autenticación

El panel requiere:

- Google OAuth con email `@avivacredito.com`
- Rol de admin en Firestore (`role: "admin"` o `role: "SUPER_ADMIN"`)

## Scripts Disponibles

```bash
npm run dev              # Servidor de desarrollo (puerto 5173)
npm run build            # Compilar para producción
npm run preview          # Vista previa del build
npm run lint             # Linter ESLint
npm run type-check       # Verificar tipos TypeScript
```

## Deployment

### Desarrollo

```bash
npm run dev
# Abre http://localhost:5173
```

### Producción

```bash
npm run build

# Desde la raíz del proyecto
firebase deploy --only hosting
```

## Módulos Principales

### Gestión de Usuarios y Administradores

- CRUD de usuarios y administradores
- Asignación de roles y permisos
- Configuración de HubSpot Owner IDs
- Asignación de kioscos

### Kioscos y Productos

- CRUD de ubicaciones/kioscos
- Configuración de radios permitidos para check-in
- Catálogo de productos financieros
- Filtros por región

### Mapa, Rutas y Zonas

- Mapa de vendedores en tiempo real con Google Maps
- Rutas del día de cada promotor
- Zonas geográficas asignadas
- Marcadores codificados por color y estado

### Ligas, Bonos y Giros

- Sistema de ligas con criterios de puntuación configurables
- Rankings automáticos en tiempo real
- Gestión de bonos por desempeño
- Control de giros y pagos

### Metas Comerciales

- Metas por promotor, liga, kiosko o todos
- Métricas de llamadas y colocación
- Progreso en tiempo real

### HubSpot

- Dashboard de métricas CRM
- Sincronización de visitas y propiedades
- Filtros avanzados y reportes personalizados

### Auditoría y Configuración

- Registro de acciones del sistema
- Alertas de ubicación
- Configuración global de la plataforma

## Troubleshooting

### El admin no compila

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Error de autenticación

1. El email debe tener dominio `@avivacredito.com`
2. El usuario debe existir en Firestore colección `users`
3. El usuario debe tener `role: "admin"` o `role: "SUPER_ADMIN"`

### Mapa no carga

1. `VITE_GOOGLE_MAPS_API_KEY` está configurada en `.env`
2. Maps JavaScript API habilitada en Google Cloud
3. Billing configurado en Google Cloud

### No conecta con Firebase

1. Todas las variables `VITE_FIREBASE_*` están en `.env`
2. Firebase Rules permiten lectura/escritura para admins
3. Conexión a internet disponible

## Documentación Adicional

- [`ADMIN_PANEL_README.md`](../ADMIN_PANEL_README.md) - Arquitectura detallada
- [`DEPLOYMENT_WINDOWS.md`](../DEPLOYMENT_WINDOWS.md) - Guía de deployment
- [`FIREBASE_SETUP_DETALLADO.md`](../FIREBASE_SETUP_DETALLADO.md) - Configuración Firebase
- [`HUBSPOT_INTEGRATION_SETUP.md`](../HUBSPOT_INTEGRATION_SETUP.md) - Integración HubSpot

## Notas

- TypeScript estricto en todo el proyecto
- Material-UI v5 para todos los componentes UI
- React Router v6 para navegación
- Firebase v10 para backend
