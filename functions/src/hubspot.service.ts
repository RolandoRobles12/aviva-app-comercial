import axios, { AxiosInstance } from "axios";

/**
 * Servicio para integración con HubSpot CRM API
 * Documentación: https://developers.hubspot.com/docs/api/overview
 */
export class HubSpotService {
  private axiosInstance: AxiosInstance;
  private ownerCache: Map<string, { name: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 86400000; // 24 horas en milisegundos

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
   * Mapea internal value de producto a label
   */
  private mapProductLabel(internalValue: string): string {
    const productMap: { [key: string]: string } = {
      "aviva_contigo": "Aviva Contigo",
      "aviva_atn": "Aviva Tu Negocio",
      "aviva_tucompra": "Aviva Tu Compra",
      "aviva_tucasa": "Disensa Aviva Tu Casa",
      "construrama_aviva_tucasa": "Construrama Aviva Tu Casa",
      "casa_marchand": "Casa Marchand",
      "salauno": "Sala Uno",
    };
    return productMap[internalValue] || internalValue;
  }

  /**
   * Obtiene fecha de venta según el producto
   */
  private getSaleDate(deal: any): string | null {
    const producto = deal.properties.producto_aviva;

    if (producto === "aviva_tucompra") {
      return deal.properties.hs_v2_date_entered_146336009 || null;
    } else {
      return deal.properties.hs_v2_date_entered_33823866 || null;
    }
  }

  /**
   * Obtiene nombre del owner desde HubSpot con cache
   */
  private async getOwnerName(ownerId: string): Promise<string> {
    if (!ownerId) return "Sin asignar";

    // Verificar cache
    const cached = this.ownerCache.get(ownerId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.name;
    }

    try {
      const response = await this.axiosInstance.get(`/crm/v3/owners/${ownerId}`);
      const data = response.data;

      const firstName = data.firstName || "";
      const lastName = data.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      const ownerName = fullName || data.email || `Usuario ${ownerId}`;

      // Guardar en cache
      this.ownerCache.set(ownerId, {
        name: ownerName,
        timestamp: Date.now(),
      });

      return ownerName;
    } catch (error) {
      console.error(`❌ Error obteniendo owner ${ownerId}:`, error);
      return `Usuario ${ownerId}`;
    }
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
        // limit se ignora por ahora - usamos paginación completa
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
      return await this.formatResponse(totalCount, deals, response_type, date_from, date_to);
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
        // Properties específicas de Aviva
        "producto_aviva",
        "atg_renewal_offer_link",
        "whatsapp_phone_number",
        "aos_cross_selling",
        "incentivo_por_venta_de_renovacion",
        "aos_customerlink_pay",
        "service_owner",
        "tipo_de_periodo",
        "periodos",
        "pago_por_periodo",
        "curb",
        "hs_v2_date_entered_33823866",
        "hs_v2_date_entered_146336009",
        "hs_v2_date_entered_146251806",
        "hs_v2_date_entered_36073275",
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
  private async formatResponse(
    totalCount: number,
    deals: any[],
    responseType: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<string> {
    const dateStr = this.getDateString(dateFrom, dateTo);

    if (responseType === "count_only") {
      return `📊 ${totalCount} deals/llamadas encontrados${dateStr}.`;
    }

    if (responseType === "summary") {
      const lines = [`📊 ${totalCount} deals/llamadas encontrados${dateStr}\n`];

      if (deals.length > 0) {
        // Análisis de owners con nombres reales
        const ownersAnalysis = await this.analyzeOwners(deals);

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
    return await this.formatDealsDetailed(deals, totalCount, dateStr);
  }

  /**
   * Analiza owners y retorna ranking con nombres reales
   */
  private async analyzeOwners(deals: any[]): Promise<Array<[string, number]>> {
    const ownersCount: { [key: string]: number } = {};

    // Agrupar por owner ID
    deals.forEach((deal) => {
      const ownerId = deal.properties.hubspot_owner_id || "Sin asignar";
      ownersCount[ownerId] = (ownersCount[ownerId] || 0) + 1;
    });

    // Obtener nombres reales
    const ownersWithNames: Array<[string, number]> = [];

    for (const [ownerId, count] of Object.entries(ownersCount)) {
      const ownerName = await this.getOwnerName(ownerId);
      ownersWithNames.push([ownerName, count]);
    }

    return ownersWithNames.sort((a, b) => b[1] - a[1]);
  }

  /**
   * Formato detallado de deals con toda la información
   */
  private async formatDealsDetailed(deals: any[], totalCount: number, dateStr: string): Promise<string> {
    const lines = [`📊 ${totalCount} deals/llamadas encontrados${dateStr}:\n`];

    const displayCount = Math.min(5, deals.length);

    for (let i = 0; i < displayCount; i++) {
      const deal = deals[i];
      const props = deal.properties;

      // Información básica
      const amount = parseFloat(props.amount || "0");
      const amountFormatted = isNaN(amount) ? "$0" : `$${Math.round(amount).toLocaleString()}`;

      // Fecha de venta (no createdate)
      const saleDate = this.getSaleDate(deal);
      let saleDateFormatted = "N/A";
      if (saleDate) {
        try {
          const date = new Date(parseInt(saleDate));
          saleDateFormatted = date.toLocaleDateString("es-MX");
        } catch {
          saleDateFormatted = "N/A";
        }
      }

      // Producto
      const producto = props.producto_aviva
        ? this.mapProductLabel(props.producto_aviva)
        : "N/A";

      // Vendedor (owner)
      const ownerId = props.hubspot_owner_id || "";
      const vendedor = await this.getOwnerName(ownerId);

      // Videoagente (service owner)
      const serviceOwnerId = props.service_owner || "";
      const videoagente = await this.getOwnerName(serviceOwnerId);

      // Información de períodos y pagos
      const tipoPeriodo = props.tipo_de_periodo || "N/A";
      const periodos = props.periodos || "N/A";
      const pagoPorPeriodo = props.pago_por_periodo
        ? `$${parseFloat(props.pago_por_periodo).toLocaleString()}`
        : "N/A";

      // Cross-selling
      const isCrossSelling = props.aos_cross_selling === "true";

      lines.push(`\n🔹 Deal ${i + 1}:`);
      lines.push(`• Cliente: ${props.dealname || "Sin nombre"}`);
      lines.push(`• Producto: ${producto}`);
      lines.push(`• Monto: ${amountFormatted}`);
      lines.push(`• Vendedor: ${vendedor}`);
      lines.push(`• Videoagente: ${videoagente}`);
      lines.push(`• Fecha de venta: ${saleDateFormatted}`);

      if (periodos !== "N/A") {
        lines.push(`• Períodos: ${periodos} (${tipoPeriodo})`);
        lines.push(`• Pago por período: ${pagoPorPeriodo}`);
      }

      if (isCrossSelling) {
        lines.push(`• 🔄 Es renovación cross-selling`);
      }

      // WhatsApp si existe
      if (props.whatsapp_phone_number) {
        lines.push(`• WhatsApp: ${props.whatsapp_phone_number}`);
      }

      // Link de pago si existe
      if (props.aos_customerlink_pay) {
        lines.push(`• Link de pago: ${props.aos_customerlink_pay}`);
      }
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
