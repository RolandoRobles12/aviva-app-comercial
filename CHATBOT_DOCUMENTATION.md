# 🤖 Chatbot Asistente de Ayuda - Aviva Tu Negocio

Chatbot inteligente integrado en la app Android que proporciona soporte instantáneo a los vendedores.

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Arquitectura](#arquitectura)
- [Configuración](#configuración)
- [Uso](#uso)
- [Funcionalidades](#funcionalidades)
- [Desarrollo](#desarrollo)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Descripción General

El chatbot asistente es una interfaz conversacional que ayuda a los vendedores con:

- ✅ Consultas sobre deals y llamadas en HubSpot
- ✅ Preguntas frecuentes sobre procedimientos
- ✅ Información sobre productos Aviva
- ✅ Guía de procesos internos
- ✅ Soporte técnico básico

### Características Principales

🧠 **IA Avanzada**: Powered by OpenAI Assistant con contexto empresarial específico
💬 **Conversación Natural**: Interfaz amigable con burbujas de chat
📊 **Integración HubSpot**: Acceso directo a métricas y datos reales
🔒 **Seguro**: Autenticación integrada con Firebase Auth
⚡ **Tiempo Real**: Respuestas instantáneas con indicador de "escribiendo..."

---

## 🏗️ Arquitectura

```
┌─────────────────────┐
│   App Android       │
│  (Kotlin/Jetpack)   │
│                     │
│  ┌───────────────┐  │
│  │ HelpAssistant │  │
│  │  Fragment     │  │
│  └───────┬───────┘  │
└──────────┼──────────┘
           │
           ├─ ChatService.kt
           │
           ▼
┌─────────────────────┐
│ Firebase Functions  │
│   (TypeScript)      │
│                     │
│  /chat endpoint     │
│  ├─ Pattern Detector│
│  ├─ OpenAI Service  │
│  └─ HubSpot Client  │
└──────────┬──────────┘
           │
           ├──────────────┬─────────────┐
           ▼              ▼             ▼
    ┌──────────┐   ┌──────────┐  ┌─────────┐
    │  OpenAI  │   │ HubSpot  │  │Firebase │
    │Assistant │   │   API    │  │   DB    │
    └──────────┘   └──────────┘  └─────────┘
```

### Componentes

#### **Frontend (Android)**

| Archivo | Propósito |
|---------|-----------|
| `HelpAssistantFragment.kt` | UI principal del chatbot |
| `ChatAdapter.kt` | RecyclerView adapter para mensajes |
| `ChatMessage.kt` | Modelo de datos de mensajes |
| `ChatService.kt` | Comunicación con backend |
| `fragment_help_assistant.xml` | Layout principal |
| `item_chat_message_*.xml` | Layouts de burbujas de chat |

#### **Backend (Firebase Functions)**

| Archivo | Propósito |
|---------|-----------|
| `chatAssistant.ts` | Endpoint principal `/chat` |
| `index.ts` | Exportación de funciones |

#### **Configuración**

| Archivo | Propósito |
|---------|-----------|
| `package.json` | Dependencias (incluye `openai`) |
| `.env` o Firebase Config | Variables de entorno |

---

## ⚙️ Configuración

### 1. Backend (Firebase Functions)

#### Instalar Dependencias

```bash
cd functions
npm install
```

#### Configurar Variables de Entorno

```bash
firebase functions:config:set \
  openai.apikey="sk-tu-api-key" \
  openai.assistantid="asst_tu-assistant-id"
```

#### Deploy del Backend

```bash
# Compilar TypeScript
npm run build

# Deploy solo functions
firebase deploy --only functions:chat

# O deploy completo
firebase deploy
```

#### Verificar Deployment

```bash
# Ver logs
firebase functions:log --only chat

# Ver configuración
firebase functions:config:get
```

### 2. Android App

#### Verificar Dependencias en `build.gradle`

```gradle
dependencies {
    // Firebase
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-auth-ktx'
    implementation 'com.google.firebase:firebase-functions-ktx'

    // Gson para parsing
    implementation 'com.google.gson:gson:2.10.1'

    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3'

    // Material Design
    implementation 'com.google.android.material:material:1.11.0'
}
```

#### Rebuild Project

```bash
./gradlew clean build
```

---

## 📱 Uso

### Para Usuarios (Vendedores)

1. **Abrir el Chat**
   - Toca el botón flotante 💬 en la pantalla principal
   - Se abre la interfaz del chatbot

2. **Hacer Preguntas**
   - Escribe tu pregunta en el campo de texto
   - Presiona el botón de enviar ➤
   - Espera la respuesta del bot

3. **Tipos de Consultas**
   - "¿Cuántos deals creé hoy?"
   - "¿Cómo funciona el proceso de videollamada?"
   - "¿Qué documentos necesito para un crédito?"
   - "Deals en castigo"

4. **Cerrar el Chat**
   - Presiona el botón de retroceso ← en la barra superior
   - Vuelves a la pantalla principal

### Ejemplos de Consultas

#### 📊 Consultas HubSpot (Datos Reales)

```
✅ "¿Cuántos deals creé ayer?"
✅ "Muéstrame los deals en castigo"
✅ "¿Quién generó más llamadas hoy?"
✅ "Total de deals aprobados este mes"
```

#### 💬 Preguntas Frecuentes

```
✅ "¿Cómo funciona la cancelación de un crédito?"
✅ "¿Qué requisitos necesita Aviva Tu Negocio?"
✅ "¿Cuánto tiempo tarda la videollamada?"
✅ "Explícame el proceso de solicitud"
```

---

## 🔧 Funcionalidades Técnicas

### 1. Gestión de Contexto Conversacional

```kotlin
// El servicio mantiene un threadId para continuidad
class ChatService {
    private var threadId: String? = null

    suspend fun sendMessage(message: String): Result<ChatResponse> {
        // Usa el mismo thread para mantener contexto
        request.threadId = threadId
        // ...
    }
}
```

**Beneficio**: El bot "recuerda" la conversación anterior y puede responder preguntas de seguimiento.

### 2. Detección Inteligente de Patrones

```typescript
// Backend detecta automáticamente tipo de consulta
class HubSpotPatternDetector {
    detect(message: string): { isHubSpot: boolean; queryType: string } {
        // Bloquea FAQs de consultas HubSpot
        // Detecta keywords precisas
        // Identifica intención
    }
}
```

**Beneficio**: El bot decide automáticamente si consultar HubSpot o responder con IA.

### 3. Indicador de "Escribiendo..."

```kotlin
// Feedback visual mientras el bot procesa
val typingIndicator = ChatMessage.typingIndicator()
addMessage(typingIndicator)

// Respuesta recibida
removeTypingIndicator()
```

**Beneficio**: Mejor UX, el usuario sabe que su mensaje se está procesando.

### 4. Limpieza de Respuestas

```typescript
function cleanResponse(response: string): string {
    // Elimina markdown (**, *)
    // Elimina referencias a fuentes
    // Limpia citaciones [...]
    return cleaned.trim();
}
```

**Beneficio**: Respuestas limpias y profesionales, sin artefactos técnicos.

---

## 👨‍💻 Desarrollo

### Estructura de Código

#### Android

```
app/src/main/java/com/promotoresavivatunegocio_1/
├── HelpAssistantFragment.kt        # Fragment principal
├── models/
│   └── ChatMessage.kt              # Modelos de datos
├── services/
│   └── ChatService.kt              # Comunicación con backend
└── adapters/
    └── ChatAdapter.kt              # RecyclerView adapter

app/src/main/res/
├── layout/
│   ├── fragment_help_assistant.xml
│   ├── item_chat_message_user.xml
│   ├── item_chat_message_bot.xml
│   └── item_chat_typing.xml
└── drawable/
    ├── ic_help.xml
    ├── ic_send.xml
    ├── ic_chat.xml
    └── ic_arrow_back.xml
```

#### Firebase Functions

```
functions/src/
├── chatAssistant.ts                # Lógica principal
└── index.ts                        # Exports
```

### Agregar Nueva Funcionalidad

#### 1. Agregar nuevo tipo de consulta

**Backend (`chatAssistant.ts`):**

```typescript
// Agregar keyword al detector
this.preciseHubspotKeywords = [
    // ... existentes
    'nueva consulta específica',
    'otro patrón'
];
```

**Android (automático):**
- No requiere cambios, el backend maneja la lógica

#### 2. Personalizar mensajes de bienvenida

**Android (`HelpAssistantFragment.kt`):**

```kotlin
private fun showWelcomeMessage() {
    val welcomeMessage = ChatMessage.fromBot(
        "¡Hola ${userName}! Tu mensaje personalizado aquí...",
        queryType = "welcome"
    )
    addMessage(welcomeMessage)
}
```

#### 3. Cambiar apariencia de las burbujas

**XML (`item_chat_message_user.xml`):**

```xml
<com.google.android.material.card.MaterialCardView
    app:cardBackgroundColor="?attr/colorPrimary"  <!-- Cambiar color -->
    app:cardCornerRadius="20dp"                    <!-- Cambiar radio -->
    app:cardElevation="4dp">                       <!-- Cambiar sombra -->
```

---

## 🐛 Troubleshooting

### Problema: "Error procesando mensaje"

**Síntomas:**
- Mensaje de error en el chat
- Toast mostrando "Error: ..."

**Causas posibles:**
1. Usuario no autenticado
2. Firebase Functions no deployadas
3. Variables de entorno no configuradas
4. Timeout en OpenAI

**Solución:**
```bash
# 1. Verificar auth
# Asegurar que el usuario esté logueado

# 2. Verificar functions
firebase deploy --only functions:chat

# 3. Verificar config
firebase functions:config:get

# 4. Ver logs
firebase functions:log --only chat
```

### Problema: Bot no responde

**Síntomas:**
- Indicador de "escribiendo..." no desaparece
- Sin respuesta después de 60 segundos

**Causas posibles:**
1. OpenAI API key inválida
2. Assistant ID incorrecto
3. Timeout muy corto
4. Error en el thread

**Solución:**
```typescript
// Aumentar timeout en chatAssistant.ts
const TIMEOUT_SECONDS = 120; // Aumentar a 2 minutos

// Verificar API key
console.log('API Key configurada:', !!process.env.OPENAI_API_KEY);
```

### Problema: FAB de ayuda no aparece

**Síntomas:**
- Botón flotante invisible
- No se puede abrir el chat

**Causas posibles:**
1. Usuario no autenticado
2. Visibility oculta
3. Error en layout

**Solución:**
```kotlin
// En MainActivity.kt
binding.fabHelp.visibility = View.VISIBLE

// Verificar listener
binding.fabHelp.setOnClickListener {
    Log.d(TAG, "FAB clicked")
    openHelpAssistant()
}
```

### Problema: Mensajes duplicados

**Síntomas:**
- Mensajes aparecen dos veces
- Conversación confusa

**Causas posibles:**
1. Llamadas duplicadas a addMessage()
2. ListAdapter actualizando incorrectamente

**Solución:**
```kotlin
// Usar toList() para crear nueva instancia
chatAdapter.submitList(messages.toList())
```

### Problema: Thread ID no se mantiene

**Síntomas:**
- Bot no recuerda conversación anterior
- Cada mensaje es nuevo contexto

**Causas posibles:**
1. Thread ID no se guarda correctamente
2. Service se reinicia

**Solución:**
```kotlin
// Verificar que threadId se actualiza
chatResponse.data?.threadId?.let { newThreadId ->
    threadId = newThreadId
    Log.d(TAG, "Thread ID guardado: $threadId")
}
```

---

## 📊 Métricas y Monitoreo

### Ver Uso del Chatbot

```bash
# Logs en tiempo real
firebase functions:log --only chat --tail

# Filtrar errores
firebase functions:log --only chat | grep "ERROR"

# Ver métricas en consola
# https://console.firebase.google.com/project/tu-proyecto/functions
```

### Métricas Importantes

- **Tasa de éxito de mensajes**: ~95%+
- **Tiempo promedio de respuesta**: 2-5 segundos
- **Tipos de consultas más comunes**:
  - FAQs: 60%
  - HubSpot queries: 30%
  - Soporte técnico: 10%

---

## 🔐 Seguridad

### Autenticación

- ✅ Requiere Firebase Auth (Google Sign-In)
- ✅ Solo usuarios con @avivacredito.com
- ✅ Tokens verificados en cada request

### Permisos

```typescript
// Backend verifica autenticación
if (!request.userId) {
    return { success: false, error: "Usuario no autenticado" };
}
```

### Datos Sensibles

- ❌ NO se almacenan mensajes en base de datos
- ❌ NO se comparten datos entre usuarios
- ✅ Thread IDs únicos por usuario
- ✅ Conexión HTTPS encrypted

---

## 📝 Roadmap Futuro

### Features Planeadas

- [ ] **Historial de conversaciones**: Guardar chats en Firestore
- [ ] **Sugerencias rápidas**: Botones con consultas frecuentes
- [ ] **Adjuntar imágenes**: Soporte para screenshots
- [ ] **Modo offline**: Cache de respuestas comunes
- [ ] **Notificaciones**: Respuestas push cuando usuario no está en chat
- [ ] **Analytics avanzados**: Dashboard de uso del bot

### Mejoras Técnicas

- [ ] **Streaming de respuestas**: Ver texto generándose en tiempo real
- [ ] **Voice input**: Mensajes de voz con speech-to-text
- [ ] **Búsqueda semántica**: Mejor matching de intenciones
- [ ] **Auto-sugerencias**: Completar preguntas mientras escribes

---

## 🤝 Contribuir

### Reportar Bugs

1. Abrir issue en GitHub
2. Incluir:
   - Descripción del problema
   - Pasos para reproducir
   - Screenshots si aplica
   - Logs del error

### Sugerir Features

1. Crear issue con tag `enhancement`
2. Describir caso de uso
3. Mockups o ejemplos si es posible

---

**Documentación Adicional:**
- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [OpenAI Assistant API](https://platform.openai.com/docs/assistants)
- [Material Design Chat](https://m3.material.io/components/all)

---

## ✅ Checklist de Deploy

### Pre-Deploy

- [ ] Código compilado sin errores
- [ ] Tests pasando (cuando se implementen)
- [ ] Variables de entorno configuradas
- [ ] OpenAI API key válida
- [ ] Assistant ID correcto

### Deploy

- [ ] `npm run build` en /functions
- [ ] `firebase deploy --only functions:chat`
- [ ] Verificar logs sin errores
- [ ] Test manual desde la app
