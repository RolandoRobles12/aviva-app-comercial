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

      // Obtener datos del usuario
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (!userData) {
        res.status(404).json({
          success: false,
          data: null,
          error: "User not found",
          message: null
        });
        return;
      }

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
            endDateObj
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

      // Obtener datos del usuario
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (!userData) {
        res.status(404).json({
          success: false,
          data: null,
          error: "User not found",
          message: null
        });
        return;
      }

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

        // Obtener hubspotOwnerIds de todos los miembros
        const memberUserIds = leagueData.members as string[];
        const memberHubspotIds: string[] = [];

        for (const memberId of memberUserIds) {
          const memberDoc = await admin.firestore().collection("users").doc(memberId).get();
          const memberData = memberDoc.data();
          if (memberData?.hubspotOwnerId) {
            memberHubspotIds.push(memberData.hubspotOwnerId);
          }
        }

        if (memberHubspotIds.length === 0) {
          continue;
        }

        // Calcular benchmarks para toda la liga
        const benchmarks = await hubspotService.calculateLeagueBenchmarks(
          memberHubspotIds,
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
          totalMembers: memberHubspotIds.length,
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
          }
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
