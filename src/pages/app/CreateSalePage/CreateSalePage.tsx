import { useCallback, useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/context/AuthContext";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import {
  IconShoppingCart,
  IconUser,
} from "@/assets/icons";

import { getInvoiceForSale, createFullSale } from "@/router/actions/sale.actions";
import { productApi } from "@/api/product.api";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useCashDrawer } from "@/hooks/useCashDrawer";
import { paymentMethods } from "@/constants/payment-methods";

import type { CreateSalePageLoaderData } from "@/router/loaders/sale.loaders";
import type { Customer } from "@/interfaces/entities/Customer.interface";
import type { CreateSaleResult, InvoiceInfo } from "@/interfaces/entities/Sale.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type { ProductVariantSelection } from "@/components/ui/ProductVariantComboBox";

import { blankCustomer, formatAmount, round2 } from "./create-sale.constants";
import type { CartItem, PaymentSplit } from "./create-sale.types";
import { saleItemSchema, type SaleItemForm } from "./create-sale.schema";

import { SaleResultModal, type SaleReceiptItem } from "./SaleResultModal";
import {
  ApplyPromotionModal,
  type AppliedPromotion,
} from "./ApplyPromotionModal";
import { QuickCashRegisterModal } from "./QuickCashRegisterModal";

import { useDocumentTypes } from "./hooks/useDocumentTypes";
import { useSellerDisplayName } from "./hooks/useSellerDisplayName";
import { useBranchWarehouse } from "./hooks/useBranchWarehouse";
import { useDefaultPromotions } from "./hooks/useDefaultPromotions";
import { useCashRegisters } from "./hooks/useCashRegisters";
import {
  useServerExchangeRate,
  useSplitExchangeRates,
} from "./hooks/useExchangeRates";
import { useCustomerLookup } from "./hooks/useCustomerLookup";
import { useCustomerLoyalty } from "./hooks/useCustomerLoyalty";
import { useSaleCalculations } from "./hooks/useSaleCalculations";
import {
  usePaymentSplits,
  defaultPaymentMethod,
  defaultCurrency,
} from "./hooks/usePaymentSplits";
import { usePaymentTotals } from "./hooks/usePaymentTotals";
import { validateSale, buildSalePayload } from "./CreateSalePage.handlers";

import { CustomerLookupSection } from "./sections/CustomerLookupSection/CustomerLookupSection";
import { ItemsSection } from "./sections/ItemsSection/ItemsSection";
import { LoyaltyPointsSection } from "./sections/LoyaltyPointsSection/LoyaltyPointsSection";
import { CreditApartadoSection } from "./sections/CreditApartadoSection/CreditApartadoSection";
import { PaymentSplitsSection } from "./sections/PaymentSplitsSection/PaymentSplitsSection";

export function CreateSalePage() {
  const { branches, saleConditions } =
    useLoaderData() as CreateSalePageLoaderData;
  const { user } = useAuth();

  const tenantId = user?.tenant?.tenant_id ?? "";

  const defaultBranchId = branches[0]?.branch_id ?? "";
  const defaultCondition = saleConditions[0]?.condition_code ?? "01";
  const currencyId = defaultCurrency.value;

  const [branchId, setBranchId] = useState(defaultBranchId);
  const [saleCondition, setSaleCondition] = useState(defaultCondition);
  const [adMessage, setAdMessage] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isCashRegisterModalOpen, setIsCashRegisterModalOpen] = useState(false);

  const [toast, setToast] = useState<{ mode: ToastMode; message: string } | null>(
    null,
  );
  const showToast = useCallback((mode: ToastMode, message: string) => {
    setToast({ mode, message });
  }, []);

  const documentTypes = useDocumentTypes();
  const sellerDisplayName = useSellerDisplayName(user);
  const branchWarehouseId = useBranchWarehouse(tenantId, branchId);
  const defaultPromotions = useDefaultPromotions(tenantId);

  const showCashRegisterError = useCallback(
    (message: string) => showToast("error", message),
    [showToast],
  );
  const cashRegisters = useCashRegisters(branchId, showCashRegisterError);

  const [step, setStep] = useState<"lookup" | "items">("lookup");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isWalkInSale, setIsWalkInSale] = useState(false);

  const lookup = useCustomerLookup({
    tenantId,
    setStep,
    setCustomer,
    setIsWalkInSale,
    showToast,
  });

  const [items, setItems] = useState<CartItem[]>([]);
  const [lastItemAmount, setLastItemAmount] = useState(0);
  const [selectedVariant, setSelectedVariant] =
    useState<ProductVariantSelection | null>(null);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [appliedPromotion, setAppliedPromotion] =
    useState<AppliedPromotion | null>(null);

  const loyalty = useCustomerLoyalty(customer?.customer_id);

  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  useEffect(() => {
    if (!customer?.customer_id) {
      setUsePoints(false);
      setPointsToRedeem(0);
    }
  }, [customer?.customer_id]);

  const { serverExchangeRate, effectiveExchangeRate } = useServerExchangeRate();

  const calc = useSaleCalculations({
    items,
    defaultPromotions,
    appliedPromotion,
    currencyId,
    effectiveExchangeRate,
    usePoints,
    pointsToRedeem,
    pointsRate: loyalty.pointsRate,
    availablePoints: loyalty.availablePoints,
    loyaltyActive: loyalty.loyaltyActive,
  });

  const isApartado = saleCondition === "04";
  const isCredit = saleCondition === "02";

  const targetPayment = isApartado
    ? calc.totalAmountDisplay
    : usePoints && calc.actualPointsRedeemed > 0
      ? calc.remainderDisplay
      : calc.totalAmountDisplay;

  const paymentSplits = usePaymentSplits({
    totalAmountDisplay: calc.totalAmountDisplay,
    targetPayment,
    isWalkInSale,
  });

  const exchangeRatesForSplits = useSplitExchangeRates(
    paymentSplits.paymentSplits,
  );

  const paymentTotals = usePaymentTotals({
    paymentSplits: paymentSplits.paymentSplits,
    isPartialPayment: paymentSplits.isPartialPayment,
    currencyId,
    targetPayment,
    serverExchangeRate,
    effectiveExchangeRate,
    exchangeRatesForSplits,
  });

  const cashRegisterSessionId = useMemo(
    () =>
      cashRegisters.openSessions.find(
        (s) => s.cash_register_id === cashRegisters.cashRegisterId,
      )?.cash_register_session_id ?? "",
    [cashRegisters.openSessions, cashRegisters.cashRegisterId],
  );

  const apartadoAmountDisplay = isApartado
    ? paymentTotals.splitTotalInSaleCurrency
    : 0;
  const apartadoBalance = isApartado
    ? round2(calc.totalAmountDisplay - apartadoAmountDisplay)
    : 0;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState<{
    open: boolean;
    saleId: string | null;
    total: number;
    items: SaleReceiptItem[];
    digitalInvoice: InvoiceInfo | null;
    paymentSplits: PaymentSplit[];
    currencySymbol: string;
    pointsRedeemed: number;
    pointsRate: number;
  }>({
    open: false,
    saleId: null,
    total: 0,
    items: [],
    digitalInvoice: null,
    paymentSplits: [],
    currencySymbol: "Bs.",
    pointsRedeemed: 0,
    pointsRate: 0,
  });

  const itemForm = useForm<SaleItemForm>({
    resolver: zodResolver(saleItemSchema),
    defaultValues: {
      product_variant_id: "",
      quantity: 1,
      unit_price: 0,
    },
  });

  const handleAddItem = (data: SaleItemForm) => {
    if (!selectedVariant || !data.product_variant_id) {
      showToast("error", "Producto inválido");
      return;
    }

    const existingIndex = items.findIndex(
      (i) => i.product_variant_id === selectedVariant.product_variant_id,
    );

    if (existingIndex >= 0) {
      setItems((prev) =>
        prev.map((item, idx) => {
          if (idx !== existingIndex) return item;
          const newQty = item.quantity + data.quantity;
          return {
            ...item,
            quantity: newQty,
            total_price: Number((newQty * item.unit_price).toFixed(2)),
          };
        }),
      );
      setLastItemAmount(Number((data.quantity * data.unit_price).toFixed(2)));
    } else {
      const total = Number((data.quantity * data.unit_price).toFixed(2));
      const newItem: CartItem = {
        id: `${selectedVariant.product_variant_id}-${Date.now()}`,
        product_variant_id: selectedVariant.product_variant_id,
        variant_name: selectedVariant.variant_name,
        sku: selectedVariant.sku,
        group_ids: selectedVariant.group_ids ?? [],
        quantity: data.quantity,
        unit_price: data.unit_price,
        total_price: total,
        includes_iva: selectedVariant.includes_iva ?? false,
      };
      setItems((prev) => [...prev, newItem]);
      setLastItemAmount(total);
    }

    setAppliedPromotion(null);
    setSelectedVariant(null);
    itemForm.reset({
      product_variant_id: "",
      quantity: 1,
      unit_price: 0,
    });
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setAppliedPromotion(null);
  };

  const handleApplyPromotion = (applied: AppliedPromotion) => {
    setAppliedPromotion(applied);
    showToast("success", `Promoción aplicada: ${applied.description}`);
  };

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    showToast("info", "Promoción removida");
  };

  const handleVariantSelect = async (selection: ProductVariantSelection) => {
    if (effectiveExchangeRate <= 0) {
      showToast(
        "error",
        "No hay tasa de cambio USD → Bs. cargada. No se pueden agregar productos hasta que se configure.",
      );
      return;
    }

    let groupIds: string[] = [];
    let includes_iva = false;

    try {
      const detail = await productApi.getByIdWithAttributes(
        tenantId,
        selection.product_variant_id,
      );
      groupIds = (detail.groups ?? []).map(
        (group) => group.tenant_product_group_id,
      );
      includes_iva = detail.includes_iva ?? false;
    } catch {
      groupIds = [];
    }

    const priceInVes = calc.usdCatalogPriceToVes(selection.unit_price);
    setSelectedVariant({
      ...selection,
      unit_price: priceInVes,
      group_ids: groupIds,
      includes_iva,
    });
    itemForm.setValue("product_variant_id", selection.product_variant_id, {
      shouldValidate: true,
    });
    itemForm.setValue("unit_price", priceInVes, {
      shouldValidate: true,
    });
  };

  const handleVariantClear = () => {
    setSelectedVariant(null);
    itemForm.setValue("product_variant_id", "");
    itemForm.setValue("unit_price", 0);
  };

  const handleQuantityChange = useCallback((itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQty,
              total_price: Number((newQty * item.unit_price).toFixed(2)),
            }
          : item,
      ),
    );
  }, []);

  const handleBarcodeScan = useCallback(
    async (sku: string) => {
      if (effectiveExchangeRate <= 0) {
        showToast(
          "error",
          "No hay tasa de cambio USD → Bs. cargada. No se pueden agregar productos hasta que se configure.",
        );
        return;
      }

      try {
        const found = await productApi.getBySku(sku);
        if (!found?.product_variant_id) {
          showToast("error", `SKU no encontrado: ${sku}`);
          return;
        }

        let groupIds: string[] = [];
        try {
          const detail = await productApi.getByIdWithAttributes(
            tenantId,
            found.product_variant_id,
          );
          groupIds = (detail.groups ?? []).map(
            (g) => g.tenant_product_group_id,
          );
        } catch {
          groupIds = [];
        }

        const variantId = found.product_variant_id;
        const variantName = found.variant_name ?? found.product_name ?? "—";
        const unitPrice = calc.usdCatalogPriceToVes(
          Number(found.unit_price ?? found.price ?? 0),
        );

        setItems((prev) => {
          const existingIndex = prev.findIndex(
            (i) => i.product_variant_id === variantId,
          );
          if (existingIndex >= 0) {
            return prev.map((item, idx) => {
              if (idx !== existingIndex) return item;
              const newQty = item.quantity + 1;
              return {
                ...item,
                quantity: newQty,
                total_price: Number((newQty * item.unit_price).toFixed(2)),
              };
            });
          }
          const newItem: CartItem = {
            id: `${variantId}-${Date.now()}`,
            product_variant_id: variantId,
            variant_name: variantName,
            sku: found.sku,
            group_ids: groupIds,
            quantity: 1,
            unit_price: unitPrice,
            total_price: unitPrice,
            includes_iva: found.includes_iva ?? false,
          };
          return [...prev, newItem];
        });

        setAppliedPromotion(null);
        setLastItemAmount(unitPrice);
        showToast("success", `Agregado: ${variantName}`);
      } catch {
        showToast("error", `Error al buscar SKU: ${sku}`);
      }
    },
    [tenantId, effectiveExchangeRate, calc, showToast],
  );

  useBarcodeScanner(handleBarcodeScan, step === "items");

  const { openDrawer } = useCashDrawer();

  const handleAddRoyaltyItems = (royaltyItems: CartItem[]) => {
    setItems((prev) => [
      ...prev,
      ...royaltyItems.filter(
        (ri) =>
          !prev.some(
            (ex) =>
              ex.product_variant_id === ri.product_variant_id &&
              ex.unit_price === 0,
          ),
      ),
    ]);
  };

  const handleAddRoyaltyItemsFromPromoModal = (royaltyItems: CartItem[]) => {
    setItems((prev) => [
      ...prev,
      ...royaltyItems
        .filter(
          (ri) =>
            !prev.some(
              (ex) =>
                ex.product_variant_id === ri.product_variant_id &&
                ex.unit_price === 0,
            ),
        )
        .map((ri) => ({ ...ri, group_ids: [] })),
    ]);
  };

  const handleToggleUsePoints = (checked: boolean) => {
    setUsePoints(checked);

    if (checked) {
      const pointsNeeded = round2(calc.totalAmount * loyalty.pointsRate);
      const amountInCurrency =
        loyalty.pointsRate > 0 ? round2(pointsNeeded / loyalty.pointsRate) : 0;

      paymentSplits.setPaymentSplits([
        {
          id: "split-1",
          methodId: 5, // Loyalty points method
          amount: String(amountInCurrency),
          currencyId,
        },
      ]);
      paymentSplits.setIsPartialPayment(false);
      setPointsToRedeem(pointsNeeded);
    } else {
      paymentSplits.setPaymentSplits([
        {
          id: "split-1",
          methodId: defaultPaymentMethod.value,
          amount: "",
          currencyId,
        },
      ]);
      setPointsToRedeem(0);
    }
  };

  const handleSubmitSale = async () => {
    const error = validateSale({
      hasCustomer: Boolean(customer),
      isWalkInSale,
      branchId,
      cashRegisterId: cashRegisters.cashRegisterId,
      itemsCount: items.length,
      usePoints,
      paymentSplits: paymentSplits.paymentSplits,
      pointsRate: loyalty.pointsRate,
      availablePoints: loyalty.availablePoints,
      isApartado,
      isCredit,
      splitTotalInSaleCurrency: paymentTotals.splitTotalInSaleCurrency,
      totalAmountDisplay: calc.totalAmountDisplay,
      paymentBalance: paymentTotals.paymentBalance,
      dueDate,
      currencySymbol: calc.currencySymbol,
    });
    if (error) {
      showToast("error", error);
      return;
    }

    setIsSubmitting(true);

    const customerId = customer?.customer_id ?? null;
    const payload = buildSalePayload({
      tenantId,
      branchId,
      cashRegisterId: cashRegisters.cashRegisterId,
      cashRegisterSessionId,
      currencyId,
      customerId,
      saleCondition,
      isApartado,
      isCredit,
      sellerUserId: user?.user_id,
      dueDate,
      adMessage,
      items,
      appliedPromotion,
      defaultPromoDiscount: calc.defaultPromoDiscount,
      convertCrcToSaleCurrency: calc.convertCrcToSaleCurrency,
      subtotalDisplay: calc.subtotalDisplay,
      taxAmountDisplay: calc.taxAmountDisplay,
      totalAmountDisplay: calc.totalAmountDisplay,
      splitTotalInSaleCurrency: paymentTotals.splitTotalInSaleCurrency,
      paymentBalance: paymentTotals.paymentBalance,
      paymentSplits: paymentSplits.paymentSplits,
      usePoints,
      actualPointsRedeemed: calc.actualPointsRedeemed,
      pointsCoveredDisplay: calc.pointsCoveredDisplay,
      pointsRate: loyalty.pointsRate,
    });

    try {
      const result: CreateSaleResult = await createFullSale(payload);

      const hasCashPayment = paymentSplits.paymentSplits.some(
        (s) => s.methodId === 1,
      );
      if (hasCashPayment) openDrawer();

      const [digitalInvoice] = await Promise.all([
        getInvoiceForSale(result.saleId),
      ]);
      const splitPointsTotal = paymentSplits.paymentSplits
        .filter((s) => s.methodId === 5)
        .reduce(
          (sum, s) =>
            sum + Math.round((parseFloat(s.amount) || 0) * loyalty.pointsRate),
          0,
        );
      const effectivePointsRedeemed = usePoints
        ? calc.actualPointsRedeemed
        : splitPointsTotal;

      setResultModal({
        open: true,
        saleId: result.saleId ?? null,
        total: calc.totalAmountDisplay,
        digitalInvoice: digitalInvoice ?? null,
        items: items.map((item) => ({
          variant_name: item.variant_name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
        paymentSplits: paymentSplits.paymentSplits,
        currencySymbol: calc.currencySymbol,
        pointsRedeemed: effectivePointsRedeemed,
        pointsRate: loyalty.pointsRate,
      });
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Error al procesar venta",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForNewSale = () => {
    setResultModal((prev) => ({ ...prev, open: false }));
    setStep("lookup");
    setCustomer(null);
    setIsWalkInSale(false);
    setItems([]);
    setLastItemAmount(0);
    setAppliedPromotion(null);
    setAdMessage("");
    setDueDate("");
    paymentSplits.resetPaymentSplits();
    lookup.lookupForm.reset({ document_number: "" });
    lookup.inlineCustomerForm.reset(blankCustomer());
    lookup.cancelInlineCreate();
    setSelectedVariant(null);
    itemForm.reset({
      product_variant_id: "",
      quantity: 1,
      unit_price: 0,
    });
  };

  const branchOptions = branches.map((b) => ({
    value: b.branch_id,
    label: b.branch_name,
  }));
  const conditionOptions = saleConditions.map((c) => ({
    value: c.condition_code,
    label: `${c.condition_code} — ${c.condition_desc}`,
  }));
  const paymentOptions = paymentMethods
    .filter((m) => !(m.code === "loyalty_points" && isWalkInSale))
    .map((m) => ({ value: String(m.value), label: m.label }));
  const cashRegisterOptions = cashRegisters.cashRegisters.map((register) => ({
    value: register.cash_register_id,
    label: register.register_name || register.cash_register_id,
  }));

  return (
    <div className="p-6 lg:p-8">
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Crear nueva venta
          </h1>
          <p className="text-gray-600">
            Procese pagos de productos y servicios para clientes en tienda.
          </p>
        </div>
        {sellerDisplayName && (
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm">
            <IconUser />
            <span className="text-gray-500">Vendedor:</span>
            <span className="font-semibold text-gray-900">
              {sellerDisplayName}
            </span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label="Sucursal"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            options={branchOptions}
            placeholder="Seleccionar sucursal"
            required
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Caja<span className="ml-0.5 text-accent-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCashRegisterModalOpen(true)}
                disabled={!branchId}
                className="text-xs cursor-pointer font-medium text-accent-700 hover:text-accent-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Abrir / cerrar cajas
              </button>
            </div>
            <Select
              value={cashRegisters.cashRegisterId}
              onChange={(e) => cashRegisters.setCashRegisterId(e.target.value)}
              options={
                cashRegisterOptions.length
                  ? cashRegisterOptions
                  : [
                      {
                        value: "",
                        label: cashRegisters.isLoadingCashRegisters
                          ? "Cargando cajas..."
                          : "No hay cajas con sesion abierta en esta sucursal",
                      },
                    ]
              }
              disabled={
                cashRegisters.isLoadingCashRegisters ||
                cashRegisterOptions.length === 0
              }
              required
            />
          </div>
        </div>
      </div>

      <CustomerLookupSection
        customer={customer}
        step={step}
        isWalkInSale={isWalkInSale}
        isApartado={isApartado}
        documentTypes={documentTypes}
        lookup={lookup}
      />

      <ItemsSection
        step={step}
        tenantId={tenantId}
        branchWarehouseId={branchWarehouseId}
        itemForm={itemForm}
        selectedVariant={selectedVariant}
        onVariantSelect={handleVariantSelect}
        onVariantClear={handleVariantClear}
        onAddItem={handleAddItem}
        saleCondition={saleCondition}
        onSaleConditionChange={setSaleCondition}
        conditionOptions={conditionOptions}
        items={items}
        lastItemAmount={lastItemAmount}
        onOpenPromotionModal={() => setIsPromotionModalOpen(true)}
        appliedPromotion={appliedPromotion}
        onRemovePromotion={handleRemovePromotion}
        calc={calc}
        effectiveExchangeRate={effectiveExchangeRate}
        customer={customer}
        isWalkInSale={isWalkInSale}
        onAddRoyaltyItems={handleAddRoyaltyItems}
        onQuantityChange={handleQuantityChange}
        onRemoveItem={handleRemoveItem}
      />

      <LoyaltyPointsSection
        step={step}
        loyaltyActive={loyalty.loyaltyActive}
        availablePoints={loyalty.availablePoints}
        pointsRate={loyalty.pointsRate}
        maxPointsCrcValue={calc.maxPointsCrcValue}
        convertCrcToSaleCurrency={calc.convertCrcToSaleCurrency}
        currencySymbol={calc.currencySymbol}
        usePoints={usePoints}
        pointsCoveredDisplay={calc.pointsCoveredDisplay}
        pointsToRedeem={pointsToRedeem}
        totalAmount={calc.totalAmount}
        onToggleUsePoints={handleToggleUsePoints}
      />

      <CreditApartadoSection
        step={step}
        isCredit={isCredit}
        isApartado={isApartado}
        dueDate={dueDate}
        onDueDateChange={setDueDate}
        paymentBalance={paymentTotals.paymentBalance}
        currencySymbol={calc.currencySymbol}
        totalAmountDisplay={calc.totalAmountDisplay}
        apartadoAmountDisplay={apartadoAmountDisplay}
        apartadoBalance={apartadoBalance}
      />

      <PaymentSplitsSection
        step={step}
        paymentSplits={paymentSplits.paymentSplits}
        isPartialPayment={paymentSplits.isPartialPayment}
        onTogglePartialPayment={paymentSplits.setIsPartialPayment}
        usePoints={usePoints}
        pointsToRedeem={pointsToRedeem}
        pointsRate={loyalty.pointsRate}
        availablePoints={loyalty.availablePoints}
        paymentOptions={paymentOptions}
        onUpdateSplit={paymentSplits.updatePaymentSplit}
        onFillRemainder={paymentSplits.fillRemainder}
        splitTotalInSaleCurrency={paymentTotals.splitTotalInSaleCurrency}
        targetPayment={targetPayment}
        paymentBalance={paymentTotals.paymentBalance}
        paymentCurrenciesUsed={paymentTotals.paymentCurrenciesUsed}
        currencySymbol={calc.currencySymbol}
      />

      <div className="bg-white rounded-2xl border border-gray-300 p-6 flex flex-col gap-4">
        <Input
          label="Mensaje en factura"
          placeholder="Gracias por su compra."
          value={adMessage}
          onChange={(e) => setAdMessage(e.target.value)}
          hint="El cajero puede incluir un mensaje que aparecerá en la factura digital."
        />
        <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {items.length} producto{items.length !== 1 ? "s" : ""} ·{" "}
              {formatAmount(calc.totalAmountDisplay, calc.currencySymbol)}
            </span>
            <Button
              variant="primary"
              onClick={handleSubmitSale}
              loading={isSubmitting}
              disabled={
                (!customer && !isWalkInSale) ||
                items.length === 0 ||
                !branchId ||
                !cashRegisters.cashRegisterId ||
                isSubmitting
              }
            >
              <IconShoppingCart />
              Procesar venta
            </Button>
          </div>
        </div>
      </div>

      <SaleResultModal
        isOpen={resultModal.open}
        saleId={resultModal.saleId}
        totalAmount={resultModal.total}
        currencySymbol={resultModal.currencySymbol}
        items={resultModal.items}
        digitalInvoice={resultModal.digitalInvoice}
        paymentSplits={resultModal.paymentSplits}
        pointsRedeemed={resultModal.pointsRedeemed}
        pointsRate={resultModal.pointsRate}
        onNewSale={resetForNewSale}
      />

      <ApplyPromotionModal
        isOpen={isPromotionModalOpen}
        tenantId={tenantId}
        cartItems={items.map((i) => ({
          id: i.id,
          product_variant_id: i.product_variant_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.total_price,
          group_ids: i.group_ids ?? [],
        }))}
        cartSubtotal={calc.grossSubtotal}
        currencySymbol={calc.currencySymbol}
        totalAmount={calc.totalAmount}
        onClose={() => setIsPromotionModalOpen(false)}
        onApply={handleApplyPromotion}
        onAddRoyaltyItems={handleAddRoyaltyItemsFromPromoModal}
      />

      <QuickCashRegisterModal
        isOpen={isCashRegisterModalOpen}
        branchId={branchId}
        branchName={branches.find((b) => b.branch_id === branchId)?.branch_name}
        onClose={() => setIsCashRegisterModalOpen(false)}
        onSessionsChanged={cashRegisters.refresh}
      />
    </div>
  );
}
