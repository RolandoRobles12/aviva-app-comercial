import axios, { AxiosInstance } from "axios";

/**
 * Servicio para integración con HubSpot CRM API
 * Documentación: https://developers.hubspot.com/docs/api/overview
 */
export class HubSpotService {
  private axiosInstance: AxiosInstance;

  constructor(apiKey: string) {
    this.axiosInstance = axios.create({
      baseURL: "https://api.hubapi.com",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
  }

  /**
   * Obtiene métricas de deals (negocios/ventas)
   */
  async getDealsMetrics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const filters: any = {
        filterGroups: [],
      };

      // Si hay fechas, filtrar por rango
      if (startDate && endDate) {
        filters.filterGroups.push({
          filters: [
            {
              propertyName: "createdate",
              operator: "GTE",
              value: startDate.getTime().toString(),
            },
            {
              propertyName: "createdate",
              operator: "LTE",
              value: endDate.getTime().toString(),
            },
          ],
        });
      }

      const response = await this.axiosInstance.post("/crm/v3/objects/deals/search", {
        ...filters,
        properties: [
          "dealname",
          "amount",
          "dealstage",
          "closedate",
          "createdate",
          "pipeline",
          "hs_priority",
        ],
        limit: 100,
      });

      const deals = response.data.results;

      // Calcular métricas agregadas
      const totalDeals = deals.length;
      const totalAmount = deals.reduce((sum: number, deal: any) =>
        sum + (parseFloat(deal.properties.amount) || 0), 0);
      const avgDealSize = totalDeals > 0 ? totalAmount / totalDeals : 0;

      // Agrupar por etapa
      const dealsByStage: { [key: string]: number } = {};
      deals.forEach((deal: any) => {
        const stage = deal.properties.dealstage || "unknown";
        dealsByStage[stage] = (dealsByStage[stage] || 0) + 1;
      });

      return {
        totalDeals,
        totalAmount,
        avgDealSize,
        dealsByStage,
        deals: deals.slice(0, 10), // Top 10 deals
      };
    } catch (error: any) {
      console.error("Error fetching deals metrics:", error.response?.data || error.message);
      throw new Error(`Failed to fetch deals: ${error.message}`);
    }
  }

  /**
   * Obtiene métricas de contactos
   */
  async getContactsMetrics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const filters: any = {
        filterGroups: [],
      };

      if (startDate && endDate) {
        filters.filterGroups.push({
          filters: [
            {
              propertyName: "createdate",
              operator: "GTE",
              value: startDate.getTime().toString(),
            },
            {
              propertyName: "createdate",
              operator: "LTE",
              value: endDate.getTime().toString(),
            },
          ],
        });
      }

      const response = await this.axiosInstance.post("/crm/v3/objects/contacts/search", {
        ...filters,
        properties: [
          "firstname",
          "lastname",
          "email",
          "phone",
          "createdate",
          "lifecyclestage",
          "hs_lead_status",
        ],
        limit: 100,
      });

      const contacts = response.data.results;

      // Agrupar por lifecycle stage
      const contactsByStage: { [key: string]: number } = {};
      contacts.forEach((contact: any) => {
        const stage = contact.properties.lifecyclestage || "unknown";
        contactsByStage[stage] = (contactsByStage[stage] || 0) + 1;
      });

      return {
        totalContacts: contacts.length,
        contactsByStage,
        recentContacts: contacts.slice(0, 10),
      };
    } catch (error: any) {
      console.error("Error fetching contacts metrics:", error.response?.data || error.message);
      throw new Error(`Failed to fetch contacts: ${error.message}`);
    }
  }

  /**
   * Obtiene métricas generales del pipeline
   */
  async getPipelineMetrics(): Promise<any> {
    try {
      // Obtener pipelines
      const pipelinesResponse = await this.axiosInstance.get("/crm/v3/pipelines/deals");
      const pipelines = pipelinesResponse.data.results;

      // Obtener deals para cada pipeline
      const pipelineMetrics = await Promise.all(
        pipelines.map(async (pipeline: any) => {
          const dealsResponse = await this.axiosInstance.post("/crm/v3/objects/deals/search", {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "pipeline",
                    operator: "EQ",
                    value: pipeline.id,
                  },
                ],
              },
            ],
            properties: ["amount", "dealstage"],
            limit: 100,
          });

          const deals = dealsResponse.data.results;
          const totalValue = deals.reduce((sum: number, deal: any) =>
            sum + (parseFloat(deal.properties.amount) || 0), 0);

          return {
            pipelineId: pipeline.id,
            pipelineName: pipeline.label,
            totalDeals: deals.length,
            totalValue,
            stages: pipeline.stages,
          };
        })
      );

      return {
        pipelines: pipelineMetrics,
        totalPipelines: pipelines.length,
      };
    } catch (error: any) {
      console.error("Error fetching pipeline metrics:", error.response?.data || error.message);
      throw new Error(`Failed to fetch pipelines: ${error.message}`);
    }
  }

  /**
   * Crea un nuevo contacto en HubSpot
   */
  async createContact(contactData: {
    email: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    [key: string]: any;
  }): Promise<any> {
    try {
      const response = await this.axiosInstance.post("/crm/v3/objects/contacts", {
        properties: contactData,
      });

      return response.data;
    } catch (error: any) {
      console.error("Error creating contact:", error.response?.data || error.message);
      throw new Error(`Failed to create contact: ${error.message}`);
    }
  }

  /**
   * Crea un nuevo deal en HubSpot
   */
  async createDeal(dealData: {
    dealname: string;
    amount?: number;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    [key: string]: any;
  }): Promise<any> {
    try {
      const response = await this.axiosInstance.post("/crm/v3/objects/deals", {
        properties: dealData,
      });

      return response.data;
    } catch (error: any) {
      console.error("Error creating deal:", error.response?.data || error.message);
      throw new Error(`Failed to create deal: ${error.message}`);
    }
  }

  /**
   * Sincroniza una visita de la app con HubSpot
   * Crea un contacto (si no existe) y un deal asociado
   */
  async syncVisitToHubSpot(visitData: {
    businessName: string;
    email?: string;
    phone?: string;
    status: string;
    notes?: string;
    userName: string;
    timestamp: number;
    location?: { latitude: number; longitude: number };
  }): Promise<any> {
    try {
      let contactId = null;

      // 1. Crear o buscar contacto
      if (visitData.email) {
        try {
          // Buscar contacto por email
          const searchResponse = await this.axiosInstance.post("/crm/v3/objects/contacts/search", {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "email",
                    operator: "EQ",
                    value: visitData.email,
                  },
                ],
              },
            ],
          });

          if (searchResponse.data.results.length > 0) {
            contactId = searchResponse.data.results[0].id;
          }
        } catch (searchError) {
          console.log("Contact not found, will create new one");
        }

        // Si no existe, crear nuevo contacto
        if (!contactId) {
          const contactResponse = await this.createContact({
            email: visitData.email,
            company: visitData.businessName,
            phone: visitData.phone || "",
            hs_lead_status: "NEW",
          });
          contactId = contactResponse.id;
        }
      }

      // 2. Crear deal asociado a la visita
      const dealData: any = {
        dealname: `Visita - ${visitData.businessName}`,
        dealstage: this.mapVisitStatusToDealStage(visitData.status),
        amount: 0, // Puedes personalizar esto según tus necesidades
        closedate: new Date(visitData.timestamp).toISOString().split("T")[0],
        hs_priority: "medium",
        // Campos personalizados
        description: `Visita realizada por ${visitData.userName}\nNotas: ${visitData.notes || "Sin notas"}`,
      };

      const dealResponse = await this.createDeal(dealData);

      // 3. Asociar deal con contacto si existe
      if (contactId) {
        await this.axiosInstance.put(
          `/crm/v3/objects/deals/${dealResponse.id}/associations/contacts/${contactId}/deal_to_contact`
        );
      }

      return {
        success: true,
        contactId,
        dealId: dealResponse.id,
      };
    } catch (error: any) {
      console.error("Error syncing visit to HubSpot:", error.response?.data || error.message);
      throw new Error(`Failed to sync visit: ${error.message}`);
    }
  }

  /**
   * Mapea el estado de visita a una etapa de deal en HubSpot
   */
  private mapVisitStatusToDealStage(status: string): string {
    const statusMap: { [key: string]: string } = {
      "Aprobada": "closedwon",
      "Exitosa": "closedwon",
      "Completada": "closedwon",
      "Pendiente": "qualifiedtobuy",
      "En proceso": "presentationscheduled",
      "Rechazada": "closedlost",
      "Fallida": "closedlost",
    };

    return statusMap[status] || "appointmentscheduled";
  }

  /**
   * Obtiene analytics y métricas agregadas
   */
  async getAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const [dealsMetrics, contactsMetrics, pipelineMetrics] = await Promise.all([
        this.getDealsMetrics(startDate, endDate),
        this.getContactsMetrics(startDate, endDate),
        this.getPipelineMetrics(),
      ]);

      return {
        deals: dealsMetrics,
        contacts: contactsMetrics,
        pipelines: pipelineMetrics,
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("Error fetching analytics:", error.response?.data || error.message);
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }
  }
}
