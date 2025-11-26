import * as functions from 'firebase-functions';
import { OpenAI } from 'openai';

// Tipos
interface ChatRequest {
  message: string;
  userId: string;
  userName?: string;
  userRole?: string;
  threadId?: string;
}

interface ChatResponse {
  success: boolean;
  data: {
    response: string;
    threadId: string;
    isHubSpotQuery: boolean;
    queryType: string;
  } | null;
  error: string | null;
  message: string | null;
}

// Cliente OpenAI - Usando Firebase Functions Config
const config = functions.config();
const openai = new OpenAI({
  apiKey: config.openai?.apikey || '',
});

const ASSISTANT_ID = config.openai?.assistantid || '';

// Thread storage (en producción, usar Firestore)
const threadStore: Map<string, string> = new Map();

/**
 * Detector de patrones HubSpot
 */
class HubSpotPatternDetector {
  private strictFaqBlockers = [
    'cancelación', 'cancelacion', 'cancelar',
    'proceso', 'procedimiento', 'pasos',
    'tiempo', 'tardan', 'demora', 'cuanto tiempo', 'cuánto tiempo',
    'cómo funciona', 'como funciona',
    'requisitos', 'documentos', 'papeles',
    'videollamada', 'video llamada',
    'cuenta cashi', 'cuenta cash',
    'saldo', 'desaparezca',
    'aviva tu negocio', 'aviva contigo',
    'crédito aviva', 'credito aviva',
    'necesita', 'necesito', 'requiere',
    'problema', 'error', 'falla',
    'ayuda', 'apoyo', 'asistencia',
    'información', 'informacion',
    'explicar', 'explicación', 'explicacion',
    'mi cliente', 'un cliente', 'el cliente',
    'mi crédito', 'su crédito', 'el crédito',
  ];

  private preciseHubspotKeywords = [
    'cuántos deals', 'cuantos deals',
    'cuántas llamadas', 'cuantas llamadas',
    'cuántos clientes', 'cuantos clientes',
    'total de deals', 'total deals',
    'cantidad de deals', 'cantidad deals',
    'deals creados', 'deals generados',
    'llamadas creadas', 'llamadas generadas',
    'quién creó más deals', 'quien creo mas deals',
    'deals en castigo', 'deals aprobados', 'deals pagados',
  ];

  detect(message: string): { isHubSpot: boolean; queryType: string } {
    const messageLower = message.toLowerCase();

    // Bloquear FAQs
    for (const blocker of this.strictFaqBlockers) {
      if (messageLower.includes(blocker)) {
        return { isHubSpot: false, queryType: 'faq_blocked' };
      }
    }

    // Verificar keywords HubSpot
    for (const keyword of this.preciseHubspotKeywords) {
      if (messageLower.includes(keyword)) {
        return { isHubSpot: true, queryType: 'hubspot_query' };
      }
    }

    return { isHubSpot: false, queryType: 'faq' };
  }
}

const patternDetector = new HubSpotPatternDetector();

/**
 * Procesa mensaje con OpenAI Assistant
 */
async function processWithAssistant(
  message: string,
  userId: string,
  userName: string,
  threadId?: string
): Promise<{ response: string; threadId: string }> {
  try {
    // Obtener o crear thread
    let currentThreadId = threadId;
    if (!currentThreadId) {
      currentThreadId = threadStore.get(userId);
      if (!currentThreadId) {
        const thread = await openai.beta.threads.create();
        currentThreadId = thread.id;
        threadStore.set(userId, currentThreadId);
      }
    }

    // Enriquecer mensaje con contexto
    const enrichedMessage = `El usuario se llama ${userName}. IMPORTANTE: Responde de manera natural y conversacional. NO menciones sistemas, bases de datos o fuentes de información. Saluda al usuario por su nombre cuando sea apropiado.\n\nPregunta actual: ${message}`;

    // Crear mensaje en el thread
    await openai.beta.threads.messages.create(currentThreadId, {
      role: 'user',
      content: enrichedMessage,
    });

    // Ejecutar assistant
    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: ASSISTANT_ID,
    });

    // Esperar completación (polling)
    let runStatus = await openai.beta.threads.runs.retrieve(
      currentThreadId,
      run.id
    );

    let iterations = 0;
    const maxIterations = 30;

    while (
      ['queued', 'in_progress', 'requires_action'].includes(runStatus.status) &&
      iterations < maxIterations
    ) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      iterations++;

      runStatus = await openai.beta.threads.runs.retrieve(
        currentThreadId,
        run.id
      );

      // Manejar tool calls si es necesario
      if (runStatus.status === 'requires_action') {
        // Aquí se manejarían las herramientas del assistant
        // Por ahora, solo continuamos
      }
    }

    if (runStatus.status === 'completed') {
      // Obtener mensajes
      const messages = await openai.beta.threads.messages.list(currentThreadId);
      const lastMessage = messages.data[0];

      if (lastMessage.content[0].type === 'text') {
        let response = lastMessage.content[0].text.value;

        // Limpiar formato markdown y referencias
        response = cleanResponse(response);

        return { response, threadId: currentThreadId };
      }
    }

    return {
      response: 'Lo siento, no pude procesar tu mensaje. ¿Podrías reformular tu pregunta?',
      threadId: currentThreadId,
    };
  } catch (error) {
    console.error('Error en OpenAI Assistant:', error);
    throw new Error('Error procesando mensaje con IA');
  }
}

/**
 * Limpia la respuesta de markdown y referencias
 */
function cleanResponse(response: string): string {
  // Limpiar markdown
  let cleaned = response.replace(/\*\*(.*?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');

  // Limpiar referencias
  const citationPatterns = [
    /\[.*?\]/g,
    /<cite>.*?<\/cite>/g,
    /según\s+(?:hubspot|el\s+sistema|la\s+información|los\s+datos)/gi,
    /de\s+acuerdo\s+(?:a|con)\s+(?:hubspot|el\s+sistema)/gi,
    /basado\s+en\s+(?:hubspot|la\s+información|los\s+datos)/gi,
    /fuente:\s*\w+/gi,
    /en\s+(?:nuestro\s+)?(?:sistema|base\s+de\s+datos|crm)/gi,
  ];

  for (const pattern of citationPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Limpiar espacios extra
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\.+/g, '.');
  cleaned = cleaned.replace(/,+/g, ',');

  return cleaned.trim();
}

/**
 * Endpoint principal del chatbot
 */
export const chat = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      data: null,
      error: 'Method not allowed',
      message: 'Solo se permite POST',
    } as ChatResponse);
    return;
  }

  try {
    const { message, userId, userName, threadId } = req.body as ChatRequest;

    // Validaciones
    if (!message || !userId) {
      res.status(400).json({
        success: false,
        data: null,
        error: 'Missing required fields',
        message: 'Se requieren message y userId',
      } as ChatResponse);
      return;
    }

    // Verificar configuración
    if (!ASSISTANT_ID || !process.env.OPENAI_API_KEY) {
      res.status(500).json({
        success: false,
        data: null,
        error: 'Configuration error',
        message: 'El chatbot no está configurado correctamente',
      } as ChatResponse);
      return;
    }

    console.log(`📨 Mensaje de ${userName || userId}: ${message}`);

    // Detectar tipo de consulta
    const detection = patternDetector.detect(message);

    // Procesar con OpenAI Assistant
    const { response, threadId: newThreadId } = await processWithAssistant(
      message,
      userId,
      userName || 'Usuario',
      threadId
    );

    console.log(`✅ Respuesta generada: ${response.substring(0, 100)}...`);

    res.status(200).json({
      success: true,
      data: {
        response,
        threadId: newThreadId,
        isHubSpotQuery: detection.isHubSpot,
        queryType: detection.queryType,
      },
      error: null,
      message: null,
    } as ChatResponse);
  } catch (error) {
    console.error('❌ Error en chat endpoint:', error);

    res.status(500).json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Error procesando el mensaje',
    } as ChatResponse);
  }
});
