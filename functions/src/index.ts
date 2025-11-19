import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";
import { HubSpotService } from "./hubspot.service";

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
        res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
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
          res.status(403).json({ error: "Forbidden: Admin access required" });
          return;
        }
      } catch (authError) {
        console.error("Authentication error:", authError);
        res.status(401).json({ error: "Unauthorized: Invalid token" });
        return;
      }

      // Obtener API key de HubSpot desde config
      const hubspotApiKey = functions.config().hubspot?.apikey;
      if (!hubspotApiKey) {
        res.status(500).json({
          error: "HubSpot API key not configured",
          hint: "Run: firebase functions:config:set hubspot.apikey=\"YOUR_API_KEY\"",
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
      });
    } catch (error: any) {
      console.error("Error getting HubSpot metrics:", error);
      res.status(500).json({
        error: "Failed to fetch HubSpot metrics",
        details: error.message,
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
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      // Verificar permisos de admin
      const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const hubspotApiKey = functions.config().hubspot?.apikey;
      if (!hubspotApiKey) {
        res.status(500).json({ error: "HubSpot API key not configured" });
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
      });
    } catch (error: any) {
      console.error("Error getting deals metrics:", error);
      res.status(500).json({
        error: "Failed to fetch deals metrics",
        details: error.message,
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
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const hubspotApiKey = functions.config().hubspot?.apikey;
      if (!hubspotApiKey) {
        res.status(500).json({ error: "HubSpot API key not configured" });
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
      });
    } catch (error: any) {
      console.error("Error getting contacts metrics:", error);
      res.status(500).json({
        error: "Failed to fetch contacts metrics",
        details: error.message,
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
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const { visitId } = req.body;
      if (!visitId) {
        res.status(400).json({ error: "Missing visitId" });
        return;
      }

      // Obtener datos de la visita desde Firestore
      const visitDoc = await admin.firestore().collection("visits").doc(visitId).get();
      if (!visitDoc.exists) {
        res.status(404).json({ error: "Visit not found" });
        return;
      }

      const visitData = visitDoc.data();
      if (!visitData) {
        res.status(404).json({ error: "Visit data is empty" });
        return;
      }

      const hubspotApiKey = functions.config().hubspot?.apikey;
      if (!hubspotApiKey) {
        res.status(500).json({ error: "HubSpot API key not configured" });
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
        data: syncResult,
        message: "Visit synced to HubSpot successfully",
      });
    } catch (error: any) {
      console.error("Error syncing visit to HubSpot:", error);
      res.status(500).json({
        error: "Failed to sync visit to HubSpot",
        details: error.message,
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
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const { visitIds } = req.body;
      if (!visitIds || !Array.isArray(visitIds) || visitIds.length === 0) {
        res.status(400).json({ error: "Missing or invalid visitIds array" });
        return;
      }

      const hubspotApiKey = functions.config().hubspot?.apikey;
      if (!hubspotApiKey) {
        res.status(500).json({ error: "HubSpot API key not configured" });
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
        data: results,
        message: `Synced ${results.success} visits, ${results.failed} failed`,
      });
    } catch (error: any) {
      console.error("Error in batch sync:", error);
      res.status(500).json({
        error: "Failed to batch sync visits",
        details: error.message,
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
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== "admin") {
        res.status(403).json({ error: "Forbidden: Admin access required" });
        return;
      }

      const hubspotApiKey = functions.config().hubspot?.apikey;
      if (!hubspotApiKey) {
        res.status(500).json({ error: "HubSpot API key not configured" });
        return;
      }

      const hubspotService = new HubSpotService(hubspotApiKey);
      const pipelineMetrics = await hubspotService.getPipelineMetrics();

      res.status(200).json({
        success: true,
        data: pipelineMetrics,
      });
    } catch (error: any) {
      console.error("Error getting pipeline metrics:", error);
      res.status(500).json({
        error: "Failed to fetch pipeline metrics",
        details: error.message,
      });
    }
  });
});
