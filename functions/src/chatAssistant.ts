import * as functions from 'firebase-functions';
import { OpenAI } from 'openai';
import { HubSpotService } from './hubspot.service';

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

// HubSpot Service (opcional, solo si está configurado)
let hubspotService: HubSpotService | null = null;
const hubspotApiKey = config.hubspot?.apikey;
if (hubspotApiKey) {
  hubspotService = new HubSpotService(hubspotApiKey);
  console.log('✅ HubSpot service inicializado');
} else {
  console.log('⚠️ HubSpot no configurado');
}

// Thread storage (en producción, usar Firestore)
const threadStore: Map<string, string> = new Map();

/**
 * Detector de patrones HubSpot
 */
class HubSpotPatternDetector {
  private strictFaqBlockers = [
    // Procesos y procedimientos
    'cómo cancelar', 'como cancelar', 'proceso de cancelación', 'proceso de cancelacion',
    'cuáles son los pasos', 'cuales son los pasos', 'qué pasos', 'que pasos',
    'cuánto tiempo tarda', 'cuanto tiempo tarda', 'cuánto demora', 'cuanto demora',
    'cómo funciona', 'como funciona',
    // Requisitos y documentación
    'qué requisitos', 'que requisitos', 'cuáles requisitos', 'cuales requisitos',
    'qué documentos', 'que documentos', 'cuáles documentos', 'cuales documentos',
    'qué necesita', 'que necesita', 'qué necesito', 'que necesito',
    // Información general sobre productos
    'qué es aviva', 'que es aviva',
    'qué es crédito aviva', 'que es credito aviva',
    'qué es cuenta cashi', 'que es cuenta cashi',
    'cómo funciona aviva', 'como funciona aviva',
    'cómo funciona el crédito', 'como funciona el credito',
    // Preguntas de ayuda general
    'cómo puedo ayudar', 'como puedo ayudar',
    'qué puedes hacer', 'que puedes hacer',
    'en qué me ayudas', 'en que me ayudas',
    // Problemas técnicos generales
    'tengo un problema con', 'tengo un error',
    'no funciona', 'no puedo',
    'por qué no', 'porque no',
    // Videollamadas (proceso general)
    'cómo hacer videollamada', 'como hacer videollamada',
    'cómo agendar videollamada', 'como agendar videollamada',
  ];

  private preciseHubspotKeywords = [
    // Consultas agregadas
    'cuántos deals', 'cuantos deals',
    'cuántas llamadas', 'cuantas llamadas',
    'cuántos clientes', 'cuantos clientes',
    'total de deals', 'total deals',
    'cantidad de deals', 'cantidad deals',
    'deals creados', 'deals generados',
    'llamadas creadas', 'llamadas generadas',
    'quién creó más deals', 'quien creo mas deals',
    'deals en castigo', 'deals aprobados', 'deals pagados',
    // Consultas de ventas personales
    'cuánto he vendido', 'cuanto he vendido',
    'cuántas ventas', 'cuantas ventas',
    'mis ventas', 'mis deals',
    'lo que he vendido', 'lo que vendí', 'lo que vendi',
    'cuánto vendí', 'cuanto vendi',
    // Consultas de clientes específicos
    'status del cliente', 'estado del cliente',
    'información del cliente', 'informacion del cliente',
    'datos del cliente', 'dato del cliente',
    'consultar cliente', 'buscar cliente',
    'ver cliente', 'mostrar cliente',
    'cliente llamado', 'cliente con nombre',
    // Consultas de deals específicos
    'status del deal', 'estado del deal',
    'información del deal', 'informacion del deal',
    'datos del deal', 'dato del deal',
    'consultar deal', 'buscar deal',
    // Consultas de créditos/prospectos
    'status del crédito', 'estado del credito', 'estado del crédito',
    'información del crédito', 'informacion del credito',
    'crédito de', 'credito de',
    'prospecto llamado', 'prospecto con nombre',
    // Consultas por producto
    'aviva contigo', 'aviva tu negocio', 'aviva tu compra',
    'aviva tu casa', 'construrama', 'casa marchand', 'sala uno',
    // Consultas de renovaciones y cross-selling
    'renovaciones', 'renovación', 'renovacion',
    'cross selling', 'cross-selling', 'crossselling',
    'cuántas renovaciones', 'cuantas renovaciones',
    'incentivo por renovación', 'incentivo por renovacion',
  ];

  detect(message: string): { isHubSpot: boolean; queryType: string } {
    const messageLower = message.toLowerCase();

    // PASO 1: Verificar keywords HubSpot específicos PRIMERO
    for (const keyword of this.preciseHubspotKeywords) {
      if (messageLower.includes(keyword)) {
        return { isHubSpot: true, queryType: 'hubspot_query' };
      }
    }

    // PASO 2: Detectar nombres propios (indicador de consulta específica)
    // Si el mensaje contiene 2 o más palabras que inician con mayúscula consecutivas,
    // probablemente es un nombre de cliente/prospecto
    const properNamePattern = /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+/;
    if (properNamePattern.test(message)) {
      // Si tiene un nombre propio Y menciona cliente/crédito/deal/prospecto
      if (
        messageLower.includes('cliente') ||
        messageLower.includes('crédito') ||
        messageLower.includes('credito') ||
        messageLower.includes('deal') ||
        messageLower.includes('prospecto')
      ) {
        return { isHubSpot: true, queryType: 'hubspot_query' };
      }
    }

    // PASO 3: Bloquear FAQs genéricas (solo si no pasó las verificaciones anteriores)
    for (const blocker of this.strictFaqBlockers) {
      if (messageLower.includes(blocker)) {
        return { isHubSpot: false, queryType: 'faq_blocked' };
      }
    }

    // PASO 4: Por defecto, permitir como FAQ
    return { isHubSpot: false, queryType: 'faq' };
  }
}

const patternDetector = new HubSpotPatternDetector();

/**
 * Maneja las llamadas a herramientas del Assistant
 */
async function handleToolCalls(toolCalls: any[]): Promise<any[]> {
  const toolOutputs = [];

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);

    console.log(`🔧 Ejecutando herramienta: ${functionName}`);
    console.log(`📋 Argumentos:`, args);

    let result = '';

    try {
      if (functionName === 'search_hubspot_deals') {
        // Verificar si HubSpot está configurado
        if (!hubspotService) {
          result = 'HubSpot no está configurado en el sistema.';
        } else {
          // Limpiar argumentos - solo pasar parámetros soportados
          const cleanArgs: any = {};
          const supportedParams = [
            'deal_name',
            'deal_stage',
            'owner_ids',
            'date_from',
            'date_to',
            'response_type',
            'limit',
          ];

          for (const key of supportedParams) {
            if (args[key] !== undefined) {
              cleanArgs[key] = args[key];
            }
          }

          console.log(`🚀 Ejecutando búsqueda HubSpot con:`, cleanArgs);

          // Ejecutar búsqueda
          result = await hubspotService.searchDeals(cleanArgs);

          console.log(`✅ Resultado HubSpot: ${result.substring(0, 200)}...`);
        }
      } else {
        result = `Función ${functionName} no implementada`;
        console.warn(`⚠️ Función desconocida: ${functionName}`);
      }
    } catch (error) {
      console.error(`❌ Error ejecutando ${functionName}:`, error);
      result = `Error ejecutando la búsqueda: ${
        error instanceof Error ? error.message : 'Error desconocido'
      }`;
    }

    toolOutputs.push({
      tool_call_id: toolCall.id,
      output: result,
    });
  }

  return toolOutputs;
}

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
        console.log('🔧 Assistant requiere ejecutar herramientas');

        const toolCalls = runStatus.required_action?.submit_tool_outputs?.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
          const toolOutputs = await handleToolCalls(toolCalls);

          // Enviar resultados de herramientas al assistant
          await openai.beta.threads.runs.submitToolOutputs(
            currentThreadId,
            run.id,
            { tool_outputs: toolOutputs }
          );
        }
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
 * Implementación agresiva como el bot de Python
 */
function cleanResponse(response: string): string {
  let cleaned = response;

  // Limpiar markdown (bold y cursiva)
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
  cleaned = cleaned.replace(/__(.*?)__/g, '$1');
  cleaned = cleaned.replace(/_(.*?)_/g, '$1');

  // Limpiar referencias y citaciones
  const citationPatterns = [
    /\[.*?\]/g, // Referencias [1], [2], etc.
    /\【.*?\】/g, // Referencias especiales
    /<cite>.*?<\/cite>/g, // Tags cite
    /según\s+(?:hubspot|el\s+sistema|la\s+información|los\s+datos)/gi,
    /de\s+acuerdo\s+(?:a|con)\s+(?:hubspot|el\s+sistema)/gi,
    /basado\s+en\s+(?:hubspot|la\s+información|los\s+datos)/gi,
    /fuente:\s*\w+/gi,
    /en\s+(?:nuestro\s+)?(?:sistema|base\s+de\s+datos|crm)/gi,
    /consultando\s+(?:hubspot|el\s+sistema|la\s+base\s+de\s+datos)/gi,
    /en\s+la\s+base\s+de\s+datos/gi,
  ];

  for (const pattern of citationPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Limpiar espacios extra, puntos y comas duplicados
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\.+/g, '.');
  cleaned = cleaned.replace(/,+/g, ',');
  cleaned = cleaned.replace(/\s+\./g, '.');
  cleaned = cleaned.replace(/\s+,/g, ',');

  // Limpiar espacios antes/después de puntuación
  cleaned = cleaned.trim();

  return cleaned;
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
    // Cuando se usa getHttpsCallable() desde el cliente, los datos vienen en req.body.data
    const requestData = (req.body as any).data || req.body;
    const { message, userId, userName, threadId } = requestData as ChatRequest;

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
    if (!ASSISTANT_ID || !config.openai?.apikey) {
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
