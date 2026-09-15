import { useMemo, useState } from "react";

import {
  createReturnTransaction,
  getSaleRefundContext,
  processFullRefund,
} from "@/router/actions/returns.actions";
import { findReturns } from "@/router/loaders/returns.loaders";
import { paymentMethods, refundStatuses } from "@/constants/payment-methods";

import type { ReturnTransaction } from "@/interfaces/entities/ReturnTransaction.interface";
import type { SaleRefundContext } from "@/interfaces/entities/SaleRefundContext.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

import { isUUID } from "@/pages/app/RefundsPage/refunds.utils";

export type RefundMode = "partial" | "full";

export interface ItemSelection {
  selected: boolean;
  quantity: number;
}

interface ToastState {
  mode: ToastMode;
  message: string;
}

interface UseRefundFlowArgs {
  initialReturns: ReturnTransaction[];
}

export function useRefundFlow({ initialReturns }: UseRefundFlowArgs) {
  const [returns, setReturns] = useState<ReturnTransaction[]>(initialReturns);
  const [mode, setMode] = useState<RefundMode>("partial");
  const [saleIdInput, setSaleIdInput] = useState("");
  const [context, setContext] = useState<SaleRefundContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, ItemSelection>>(
    {},
  );
  const [refundMethod, setRefundMethod] = useState<number>(
    paymentMethods[0]?.value ?? 1,
  );
  const [returnStatusId, setReturnStatusId] = useState<number>(
    refundStatuses[0]?.value ?? 1,
  );
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const currencySymbol = context?.sale.currency_symbol ?? "Bs.";

  const productsToRefund = useMemo(() => {
    if (!context) return [];
    return context.items
      .filter((it) => selections[it.sale_item_id]?.selected)
      .map((it) => {
        const sel = selections[it.sale_item_id];
        const qty = Math.max(
          1,
          Math.min(sel.quantity || 1, it.available_quantity),
        );
        return {
          sale_item_id: it.sale_item_id,
          quantity: qty,
          unit_price: it.unit_price,
          total_price: Number((qty * it.unit_price).toFixed(2)),
          variant_name: it.variant_name,
          sku: it.sku,
        };
      });
  }, [context, selections]);

  const refundTotal = useMemo(
    () => productsToRefund.reduce((acc, p) => acc + p.total_price, 0),
    [productsToRefund],
  );

  const refreshReturns = async () => {
    try {
      const fresh = await findReturns({});
      setReturns(fresh);
    } catch {
      // silent
    }
  };

  const resetContext = () => {
    setContext(null);
    setSelections({});
    setContextError(null);
  };

  const switchMode = (next: RefundMode) => {
    setMode(next);
    resetContext();
    setSaleIdInput("");
  };

  const lookupSale = async () => {
    const saleId = saleIdInput.trim();
    if (!isUUID(saleId)) {
      setContextError("Ingrese un sale_id válido (UUID)");
      return;
    }
    setIsLoadingContext(true);
    setContextError(null);
    try {
      const ctx = await getSaleRefundContext(saleId);
      setContext(ctx);
      const initialSelections: Record<string, ItemSelection> = {};
      ctx.items.forEach((it) => {
        initialSelections[it.sale_item_id] = {
          selected: false,
          quantity: it.available_quantity,
        };
      });
      setSelections(initialSelections);
    } catch (err) {
      resetContext();
      setContextError(
        err instanceof Error ? err.message : "Error al cargar la venta",
      );
    } finally {
      setIsLoadingContext(false);
    }
  };

  const clearSale = () => {
    resetContext();
    setSaleIdInput("");
  };

  const toggleItemSelection = (saleItemId: string) => {
    setSelections((prev) => ({
      ...prev,
      [saleItemId]: {
        ...prev[saleItemId],
        selected: !prev[saleItemId]?.selected,
      },
    }));
  };

  const updateItemQuantity = (
    saleItemId: string,
    qty: number,
    available: number,
  ) => {
    const clamped = Math.max(1, Math.min(qty, available));
    setSelections((prev) => ({
      ...prev,
      [saleItemId]: {
        selected: prev[saleItemId]?.selected ?? false,
        quantity: clamped,
      },
    }));
  };

  const submitPartial = async () => {
    if (!context) return;
    if (productsToRefund.length === 0) {
      setToast({
        mode: "error",
        message: "Seleccione al menos un producto a reembolsar",
      });
      return;
    }
    if (!description.trim()) {
      setToast({
        mode: "error",
        message: "La descripción del reembolso es obligatoria",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createReturnTransaction({
        sale_id: context.sale.sale_id,
        tenant_customer_id: context.customer?.tenant_customer_id ?? undefined,
        refund_method: refundMethod,
        return_status_id: returnStatusId,
        description: description.trim(),
        return_products: productsToRefund.map((p) => ({
          sale_item_id: p.sale_item_id,
          quantity: p.quantity,
          unit_price: p.unit_price,
          total_price: p.total_price,
        })),
      });
      setToast({
        mode: "success",
        message: result.message ?? "Reembolso parcial registrado",
      });
      setDescription("");
      clearSale();
      void refreshReturns();
    } catch (err) {
      setToast({
        mode: "error",
        message:
          err instanceof Error ? err.message : "Error al registrar reembolso",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFull = async () => {
    if (!context) return;
    if (!description.trim()) {
      setToast({
        mode: "error",
        message: "La descripción del reembolso es obligatoria",
      });
      return;
    }
    const confirmed = confirm(
      "¿Confirma el reembolso completo? La venta quedará marcada como cancelada.",
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const result = await processFullRefund(
        context.sale.sale_id,
        description.trim(),
      );
      setToast({
        mode: "success",
        message: result.message ?? "Reembolso completo registrado",
      });
      setDescription("");
      clearSale();
      void refreshReturns();
    } catch (err) {
      setToast({
        mode: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al procesar reembolso completo",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    // state
    returns,
    mode,
    saleIdInput,
    context,
    isLoadingContext,
    contextError,
    selections,
    refundMethod,
    returnStatusId,
    isSubmitting,
    toast,
    currencySymbol,
    productsToRefund,
    refundTotal,
    // setters
    setSaleIdInput,
    setRefundMethod,
    setReturnStatusId,
    setToast,
    description,
    setDescription,
    // actions
    switchMode,
    lookupSale,
    clearSale,
    toggleItemSelection,
    updateItemQuantity,
    submitPartial,
    submitFull,
  };
}
