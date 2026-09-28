import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type {
  ApplySupplierCreditRequest,
  CreatePurchaseDisputeRequest,
  CreatePurchaseOrderRequest,
  CreatePurchasePaymentRequest,
  CreateSupplierRequest,
  ResolvePurchaseDisputeRequest,
  UpdateSupplierInvoiceRequest,
  UpdateSupplierRequest,
  UpsertPaymentAlertConfigRequest,
} from "@/interfaces/api/requests/PurchaseModuleRequests.interface";
import type {
  ExchangeRateResult,
  PaymentAlert,
  PaymentAlertConfigResponse,
  PaymentAlertStats,
  PurchaseAccountPayable,
  PurchaseCatalogs,
  PurchaseDispute,
  PurchaseMatching,
  PurchaseOrder,
  PurchaseOrderDetail,
  Supplier,
  SupplierCredit,
} from "@/interfaces/entities/Purchase.interface";

const json = async <T>(res: Response, fallback: string): Promise<T> => {
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok) {
    const errorBody = body as any;
    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(", ")
      : (errorBody?.message ?? errorBody?.error ?? fallback);
    throw new Error(message);
  }

  return body.data as T;
};

const withQuery = (
  path: string,
  params?: Record<string, string | undefined | null>,
) => {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });

  return search.size ? `${path}?${search.toString()}` : path;
};

export const purchaseApi = {
  async listSuppliers(): Promise<Supplier[]> {
    const res = await fetch(`${url}/suppliers`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    return json<Supplier[]>(res, "Error al listar proveedores");
  },

  async createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
    const res = await fetch(`${url}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    return json<Supplier>(res, "Error al crear proveedor");
  },

  async updateSupplier(
    supplierId: string,
    data: UpdateSupplierRequest,
  ): Promise<{ message: string; supplier: Supplier }> {
    const res = await fetch(`${url}/suppliers/${supplierId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    return json<{ message: string; supplier: Supplier }>(
      res,
      "Error al actualizar proveedor",
    );
  },

  async deleteSupplier(
    supplierId: string,
  ): Promise<{ message: string; supplier: Supplier }> {
    const res = await fetch(`${url}/suppliers/${supplierId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    return json<{ message: string; supplier: Supplier }>(
      res,
      "Error al eliminar proveedor",
    );
  },

  async listOrders(): Promise<PurchaseOrder[]> {
    const res = await fetch(`${url}/purchase`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    return json<PurchaseOrder[]>(res, "Error al listar órdenes de compra");
  },

  async getOrderById(orderId: string): Promise<PurchaseOrderDetail> {
    const res = await fetch(`${url}/purchase/${orderId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    return json<PurchaseOrderDetail>(res, "Error al obtener la orden de compra");
  },

  async createOrder(data: CreatePurchaseOrderRequest): Promise<PurchaseOrderDetail> {
    const res = await fetch(`${url}/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    return json<PurchaseOrderDetail>(res, "Error al crear la orden de compra");
  },

  async updateOrderStatus(
    orderId: string,
    statusId: number,
  ): Promise<PurchaseOrderDetail & { message?: string }> {
    const res = await fetch(`${url}/purchase/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status_id: statusId }),
    });

    return json<PurchaseOrderDetail & { message?: string }>(
      res,
      "Error al actualizar el estado de la orden",
    );
  },

  async updateSupplierInvoice(
    invoiceId: string,
    data: UpdateSupplierInvoiceRequest,
  ): Promise<PurchaseOrderDetail> {
    const res = await fetch(`${url}/purchase/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    return json<PurchaseOrderDetail>(res, "Error al actualizar la factura");
  },

  async createDispute(data: CreatePurchaseDisputeRequest): Promise<PurchaseDispute> {
    const res = await fetch(`${url}/purchase/disputes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    return json<PurchaseDispute>(res, "Error al reportar la discrepancia");
  },

  async listDisputesByOrder(purchaseOrderId: string): Promise<PurchaseDispute[]> {
    const res = await fetch(
      withQuery(`${url}/purchase/disputes`, { purchase_order_id: purchaseOrderId }),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    return json<PurchaseDispute[]>(res, "Error al listar discrepancias");
  },

  async resolveDispute(
    disputeId: string,
    data: ResolvePurchaseDisputeRequest,
  ): Promise<PurchaseDispute> {
    const res = await fetch(`${url}/purchase/disputes/${disputeId}/resolve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    return json<PurchaseDispute>(res, "Error al resolver la discrepancia");
  },

  async listSupplierCredits(supplierId: string): Promise<SupplierCredit[]> {
    const res = await fetch(
      withQuery(`${url}/purchase/supplier-credits`, { supplier_id: supplierId }),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    return json<SupplierCredit[]>(res, "Error al listar créditos del proveedor");
  },

  async applySupplierCredit(
    creditId: string,
    data: ApplySupplierCreditRequest,
  ): Promise<PurchaseOrderDetail> {
    const res = await fetch(`${url}/purchase/supplier-credits/${creditId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    return json<PurchaseOrderDetail>(res, "Error al aplicar el crédito del proveedor");
  },

  async getMatching(orderId: string): Promise<PurchaseMatching> {
    const res = await fetch(`${url}/purchase/${orderId}/matching`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    return json<PurchaseMatching>(res, "Error al consultar la conciliación");
  },

  async listPayables(): Promise<PurchaseAccountPayable[]> {
    const res = await fetch(`${url}/purchase/payables`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    return json<PurchaseAccountPayable[]>(res, "Error al listar cuentas por pagar");
  },

  async registerPayment(
    data: CreatePurchasePaymentRequest,
  ): Promise<{
    payment_id: string;
    purchase_account_payable: PurchaseAccountPayable;
    order: PurchaseOrderDetail;
  }> {
    const res = await fetch(`${url}/purchase/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    return json<{
      payment_id: string;
      purchase_account_payable: PurchaseAccountPayable;
      order: PurchaseOrderDetail;
    }>(res, "Error al registrar el pago");
  },

  async updatePayment(
    paymentId: string,
    data: Partial<CreatePurchasePaymentRequest>,
  ): Promise<{
    payment_id: string;
    purchase_account_payable: PurchaseAccountPayable;
    order: PurchaseOrderDetail;
  }> {
    const res = await fetch(`${url}/purchase/payment/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    return json<{
      payment_id: string;
      purchase_account_payable: PurchaseAccountPayable;
      order: PurchaseOrderDetail;
    }>(res, "Error al actualizar el pago");
  },

  async getExchangeRate(fromCurrencyId: number): Promise<ExchangeRateResult | null> {
    const res = await fetch(`${url}/purchase/exchange-rate/${fromCurrencyId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    return json<ExchangeRateResult | null>(res, "Error al consultar la tasa de cambio");
  },

  async getCatalogs(): Promise<PurchaseCatalogs> {
    const res = await fetch(`${url}/purchase/catalogs`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    return json<PurchaseCatalogs>(res, "Error al cargar catálogos de compras");
  },

  async listPaymentAlerts(tenantId?: string): Promise<PaymentAlert[]> {
    const res = await fetch(
      withQuery(`${url}/payment-alerts`, { tenantId }),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    return json<PaymentAlert[]>(res, "Error al listar alertas de pago");
  },

  async getPaymentAlertStats(tenantId?: string): Promise<PaymentAlertStats> {
    const res = await fetch(
      withQuery(`${url}/payment-alerts/stats`, { tenantId }),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    return json<PaymentAlertStats>(res, "Error al obtener estadísticas");
  },

  async getPaymentAlertConfig(
    tenantId?: string,
  ): Promise<PaymentAlertConfigResponse> {
    const res = await fetch(
      withQuery(`${url}/payment-alerts/config`, { tenantId }),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    return json<PaymentAlertConfigResponse>(
      res,
      "Error al obtener la configuración de alertas",
    );
  },

  async savePaymentAlertConfig(
    data: UpsertPaymentAlertConfigRequest,
  ): Promise<PaymentAlertConfigResponse> {
    const res = await fetch(`${url}/payment-alerts/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    return json<PaymentAlertConfigResponse>(
      res,
      "Error al guardar la configuración de alertas",
    );
  },

  async generatePaymentAlerts(
    tenantId?: string,
  ): Promise<{ tenant_id: string; alerts: PaymentAlert[]; stats: PaymentAlertStats }> {
    const res = await fetch(
      withQuery(`${url}/payment-alerts/generate`, { tenantId }),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      },
    );

    return json<{ tenant_id: string; alerts: PaymentAlert[]; stats: PaymentAlertStats }>(
      res,
      "Error al generar alertas de pago",
    );
  },

  async resolvePaymentAlert(
    alertId: string,
  ): Promise<{ payment_alert_id: string; is_resolved: boolean }> {
    const res = await fetch(`${url}/payment-alerts/${alertId}/resolve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    return json<{ payment_alert_id: string; is_resolved: boolean }>(
      res,
      "Error al resolver la alerta",
    );
  },
};
