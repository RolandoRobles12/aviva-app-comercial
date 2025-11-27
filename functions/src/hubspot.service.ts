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

  /**
   * Búsqueda avanzada de deals para el chatbot
   * Similar al bot de Python/Slack
   */
  async searchDeals(params: {
    deal_name?: string;
    deal_stage?: string;
    owner_ids?: string[];
    date_from?: string;
    date_to?: string;
    response_type?: "count_only" | "summary" | "details";
    limit?: number;
  }): Promise<string> {
    try {
      console.log("🔍 HubSpot searchDeals:", JSON.stringify(params, null, 2));

      const {
        deal_name,
        deal_stage,
        owner_ids,
        date_from,
        date_to,
        response_type = "summary",
        limit = 20,
      } = params;

      // Construir filtros
      const filters: any[] = [];

      if (deal_name) {
        filters.push({
          propertyName: "dealname",
          operator: "CONTAINS_TOKEN",
          value: deal_name,
        });
      }

      if (deal_stage) {
        filters.push({
          propertyName: "dealstage",
          operator: "EQ",
          value: deal_stage,
        });
      }

      if (date_from) {
        const dateObj = new Date(date_from);
        const timestamp = dateObj.getTime();
        filters.push({
          propertyName: "createdate",
          operator: "GTE",
          value: timestamp.toString(),
        });
      }

      if (date_to) {
        const dateObj = new Date(date_to);
        dateObj.setHours(23, 59, 59, 999);
        const timestamp = dateObj.getTime();
        filters.push({
          propertyName: "createdate",
          operator: "LTE",
          value: timestamp.toString(),
        });
      }

      // Construir filter groups
      let filterGroups: any[] = [];

      if (owner_ids && owner_ids.length > 1) {
        // Múltiples owners - crear un filter group por cada uno
        filterGroups = owner_ids.map((ownerId) => ({
          filters: [
            ...filters,
            {
              propertyName: "hubspot_owner_id",
              operator: "EQ",
              value: ownerId,
            },
          ],
        }));
      } else {
        // Un solo owner o ninguno
        if (owner_ids && owner_ids.length === 1) {
          filters.push({
            propertyName: "hubspot_owner_id",
            operator: "EQ",
            value: owner_ids[0],
          });
        }
        filterGroups = [{ filters }];
      }

      // Obtener conteo total con paginación
      const totalCount = await this.getDealsCount(filterGroups);

      if (totalCount === 0) {
        const dateStr = date_from && date_to
          ? date_from === date_to
            ? ` el ${this.formatDateSpanish(date_from)}`
            : ` entre ${this.formatDateSpanish(date_from)} y ${this.formatDateSpanish(date_to)}`
          : "";
        return `No se encontraron deals/llamadas${dateStr}.`;
      }

      // Para análisis, obtener muestra de datos
      let deals: any[] = [];
      if (response_type === "summary" || response_type === "details") {
        deals = await this.getDealsSample(filterGroups, Math.min(200, totalCount));
      }

      // Formatear respuesta
      return this.formatResponse(totalCount, deals, response_type, date_from, date_to);
    } catch (error: any) {
      console.error("Error in searchDeals:", error.response?.data || error.message);
      throw new Error(`Failed to search deals: ${error.message}`);
    }
  }

  /**
   * Obtiene conteo total de deals con paginación ilimitada
   */
  private async getDealsCount(filterGroups: any[]): Promise<number> {
    let totalCount = 0;
    let after: string | undefined;
    let page = 1;

    console.log("🚀 Iniciando paginación para conteo...");

    while (true) {
      const payload: any = {
        filterGroups,
        properties: ["hubspot_owner_id"],
        limit: 100,
        sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
      };

      if (after) {
        payload.after = after;
      }

      const response = await this.axiosInstance.post(
        "/crm/v3/objects/deals/search",
        payload
      );

      const deals = response.data.results || [];
      const pageCount = deals.length;
      totalCount += pageCount;

      console.log(`📄 Página ${page}: ${pageCount} deals (Total acumulado: ${totalCount})`);

      const paging = response.data.paging || {};
      after = paging.next?.after;

      if (!after || pageCount === 0) {
        console.log(`✅ Paginación completada. Total: ${totalCount} deals`);
        break;
      }

      page++;

      // Límite de seguridad (200 páginas = 20,000 deals)
      if (page > 200) {
        console.warn(`⚠️ Alcanzado límite de seguridad en página ${page}`);
        break;
      }
    }

    return totalCount;
  }

  /**
   * Obtiene muestra de deals para análisis
   */
  private async getDealsSample(filterGroups: any[], sampleSize: number): Promise<any[]> {
    const payload = {
      filterGroups,
      properties: [
        "dealname",
        "amount",
        "dealstage",
        "pipeline",
        "closedate",
        "createdate",
        "hubspot_owner_id",
        "hs_deal_stage_probability",
        "description",
      ],
      limit: sampleSize,
      sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
    };

    const response = await this.axiosInstance.post(
      "/crm/v3/objects/deals/search",
      payload
    );

    const deals = response.data.results || [];
    console.log(`📊 Muestra obtenida: ${deals.length} deals`);
    return deals;
  }

  /**
   * Formatea respuesta según el tipo solicitado
   */
  private formatResponse(
    totalCount: number,
    deals: any[],
    responseType: string,
    dateFrom?: string,
    dateTo?: string
  ): string {
    const dateStr = this.getDateString(dateFrom, dateTo);

    if (responseType === "count_only") {
      return `📊 ${totalCount} deals/llamadas encontrados${dateStr}.`;
    }

    if (responseType === "summary") {
      const lines = [`📊 ${totalCount} deals/llamadas encontrados${dateStr}\n`];

      if (deals.length > 0) {
        // Análisis de owners
        const ownersAnalysis = this.analyzeOwners(deals);

        // Monto total
        const totalAmount = deals.reduce((sum, deal) => {
          const amount = parseFloat(deal.properties.amount || "0");
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        if (totalAmount > 0) {
          lines.push(`💰 Monto total (muestra): $${Math.round(totalAmount).toLocaleString()}`);
        }

        // Top creadores
        if (ownersAnalysis.length > 0) {
          lines.push("\n👥 Top creadores:");
          ownersAnalysis.slice(0, 5).forEach(([owner, count], i) => {
            lines.push(`${i + 1}. ${owner}: ${count} deals`);
          });
        }
      }

      return lines.join("\n");
    }

    // details
    return this.formatDealsDetailed(deals, totalCount, dateStr);
  }

  /**
   * Analiza owners y retorna ranking
   */
  private analyzeOwners(deals: any[]): Array<[string, number]> {
    const ownersCount: { [key: string]: number } = {};

    deals.forEach((deal) => {
      const ownerId = deal.properties.hubspot_owner_id || "Sin asignar";
      const ownerName = ownerId === "Sin asignar" ? "Sin asignar" : `Usuario ${ownerId}`;
      ownersCount[ownerName] = (ownersCount[ownerName] || 0) + 1;
    });

    return Object.entries(ownersCount).sort((a, b) => b[1] - a[1]);
  }

  /**
   * Formato detallado de deals
   */
  private formatDealsDetailed(deals: any[], totalCount: number, dateStr: string): string {
    const lines = [`📊 ${totalCount} deals/llamadas encontrados${dateStr}:\n`];

    const displayCount = Math.min(5, deals.length);

    for (let i = 0; i < displayCount; i++) {
      const deal = deals[i];
      const props = deal.properties;

      const amount = parseFloat(props.amount || "0");
      const amountFormatted = isNaN(amount) ? "$0" : `$${Math.round(amount).toLocaleString()}`;

      let dateFormatted = "N/A";
      if (props.createdate) {
        try {
          const date = new Date(props.createdate);
          dateFormatted = date.toLocaleDateString("es-MX");
        } catch {
          dateFormatted = "N/A";
        }
      }

      lines.push(`\nDeal ${i + 1}:`);
      lines.push(`• Cliente: ${props.dealname || "Sin nombre"}`);
      lines.push(`• Monto: ${amountFormatted}`);
      lines.push(`• Fecha: ${dateFormatted}`);
    }

    if (deals.length > displayCount) {
      const remaining = totalCount - displayCount;
      lines.push(`\n... y ${remaining} deals más`);
    }

    return lines.join("\n");
  }

  /**
   * Obtiene string de fecha formateado
   */
  private getDateString(dateFrom?: string, dateTo?: string): string {
    if (!dateFrom || !dateTo) return "";

    if (dateFrom === dateTo) {
      return ` el ${this.formatDateSpanish(dateFrom)}`;
    }

    return ` entre ${this.formatDateSpanish(dateFrom)} y ${this.formatDateSpanish(dateTo)}`;
  }

  /**
   * Formatea fecha a español
   */
  private formatDateSpanish(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("es-MX");
    } catch {
      return dateStr;
    }
  }
}
