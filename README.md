# Aviva App Comercial

Sistema completo de gestión comercial para promotores y vendedores de Aviva Crédito.

## Descripción del Proyecto

**Aviva App Comercial** es una plataforma integral que incluye:

- **App Android** - Aplicación móvil nativa para vendedores (Kotlin)
- **Panel Admin Web** - Interfaz de administración y reportería (React + TypeScript)
- **Firebase Functions** - Backend serverless (Node.js + TypeScript)
- **Chatbot IA** - Asistente inteligente con OpenAI
- **Integración HubSpot** - CRM y métricas en tiempo real

## Arquitectura

```
aviva-app-comercial/
├── app/                    # Aplicación Android (Kotlin)
├── admin/                  # Panel Web (React + TypeScript)
├── functions/              # Firebase Cloud Functions (TypeScript)
├── firestore.rules         # Reglas de seguridad Firestore
├── firebase.json           # Configuración Firebase
└── *.md                    # Documentación
```

## Inicio Rápido

### Requisitos Previos

- **Android Studio** (Arctic Fox o superior)
- **Node.js** 18+
- **Firebase CLI**: `npm install -g firebase-tools`
- **JDK** 17+
- Cuenta de **Firebase** y **HubSpot**

### Configuración Inicial

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/RolandoRobles12/aviva-app-comercial.git
   cd aviva-app-comercial
   ```

2. **Configurar Firebase**
   ```bash
   firebase login
   firebase use --add
   ```

3. **Instalar dependencias**
   ```bash
   # Admin Panel
   cd admin && npm install

   # Firebase Functions
   cd ../functions && npm install
   ```

4. **Configurar variables de entorno**
   - Ver: [`FIREBASE_SETUP_DETALLADO.md`](./FIREBASE_SETUP_DETALLADO.md)

5. **Abrir proyecto Android**
   - Abre la carpeta `app/` en Android Studio
   - Sincroniza Gradle
   - Ejecuta en emulador o dispositivo

## Documentación

### Guías de Inicio

| Documento | Descripción |
|-----------|-------------|
| [FIREBASE_SETUP_DETALLADO.md](./FIREBASE_SETUP_DETALLADO.md) | Configuración paso a paso de Firebase Functions |
| [DEPLOYMENT_WINDOWS.md](./DEPLOYMENT_WINDOWS.md) | Guía de deployment para Windows/PowerShell |

### Configuración de Integraciones

| Documento | Descripción |
|-----------|-------------|
| [HUBSPOT_INTEGRATION_SETUP.md](./HUBSPOT_INTEGRATION_SETUP.md) | Integración completa con HubSpot CRM |
| [OPENAI_ASSISTANT_SETUP.md](./OPENAI_ASSISTANT_SETUP.md) | Configuración del chatbot con OpenAI |
| [LOOKER_STUDIO_SIMPLE.md](./LOOKER_STUDIO_SIMPLE.md) | Integración de dashboards de Looker Studio |

### Panel Administrativo

| Documento | Descripción |
|-----------|-------------|
| [ADMIN_PANEL_README.md](./ADMIN_PANEL_README.md) | Arquitectura y módulos del panel admin |
| [admin/README.md](./admin/README.md) | Guía técnica del panel web |

### Funcionalidades de la App

| Documento | Descripción |
|-----------|-------------|
| [ROLES_SYSTEM.md](./ROLES_SYSTEM.md) | Sistema de roles y permisos completo |
| [ECOSISTEMA_VENDEDORES.md](./ECOSISTEMA_VENDEDORES.md) | Métricas, ligas, badges y plan de carrera |
| [SISTEMA_LIGAS_PERSONALIZABLE.md](./SISTEMA_LIGAS_PERSONALIZABLE.md) | Sistema de ligas con criterios configurables |
| [CHATBOT_DOCUMENTATION.md](./CHATBOT_DOCUMENTATION.md) | Chatbot asistente con IA |
| [CHROME_CUSTOM_TABS.md](./CHROME_CUSTOM_TABS.md) | Solución OAuth con Chrome Custom Tabs |
| [TABLET_OFFLINE_IMPROVEMENTS.md](./TABLET_OFFLINE_IMPROVEMENTS.md) | Optimización para tablets y modo offline |

## Comandos Comunes

### Panel Admin

```bash
cd admin
npm run dev              # Desarrollo (localhost:5173)
npm run build            # Compilar para producción
npm run lint             # Linter ESLint
```

### Firebase Functions

```bash
cd functions
npm run build            # Compilar TypeScript
firebase deploy --only functions    # Desplegar
firebase functions:log   # Ver logs
```

### Deployment Completo

```bash
# Desde la raíz del proyecto
firebase deploy          # Desplegar todo (hosting + functions)
```

## Variables de Entorno

### Admin Panel (`.env` en `/admin`)

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GOOGLE_MAPS_API_KEY=...
```

### Firebase Functions

```bash
firebase functions:config:set hubspot.apikey="..."
firebase functions:config:set openai.apikey="..."
firebase functions:config:set openai.assistantid="..."
```

## Módulos Principales

### App Android

- Asistencia y Check-in con geolocalización
- Registro de visitas a clientes
- Prospección con DENUE
- Métricas personales y reportería
- Ligas y competencias
- Badges y logros
- Plan de carrera
- Chat con IA (OpenAI Assistant)
- Modo offline completo
- Permisos de ubicación obligatorios (Android 11+)

### Panel Admin

| Módulo | Ruta |
|--------|------|
| Dashboard | `/` |
| Usuarios | `/usuarios` |
| Administradores | `/administradores` |
| Kioscos | `/kioscos` |
| Productos | `/productos` |
| Mapa de Vendedores | `/mapa` |
| Rutas de Promotores | `/rutas` |
| Zonas de Vendedores | `/zonas` |
| Visitas | `/visitas` |
| Metas | `/metas` |
| Metas Comerciales | `/metas-comerciales` |
| Ligas | `/ligas` |
| Bonos | `/bonos` |
| Giros | `/giros` |
| HubSpot Métricas | `/hubspot-metrics` |
| HubSpot Propiedades | `/hubspot-properties` |
| Auditoría | `/auditoria` |
| Configuración | `/config` |

### Firebase Functions

- **HubSpot** - Consultas y sincronización de métricas CRM
- **OpenAI** - Chatbot con function calling
- **Cálculo de métricas** automatizado
- **Metas comerciales** con progreso en tiempo real
- **Ligas** - Actualización de puntos y rankings

## Seguridad

- **Autenticación**: Firebase Auth con Google OAuth
- **Autorización**: Sistema de roles con múltiples niveles
- **Dominio restringido**: `@avivacredito.com`
- **Firestore Rules**: Reglas granulares por colección
- **API Keys**: Protegidas en Firebase Functions Config
- **Permisos de ubicación**: Obligatorios en la app Android (no se puede eludir)

## Stack Tecnológico

### Frontend

- **Android**: Kotlin, Jetpack Compose, Material Design 3
- **Web**: React 18, TypeScript, Material-UI v5, Vite

### Backend

- **Firebase**: Firestore, Cloud Functions v2, Auth, Hosting, Storage
- **Node.js**: v18+ con TypeScript
- **APIs**: HubSpot, OpenAI, Google Maps

### Herramientas

- **Build**: Gradle (Android), Vite (Web)
- **Monitoreo**: Firebase Crashlytics, Cloud Logging
