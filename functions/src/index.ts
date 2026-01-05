import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";
import { HubSpotService } from "./hubspot.service";

// Importar función de chat
export { chat } from "./chatAssistant";

// Inicializar Firebase Admin
admin.initializeApp();

// Configurar CORS
const corsHandler = cors({ origin: true });

/**
 * Helper function to find user document by Firebase Auth UID
 * Handles both cases: document ID = auth UID (old) or uid field = auth UID (new)
 */
async function getUserDocument(authUid: string): Promise<{ id: string; data: any } | null> {
  functions.logger.info(`Buscando usuario con authUid: ${authUid}`);

  // First, try to find by document ID (backwards compatibility)
  const userDocById = await admin.firestore().collection("users").doc(authUid).get();
  if (userDocById.exists) {
    functions.logger.info(`Usuario encontrado por document ID: ${authUid}`);
    const data = userDocById.data();
    functions.logger.info(`email: ${data?.email}`);
    functions.logger.info(`hubspotOwnerId: ${data?.hubspotOwnerId || 'NO CONFIGURADO'}`);
    functions.logger.info(`productLine: ${data?.productLine || 'NO CONFIGURADO'}`);
    return { id: userDocById.id, data: data };
  }

  functions.logger.warn(`No encontrado por document ID, buscando por campo uid...`);

  // If not found, query by uid field (current admin panel approach)
  const userQuerySnapshot = await admin.firestore()
    .collection("users")
    .where("uid", "==", authUid)
    .limit(1)
    .get();

  if (!userQuerySnapshot.empty) {
    const userDoc = userQuerySnapshot.docs[0];
    functions.logger.info(`Usuario encontrado por campo uid: ${userDoc.id}`);
    const data = userDoc.data();
    functions.logger.info(`email: ${data?.email}`);
    functions.logger.info(`hubspotOwnerId: ${data?.hubspotOwnerId || 'NO CONFIGURADO'}`);
    functions.logger.info(`productLine: ${data?.productLine || 'NO CONFIGURADO'}`);
    return { id: userDoc.id, data: data };
  }

  functions.logger.warn(`No encontrado por uid, buscando por email...`);

  // Also try querying by email as a fallback
  try {
    const userRecord = await admin.auth().getUser(authUid);
    if (userRecord.email) {
      functions.logger.info(`Buscando por email: ${userRecord.email}`);
      const emailQuerySnapshot = await admin.firestore()
        .collection("users")
        .where("email", "==", userRecord.email)
        .limit(1)
        .get();

      if (!emailQuerySnapshot.empty) {
        const userDoc = emailQuerySnapshot.docs[0];
        functions.logger.info(`Usuario encontrado por email: ${userDoc.id}`);
        const data = userDoc.data();
        functions.logger.info(`email: ${data?.email}`);
        functions.logger.info(`hubspotOwnerId: ${data?.hubspotOwnerId || 'NO CONFIGURADO'}`);
        functions.logger.info(`productLine: ${data?.productLine || 'NO CONFIGURADO'}`);
        return { id: userDoc.id, data: data };
      }
    }
  } catch (err) {
    functions.logger.error("Error fetching user by email:", err);
  }

  functions.logger.error(`NO SE ENCONTRO el usuario con authUid: ${authUid}`);
  return null;
}

/**
 * Function para obtener métricas de HubSpot
 * Endpoint: /getHubSpotMetrics
 * Método: POST
 * Body: { startDate?: string, endDate?: string }
 */
export const getHubSpotMetrics = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Validar autenticación
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          data: null,
          error: "Unauthorized: Missing or invalid token",
          message: null
        });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];

      try {
        // Verificar token de Firebase Auth
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        // Verificar que el usuario es admin
        const userResult = await getUserDocument(decodedToken.uid);

        if (!userResult || !userResult.data || userResult.data.role !== "admin") {
          res.status(403).json({
            success: false,
            data: null,
            error: "Forbidden: Admin access required",
            message: null
          });
          return;
        }
      } catch (authError) {
        console.error("Authentication error:", authError);
        res.status(401).json({
          success: false,
          data: null,
          error: "Unauthorized: Invalid token",
          message: null
        });
        return;
      }

      // Obtener API key de HubSpot desde config
      const hubspotApiKey = functions.config().hubspot?.apikey;
      if (!hubspotApiKey) {
        res.status(500).json({
          success: false,
          data: null,
          error: "HubSpot API key not configured. Run: firebase functions:config:set hubspot.apikey=\"YOUR_API_KEY\"",
          message: null,
        });
        return;
      }

      // Parsear fechas si se proporcionan
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (req.body.startDate) {
        startDate = new Date(req.body.startDate);
      }
      if (req.body.endDate) {
        endDate = new Date(req.body.endDate);
      }

      // Obtener métricas de HubSpot
      const hubspotService = new HubSpotService(hubspotApiKey);
      const analytics = await hubspotService.getAnalytics(startDate, endDate);

      res.status(200).json({
        success: true,
        data: analytics,
        message: null,
        error: null
      });
    } catch (error: any) {
      console.error("Error getting HubSpot metrics:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: "Failed to fetch HubSpot metrics",
        message: error.message,
      });
    }
  });
});

/**
 * Function para obtener métricas de deals
 * Endpoint: /getDealsMetrics
 */
export const getDealsMetrics = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Validar autenticación
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          data: null,
          error: "Unauthorized",
          message: null
        });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      // Verificar permisos de admin
      const userResult = await getUserDocument(decodedToken.uid);

      if (!userResult || !userResult.data || userResult.data.role !== "admin") {
        res.status(403).json({
          success: false,
          data: null,
          error: "Forbidden: Admin access required",
          message: null
        });
        return;
      }

      const hubspotApiKey = functions.config().hubspot?.apikey;
      if (!hubspotApiKey) {
        res.status(500).json({
          success: false,
          data: null,
          error: "HubSpot API key not configured",
          message: null
        });
        return;
      }

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (req.body.startDate) startDate = new Date(req.body.startDate);
      if (req.body.endDate) endDate = new Date(req.body.endDate);

      const hubspotService = new HubSpotService(hubspotApiKey);
      const dealsMetrics = await hubspotService.getDealsMetrics(startDate, endDate);

      res.status(200).json({
        success: true,
        data: dealsMetrics,
        message: null,
        error: null
      });
    } catch (error: any) {
      console.error("Error getting deals metrics:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: "Failed to fetch deals metrics",
        message: error.message,
      });
    }
  });
});

/**
 * Function para obtener métricas de contactos
 * Endpoint: /getContactsMetrics
 */
export const getContactsMetrics = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          data: null,
          error: "Unauthorized",
          message: null
        });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== "admin") {
        res.status(403).json({
          success: false,
          data: null,
          error: "Forbidden: Admin access required",
          message: null
        });
        return;
      }

      const hubspotApiKey = functions.config().hubspot?.apikey;
      if (!hubspotApiKey) {
        res.status(500).json({
          success: false,
          data: null,
          error: "HubSpot API key not configured",
          message: null
        });
        return;
      }

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (req.body.startDate) startDate = new Date(req.body.startDate);
      if (req.body.endDate) endDate = new Date(req.body.endDate);

      const hubspotService = new HubSpotService(hubspotApiKey);
      const contactsMetrics = await hubspotService.getContactsMetrics(startDate, endDate);

      res.status(200).json({
        success: true,
        data: contactsMetrics,
        message: null,
        error: null
      });
    } catch (error: any) {
      console.error("Error getting contacts metrics:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: "Failed to fetch contacts metrics",
        message: error.message,
      });
    }
  });
});

/**
 * Function para sincronizar visita con HubSpot
 * Endpoint: /syncVisitToHubSpot
 * Body: { visitId: string }
 */
export const syncVisitToHubSpot = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          data: null,
          error: "Unauthorized",
          message: null
        });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== "admin") {
        res.status(403).json({
          success: false,
          data: null,
          error: "Forbidden: Admin access required",
          message: null
        });
        return;
      }

      const { visitId } = req.body;
      if (!visitId) {
        res.status(400).json({
          success: false,
          data: null,
          error: "Missing visitId",
          message: null
        });
        return;
      }

      // Obtener datos de la visita desde Firestore
      const visitDoc = await admin.firestore().collection("visits").doc(visitId).get();
      if (!visitDoc.exists) {
        res.status(404).json({
          success: false,
          data: null,
          error: "Visit not found",
          message: null
        });
        return;
      }

      const visitData = visitDoc.data();
      if (!visitData) {
        res.status(404).json({
          success: false,
          data: null,
          error: "Visit data is empty",
          message: null
        });
        return;
      }

      const hubspotApiKey = functions.config().hubspot?.apikey;
      if (!hubspotApiKey) {
        res.status(500).json({
          success: false,
          data: null,
          error: "HubSpot API key not configured",
          message: null
        });
        return;
      }

      const hubspotService = new HubSpotService(hubspotApiKey);

      // Sincronizar visita
      const syncResult = await hubspotService.syncVisitToHubSpot({
        businessName: visitData.businessName || "Negocio sin nombre",
        email: visitData.email,
        phone: visitData.phone,
        status: visitData.status || "Pendiente",
        notes: visitData.notes || "",
        userName: visitData.userName || "Usuario desconocido",
        timestamp: visitData.timestamp?.toMillis() || Date.now(),
        location: visitData.location ? {
          latitude: visitData.location.latitude,
          longitude: visitData.location.longitude,
        } : undefined,
      });

      // Marcar la visita como sincronizada en Firestore
      await admin.firestore().collection("visits").doc(visitId).update({
        syncedToHubSpot: true,
        hubSpotContactId: syncResult.contactId,
        hubSpotDealId: syncResult.dealId,
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        success: true,
        data: {
          contactId: syncResult.contactId,
          dealId: syncResult.dealId,
        },
        message: "Visit synced to HubSpot successfully",
      });
    } catch (error: any) {
      console.error("Error syncing visit to HubSpot:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: "Failed to sync visit to HubSpot",
        message: error.message,
      });
    }
  });
});

/**
 * Function para sincronizar múltiples visitas en batch
 * Endpoint: /batchSyncVisits
 * Body: { visitIds: string[] }
 */
export const batchSyncVisits = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          data: null,
          error: "Unauthorized",
          message: null
        });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== "admin") {
        res.status(403).json({
          success: false,
          data: null,
          error: "Forbidden: Admin access required",
          message: null
        });
        return;
      }

      const { visitIds } = req.body;
      if (!visitIds || !Array.isArray(visitIds) || visitIds.length === 0) {
        res.status(400).json({
          success: false,
          data: null,
          error: "Missing or invalid visitIds array",
          message: null
        });
        return;
      }

      const hubspotApiKey = functions.config().hubspot?.apikey;
      if (!hubspotApiKey) {
        res.status(500).json({
          success: false,
          data: null,
          error: "HubSpot API key not configured",
          message: null
        });
        return;
      }

      const hubspotService = new HubSpotService(hubspotApiKey);
      const results = {
        success: 0,
        failed: 0,
        errors: [] as any[],
      };

      // Sincronizar cada visita
      for (const visitId of visitIds) {
        try {
          const visitDoc = await admin.firestore().collection("visits").doc(visitId).get();
          if (!visitDoc.exists) {
            results.failed++;
            results.errors.push({ visitId, error: "Visit not found" });
            continue;
          }

          const visitData = visitDoc.data();
          if (!visitData) {
            results.failed++;
            results.errors.push({ visitId, error: "Visit data is empty" });
            continue;
          }

          const syncResult = await hubspotService.syncVisitToHubSpot({
            businessName: visitData.businessName || "Negocio sin nombre",
            email: visitData.email,
            phone: visitData.phone,
            status: visitData.status || "Pendiente",
            notes: visitData.notes || "",
            userName: visitData.userName || "Usuario desconocido",
            timestamp: visitData.timestamp?.toMillis() || Date.now(),
            location: visitData.location ? {
              latitude: visitData.location.latitude,
              longitude: visitData.location.longitude,
            } : undefined,
          });

          await admin.firestore().collection("visits").doc(visitId).update({
            syncedToHubSpot: true,
            hubSpotContactId: syncResult.contactId,
            hubSpotDealId: syncResult.dealId,
            syncedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({ visitId, error: error.message });
        }
      }

      res.status(200).json({
        success: true,
        data: {
          success: results.success,
          failed: results.failed,
          errors: results.errors,
        },
        message: `Synced ${results.success} visits, ${results.failed} failed`,
      });
    } catch (error: any) {
      console.error("Error in batch sync:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: "Failed to batch sync visits",
        message: error.message,
      });
    }
  });
});

/**
 * Function para obtener métricas del pipeline
 * Endpoint: /getPipelineMetrics
 */
export const getPipelineMetrics = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          data: null,
          error: "Unauthorized",
          message: null
        });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== "admin") {
        res.status(403).json({
          success: false,
          data: null,
          error: "Forbidden: Admin access required",
          message: null
        });
        return;
      }

      const hubspotApiKey = functions.config().hubspot?.apikey;
      if (!hubspotApiKey) {
        res.status(500).json({
          success: false,
          data: null,
          error: "HubSpot API key not configured",
          message: null
        });
        return;
      }

      const hubspotService = new HubSpotService(hubspotApiKey);
      const pipelineMetrics = await hubspotService.getPipelineMetrics();

      res.status(200).json({
        success: true,
        data: pipelineMetrics,
        message: null,
        error: null
      });
    } catch (error: any) {
      console.error("Error getting pipeline metrics:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: "Failed to fetch pipeline metrics",
        message: error.message,
      });
    }
  });
});

/**
 * Function para obtener las metas asignadas a un usuario con progreso real de HubSpot
 * Endpoint: /getMyGoals
 * Método: GET
 * Headers: Authorization: Bearer <firebase-token>
 */
export const getMyGoals = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Validar autenticación
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          data: null,
          error: "Unauthorized: Missing or invalid token",
          message: null
        });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Obtener datos del usuario usando el helper que busca por uid o email
      const userResult = await getUserDocument(userId);

      if (!userResult) {
        res.status(404).json({
          success: false,
          data: null,
          error: "User not found",
          message: null
        });
        return;
      }

      const userData = userResult.data;

      // Verificar que el usuario tenga hubspotOwnerId
      const hubspotOwnerId = userData.hubspotOwnerId;
      if (!hubspotOwnerId) {
        res.status(200).json({
          success: true,
          data: {
            goals: [],
            message: "No HubSpot Owner ID configured for this user"
          },
          error: null,
          message: null
        });
        return;
      }

      // Buscar metas activas asignadas al usuario
      // Soportar ambas colecciones: 'goals' (nuevo modelo) y 'metas' (legacy)
      const now = admin.firestore.Timestamp.now();

      // Intentar primero con colección 'metas' (legacy - modelo actual en uso)
      let goalsSnapshot = await admin.firestore()
        .collection("metas")
        .where("activo", "==", true)
        .get();

      console.log(`📊 Metas en colección 'metas' (legacy): ${goalsSnapshot.size}`);

      // Si no hay en 'metas', buscar en 'goals' (nuevo modelo)
      if (goalsSnapshot.size === 0) {
        goalsSnapshot = await admin.firestore()
          .collection("goals")
          .where("active", "==", true)
          .get();
        console.log(`📊 Metas en colección 'goals' (nuevo): ${goalsSnapshot.size}`);
      }

      const userGoals: any[] = [];

      for (const goalDoc of goalsSnapshot.docs) {
        const goalData = goalDoc.data();

        // Detectar si es modelo nuevo o legacy
        const isLegacyModel = goalData.tipo !== undefined;

        console.log(`🔍 Evaluando meta: ${goalData.nombre || goalData.name}`);
        console.log(`   - Modelo: ${isLegacyModel ? 'Legacy (metas)' : 'Nuevo (goals)'}`);

        // Normalizar campos según el modelo
        const name = isLegacyModel ? goalData.nombre : goalData.name;
        const period = isLegacyModel ? goalData.periodo : goalData.period;
        const targetType = isLegacyModel
          ? (goalData.tipo === "GLOBAL" ? "all" : goalData.tipo.toLowerCase())
          : goalData.targetType;
        const startDate = (isLegacyModel ? goalData.fechaInicio : goalData.startDate);
        const endDate = (isLegacyModel ? goalData.fechaFin : goalData.endDate);
        const metricLlamadas = isLegacyModel ? goalData.llamadasObjetivo : goalData.metrics?.llamadas;
        const metricColocacion = isLegacyModel ? goalData.colocacionObjetivo : goalData.metrics?.colocacion;

        console.log(`   - targetType: ${targetType}`);
        console.log(`   - startDate: ${startDate?.toDate()}`);
        console.log(`   - endDate: ${endDate?.toDate()}`);
        console.log(`   - now: ${now.toDate()}`);

        // Verificar si la meta está asignada a este usuario
        let isAssigned = false;

        if (targetType === "all") {
          isAssigned = true;
          console.log(`   ✅ Meta asignada (tipo: all)`);
        } else if (goalData.targetType === "users" && goalData.targetIds && goalData.targetIds.includes(userId)) {
          isAssigned = true;
        } else if (goalData.targetType === "kiosks" && goalData.targetIds && userData.assignedKioskId && goalData.targetIds.includes(userData.assignedKioskId)) {
          isAssigned = true;
        } else if (goalData.targetType === "league" && goalData.targetIds) {
          // Verificar si el usuario pertenece a alguna de las ligas asignadas
          for (const leagueId of goalData.targetIds) {
            const leagueDoc = await admin.firestore().collection("leagues").doc(leagueId).get();
            const leagueData = leagueDoc.data();
            if (leagueData && leagueData.members && leagueData.members.includes(userId)) {
              isAssigned = true;
              break;
            }
          }
        }

        // Verificar que la meta esté vigente
        const startDateObj = startDate.toDate();
        const endDateObj = endDate.toDate();
        const isActive = now.toDate() >= startDateObj && now.toDate() <= endDateObj;

        console.log(`   - isAssigned: ${isAssigned}`);
        console.log(`   - isActive: ${isActive} (start <= now: ${now.toDate() >= startDateObj}, now <= end: ${now.toDate() <= endDateObj})`);

        if (isAssigned && isActive) {
          console.log(`   ✅ Meta incluida en resultados`);
          // Obtener API key de HubSpot
          const hubspotApiKey = functions.config().hubspot?.apikey;
          if (!hubspotApiKey) {
            console.error("HubSpot API key not configured");
            continue;
          }

          // Calcular progreso real desde HubSpot
          const hubspotService = new HubSpotService(hubspotApiKey);
          const progress = await hubspotService.calculateGoalProgress(
            hubspotOwnerId,
            startDateObj,
            endDateObj,
            userData.productLine // Pasar productLine del usuario
          );

          // Calcular porcentajes usando los campos normalizados
          const llamadasPercentage = metricLlamadas > 0
            ? Math.round((progress.llamadas / metricLlamadas) * 100)
            : 0;

          const colocacionPercentage = metricColocacion > 0
            ? Math.round((progress.colocacion / metricColocacion) * 100)
            : 0;

          userGoals.push({
            id: goalDoc.id,
            name: name,
            period: period,
            startDate: startDateObj.toISOString(),
            endDate: endDateObj.toISOString(),
            metrics: {
              llamadas: {
                current: progress.llamadas,
                target: metricLlamadas,
                percentage: llamadasPercentage
              },
              colocacion: {
                current: progress.colocacion,
                target: metricColocacion,
                percentage: colocacionPercentage
              }
            },
            onTrack: llamadasPercentage >= 80 && colocacionPercentage >= 80
          });
        } else {
          console.log(`   ❌ Meta NO incluida - isAssigned: ${isAssigned}, isActive: ${isActive}`);
        }
      }

      res.status(200).json({
        success: true,
        data: {
          goals: userGoals,
          hubspotOwnerId: hubspotOwnerId
        },
        error: null,
        message: null
      });
    } catch (error: any) {
      console.error("Error getting user goals:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: "Failed to fetch user goals",
        message: error.message
      });
    }
  });
});

/**
 * Function para obtener estadísticas de liga con benchmarking
 * Endpoint: /getMyLeagueStats
 * Método: GET
 * Headers: Authorization: Bearer <firebase-token>
 */
export const getMyLeagueStats = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Validar autenticación
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          data: null,
          error: "Unauthorized: Missing or invalid token",
          message: null
        });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Obtener datos del usuario usando el helper que busca por uid o email
      const userResult = await getUserDocument(userId);

      if (!userResult) {
        res.status(404).json({
          success: false,
          data: null,
          error: "User not found",
          message: null
        });
        return;
      }

      const userData = userResult.data;

      const hubspotOwnerId = userData.hubspotOwnerId;
      if (!hubspotOwnerId) {
        res.status(200).json({
          success: true,
          data: {
            leagues: [],
            message: "No HubSpot Owner ID configured for this user"
          },
          error: null,
          message: null
        });
        return;
      }

      // Buscar ligas activas donde el usuario es miembro
      const leaguesSnapshot = await admin.firestore()
        .collection("leagues")
        .where("active", "==", true)
        .where("members", "array-contains", userId)
        .get();

      const hubspotApiKey = functions.config().hubspot?.apikey;
      if (!hubspotApiKey) {
        res.status(500).json({
          success: false,
          data: null,
          error: "HubSpot API key not configured",
          message: null
        });
        return;
      }

      const hubspotService = new HubSpotService(hubspotApiKey);
      const leagueStats: any[] = [];

      // Calcular período: últimos 30 días
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      for (const leagueDoc of leaguesSnapshot.docs) {
        const leagueData = leagueDoc.data();

        // Obtener hubspotOwnerIds y productLines de todos los miembros
        const memberUserIds = leagueData.members as string[];
        const memberMap = new Map<string, string | undefined>(); // hubspotOwnerId -> productLine

        for (const memberId of memberUserIds) {
          const memberResult = await getUserDocument(memberId);
          if (memberResult?.data?.hubspotOwnerId) {
            memberMap.set(
              memberResult.data.hubspotOwnerId,
              memberResult.data.productLine
            );
          }
        }

        if (memberMap.size === 0) {
          continue;
        }

        // Calcular benchmarks para toda la liga
        const benchmarks = await hubspotService.calculateLeagueBenchmarks(
          memberMap,
          startDate,
          endDate
        );

        // Encontrar las estadísticas del usuario actual
        const userStats = benchmarks.find(b => b.userId === hubspotOwnerId);

        // Calcular promedio de la liga
        const avgLlamadas = benchmarks.reduce((sum, b) => sum + b.metrics.llamadas, 0) / benchmarks.length;
        const avgColocacion = benchmarks.reduce((sum, b) => sum + b.metrics.colocacion, 0) / benchmarks.length;
        const avgTasaCierre = benchmarks.reduce((sum, b) => sum + b.metrics.tasaCierre, 0) / benchmarks.length;

        // Ordenar por colocación para calcular ranking
        const sortedByColocacion = [...benchmarks].sort((a, b) => b.metrics.colocacion - a.metrics.colocacion);
        const userRank = sortedByColocacion.findIndex(b => b.userId === hubspotOwnerId) + 1;

        leagueStats.push({
          leagueId: leagueDoc.id,
          leagueName: leagueData.name,
          icon: leagueData.icon,
          color: leagueData.color,
          totalMembers: memberMap.size,
          userRank: userRank,
          userMetrics: userStats ? userStats.metrics : {
            llamadas: 0,
            colocacion: 0,
            tasaCierre: 0
          },
          leagueAverage: {
            llamadas: Math.round(avgLlamadas),
            colocacion: Math.round(avgColocacion),
            tasaCierre: Math.round(avgTasaCierre * 100) / 100
          },
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          },
          // Competitive mode fields
          competitiveMode: leagueData.competitiveMode || false,
          tier: leagueData.tier || null,
          season: leagueData.season || null,
          startDate: leagueData.startDate || null,
          endDate: leagueData.endDate || null,
          maxParticipants: leagueData.maxParticipants || null,
          promotionSpots: leagueData.promotionSpots || null,
          relegationSpots: leagueData.relegationSpots || null,
          prizes: leagueData.prizes || [],
          status: leagueData.status || null
        });
      }

      res.status(200).json({
        success: true,
        data: {
          leagues: leagueStats,
          hubspotOwnerId: hubspotOwnerId
        },
        error: null,
        message: null
      });
    } catch (error: any) {
      console.error("Error getting league stats:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: "Failed to fetch league stats",
        message: error.message
      });
    }
  });
});

/**
 * Firebase Function para actualizar puntos de una liga según criterios personalizables
 * Endpoint: /updateLeaguePoints
 * Método: POST
 * Body: { leagueId: string }
 *
 * Esta función:
 * 1. Lee la configuración de criterios de la liga
 * 2. Calcula los puntos de cada participante según los criterios
 * 3. Actualiza la colección leagueParticipants con los resultados
 * 4. Recalcula los rankings
 */
export const updateLeaguePoints = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Validar parámetros
      if (!req.body.leagueId) {
        res.status(400).json({
          success: false,
          error: "leagueId is required"
        });
        return;
      }

      const { leagueId } = req.body;
      functions.logger.info(`📊 Actualizando puntos de liga: ${leagueId}`);

      // Obtener configuración de la liga
      const leagueDoc = await admin.firestore()
        .collection("leagues")
        .doc(leagueId)
        .get();

      if (!leagueDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Liga no encontrada"
        });
        return;
      }

      const leagueData = leagueDoc.data();
      const members = leagueData?.members || [];
      const criteria = leagueData?.criteria || [];
      const startDate = leagueData?.startDate?.toDate();
      const endDate = leagueData?.endDate?.toDate();

      if (criteria.length === 0) {
        res.status(400).json({
          success: false,
          error: "La liga no tiene criterios configurados"
        });
        return;
      }

      functions.logger.info(`👥 Procesando ${members.length} miembros`);
      functions.logger.info(`📏 Criterios activos: ${criteria.filter((c: any) => c.enabled).length}`);

      const results = [];

      // Procesar cada miembro
      for (const userId of members) {
        functions.logger.info(`\n👤 Calculando puntos para usuario: ${userId}`);

        let totalPoints = 0;
        let totalSales = 0;
        const criteriaResults: any[] = [];

        // Calcular puntos por cada criterio activo
        for (const criterion of criteria) {
          if (!criterion.enabled) {
            functions.logger.info(`⏭️  Criterio deshabilitado: ${criterion.name}`);
            continue;
          }

          functions.logger.info(`📊 Evaluando criterio: ${criterion.name}`);

          let value = 0;

          // Calcular valor según la fuente
          if (criterion.source === 'VISITS') {
            // Contar visitas desde Firestore
            let query = admin.firestore()
              .collection("visits")
              .where("userId", "==", userId);

            // Aplicar filtro de fechas si existen
            if (startDate) {
              query = query.where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startDate));
            }
            if (endDate) {
              query = query.where("createdAt", "<=", admin.firestore.Timestamp.fromDate(endDate));
            }

            const snapshot = await query.get();
            value = snapshot.size;
            functions.logger.info(`   Visitas encontradas: ${value}`);

          } else if (criterion.source === 'CUSTOM_FIELD') {
            // Consultar colección personalizada
            if (!criterion.firestoreCollection || !criterion.firestoreUserField) {
              functions.logger.warn(`   ⚠️  Criterio mal configurado: falta colección o campo usuario`);
              continue;
            }

            let query: any = admin.firestore()
              .collection(criterion.firestoreCollection)
              .where(criterion.firestoreUserField, "==", userId);

            // Aplicar filtro adicional si existe
            if (criterion.whereField && criterion.whereOperator && criterion.whereValue !== undefined) {
              query = query.where(criterion.whereField, criterion.whereOperator, criterion.whereValue);
            }

            // Aplicar filtro de fechas si existen
            if (startDate) {
              query = query.where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startDate));
            }
            if (endDate) {
              query = query.where("createdAt", "<=", admin.firestore.Timestamp.fromDate(endDate));
            }

            const snapshot = await query.get();

            if (criterion.calculationType === 'COUNT') {
              value = snapshot.size;
            } else if (criterion.calculationType === 'SUM' && criterion.firestoreField) {
              value = snapshot.docs.reduce((sum: number, doc: any) => {
                const fieldValue = doc.data()[criterion.firestoreField!] || 0;
                return sum + (typeof fieldValue === 'number' ? fieldValue : 0);
              }, 0);
            } else if (criterion.calculationType === 'AVERAGE' && criterion.firestoreField) {
              const sum = snapshot.docs.reduce((sum: number, doc: any) => {
                const fieldValue = doc.data()[criterion.firestoreField!] || 0;
                return sum + (typeof fieldValue === 'number' ? fieldValue : 0);
              }, 0);
              value = snapshot.size > 0 ? sum / snapshot.size : 0;
            }

            functions.logger.info(`   Valor calculado (${criterion.calculationType}): ${value}`);
          } else if (criterion.source === 'HUBSPOT_METRIC') {
            // Obtener configuración de la métrica desde hubspotMetrics collection
            if (!criterion.hubspotMetricId) {
              functions.logger.warn(`   ⚠️  Criterio mal configurado: falta hubspotMetricId`);
              continue;
            }

            const metricDoc = await admin.firestore()
              .collection("hubspotMetrics")
              .doc(criterion.hubspotMetricId)
              .get();

            if (!metricDoc.exists) {
              functions.logger.warn(`   ⚠️  Métrica de HubSpot no encontrada: ${criterion.hubspotMetricId}`);
              continue;
            }

            const metricConfig = metricDoc.data();
            if (!metricConfig?.active) {
              functions.logger.warn(`   ⚠️  Métrica de HubSpot inactiva: ${metricConfig?.name}`);
              continue;
            }

            // Obtener datos del usuario (hubspotOwnerId y productLine)
            const userResult = await getUserDocument(userId);
            if (!userResult || !userResult.data?.hubspotOwnerId) {
              functions.logger.warn(`   ⚠️  Usuario sin hubspotOwnerId configurado`);
              continue;
            }

            const hubspotOwnerId = userResult.data.hubspotOwnerId;
            const productLine = userResult.data.productLine;

            // Obtener API key de HubSpot
            const hubspotApiKey = functions.config().hubspot?.apikey;
            if (!hubspotApiKey) {
              functions.logger.error("   ❌ HubSpot API key not configured");
              continue;
            }

            // Calcular fechas según configuración de la métrica
            let metricStartDate = startDate;
            let metricEndDate = endDate;

            if (!metricConfig.usesDateRange) {
              // Si no usa rango de fechas, usar todo el tiempo
              metricStartDate = undefined;
              metricEndDate = undefined;
            }

            functions.logger.info(`   🔧 Usando métrica: ${metricConfig.name}`);
            functions.logger.info(`   📅 Rango: ${metricStartDate?.toISOString() || 'sin inicio'} - ${metricEndDate?.toISOString() || 'sin fin'}`);
            functions.logger.info(`   🏢 ProductLine: ${productLine || 'todos'}`);

            // Llamar al método de HubSpot correspondiente
            const hubspotService = new HubSpotService(hubspotApiKey);
            let result: any;

            try {
              if (metricConfig.calculationMethod === 'calculateGoalProgress') {
                result = await hubspotService.calculateGoalProgress(
                  hubspotOwnerId,
                  metricStartDate,
                  metricEndDate,
                  metricConfig.usesProductLine ? productLine : undefined
                );
              } else if (metricConfig.calculationMethod === 'calculateClosureRate') {
                result = await hubspotService.calculateClosureRate(
                  hubspotOwnerId,
                  metricStartDate,
                  metricEndDate,
                  metricConfig.usesProductLine ? productLine : undefined
                );
              } else {
                functions.logger.warn(`   ⚠️  Método desconocido: ${metricConfig.calculationMethod}`);
                continue;
              }

              // Extraer el campo especificado
              value = result[metricConfig.extractField] || 0;
              functions.logger.info(`   Valor extraído (${metricConfig.extractField}): ${value}`);

            } catch (error: any) {
              functions.logger.error(`   ❌ Error al calcular métrica de HubSpot: ${error.message}`);
              continue;
            }
          } else if (criterion.source === 'MANUAL') {
            functions.logger.info(`   Criterio manual - puntos no calculados automáticamente`);
            continue;
          }

          // Calcular puntos para este criterio
          const points = value * criterion.pointsPerUnit;
          totalPoints += points;

          // Si es un criterio de "ventas", sumarlo al total
          if (criterion.name.toLowerCase().includes('venta') || criterion.name.toLowerCase().includes('visita')) {
            totalSales += value;
          }

          criteriaResults.push({
            criteriaId: criterion.id,
            criteriaName: criterion.name,
            value: value,
            points: points
          });

          functions.logger.info(`   ✅ Puntos otorgados: ${points} (${value} × ${criterion.pointsPerUnit})`);
        }

        functions.logger.info(`\n💯 Total puntos usuario ${userId}: ${totalPoints}`);
        functions.logger.info(`📈 Total ventas: ${totalSales}`);

        // Actualizar o crear participante en leagueParticipants
        const participantQuery = await admin.firestore()
          .collection("leagueParticipants")
          .where("leagueId", "==", leagueId)
          .where("userId", "==", userId)
          .limit(1)
          .get();

        const participantData = {
          leagueId: leagueId,
          userId: userId,
          currentPoints: totalPoints,
          salesInSeason: totalSales,
          pointsEarned: totalPoints,
          status: 'ACTIVE',
          updatedAt: admin.firestore.Timestamp.now()
        };

        if (participantQuery.empty) {
          // Crear nuevo participante
          await admin.firestore()
            .collection("leagueParticipants")
            .add({
              ...participantData,
              currentPosition: 0,
              previousPosition: 0,
              positionHistory: [],
              joinedAt: admin.firestore.Timestamp.now()
            });
          functions.logger.info(`   ✅ Participante creado`);
        } else {
          // Actualizar participante existente
          const participantDoc = participantQuery.docs[0];
          await participantDoc.ref.update(participantData);
          functions.logger.info(`   ✅ Participante actualizado`);
        }

        results.push({
          userId,
          totalPoints,
          totalSales,
          criteriaResults
        });
      }

      // Recalcular posiciones (ranking)
      functions.logger.info(`\n🏆 Recalculando rankings...`);
      const allParticipants = await admin.firestore()
        .collection("leagueParticipants")
        .where("leagueId", "==", leagueId)
        .where("status", "==", "ACTIVE")
        .orderBy("currentPoints", "desc")
        .get();

      const batch = admin.firestore().batch();
      allParticipants.docs.forEach((doc, index) => {
        const currentData = doc.data();
        const newPosition = index + 1;

        batch.update(doc.ref, {
          previousPosition: currentData.currentPosition || newPosition,
          currentPosition: newPosition
        });
      });

      await batch.commit();
      functions.logger.info(`✅ Rankings actualizados`);

      res.status(200).json({
        success: true,
        data: {
          leagueId,
          membersProcessed: members.length,
          criteriaEvaluated: criteria.filter((c: any) => c.enabled).length,
          results
        },
        message: "Puntos actualizados exitosamente"
      });

    } catch (error: any) {
      functions.logger.error("Error updating league points:", error);
      res.status(500).json({
        success: false,
        error: "Error al actualizar puntos",
        message: error.message
      });
    }
  });
});
