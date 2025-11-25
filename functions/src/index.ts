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
