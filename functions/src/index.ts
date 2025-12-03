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
      const now = admin.firestore.Timestamp.now();
      const goalsSnapshot = await admin.firestore()
        .collection("goals")
        .where("active", "==", true)
        .get();

      const userGoals: any[] = [];

      for (const goalDoc of goalsSnapshot.docs) {
        const goalData = goalDoc.data();

        // Verificar si la meta está asignada a este usuario
        let isAssigned = false;

        if (goalData.targetType === "all") {
          isAssigned = true;
        } else if (goalData.targetType === "seller" && goalData.targetId === userId) {
          isAssigned = true;
        } else if (goalData.targetType === "kiosk" && goalData.targetId === userData.assignedKioskId) {
          isAssigned = true;
        }

        // Verificar que la meta esté vigente
        const startDate = goalData.startDate.toDate();
        const endDate = goalData.endDate.toDate();
        const isActive = now.toDate() >= startDate && now.toDate() <= endDate;

        if (isAssigned && isActive) {
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
            startDate,
            endDate
          );

          // Calcular porcentajes
          const llamadasPercentage = goalData.metrics.llamadas > 0
            ? Math.round((progress.llamadas / goalData.metrics.llamadas) * 100)
            : 0;

          const colocacionPercentage = goalData.metrics.colocacion > 0
            ? Math.round((progress.colocacion / goalData.metrics.colocacion) * 100)
            : 0;

          userGoals.push({
            id: goalDoc.id,
            name: goalData.name,
            period: goalData.period,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            metrics: {
              llamadas: {
                current: progress.llamadas,
                target: goalData.metrics.llamadas,
                percentage: llamadasPercentage
              },
              colocacion: {
                current: progress.colocacion,
                target: goalData.metrics.colocacion,
                percentage: colocacionPercentage
              }
            },
            onTrack: llamadasPercentage >= 80 && colocacionPercentage >= 80
          });
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
