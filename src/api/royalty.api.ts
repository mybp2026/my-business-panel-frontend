import { url } from ".";
import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  ApplicableRoyaltyRule,
  GiftableProduct,
  RoyaltyOption,
  RoyaltyRule,
} from "@/interfaces/entities/Royalty.interface";
import type {
  RoyaltyAnalytics,
  RoyaltyInterval,
} from "@/interfaces/entities/RoyaltyAnalytics.interface";

const base = `${url}/pos-royalty`;

const checkResponse = (res: Response, body: unknown) => {
  if (!res.ok) {
    const msg = (body as { message?: string })?.message ?? `Error ${res.status}`;
    throw new Error(Array.isArray(msg) ? (msg as string[]).join(", ") : msg);
  }
};

export const royaltyApi = {
  // Analitica de regalias (mercancia obsequiada). Intervalo + sucursal se aplican
  // en el backend (regla del repo: los filtros re-consultan).
  async getAnalytics(
    tenantId: string,
    interval: RoyaltyInterval,
    branchId?: string | null,
  ): Promise<RoyaltyAnalytics> {
    const params = new URLSearchParams({ interval });
    if (branchId) params.set("branchId", branchId);
    const res = await fetch(`${base}/analytics/${tenantId}?${params.toString()}`, {
      credentials: "include",
    });
    const body = await res.json();
    checkResponse(res, body);
    return (body as ApiResponse<RoyaltyAnalytics>).data;
  },

  async listRules(tenantId: string): Promise<RoyaltyRule[]> {
    const res = await fetch(`${base}/rules/${tenantId}`, {
      credentials: "include",
    });
    const body = await res.json();
    checkResponse(res, body);
    return (body as ApiResponse<RoyaltyRule[]>).data;
  },

  async createRule(tenantId: string, minAmount: number): Promise<RoyaltyRule> {
    const res = await fetch(`${base}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        tenant_id: tenantId,
        min_amount: minAmount,
      }),
    });
    const body = await res.json();
    checkResponse(res, body);
    return (body as ApiResponse<RoyaltyRule>).data;
  },

  async updateRule(royaltyRuleId: string, minAmount: number): Promise<RoyaltyRule> {
    const res = await fetch(`${base}/rules/${royaltyRuleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ min_amount: minAmount }),
    });
    const body = await res.json();
    checkResponse(res, body);
    return (body as ApiResponse<RoyaltyRule>).data;
  },

  async deleteRule(royaltyRuleId: string): Promise<void> {
    const res = await fetch(`${base}/rules/${royaltyRuleId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const body = await res.json().catch(() => ({}));
    checkResponse(res, body);
  },

  async setRuleDimensions(
    royaltyRuleId: string,
    tenantProductGroupTypeIds: string[],
  ): Promise<RoyaltyRule> {
    const res = await fetch(`${base}/rules/${royaltyRuleId}/dimensions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        tenant_product_group_type_ids: tenantProductGroupTypeIds,
      }),
    });
    const body = await res.json();
    checkResponse(res, body);
    return (body as ApiResponse<RoyaltyRule>).data;
  },

  async createOption(data: {
    royalty_rule_id: string;
    tenant_product_group_id: string;
    quantity: number;
  }): Promise<RoyaltyOption> {
    const res = await fetch(`${base}/options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const body = await res.json();
    checkResponse(res, body);
    return (body as ApiResponse<RoyaltyOption>).data;
  },

  async updateOption(
    royaltyOptionId: string,
    data: { quantity: number },
  ): Promise<RoyaltyOption> {
    const res = await fetch(`${base}/options/${royaltyOptionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const body = await res.json();
    checkResponse(res, body);
    return (body as ApiResponse<RoyaltyOption>).data;
  },

  async deleteOption(royaltyOptionId: string): Promise<void> {
    const res = await fetch(`${base}/options/${royaltyOptionId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const body = await res.json().catch(() => ({}));
    checkResponse(res, body);
  },

  async getApplicableRules(
    tenantId: string,
    amount: number,
  ): Promise<ApplicableRoyaltyRule[]> {
    const res = await fetch(
      `${base}/applicable?tenant_id=${tenantId}&amount=${amount}`,
      { credentials: "include" },
    );
    const body = await res.json();
    checkResponse(res, body);
    return (body as ApiResponse<ApplicableRoyaltyRule[]>).data;
  },

  async getGiftableProducts(tenantProductGroupId: string): Promise<GiftableProduct[]> {
    const res = await fetch(
      `${base}/giftable-products/${tenantProductGroupId}`,
      { credentials: "include" },
    );
    const body = await res.json();
    checkResponse(res, body);
    return (body as ApiResponse<GiftableProduct[]>).data;
  },
};
