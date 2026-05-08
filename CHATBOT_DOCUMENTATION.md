# Chatbot Asistente - Documentación Técnica

Chatbot conversacional integrado en la app Android. Consulta HubSpot y responde FAQs vía OpenAI Assistant con function calling.

## Arquitectura

```
HelpAssistantFragment.kt
    └── ChatService.kt
            └── Firebase Functions /chat
                    ├── HubSpotPatternDetector  → decide si consultar HubSpot o pasar a OpenAI
                    ├── OpenAI Assistants API   → manejo de thread y run
                    └── HubSpot API             → search_hubspot_deals function call
```

## Archivos

### Android

| Archivo | Descripción |
|---------|-------------|
| `HelpAssistantFragment.kt` | Fragment principal, gestiona UI y ciclo de vida |
| `models/ChatMessage.kt` | Data classes: `fromBot()`, `fromUser()`, `typingIndicator()` |
| `services/ChatService.kt` | Llama a la Firebase Function `/chat`, mantiene `threadId` |
| `adapters/ChatAdapter.kt` | `ListAdapter<ChatMessage>` con DiffCallback |
| `fragment_help_assistant.xml` | Layout con RecyclerView y FAB de envío |
| `item_chat_message_user.xml` / `item_chat_message_bot.xml` / `item_chat_typing.xml` | Layouts de burbujas |

### Firebase Functions

| Archivo | Descripción |
|---------|-------------|
| `functions/src/chatAssistant.ts` | Endpoint `chat`, orquesta OpenAI + HubSpot |
| `functions/src/index.ts` | Export de la función |

## Configuración

### Variables de entorno en Functions

```bash
firebase functions:config:set \
  openai.apikey="sk-..." \
  openai.assistantid="asst_..."

firebase functions:config:get  # verificar
```

### Dependencias Android (`build.gradle.kts`)

```kotlin
implementation(platform("com.google.firebase:firebase-bom:32.7.0"))
implementation("com.google.firebase:firebase-auth-ktx")
implementation("com.google.firebase:firebase-functions-ktx")
implementation("com.google.gson:gson:2.10.1")
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")
```

### Deploy

```bash
cd functions && npm run build
firebase deploy --only functions:chat
firebase functions:log --only chat  # verificar
```

## Detalles Técnicos

### Gestión de contexto conversacional

`ChatService` persiste el `threadId` entre mensajes para mantener contexto en el mismo hilo de OpenAI:

```kotlin
chatResponse.data?.threadId?.let { threadId = it }
```

### Detección de patrones HubSpot

`HubSpotPatternDetector` en `chatAssistant.ts` clasifica la consulta antes de llamar a OpenAI. Agrega keywords al array `preciseHubspotKeywords` para extender los patrones reconocidos.

### Limpieza de respuestas

```typescript
function cleanResponse(response: string): string {
    // Elimina markdown (**, *), referencias a fuentes y citaciones [...]
}
```

### Indicador de typing

```kotlin
val typingIndicator = ChatMessage.typingIndicator()
addMessage(typingIndicator)
// al recibir respuesta:
removeTypingIndicator()
```

### Seguridad

- Requiere Firebase Auth (Google Sign-In con `@avivacredito.com`)
- Backend verifica `request.userId` antes de procesar
- Los mensajes no se persisten en Firestore
- `threadId` único por sesión de usuario

## Troubleshooting

**"Error procesando mensaje"**: Verificar autenticación del usuario, Functions deployadas, config de OpenAI (`firebase functions:config:get`), y logs (`firebase functions:log --only chat`).

**Bot no responde / timeout**: Aumentar `TIMEOUT_SECONDS` en `chatAssistant.ts`. Verificar que `OPENAI_API_KEY` y `assistantid` son válidos.

**FAB de ayuda no aparece**:
```kotlin
binding.fabHelp.visibility = View.VISIBLE
```

**Mensajes duplicados**: Usar `chatAdapter.submitList(messages.toList())` (copia del estado, no referencia mutable).

**Thread ID no persiste**: Verificar que la actualización del `threadId` se ejecuta en el scope correcto del ViewModel/Fragment.

## Logs

```bash
firebase functions:log --only chat --tail
firebase functions:log --only chat | grep "ERROR"
```
