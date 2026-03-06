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
   * Obtiene deals de HubSpot para un owner específico en un rango de fechas.
   * Usado por el Reporte de Productividad para evitar CORS desde el browser.
   */
  async getDealsByOwner(ownerId: string, startMs: number, endMs: number): Promise<{ id: string; createdDate: string }[]> {
    const response = await this.axiosInstance.post("/crm/v3/objects/deals/search", {
      filterGroups: [{
        filters: [
          { propertyName: "hubspot_owner_id", operator: "EQ", value: ownerId },
          { propertyName: "createdate", operator: "GTE", value: startMs.toString() },
          { propertyName: "createdate", operator: "LTE", value: endMs.toString() },
        ],
      }],
      properties: ["dealname", "createdate"],
      limit: 200,
    });
    return (response.data.results || []).map((d: any) => ({
      id: d.id,
      createdDate: (d.properties.createdate || "").split("T")[0],
    }));
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
    producto_aviva?: string;
    aos_cross_selling?: boolean;
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
        producto_aviva,
        aos_cross_selling,
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

      // IMPORTANTE: Filtros de fecha
      // Usamos createdate para el filtro inicial por optimización de la API.
      // Las fechas de venta reales (hs_v2_date_entered_*) se usan solo para MOSTRAR,
      // no para filtrar, porque cada producto usa un campo diferente.
      // Esto significa que los filtros de fecha son aproximados (basados en fecha de solicitud).
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

      // Filtro por producto
      if (producto_aviva) {
        filters.push({
          propertyName: "producto_aviva",
          operator: "EQ",
          value: producto_aviva,
        });
      }

      // Filtro por cross-selling
      if (aos_cross_selling !== undefined) {
        filters.push({
          propertyName: "aos_cross_selling",
          operator: "EQ",
          value: aos_cross_selling ? "true" : "false",
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

  /**
   * Mapea productLine de Firestore a valores de producto_aviva en HubSpot
   */
  private getHubSpotProductsForProductLine(productLine?: string): string[] {
    if (!productLine) return []; // Sin filtro si no hay productLine

    const productMap: { [key: string]: string[] } = {
      "AVIVA_TU_NEGOCIO": ["aviva_atn"],
      "AVIVA_CONTIGO": ["aviva_contigo"],
      "AVIVA_TU_COMPRA": ["aviva_tucompra"],
      "AVIVA_TU_CASA": ["aviva_tucasa", "disensa_aviva_tucasa", "construrama_aviva_tucasa", "casa_marchand", "salauno"],
    };

    return productMap[productLine] || [];
  }

  /**
   * Calcula el progreso de una meta comercial para un usuario específico
   *
   * @param userId - ID del usuario (hubspot_owner_id)
   * @param startDate - Fecha de inicio de la meta
   * @param endDate - Fecha de fin de la meta
   * @param productLine - Línea de producto del usuario (AVIVA_TU_NEGOCIO, AVIVA_CONTIGO, etc.)
   * @returns Objeto con llamadas y colocación actuales
   */
  async calculateGoalProgress(
    userId: string,
    startDate: Date,
    endDate: Date,
    productLine?: string
  ): Promise<{ llamadas: number; colocacion: number }> {
    try {
      // Ajustar endDate al final del día
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      // CORREGIDO: Traer deals de los últimos 6 meses para incluir
      // deals creados antes pero desembolsados en el período actual
      const sixMonthsAgo = new Date(startDate);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const filters = [
        {
          propertyName: "hubspot_owner_id",
          operator: "EQ",
          value: userId,
        },
        {
          propertyName: "createdate",
          operator: "GTE",
          value: sixMonthsAgo.getTime().toString(),
        },
        {
          propertyName: "createdate",
          operator: "LTE",
          value: endDateTime.getTime().toString(),
        },
      ];

      // Obtener todos los deals del usuario de los últimos 6 meses
      const deals = await this.getAllDeals([{ filters }]);

      const startTime = startDate.getTime();
      const endTime = endDateTime.getTime();

      // Obtener productos válidos según productLine del usuario
      const validProducts = this.getHubSpotProductsForProductLine(productLine);

      console.log(`💰 Calculando progreso para ${deals.length} deals`);
      console.log(`   Rango: ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);
      console.log(`   ProductLine: ${productLine || 'no especificado'}`);
      console.log(`   Productos válidos: ${validProducts.length > 0 ? validProducts.join(', ') : 'TODOS'}`);

      let llamadas = 0;
      let colocacion = 0;
      let dealsWithDisbursement = 0;
      let dealsWithoutDisbursement = 0;
      let dealsFiltered = 0;

      // Mostrar detalles del PRIMER deal solamente para diagnóstico
      if (deals.length > 0) {
        const firstDeal = deals[0];
        const props = firstDeal.properties;
        console.log(`\n========================================`);
        console.log(`📋 DEAL #1 (DIAGNÓSTICO COMPLETO)`);
        console.log(`========================================`);
        console.log(`Nombre: ${props.dealname || 'Sin nombre'}`);
        console.log(`Amount: ${props.amount || 'null'}`);
        console.log(`Producto: ${props.producto_aviva || 'null'}`);
        console.log(`\n🔍 TODAS LAS PROPIEDADES con 'date' o 'entered':`);
        Object.keys(props).sort().forEach(key => {
          if (key.includes('date') || key.includes('Date') || key.includes('entered')) {
            const value = props[key];
            if (value && value !== 'null' && value !== null) {
              console.log(`   ✅ ${key}: ${value}`);
            } else {
              console.log(`   ❌ ${key}: null`);
            }
          }
        });
        console.log(`========================================\n`);
      }

      deals.forEach((deal, index) => {
        const props = deal.properties;

        // Determinar tipo de producto
        const producto = props.producto_aviva;

        // FILTRAR: Solo procesar deals del productLine del usuario
        if (validProducts.length > 0 && !validProducts.includes(producto)) {
          console.log(`   ⏭️  OMITIDO - Producto no coincide con productLine del usuario`);
          dealsFiltered++;
          return;
        }

        // LLAMADAS = Deals CREADOS en el período (verificar createdate)
        const createDate = props.createdate ? new Date(props.createdate).getTime() : null;
        const createdInPeriod = createDate && createDate >= startTime && createDate <= endTime;

        if (createdInPeriod) {
          llamadas++;
          console.log(`   ✅ CUENTA para llamadas (#${llamadas}) - deal creado en el período`);
        } else {
          console.log(`   ⏭️  NO cuenta para llamadas - creado fuera del período`);
        }

        const isAvivaCompra = producto === "aviva_tucompra";

        // Obtener fecha de disbursement según el producto SOLO para colocación
        let disbursementDate = null;

        if (isAvivaCompra) {
          // Aviva Tu Compra usa hs_v2_date_entered_146336009
          if (props.hs_v2_date_entered_146336009) {
            const rawValue = props.hs_v2_date_entered_146336009;
            // HubSpot puede retornar timestamp numérico o ISO string
            if (typeof rawValue === 'string' && rawValue.includes('T')) {
              // Es ISO string (ej: "2025-12-04T18:17:25.649Z")
              disbursementDate = new Date(rawValue).getTime();
            } else {
              // Es timestamp numérico (milisegundos desde epoch)
              disbursementDate = parseInt(rawValue);
            }
            console.log(`   ✅ Tiene disbursement (Aviva Tu Compra): ${new Date(disbursementDate).toISOString()}`);
          }
        } else {
          // Otros productos usan hs_v2_date_entered_33823866
          if (props.hs_v2_date_entered_33823866) {
            const rawValue = props.hs_v2_date_entered_33823866;
            // HubSpot puede retornar timestamp numérico o ISO string
            if (typeof rawValue === 'string' && rawValue.includes('T')) {
              // Es ISO string (ej: "2025-12-04T18:17:25.649Z")
              disbursementDate = new Date(rawValue).getTime();
            } else {
              // Es timestamp numérico (milisegundos desde epoch)
              disbursementDate = parseInt(rawValue);
            }
            console.log(`   ✅ Tiene disbursement (Otros productos): ${new Date(disbursementDate).toISOString()}`);
          }
        }

        // COLOCACIÓN = Solo deals con disbursement en el período
        if (disbursementDate && disbursementDate >= startTime && disbursementDate <= endTime) {
          const amount = parseFloat(props.amount || "0");
          if (!isNaN(amount) && amount > 0) {
            colocacion += amount;
            dealsWithDisbursement++;
            console.log(`   ✅ CUENTA para colocación: $${amount.toLocaleString()} (disbursement en período)`);
          } else {
            console.log(`   ⚠️  Disbursement en período pero amount inválido: ${props.amount}`);
          }
        } else if (disbursementDate) {
          const isBeforeStart = disbursementDate < startTime;
          console.log(`   ❌ Disbursement FUERA del rango: ${isBeforeStart ? 'antes del inicio' : 'después del fin'}`);
          dealsWithDisbursement++;
        } else {
          console.log(`   ℹ️  Sin fecha de disbursement - no cuenta para colocación`);
          dealsWithoutDisbursement++;
        }
      });

      console.log(`\n📊 Resultados:`);
      console.log(`   - Total deals encontrados: ${deals.length}`);
      console.log(`   - Deals filtrados (producto no coincide): ${dealsFiltered}`);
      console.log(`   - Deals procesados: ${llamadas}`);
      console.log(`   - Deals CON fecha de disbursement: ${dealsWithDisbursement}`);
      console.log(`   - Deals SIN fecha de disbursement: ${dealsWithoutDisbursement}`);
      console.log(`   - Llamadas: ${llamadas}`);
      console.log(`   - Colocación: $${colocacion.toLocaleString()}`);

      // Diagnóstico adicional si colocación es 0
      if (colocacion === 0 && llamadas > 0) {
        console.log(`\n⚠️  DIAGNÓSTICO: Colocación es $0 pero hay ${llamadas} llamadas`);
        if (dealsWithoutDisbursement === llamadas) {
          console.log(`   ❌ PROBLEMA: NINGÚN deal tiene fecha de disbursement`);
          console.log(`   💡 Solución: Los deals deben avanzar a la etapa de disbursement en HubSpot`);
          console.log(`   💡 O verificar que las propiedades de disbursement sean correctas:`);
          console.log(`      - Aviva Tu Compra: hs_v2_date_entered_146336009`);
          console.log(`      - Otros productos: hs_v2_date_entered_33823866`);
        } else if (dealsWithDisbursement > 0 && dealsWithDisbursement < llamadas) {
          console.log(`   ⚠️  Solo ${dealsWithDisbursement}/${llamadas} deals tienen disbursement`);
          console.log(`   💡 Los ${dealsWithDisbursement} deals con disbursement están fuera del rango de fechas`);
        }
      }

      return {
        llamadas,
        colocacion: Math.round(colocacion), // Redondear a enteros
      };
    } catch (error: any) {
      console.error("Error calculating goal progress:", error);
      throw new Error(`Failed to calculate goal progress: ${error.message}`);
    }
  }

  /**
   * Obtiene todos los deals con paginación completa
   * (versión privada para uso interno)
   */
  private async getAllDeals(filterGroups: any[]): Promise<any[]> {
    const allDeals: any[] = [];
    let after: string | undefined;
    let page = 1;

    while (true) {
      const payload: any = {
        filterGroups,
        // TEMPORAL: Solicitar TODAS las propiedades para diagnóstico
        // Esto mostrará qué propiedades existen realmente en HubSpot
        properties: [
          "dealname",
          "amount",
          "createdate",
          "closedate",
          "hubspot_owner_id",
          "dealstage",
          "pipeline",
          "hs_v2_date_entered_33823866",
          "hs_v2_date_entered_146336009",
          "hs_v2_date_entered_146251806",
          "hs_v2_date_entered_36073275",
          "producto_aviva",
          "hs_date_entered_33823866",
          "hs_date_entered_146336009",
          "hs_date_entered_146251806",
          "hs_date_entered_36073275",
        ],
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
      allDeals.push(...deals);

      const paging = response.data.paging || {};
      after = paging.next?.after;

      if (!after || deals.length === 0) {
        break;
      }

      page++;

      // Límite de seguridad
      if (page > 200) {
        console.warn(`⚠️ Alcanzado límite de seguridad en getAllDeals (página ${page})`);
        break;
      }
    }

    return allDeals;
  }

  /**
   * Calcula benchmarks de una liga
   *
   * @param userIds - Array de IDs de usuarios en la liga
   * @param startDate - Fecha de inicio del período
   * @param endDate - Fecha de fin del período
   * @returns Array de resultados con métricas por usuario
   */
  async calculateLeagueBenchmarks(
    userMap: Map<string, string | undefined>, // Map de hubspotOwnerId -> productLine
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    userId: string;
    metrics: {
      llamadas: number;
      colocacion: number;
      tasaCierre: number;
    };
  }>> {
    try {
      const results = await Promise.all(
        Array.from(userMap.entries()).map(async ([userId, productLine]) => {
          // Calcular métricas básicas (llamadas y colocación)
          const progress = await this.calculateGoalProgress(userId, startDate, endDate, productLine);

          // Calcular tasa de cierre según las nuevas reglas
          const tasaCierre = await this.calculateClosureRate(userId, startDate, endDate, productLine);

          return {
            userId,
            metrics: {
              llamadas: progress.llamadas,
              colocacion: progress.colocacion,
              tasaCierre: Math.round(tasaCierre * 100) / 100, // 2 decimales
            },
          };
        })
      );

      return results;
    } catch (error: any) {
      console.error("Error calculating league benchmarks:", error);
      throw new Error(`Failed to calculate league benchmarks: ${error.message}`);
    }
  }

  /**
   * Calcula la tasa de cierre de un usuario
   * Tasa de cierre = (deals desembolsados / deals aprobados) * 100
   *
   * Para Aviva Tu Compra/Cashi:
   *   - Desembolsados: deals con hs_v2_date_entered_146336009 en el período
   *   - Aprobados: deals con hs_v2_date_entered_146251806 en el período
   *
   * Para otros productos:
   *   - Desembolsados: deals con hs_v2_date_entered_33823866 en el período
   *   - Aprobados: deals con hs_v2_date_entered_36073275 en el período
   */
  async calculateClosureRate(
    userId: string,
    startDate: Date,
    endDate: Date,
    productLine?: string
  ): Promise<number> {
    try {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      // Filtros base para deals del usuario
      const filters = [
        {
          propertyName: "hubspot_owner_id",
          operator: "EQ",
          value: userId,
        },
        {
          propertyName: "createdate",
          operator: "GTE",
          value: startDate.getTime().toString(),
        },
        {
          propertyName: "createdate",
          operator: "LTE",
          value: endDateTime.getTime().toString(),
        },
      ];

      // Obtener todos los deals del usuario
      const deals = await this.getAllDeals([{ filters }]);

      // Obtener productos válidos según productLine del usuario
      const validProducts = this.getHubSpotProductsForProductLine(productLine);

      const startTime = startDate.getTime();
      const endTime = endDateTime.getTime();

      let desembolsadosAvivaCompra = 0;
      let aprobadosAvivaCompra = 0;
      let desembolsadosOtros = 0;
      let aprobadosOtros = 0;

      deals.forEach((deal) => {
        const props = deal.properties;
        const producto = props.producto_aviva;

        // FILTRAR: Solo procesar deals del productLine del usuario
        if (validProducts.length > 0 && !validProducts.includes(producto)) {
          return; // Skip este deal
        }

        const isAvivaCompra = producto === "aviva_tucompra";

        if (isAvivaCompra) {
          // Aviva Tu Compra
          // Contar desembolsados
          if (props.hs_v2_date_entered_146336009) {
            const dateValue = this.parseHubSpotDate(props.hs_v2_date_entered_146336009);
            if (dateValue && dateValue >= startTime && dateValue <= endTime) {
              desembolsadosAvivaCompra++;
            }
          }

          // Contar aprobados
          if (props.hs_v2_date_entered_146251806) {
            const dateValue = this.parseHubSpotDate(props.hs_v2_date_entered_146251806);
            if (dateValue && dateValue >= startTime && dateValue <= endTime) {
              aprobadosAvivaCompra++;
            }
          }
        } else {
          // Otros productos
          // Contar desembolsados
          if (props.hs_v2_date_entered_33823866) {
            const dateValue = this.parseHubSpotDate(props.hs_v2_date_entered_33823866);
            if (dateValue && dateValue >= startTime && dateValue <= endTime) {
              desembolsadosOtros++;
            }
          }

          // Contar aprobados
          if (props.hs_v2_date_entered_36073275) {
            const dateValue = this.parseHubSpotDate(props.hs_v2_date_entered_36073275);
            if (dateValue && dateValue >= startTime && dateValue <= endTime) {
              aprobadosOtros++;
            }
          }
        }
      });

      // Calcular tasa de cierre combinada
      const totalDesembolsados = desembolsadosAvivaCompra + desembolsadosOtros;
      const totalAprobados = aprobadosAvivaCompra + aprobadosOtros;

      console.log(`📊 Tasa de cierre para usuario ${userId}:`);
      console.log(`   - Aviva Tu Compra: ${desembolsadosAvivaCompra} / ${aprobadosAvivaCompra}`);
      console.log(`   - Otros: ${desembolsadosOtros} / ${aprobadosOtros}`);
      console.log(`   - Total: ${totalDesembolsados} / ${totalAprobados}`);

      if (totalAprobados === 0) {
        return 0;
      }

      return (totalDesembolsados / totalAprobados) * 100;
    } catch (error) {
      console.error("Error calculating closure rate:", error);
      return 0;
    }
  }

  /**
   * Helper para parsear fechas de HubSpot (pueden ser timestamps o ISO strings)
   */
  private parseHubSpotDate(value: string): number | null {
    if (!value) return null;

    try {
      if (typeof value === 'string' && value.includes('T')) {
        // Es ISO string (ej: "2025-12-04T18:17:25.649Z")
        return new Date(value).getTime();
      } else {
        // Es timestamp numérico (milisegundos desde epoch)
        return parseInt(value);
      }
    } catch (error) {
      console.error("Error parsing HubSpot date:", error);
      return null;
    }
  }

  /**
   * Calcula el progreso de una meta para un kiosco específico
   * (asume que los deals tienen una propiedad personalizada que identifica el kiosco)
   *
   * @param kioskId - ID del kiosco
   * @param startDate - Fecha de inicio de la meta
   * @param endDate - Fecha de fin de la meta
   * @returns Objeto con llamadas y colocación actuales
   */
  async calculateKioskGoalProgress(
    kioskId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ llamadas: number; colocacion: number }> {
    try {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      // Nota: Este método asume que existe una propiedad personalizada en HubSpot
      // para identificar el kiosco. Ajustar según la implementación real.
      const filters = [
        {
          propertyName: "kiosk_id", // Ajustar según el nombre real de la propiedad
          operator: "EQ",
          value: kioskId,
        },
        {
          propertyName: "createdate",
          operator: "GTE",
          value: startDate.getTime().toString(),
        },
        {
          propertyName: "createdate",
          operator: "LTE",
          value: endDateTime.getTime().toString(),
        },
      ];

      const deals = await this.getAllDeals([{ filters }]);

      const startTime = startDate.getTime();
      const endTime = endDateTime.getTime();

      let llamadas = 0;
      let colocacion = 0;

      deals.forEach((deal) => {
        const props = deal.properties;
        const producto = props.producto_aviva;
        const isAvivaCompra = producto === "aviva_tucompra";

        let disbursementDate = null;

        if (isAvivaCompra) {
          if (props.hs_v2_date_entered_146336009) {
            disbursementDate = this.parseHubSpotDate(props.hs_v2_date_entered_146336009);
          }
        } else {
          if (props.hs_v2_date_entered_33823866) {
            disbursementDate = this.parseHubSpotDate(props.hs_v2_date_entered_33823866);
          }
        }

        if (disbursementDate && disbursementDate >= startTime && disbursementDate <= endTime) {
          llamadas++;
          const amount = parseFloat(props.amount || "0");
          if (!isNaN(amount) && amount > 0) {
            colocacion += amount;
          }
        }
      });

      return {
        llamadas,
        colocacion: Math.round(colocacion),
      };
    } catch (error: any) {
      console.error("Error calculating kiosk goal progress:", error);
      throw new Error(`Failed to calculate kiosk goal progress: ${error.message}`);
    }
  }
}
