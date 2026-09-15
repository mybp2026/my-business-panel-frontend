import { useCallback, useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/context/AuthContext";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import {
  ProductVariantComboBox,
  type ProductVariantSelection,
} from "@/components/ui/ProductVariantComboBox";
import {
  IconPlus,
  IconShoppingCart,
  IconTrash,
  IconUser,
  IconX,
} from "@/assets/icons";

import { createCustomer } from "@/router/actions/customer.actions";
import {
  createFullSale,
  getInvoiceForSale,
} from "@/router/actions/sale.actions";
import {
  getCashRegistersByBranch,
  getOpenCashSessionsByBranch,
} from "@/router/actions/cashRegister.actions";

import { customerApi } from "@/api/customer.api";
import { employeeApi } from "@/api/employee.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { productApi } from "@/api/product.api";
import { warehouseApi } from "@/api/warehouse.api";
import { promotionApi } from "@/api/promotion.api";
import { useDebounce } from "@/hooks/useDebounce";
import { useUniqueAvailability } from "@/hooks/useUniqueAvailability";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useCashDrawer } from "@/hooks/useCashDrawer";
import {
  calculatePromotionDiscount,
  findMatchingTier,
  isPromotionWithinDate,
  promotionAppliesToItem,
} from "@/utils/promotion";

import { identificationTypes } from "@/constants/identification-types";
import { paymentMethods, currencies } from "@/constants/payment-methods";

import type { Promotion } from "@/interfaces/entities/Promotion.interface";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";
import type { CustomerDetail } from "@/interfaces/entities/CustomerDetail.interface";

import type { CreateSalePageLoaderData } from "@/router/loaders/sale.loaders";
import type { Customer } from "@/interfaces/entities/Customer.interface";
import type {
  CashRegister,
  CashRegisterSession,
} from "@/interfaces/entities/CashRegister.interface";
import type { CreateSaleRequest } from "@/interfaces/api/requests/CreateSaleRequest.interface";
import type {
  SaleItemPayload,
  CreateSaleResult,
  InvoiceInfo,
} from "@/interfaces/entities/Sale.interface";
import type { Column } from "@/interfaces/components/ui/TableProps.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type { Warehouse } from "@/interfaces/entities/Warehouse.interface";

import {
  customerLookupSchema,
  type CustomerLookupForm,
  inlineCustomerSchema,
  type InlineCustomerForm,
  saleItemSchema,
  type SaleItemForm,
} from "./create-sale.schema";

import { SaleResultModal, type SaleReceiptItem } from "./SaleResultModal";
import { CashDrawerStatus } from "@/components/ui/CashDrawerStatus";
import { getCustomerByDocNumber } from "@/router/loaders/customer.loaders";
import {
  ApplyPromotionModal,
  type AppliedPromotion,
} from "./ApplyPromotionModal";
import { QuickCashRegisterModal } from "./QuickCashRegisterModal";
import { RoyaltyPanel } from "./RoyaltyPanel";

interface CartItem {
  id: string;
  product_variant_id: string;
  variant_name: string;
  sku?: string;
  group_ids?: string[];
  quantity: number;
  unit_price: number;
  total_price: number;
  includes_iva?: boolean;
  sale_price_type?: "NORMAL" | "PROMO" | "SEGMENT" | "MANUAL" | "ROYALTY";
  royalty_option_id?: string | null;
  royalty_rule_id?: string | null;
}

interface PaymentSplit {
  id: string;
  methodId: number;
  amount: string;
  currencyId: number;
}

const TAX_RATE = 0.13;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CRC_CURRENCY_ID = 1;

const formatAmount = (value: number, symbol: string) =>
  `${symbol} ${value.toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;

const round2 = (value: number) => Number(value.toFixed(2));

const blankCustomer = (): InlineCustomerForm => ({
  first_name: "",
  last_name: "",
  document_type_id: 1,
  document_number: "",
  email: "",
  phone: "",
});

const buildVariantLabel = (selection: ProductVariantSelection) =>
  selection.sku
    ? `${selection.variant_name} (${selection.sku})`
    : selection.variant_name;

export function CreateSalePage() {
  const { branches, saleConditions } =
    useLoaderData() as CreateSalePageLoaderData;
  const { user } = useAuth();

  const tenantId = user?.tenant?.tenant_id ?? "";

  const defaultBranchId = branches[0]?.branch_id ?? "";
  const defaultCondition = saleConditions[0]?.condition_code ?? "01";
  const defaultCurrency = currencies[0];
  const defaultPaymentMethod =
    paymentMethods.find((m) => m.code === "debit_card") ?? paymentMethods[0];

  const [branchId, setBranchId] = useState(defaultBranchId);
  const [saleCondition, setSaleCondition] = useState(defaultCondition);
  const currencyId = defaultCurrency.value;
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([
    {
      id: "split-1",
      methodId: defaultPaymentMethod.value,
      amount: "",
      currencyId: defaultCurrency.value,
    },
  ]);
  const [singlePaymentManuallyEdited, setSinglePaymentManuallyEdited] =
    useState(false);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [openSessions, setOpenSessions] = useState<CashRegisterSession[]>([]);
  const [isLoadingCashRegisters, setIsLoadingCashRegisters] = useState(false);
  const [adMessage, setAdMessage] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [step, setStep] = useState<"lookup" | "items">("lookup");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  // Walk-in / counter sale: no customer attached. The DB columns
  // (sale.tenant_customer_id and customer_payment.tenant_customer_id) are
  // nullable, so we send null for those rows.
  const [isWalkInSale, setIsWalkInSale] = useState(false);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(
    null,
  );
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  // Apartado abono now flows through the payment splits panel — same as credit.

  const [items, setItems] = useState<CartItem[]>([]);
  const [lastItemAmount, setLastItemAmount] = useState(0);
  const [selectedVariant, setSelectedVariant] =
    useState<ProductVariantSelection | null>(null);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [appliedPromotion, setAppliedPromotion] =
    useState<AppliedPromotion | null>(null);
  const [isCashRegisterModalOpen, setIsCashRegisterModalOpen] = useState(false);

  const [, setWarehouses] = useState<Warehouse[]>([]);
  const [branchWarehouseId, setBranchWarehouseId] = useState<string>("");

  // Default promotions: pre-applied to every new sale while active. Loaded once
  // for the current tenant and re-evaluated against the cart.
  const [defaultPromotions, setDefaultPromotions] = useState<Promotion[]>([]);

  // Exchange rate (VES <-> USD): fetched from the server on mount, then
  // overridable locally for the current cash-session lifetime. Per spec, the
  // override does not persist to the database — closing the session loses it.
  const [serverExchangeRate, setServerExchangeRate] =
    useState<ExchangeRate | null>(null);
  // Exchange rates for each payment split: keyed by split.id
  const [exchangeRatesForSplits, setExchangeRatesForSplits] = useState<
    Record<string, ExchangeRate | null>
  >({});

  // Seller display: full name from the employee record falls back to email.
  const [sellerDisplayName, setSellerDisplayName] = useState<string>("");

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

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

  const lookupForm = useForm<CustomerLookupForm>({
    resolver: zodResolver(customerLookupSchema),
    defaultValues: { document_number: "" },
  });

  const docNumberValue = lookupForm.watch("document_number") ?? "";
  const debouncedDocNumber = useDebounce(docNumberValue, 400);

  const inlineCustomerForm = useForm<InlineCustomerForm>({
    resolver: zodResolver(inlineCustomerSchema),
    defaultValues: blankCustomer(),
  });

  // Live uniqueness probes for the inline-creation flow. We only fire them
  // while the inline section is open and a tenant is known.
  const inlineDoc = inlineCustomerForm.watch("document_number") ?? "";
  const inlineEmail = inlineCustomerForm.watch("email") ?? "";
  const inlinePhone = inlineCustomerForm.watch("phone") ?? "";

  const checkInlineDoc = useCallback(
    async (value: string) => {
      if (!tenantId) return false;
      const { exists } = await customerApi.checkAvailability({
        tenantId,
        field: "document_number",
        value,
      });
      return exists;
    },
    [tenantId],
  );

  const checkInlineEmail = useCallback(
    async (value: string) => {
      if (!tenantId) return false;
      const { exists } = await customerApi.checkAvailability({
        tenantId,
        field: "email",
        value,
      });
      return exists;
    },
    [tenantId],
  );

  const checkInlinePhone = useCallback(
    async (value: string) => {
      if (!tenantId) return false;
      const { exists } = await customerApi.checkAvailability({
        tenantId,
        field: "phone",
        value,
      });
      return exists;
    },
    [tenantId],
  );

  const inlineDocStatus = useUniqueAvailability(inlineDoc, checkInlineDoc, {
    skip: !showInlineCreate || !tenantId,
    minLength: 3,
  });

  const inlineEmailStatus = useUniqueAvailability(
    inlineEmail,
    checkInlineEmail,
    {
      skip: !showInlineCreate || !tenantId || !inlineEmail,
      minLength: 5,
      isWellFormed: (value) => EMAIL_REGEX.test(value),
    },
  );

  const inlinePhoneStatus = useUniqueAvailability(
    inlinePhone,
    checkInlinePhone,
    {
      skip: !showInlineCreate || !tenantId || !inlinePhone,
      minLength: 5,
    },
  );

  const inlineUniquenessBlocked =
    inlineDocStatus === "taken" ||
    inlineEmailStatus === "taken" ||
    inlinePhoneStatus === "taken";

  const inlineUniquenessProbing =
    inlineDocStatus === "checking" ||
    inlineEmailStatus === "checking" ||
    inlinePhoneStatus === "checking";

  const itemForm = useForm<SaleItemForm>({
    resolver: zodResolver(saleItemSchema),
    defaultValues: {
      product_variant_id: "",
      quantity: 1,
      unit_price: 0,
    },
  });

  // Re-evaluate active default promos against the current cart. Each item gets
  // the maximum discount from any matching default promo (one per item, not
  // cumulative — additive cumulation across multiple defaults is not supported
  // by the rule engine).
  const defaultPromoDiscount = useMemo(() => {
    if (defaultPromotions.length === 0 || items.length === 0) {
      return {
        total: 0,
        perItem: {} as Record<string, number>,
        source: null as Promotion | null,
      };
    }
    const grossForRule = items.reduce((acc, i) => acc + i.total_price, 0);
    const perItem: Record<string, number> = {};
    let total = 0;
    let appliedSource: Promotion | null = null;

    for (const item of items) {
      let bestDiscount = 0;
      for (const promo of defaultPromotions) {
        if (!promotionAppliesToItem(promo, item)) continue;
        if (!promo.type_name) continue;
        const rule =
          promo.type_name === "tiered_pricing"
            ? findMatchingTier(promo.rules ?? [], item.quantity)
            : (promo.rule ?? promo.rules?.[0]);
        if (!rule) continue;
        const result = calculatePromotionDiscount({
          type: promo.type_name,
          rule,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_purchase_amount: grossForRule,
        });
        if (result.success && result.discount_amount > bestDiscount) {
          bestDiscount = Math.min(result.discount_amount, item.total_price);
          if (!appliedSource) appliedSource = promo;
        }
      }
      if (bestDiscount > 0) {
        perItem[item.id] = Number(bestDiscount.toFixed(2));
        total += bestDiscount;
      }
    }

    return {
      total: Number(total.toFixed(2)),
      perItem,
      source: appliedSource,
    };
  }, [defaultPromotions, items]);

  // Any active default that disallows stacking blocks the cashier from adding
  // a manual promotion on top.
  const hasNonStackableDefault = useMemo(
    () => defaultPromotions.some((p) => p.is_stackable === false),
    [defaultPromotions],
  );

  const grossSubtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.total_price, 0),
    [items],
  );
  const manualDiscount = useMemo(
    () => Number((appliedPromotion?.totalDiscount ?? 0).toFixed(2)),
    [appliedPromotion],
  );
  const discountAmount = useMemo(
    () => Number((manualDiscount + defaultPromoDiscount.total).toFixed(2)),
    [manualDiscount, defaultPromoDiscount.total],
  );
  const subtotal = useMemo(
    () => Number(Math.max(grossSubtotal - discountAmount, 0).toFixed(2)),
    [grossSubtotal, discountAmount],
  );
  // Only apply IVA to items where includes_iva is false (price doesn't include tax).
  // Discount is applied proportionally to the taxable portion.
  const taxableGross = useMemo(
    () =>
      items.reduce(
        (acc, item) => (!item.includes_iva ? acc + item.total_price : acc),
        0,
      ),
    [items],
  );
  const taxAmount = useMemo(() => {
    if (grossSubtotal <= 0) return 0;
    const discountRatio = discountAmount / grossSubtotal;
    const taxableNet = taxableGross * (1 - discountRatio);
    return Number((taxableNet * TAX_RATE).toFixed(2));
  }, [taxableGross, grossSubtotal, discountAmount]);
  const totalAmount = useMemo(
    () => subtotal + taxAmount,
    [subtotal, taxAmount],
  );

  const currencySymbol =
    currencies.find((c) => c.value === currencyId)?.symbol ?? "Bs.";

  // Effective rate: cashier override wins if it parses to a positive number;
  // otherwise the server rate is used.
  const effectiveExchangeRate = useMemo(() => {
    const serverRate = Number(serverExchangeRate?.rate ?? 0);
    return Number.isFinite(serverRate) && serverRate > 0 ? serverRate : 0;
  }, [serverExchangeRate]);

  const convertCrcToSaleCurrency = useCallback(
    (amount: number) => {
      if (currencyId === CRC_CURRENCY_ID) return round2(amount);
      if (effectiveExchangeRate <= 0) return round2(amount);
      return round2(amount / effectiveExchangeRate);
    },
    [currencyId, effectiveExchangeRate],
  );

  const convertSaleCurrencyToCrc = useCallback(
    (amount: number) => {
      if (currencyId === CRC_CURRENCY_ID) return round2(amount);
      if (effectiveExchangeRate <= 0) return null;
      return round2(amount * effectiveExchangeRate);
    },
    [currencyId, effectiveExchangeRate],
  );

  const grossSubtotalDisplay = useMemo(
    () => convertCrcToSaleCurrency(grossSubtotal),
    [convertCrcToSaleCurrency, grossSubtotal],
  );
  const discountAmountDisplay = useMemo(
    () => convertCrcToSaleCurrency(discountAmount),
    [convertCrcToSaleCurrency, discountAmount],
  );
  const subtotalDisplay = useMemo(
    () => convertCrcToSaleCurrency(subtotal),
    [convertCrcToSaleCurrency, subtotal],
  );
  const taxAmountDisplay = useMemo(
    () => convertCrcToSaleCurrency(taxAmount),
    [convertCrcToSaleCurrency, taxAmount],
  );
  const totalAmountDisplay = useMemo(
    () => convertCrcToSaleCurrency(totalAmount),
    [convertCrcToSaleCurrency, totalAmount],
  );
  const totalInDollars = useMemo(() => {
    if (effectiveExchangeRate <= 0) return null;
    return round2(totalAmount / effectiveExchangeRate);
  }, [effectiveExchangeRate, totalAmount]);

  // Total expressed in CRC. Only meaningful when the sale currency is USD —
  // for CRC sales this just equals the total. For other currencies we leave
  // it null since we don't have a rate.
  const totalInColones = useMemo(() => {
    if (currencyId === CRC_CURRENCY_ID) return totalAmount;
    return convertSaleCurrencyToCrc(totalAmountDisplay);
  }, [convertSaleCurrencyToCrc, currencyId, totalAmount, totalAmountDisplay]);

  const refreshOpenCashRegisters = useCallback(async () => {
    if (!branchId) {
      setCashRegisters([]);
      setCashRegisterId("");
      return;
    }

    setIsLoadingCashRegisters(true);
    try {
      const [rows, openSessions] = await Promise.all([
        getCashRegistersByBranch(branchId),
        getOpenCashSessionsByBranch(branchId),
      ]);
      const openRegisterIds = new Set(
        openSessions.map((session) => session.cash_register_id),
      );
      const openRegisters = rows.filter((register) =>
        openRegisterIds.has(register.cash_register_id),
      );

      setOpenSessions(openSessions);
      setCashRegisters(openRegisters);
      setCashRegisterId((prev) =>
        openRegisters.some((register) => register.cash_register_id === prev)
          ? prev
          : (openRegisters[0]?.cash_register_id ?? ""),
      );
    } catch (err) {
      setOpenSessions([]);
      setCashRegisters([]);
      setCashRegisterId("");
      setToast({
        mode: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al cargar cajas registradoras",
      });
    } finally {
      setIsLoadingCashRegisters(false);
    }
  }, [branchId]);

  useEffect(() => {
    refreshOpenCashRegisters();
  }, [refreshOpenCashRegisters]);

  useEffect(() => {
    let cancelled = false;
    if (!tenantId) return;
    warehouseApi
      .listByTenant()
      .then((rows) => {
        if (cancelled) return;
        setWarehouses(rows);
        const w = rows.find((r) => r.branch_id === branchId && r.is_branch);
        setBranchWarehouseId(w?.warehouse_id ?? "");
      })
      .catch(() => {
        if (!cancelled) setWarehouses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, branchId]);

  // Load active default promotions for this tenant. Filtered client-side by
  // date as a defence in depth — the backend already filters by date too.
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    promotionApi
      .getActiveDefaults(tenantId)
      .then((rows) => {
        if (cancelled) return;
        setDefaultPromotions(
          rows.filter(
            (p) =>
              p.is_active &&
              isPromotionWithinDate(
                p.promotion_start_date,
                p.promotion_end_date,
              ),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setDefaultPromotions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  // Load latest exchange rate (USD -> CRC). Failing silently is fine — the
  // panel just shows "no hay tasa registrada" and the cashier can type one.
  useEffect(() => {
    if (currencyId === CRC_CURRENCY_ID) {
      setServerExchangeRate(null);
      return;
    }

    let cancelled = false;
    exchangeRateApi
      .getLatest(currencyId, CRC_CURRENCY_ID)
      .then((rate) => {
        if (!cancelled) setServerExchangeRate(rate ?? null);
      })
      .catch(() => {
        if (!cancelled) setServerExchangeRate(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currencyId]);

  // Load exchange rates for each payment split when their currency changes
  // We load rates to convert each split's currency to CRC (as a pivot)
  useEffect(() => {
    let cancelled = false;
    const loadRatesForSplits = async () => {
      const rates: Record<string, ExchangeRate | null> = {};
      for (const split of paymentSplits) {
        if (split.currencyId === CRC_CURRENCY_ID) {
          rates[split.id] = null; // CRC doesn't need conversion to itself
        } else {
          try {
            const rate = await exchangeRateApi.getLatest(
              split.currencyId,
              CRC_CURRENCY_ID,
            );
            rates[split.id] = rate ?? null;
          } catch {
            rates[split.id] = null;
          }
        }
      }
      if (!cancelled) setExchangeRatesForSplits(rates);
    };
    loadRatesForSplits();
    return () => {
      cancelled = true;
    };
  }, [paymentSplits.map((s) => `${s.id}:${s.currencyId}`).join("|")]);

  // Fetch customer loyalty detail when a customer is selected
  useEffect(() => {
    if (!customer?.customer_id) {
      setCustomerDetail(null);
      setUsePoints(false);
      setPointsToRedeem(0);
      return;
    }
    let cancelled = false;
    customerApi
      .getDetail(customer.customer_id)
      .then((detail) => {
        if (!cancelled) setCustomerDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setCustomerDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [customer?.customer_id]);

  // Derived loyalty values
  const availablePoints = customerDetail?.loyalty_score ?? 0;
  const pointsRate = customerDetail?.points_redeemed_per_currency_unit ?? 0;
  const loyaltyActive = !!(
    customerDetail?.loyalty_program_active &&
    pointsRate > 0 &&
    availablePoints > 0
  );
  // Max monetary value coverable by available points (in CRC)
  const maxPointsCrcValue = loyaltyActive
    ? Math.floor(availablePoints / pointsRate)
    : 0;
  // Points actually redeemed = monetary coverage * pointsRate (in CRC)
  const actualPointsRedeemed =
    usePoints && loyaltyActive && pointsRate > 0
      ? Math.min(pointsToRedeem, availablePoints)
      : 0;
  const pointsCoveredCrc =
    actualPointsRedeemed > 0
      ? Math.floor(actualPointsRedeemed / pointsRate)
      : 0;
  const pointsCoveredDisplay = convertCrcToSaleCurrency(
    Math.min(pointsCoveredCrc, totalAmount),
  );
  const remainderDisplay = Math.max(
    round2(totalAmountDisplay - pointsCoveredDisplay),
    0,
  );

  // Payment splits derived values
  // Convert each split to sale currency, then sum
  const splitTotalInSaleCurrency = useMemo(() => {
    return paymentSplits.reduce((sum, s) => {
      const amount = Number(parseFloat(s.amount) || 0);
      if (amount === 0) return sum;

      // If split currency matches sale currency, add directly
      if (s.currencyId === currencyId) {
        return round2(sum + amount);
      }

      // Convert split to CRC first
      let amountInCrc = amount;
      if (s.currencyId !== CRC_CURRENCY_ID) {
        const rateToCrc = exchangeRatesForSplits[s.id];
        if (!rateToCrc) return sum; // No rate available, skip this split
        amountInCrc = round2(amount * Number(rateToCrc.rate));
      }

      // Now convert from CRC to sale currency if needed
      if (currencyId === CRC_CURRENCY_ID) {
        return round2(sum + amountInCrc);
      }

      // Sale currency is not CRC, so convert CRC to sale currency
      if (!serverExchangeRate || !effectiveExchangeRate) return sum;
      const amountInSaleCurrency = round2(amountInCrc / effectiveExchangeRate);
      return round2(sum + amountInSaleCurrency);
    }, 0);
  }, [
    paymentSplits,
    currencyId,
    exchangeRatesForSplits,
    serverExchangeRate,
    effectiveExchangeRate,
  ]);

  const isApartado = saleCondition === "04";
  const isCredit = saleCondition === "02";

  const cashRegisterSessionId = useMemo(
    () =>
      openSessions.find((s) => s.cash_register_id === cashRegisterId)
        ?.cash_register_session_id ?? "",
    [openSessions, cashRegisterId],
  );
  const apartadoAmountDisplay = isApartado ? splitTotalInSaleCurrency : 0;
  const apartadoBalance = isApartado
    ? round2(totalAmountDisplay - apartadoAmountDisplay)
    : 0;

  const targetPayment =
    isApartado
      ? totalAmountDisplay
      : usePoints && actualPointsRedeemed > 0
        ? remainderDisplay
        : totalAmountDisplay;
  const paymentBalance = round2(targetPayment - splitTotalInSaleCurrency);

  // Calculate which payment currencies are being used
  const paymentCurrenciesUsed = useMemo(() => {
    if (!isPartialPayment) return [];
    return Array.from(new Set(paymentSplits.map((s) => s.currencyId)));
  }, [isPartialPayment, paymentSplits]);

  // Resolve seller name. Try the employee record first; fall back to email.
  useEffect(() => {
    const userId = user?.user_id;
    const fallback = user?.email ?? "";
    if (!userId) {
      setSellerDisplayName(fallback);
      return;
    }
    let cancelled = false;
    employeeApi
      .getByUserId(userId)
      .then((emp) => {
        if (cancelled) return;
        const fullName =
          emp?.first_name || emp?.last_name
            ? `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim()
            : fallback;
        setSellerDisplayName(fullName);
      })
      .catch(() => {
        if (!cancelled) setSellerDisplayName(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.user_id, user?.email]);

  useEffect(() => {
    if (!isPartialPayment && !singlePaymentManuallyEdited) {
      setPaymentSplits((p) => [
        { ...p[0], amount: String(totalAmountDisplay) },
      ]);
    }
  }, [isPartialPayment, singlePaymentManuallyEdited, totalAmountDisplay]);

  useEffect(() => {
    if (isPartialPayment) {
      setSinglePaymentManuallyEdited(false);
      setPaymentSplits(
        paymentMethods
          .filter((m) => !(m.code === "loyalty_points" && isWalkInSale))
          .map((m) => ({
            id: `split-${m.value}`,
            methodId: m.value,
            amount: "",
            currencyId: CRC_CURRENCY_ID,
          })),
      );
      return;
    }
    setSinglePaymentManuallyEdited(false);
    setPaymentSplits((prev) => [
      {
        id: prev[0]?.id ?? "split-1",
        methodId: prev[0]?.methodId ?? defaultPaymentMethod.value,
        amount: String(totalAmountDisplay),
        currencyId: prev[0]?.currencyId ?? defaultCurrency.value,
      },
    ]);
  }, [isPartialPayment]);

  useEffect(() => {
    const trimmed = debouncedDocNumber.trim();
    if (trimmed.length < 3) {
      setShowInlineCreate(false);
      return;
    }

    let cancelled = false;
    setIsLookingUp(true);

    getCustomerByDocNumber(trimmed)
      .then((found) => {
        if (cancelled) return;
        if (found && (found as Customer).document_number) {
          setCustomer(found);
          setShowInlineCreate(false);
          setStep("items");
          setToast({
            mode: "success",
            message: `Cliente encontrado: ${found.first_name} ${found.last_name}`,
          });
        } else {
          inlineCustomerForm.reset({
            ...blankCustomer(),
            document_number: trimmed,
          });
          setShowInlineCreate(true);
          setToast({
            mode: "info",
            message: "Cliente no encontrado. Complete los datos para crearlo.",
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        inlineCustomerForm.reset({
          ...blankCustomer(),
          document_number: trimmed,
        });
        setShowInlineCreate(true);
        setToast({
          mode: "info",
          message: "Cliente no encontrado. Complete los datos para crearlo.",
        });
      })
      .finally(() => {
        if (!cancelled) setIsLookingUp(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedDocNumber]);

  const handleInlineCreate = async (data: InlineCustomerForm) => {
    if (!tenantId) {
      setToast({ mode: "error", message: "No se identificó el tenant" });
      return;
    }
    if (inlineUniquenessBlocked) {
      setToast({
        mode: "error",
        message: "Hay datos del cliente que ya están registrados",
      });
      return;
    }
    if (inlineUniquenessProbing) {
      setToast({
        mode: "info",
        message: "Verificando disponibilidad… intenta de nuevo en un momento",
      });
      return;
    }
    try {
      const created = await createCustomer({
        tenant_id: tenantId,
        first_name: data.first_name,
        last_name: data.last_name,
        document_type_id: Number(data.document_type_id),
        document_number: data.document_number,
        email: data.email || undefined,
        phone: data.phone || undefined,
        segment_id: 4,
      });
      setCustomer(created);
      setShowInlineCreate(false);
      setStep("items");
      setToast({ mode: "success", message: "Cliente creado correctamente" });
    } catch (err) {
      setToast({
        mode: "error",
        message: err instanceof Error ? err.message : "Error al crear cliente",
      });
    }
  };

  const handleAddItem = (data: SaleItemForm) => {
    if (!selectedVariant || !data.product_variant_id) {
      setToast({ mode: "error", message: "Producto inválido" });
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
    setToast({
      mode: "success",
      message: `Promoción aplicada: ${applied.description}`,
    });
  };

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setToast({ mode: "info", message: "Promoción removida" });
  };

  const handleVariantSelect = async (selection: ProductVariantSelection) => {
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

    setSelectedVariant({ ...selection, group_ids: groupIds, includes_iva });
    itemForm.setValue("product_variant_id", selection.product_variant_id, {
      shouldValidate: true,
    });
    itemForm.setValue("unit_price", selection.unit_price, {
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
      try {
        const found = await productApi.getBySku(sku);
        if (!found?.product_variant_id) {
          setToast({ mode: "error", message: `SKU no encontrado: ${sku}` });
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
        const unitPrice = Number(found.unit_price ?? found.price ?? 0);

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
        setToast({ mode: "success", message: `Agregado: ${variantName}` });
      } catch {
        setToast({ mode: "error", message: `Error al buscar SKU: ${sku}` });
      }
    },
    [tenantId],
  );

  useBarcodeScanner(handleBarcodeScan, step === "items");

  const { openDrawer } = useCashDrawer();

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmitSale = async () => {
    const hasCustomerOrWalkIn = Boolean(customer) || isWalkInSale;
    if (
      !hasCustomerOrWalkIn ||
      !branchId ||
      !cashRegisterId ||
      items.length === 0
    ) {
      setToast({
        mode: "error",
        message: "Complete los datos antes de procesar la venta",
      });
      return;
    }

    if (usePoints && !customer) {
      setToast({
        mode: "error",
        message: "Debe asociar un cliente para usar puntos de fidelidad.",
      });
      return;
    }

    const hasLoyaltySplit = paymentSplits.some(
      (s) => s.methodId === 5 && parseFloat(s.amount) > 0,
    );
    if (hasLoyaltySplit && !customer) {
      setToast({
        mode: "error",
        message: "Debe asociar un cliente para usar puntos de fidelidad.",
      });
      return;
    }

    if (hasLoyaltySplit && customer) {
      const totalLoyaltyAmount = paymentSplits
        .filter((s) => s.methodId === 5)
        .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
      if (
        totalLoyaltyAmount > 0 &&
        (pointsRate === 0 || availablePoints === 0)
      ) {
        setToast({
          mode: "error",
          message: "El cliente no tiene puntos disponibles para canjear.",
        });
        return;
      }
      if (pointsRate > 0) {
        const pointsRequired = Math.round(totalLoyaltyAmount * pointsRate);
        if (pointsRequired > availablePoints) {
          setToast({
            mode: "error",
            message: `Puntos insuficientes. Disponibles: ${availablePoints.toLocaleString("es-CR")}, requeridos: ${pointsRequired.toLocaleString("es-CR")}.`,
          });
          return;
        }
      }
    }

    if (isApartado) {
      if (splitTotalInSaleCurrency <= 0) {
        setToast({
          mode: "error",
          message:
            "Ingrese el abono inicial en la sección de métodos de pago (debe ser mayor a 0).",
        });
        return;
      }
      if (splitTotalInSaleCurrency >= totalAmountDisplay - 0.01) {
        setToast({
          mode: "error",
          message: "El abono inicial debe ser menor al total de la venta.",
        });
        return;
      }
    }

    if (!isCredit && !isApartado && paymentBalance > 0.01) {
      setToast({
        mode: "error",
        message: `Monto insuficiente. Falta: ${formatAmount(paymentBalance, currencySymbol)}`,
      });
      return;
    }

    if (isCredit && !dueDate) {
      setToast({
        mode: "error",
        message: "Ingrese la fecha límite de pago para ventas a crédito.",
      });
      return;
    }

    if (isApartado && !dueDate) {
      setToast({
        mode: "error",
        message: "Ingrese la fecha límite de pago para ventas en apartado.",
      });
      return;
    }

    setIsSubmitting(true);

    const customerId = customer?.customer_id ?? null;
    const now = new Date().toISOString();

    const itemsPayload: SaleItemPayload[] = items.map((item) => {
      const manualPart = appliedPromotion?.perItemDiscount[item.id] ?? 0;
      const defaultPart = defaultPromoDiscount.perItem[item.id] ?? 0;
      const itemDiscount = Number((manualPart + defaultPart).toFixed(2));
      const hasDiscount = itemDiscount > 0;
      const netUnitPriceCrc = hasDiscount
        ? round2(Math.max((item.total_price - itemDiscount) / item.quantity, 0))
        : item.unit_price;
      const netTotalCrc = hasDiscount
        ? round2(Math.max(item.total_price - itemDiscount, 0))
        : item.total_price;
      // Manual promo wins for the recorded promotion_id; fall back to the
      // first default promo that contributed if no manual was applied.
      const promotionId =
        manualPart > 0
          ? appliedPromotion?.promotionId
          : defaultPart > 0
            ? defaultPromoDiscount.source?.promotion_id
            : undefined;
      // Royalty (gifted) items keep their ROYALTY price type and audit
      // ids, and bypass promo recomputation since they are zero-priced.
      const isRoyalty = item.sale_price_type === "ROYALTY";
      return {
        tenant_id: tenantId,
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
        unit_price: convertCrcToSaleCurrency(netUnitPriceCrc),
        total_price: convertCrcToSaleCurrency(netTotalCrc),
        sale_price_type: isRoyalty
          ? "ROYALTY"
          : hasDiscount
            ? "PROMO"
            : "NORMAL",
        promotion_id: isRoyalty ? undefined : promotionId,
        royalty_option_id: item.royalty_option_id ?? null,
        royalty_rule_id: item.royalty_rule_id ?? null,
        original_price: hasDiscount
          ? convertCrcToSaleCurrency(item.unit_price)
          : undefined,
        discount_applied: hasDiscount
          ? convertCrcToSaleCurrency(itemDiscount)
          : 0,
      };
    });

    const amountPaid = splitTotalInSaleCurrency;
    const changeAmount =
      paymentBalance < -0.01 ? round2(Math.abs(paymentBalance)) : 0;

    const payload: CreateSaleRequest = {
      tenant_id: tenantId,
      branch_id: branchId,
      cash_register_id: cashRegisterId,
      cash_register_session_id: cashRegisterSessionId || undefined,
      currency_id: currencyId,
      tenant_customer_id: customerId,
      sale_condition: saleCondition,
      sale_date: now,
      subtotal_amount: subtotalDisplay,
      tax_amount: taxAmountDisplay,
      total_amount: totalAmountDisplay,
      is_completed: !isApartado,
      seller_user_id: user?.user_id,
      due_date:
        (isApartado || isCredit) && dueDate
          ? dueDate
          : new Date().toISOString().slice(0, 10),
      ad_message: adMessage.trim() || undefined,
      amount_paid: amountPaid,
      change_amount: changeAmount,
      items: itemsPayload,
      payments: (() => {
        const rows = [];
        if (usePoints && actualPointsRedeemed > 0 && pointsCoveredDisplay > 0) {
          rows.push({
            tenant_customer_id: customerId ?? null,
            payment_method_id:
              paymentSplits[0]?.methodId ?? defaultPaymentMethod.value,
            is_points_redemption: true,
            points_redeemed: actualPointsRedeemed,
            points_to_currency_rate: pointsRate,
            payment_amount: pointsCoveredDisplay,
            payment_date: now,
            currency_id: currencyId,
            verified: true,
          });
        }
        for (const split of paymentSplits) {
          const amount = parseFloat(split.amount) || 0;
          if (amount > 0) {
            const isLoyaltyMethod = split.methodId === 5;
            const splitPointsRedeemed = isLoyaltyMethod
              ? Math.round(amount * pointsRate)
              : 0;
            rows.push({
              tenant_customer_id: customerId ?? null,
              payment_method_id: split.methodId,
              is_points_redemption: isLoyaltyMethod,
              points_redeemed: splitPointsRedeemed,
              points_to_currency_rate: isLoyaltyMethod ? pointsRate : 0,
              payment_amount: amount,
              payment_date: now,
              currency_id: split.currencyId,
              verified: true,
            });
          }
        }
        return rows;
      })(),
    };

    try {
      const result: CreateSaleResult = await createFullSale(payload);

      const hasCashPayment = paymentSplits.some((s) => s.methodId === 1);
      if (hasCashPayment) openDrawer();

      const [digitalInvoice] = await Promise.all([
        getInvoiceForSale(result.saleId),
      ]);
      const splitPointsTotal = paymentSplits
        .filter((s) => s.methodId === 5)
        .reduce(
          (sum, s) =>
            sum + Math.round((parseFloat(s.amount) || 0) * pointsRate),
          0,
        );
      const effectivePointsRedeemed = usePoints
        ? actualPointsRedeemed
        : splitPointsTotal;

      setResultModal({
        open: true,
        saleId: result.saleId ?? null,
        total: totalAmountDisplay,
        digitalInvoice: digitalInvoice ?? null,
        items: items.map((item) => ({
          variant_name: item.variant_name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
        paymentSplits: paymentSplits,
        currencySymbol: currencySymbol,
        pointsRedeemed: effectivePointsRedeemed,
        pointsRate: pointsRate,
      });
    } catch (err) {
      setToast({
        mode: "error",
        message: err instanceof Error ? err.message : "Error al procesar venta",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForNewSale = () => {
    setResultModal((prev) => ({ ...prev, open: false }));
    setStep("lookup");
    setCustomer(null);
    setShowInlineCreate(false);
    setIsWalkInSale(false);
    setItems([]);
    setLastItemAmount(0);
    setAppliedPromotion(null);
    setAdMessage("");
    setDueDate("");
    setPaymentSplits([
      {
        id: "split-1",
        methodId: defaultPaymentMethod.value,
        amount: "",
        currencyId: defaultCurrency.value,
      },
    ]);
    setSinglePaymentManuallyEdited(false);
    lookupForm.reset({ document_number: "" });
    inlineCustomerForm.reset(blankCustomer());
    setSelectedVariant(null);
    itemForm.reset({
      product_variant_id: "",
      quantity: 1,
      unit_price: 0,
    });
  };

  const startWalkInSale = () => {
    setIsWalkInSale(true);
    setShowInlineCreate(false);
    setStep("items");
    setToast({
      mode: "info",
      message:
        "Venta de mostrador (sin cliente). Los puntos de fidelidad no aplican.",
    });
  };

  const updatePaymentSplit = (
    id: string,
    field: keyof PaymentSplit,
    value: string | number,
  ) => {
    if (!isPartialPayment && field === "amount") {
      setSinglePaymentManuallyEdited(true);
    }
    setPaymentSplits((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  };

  const fillRemainder = (id: string) => {
    const others = paymentSplits
      .filter((s) => s.id !== id)
      .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    const fill = round2(Math.max(targetPayment - others, 0));
    updatePaymentSplit(id, "amount", String(fill));
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
    .filter((m) => {
      // Loyalty points require a customer association
      if (m.code === "loyalty_points" && isWalkInSale) {
        return false;
      }
      return true;
    })
    .map((m) => ({
      value: String(m.value),
      label: m.label,
    }));
  const cashRegisterOptions = cashRegisters.map((register) => ({
    value: register.cash_register_id,
    label: register.register_name || register.cash_register_id,
  }));

  const itemColumns: Column[] = [
    { key: "variant_name", label: "Producto", width: "40%" },
    { key: "sku", label: "SKU", width: "15%", render: (v) => v ?? "—" },
    {
      key: "quantity",
      label: "Cant.",
      width: "10%",
      render: (_: number, row: CartItem) => (
        <input
          aria-label="cantidad"
          type="number"
          min={1}
          value={row.quantity}
          onChange={(e) =>
            handleQuantityChange(row.id, parseInt(e.target.value, 10) || 1)
          }
          className="w-16 rounded border border-gray-300 px-2 py-1 text-center font-mono text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      ),
    },
    {
      key: "unit_price",
      label: "Precio",
      width: "15%",
      render: (_: number, row: CartItem) =>
        formatAmount(convertCrcToSaleCurrency(row.unit_price), currencySymbol),
    },
    {
      key: "total_price",
      label: "Subtotal",
      width: "15%",
      render: (_: number, row: CartItem) => (
        <span className="font-medium">
          {formatAmount(
            convertCrcToSaleCurrency(row.total_price),
            currencySymbol,
          )}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "5%",
      render: (_: unknown, row: CartItem) => (
        <Button
          variant="danger"
          size="sm"
          onClick={() => handleRemoveItem(row.id)}
          title="Quitar"
        >
          <IconTrash />
        </Button>
      ),
    },
  ];

  // ─── UI ─────────────────────────────────────────────────────────────────────

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

      {/* ── Sale config row ───────────────────────────────────────────────── */}
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
              value={cashRegisterId}
              onChange={(e) => setCashRegisterId(e.target.value)}
              options={
                cashRegisterOptions.length
                  ? cashRegisterOptions
                  : [
                      {
                        value: "",
                        label: isLoadingCashRegisters
                          ? "Cargando cajas..."
                          : "No hay cajas con sesion abierta en esta sucursal",
                      },
                    ]
              }
              disabled={
                isLoadingCashRegisters || cashRegisterOptions.length === 0
              }
              required
            />
          </div>
        </div>
      </div>

      {/* ── Step 1: customer lookup ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Datos del cliente
          </h2>
          {customer && step === "items" && (
            <Badge variant="green" className="ml-2">
              Listo
            </Badge>
          )}
          {isWalkInSale && step === "items" && (
            <Badge variant="yellow" className="ml-2">
              Venta de mostrador
            </Badge>
          )}
        </div>

        {!customer && !isWalkInSale && (
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
              <Input
                label="Número de documento"
                placeholder="Ej: 105550987"
                {...lookupForm.register("document_number")}
                error={lookupForm.formState.errors.document_number?.message}
                hint={isLookingUp ? "Buscando cliente…" : undefined}
                required
              />
            </div>
            {!isApartado && (
              <Button type="button" variant="ghost" onClick={startWalkInSale}>
                Continuar sin cliente
              </Button>
            )}
          </div>
        )}

        {isWalkInSale && !customer && (
          <div className="mt-2 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <IconUser />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">Venta de mostrador</p>
              <p className="text-xs text-amber-700">
                No se asociará ningún cliente a esta venta.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsWalkInSale(false);
                setStep("lookup");
              }}
            >
              Cambiar
            </Button>
          </div>
        )}

        {showInlineCreate && !customer && (
          <form
            onSubmit={inlineCustomerForm.handleSubmit(handleInlineCreate)}
            className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-6"
          >
            <Input
              label="Nombre"
              {...inlineCustomerForm.register("first_name")}
              error={inlineCustomerForm.formState.errors.first_name?.message}
              required
            />
            <Input
              label="Apellido"
              {...inlineCustomerForm.register("last_name")}
              error={inlineCustomerForm.formState.errors.last_name?.message}
              required
            />
            <Select
              label="Tipo de documento"
              value={String(inlineCustomerForm.watch("document_type_id") ?? 1)}
              onChange={(e) =>
                inlineCustomerForm.setValue(
                  "document_type_id",
                  Number(e.target.value),
                )
              }
              options={identificationTypes.map((t) => ({
                value: String(t.value),
                label: t.label,
              }))}
              required
            />
            <Input
              label="Número de documento"
              {...inlineCustomerForm.register("document_number")}
              error={
                inlineCustomerForm.formState.errors.document_number?.message ??
                (inlineDocStatus === "taken"
                  ? "Ya existe un cliente con este documento"
                  : undefined)
              }
              hint={
                inlineDocStatus === "checking"
                  ? "Verificando disponibilidad…"
                  : inlineDocStatus === "available"
                    ? "Documento disponible"
                    : undefined
              }
              required
            />
            <Input
              label="Email"
              type="email"
              {...inlineCustomerForm.register("email")}
              error={
                inlineCustomerForm.formState.errors.email?.message ??
                (inlineEmailStatus === "taken"
                  ? "Ya existe un cliente con este email"
                  : undefined)
              }
              hint={
                inlineEmailStatus === "checking"
                  ? "Verificando disponibilidad…"
                  : inlineEmailStatus === "available"
                    ? "Email disponible"
                    : undefined
              }
            />
            <Input
              label="Teléfono"
              {...inlineCustomerForm.register("phone")}
              error={
                inlinePhoneStatus === "taken"
                  ? "Ya existe un cliente con este teléfono"
                  : undefined
              }
              hint={
                inlinePhoneStatus === "checking"
                  ? "Verificando disponibilidad…"
                  : inlinePhoneStatus === "available"
                    ? "Teléfono disponible"
                    : undefined
              }
            />
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowInlineCreate(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={inlineUniquenessBlocked || inlineUniquenessProbing}
                title={
                  inlineUniquenessBlocked
                    ? "Hay datos duplicados que deben corregirse"
                    : inlineUniquenessProbing
                      ? "Verificando disponibilidad…"
                      : undefined
                }
              >
                <IconPlus />
                Crear cliente y continuar
              </Button>
            </div>
          </form>
        )}

        {customer && (
          <div className="mt-2 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <IconUser />
            <div className="flex-1">
              <p className="font-semibold text-emerald-900">
                {customer.first_name} {customer.last_name}
              </p>
              <p className="text-xs text-emerald-700">
                Doc. {customer.document_number}{" "}
                {customer.email ? `· ${customer.email}` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCustomer(null);
                setStep("lookup");
                setShowInlineCreate(false);
                lookupForm.reset({ document_number: "" });
              }}
            >
              Cambiar
            </Button>
          </div>
        )}
      </div>

      {/* ── Step 2: items ─────────────────────────────────────────────────── */}
      <div
        className={`bg-white rounded-2xl border border-gray-300 p-6 mb-6 ${
          step === "items" ? "" : "opacity-60 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Productos y servicios
          </h2>
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <form
            onSubmit={itemForm.handleSubmit(handleAddItem)}
            className="flex-1 grid grid-cols-1 md:grid-cols-9 gap-3"
          >
            <div className="md:col-span-6">
              <ProductVariantComboBox
                tenantId={tenantId}
                warehouseId={branchWarehouseId}
                manualSkuEnabled
                label="Producto"
                value={itemForm.watch("product_variant_id")}
                displayValue={
                  selectedVariant ? buildVariantLabel(selectedVariant) : ""
                }
                onChange={handleVariantSelect}
                onClear={handleVariantClear}
                error={itemForm.formState.errors.product_variant_id?.message}
                hideOutOfStock={true}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Cantidad"
                type="number"
                min={1}
                {...itemForm.register("quantity", { valueAsNumber: true })}
                error={itemForm.formState.errors.quantity?.message}
                required
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button type="submit" variant="primary" fullWidth>
                <IconPlus />
              </Button>
            </div>
          </form>
          <div className="w-full md:w-52 shrink-0">
            <Select
              label="Condición de venta"
              value={saleCondition}
              onChange={(e) => setSaleCondition(e.target.value)}
              options={conditionOptions}
              required
            />
          </div>
          <div className="flex items-end shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPromotionModalOpen(true)}
              disabled={items.length === 0 || hasNonStackableDefault}
              title={
                hasNonStackableDefault
                  ? "Hay una promoción default activa que no permite acumular más"
                  : "Agregar promoción"
              }
            >
              PROMO
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-600">
            {items.length > 0 && (
              <span>
                Último producto agregado:{" "}
                <span className="font-semibold text-gray-900">
                  {formatAmount(
                    convertCrcToSaleCurrency(lastItemAmount),
                    currencySymbol,
                  )}
                </span>
              </span>
            )}
          </div>
        </div>

        {hasNonStackableDefault && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Una promoción default activa no permite acumular promociones
            adicionales. No es posible agregar otra encima.
          </div>
        )}

        {defaultPromoDiscount.total > 0 && defaultPromoDiscount.source && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Promoción default aplicada
            </p>
            <p className="mt-1 text-sm font-medium text-blue-900">
              {defaultPromoDiscount.source.promotion_name}
              <span className="ml-2 text-xs font-normal text-blue-700">
                Descuento: -
                {formatAmount(defaultPromoDiscount.total, currencySymbol)}
              </span>
            </p>
          </div>
        )}

        {appliedPromotion && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Promoción aplicada
              </p>
              <p className="mt-1 text-sm font-medium text-emerald-900 truncate">
                {appliedPromotion.description}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Descuento total:{" "}
                <span className="font-semibold">
                  -{formatAmount(discountAmountDisplay, currencySymbol)}
                </span>
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemovePromotion}
              title="Quitar promoción"
            >
              <IconX />
            </Button>
          </div>
        )}

        <div className="mt-4">
          <RoyaltyPanel
            customer={isWalkInSale ? null : customer}
            tenantId={tenantId}
            totalAmount={totalAmount}
            onAddItems={(royaltyItems) => {
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
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Subtotal bruto
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatAmount(grossSubtotalDisplay, currencySymbol)}
            </p>
            {currencyId === CRC_CURRENCY_ID && totalInDollars !== null && (
              <p className="text-xs text-gray-500 mt-1">
                ≈{" "}
                {formatAmount(
                  round2(grossSubtotal / effectiveExchangeRate),
                  "$",
                )}
              </p>
            )}
          </div>
          <div
            className={`border rounded-xl p-4 ${
              discountAmount > 0
                ? "bg-amber-50 border-amber-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <p
              className={`text-xs uppercase tracking-wider ${
                discountAmount > 0 ? "text-amber-700" : "text-gray-500"
              }`}
            >
              Descuento
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${
                discountAmount > 0 ? "text-amber-900" : "text-gray-900"
              }`}
            >
              -{formatAmount(discountAmountDisplay, currencySymbol)}
            </p>
            {currencyId === CRC_CURRENCY_ID && totalInDollars !== null && (
              <p className="text-xs text-amber-700 mt-1">
                ≈ -
                {formatAmount(
                  round2(discountAmount / effectiveExchangeRate),
                  "$",
                )}
              </p>
            )}
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Subtotal con descuento
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatAmount(subtotalDisplay, currencySymbol)}
            </p>
            {currencyId === CRC_CURRENCY_ID && totalInDollars !== null && (
              <p className="text-xs text-gray-500 mt-1">
                ≈ {formatAmount(round2(subtotal / effectiveExchangeRate), "$")}
              </p>
            )}
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-emerald-700">
              Total con IVA ({(TAX_RATE * 100).toFixed(0)}%)
            </p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">
              {formatAmount(totalAmountDisplay, currencySymbol)}
            </p>
            {currencyId === CRC_CURRENCY_ID && totalInDollars !== null && (
              <p className="text-xs text-emerald-700 mt-1">
                ≈ {formatAmount(totalInDollars, "$")}
              </p>
            )}
            {currencyId !== CRC_CURRENCY_ID && totalInColones !== null && (
              <p className="text-xs text-emerald-700 mt-1">
                ≈ {formatAmount(totalInColones, "Bs.")} ·
                <span className="ml-1 text-emerald-600">
                  tasa{" "}
                  {effectiveExchangeRate.toLocaleString("es-CR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}
                </span>
              </p>
            )}
            {currencyId !== CRC_CURRENCY_ID &&
              totalInColones === null &&
              effectiveExchangeRate === 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  Configure una tasa para ver el equivalente en colones.
                </p>
              )}
          </div>
        </div>

        <div className="mt-6">
          <Table
            columns={itemColumns}
            data={items}
            emptyMessage="Aún no hay productos en la venta"
          />
        </div>
      </div>

      {/* ── Loyalty points panel ─────────────────────────────────────────── */}
      {(() => {
        if (!loyaltyActive || step !== "items") return null;
        const pointsNeededForTotal =
          loyaltyActive && pointsRate > 0
            ? round2(totalAmount * pointsRate)
            : 0;
        const hasEnoughPointsForTotal =
          pointsNeededForTotal > 0 && pointsNeededForTotal <= availablePoints;
        return (
          <div className="bg-white rounded-2xl border border-purple-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Puntos de fidelidad
              </h2>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                  <p className="text-xs uppercase tracking-wider text-purple-600">
                    Puntos disponibles
                  </p>
                  <p className="text-2xl font-bold text-purple-900 mt-0.5">
                    {availablePoints.toLocaleString("es-CR")}
                  </p>
                  <p className="text-xs text-purple-700 mt-0.5">
                    Equivalen a{" "}
                    {formatAmount(
                      convertCrcToSaleCurrency(maxPointsCrcValue),
                      currencySymbol,
                    )}
                  </p>
                </div>
                {usePoints && pointsCoveredDisplay > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <p className="text-xs uppercase tracking-wider text-emerald-600">
                      Cubierto por puntos
                    </p>
                    <p className="text-2xl font-bold text-emerald-900 mt-0.5">
                      {formatAmount(round2(pointsToRedeem / pointsRate), "Bs.")}
                    </p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Puntos restantes tras compra:{" "}
                      {(availablePoints - pointsToRedeem).toLocaleString(
                        "es-CR",
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 min-w-55">
                {hasEnoughPointsForTotal && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePoints}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUsePoints(checked);

                        if (checked) {
                          // Points needed for the total amount
                          const pointsNeeded = round2(totalAmount * pointsRate);
                          // Convert points to currency for the payment split
                          const amountInCurrency =
                            pointsRate > 0
                              ? round2(pointsNeeded / pointsRate)
                              : 0;

                          // Reset payment splits to a single split with loyalty points
                          setPaymentSplits([
                            {
                              id: "split-1",
                              methodId: 5, // Loyalty points method
                              amount: String(amountInCurrency),
                              currencyId: CRC_CURRENCY_ID,
                            },
                          ]);

                          // Disable partial payment
                          setIsPartialPayment(false);
                          setPointsToRedeem(pointsNeeded);
                        } else {
                          // Reset to default payment method
                          setPaymentSplits([
                            {
                              id: "split-1",
                              methodId: defaultPaymentMethod.value,
                              amount: "",
                              currencyId: currencyId,
                            },
                          ]);
                          setPointsToRedeem(0);
                        }
                      }}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-400"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Usar puntos para pagar
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Crédito — fecha límite de pago ──────────────────────────────── */}
      {isCredit && step === "items" && (
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-semibold text-sm">
              C
            </span>
            <h2 className="text-lg font-semibold text-blue-900">
              Venta a crédito
            </h2>
          </div>
          <p className="text-sm text-blue-800 mb-4">
            El saldo pendiente se registrará como cuenta por cobrar al procesar
            la venta.
          </p>
          <Input
            label="Fecha límite de pago"
            type="date"
            value={dueDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDueDate(e.target.value)}
            hint="Fecha en que el cliente debe liquidar el saldo"
            required
          />
          {paymentBalance > 0.01 && (
            <p className="mt-3 text-sm text-blue-700">
              Saldo pendiente{" "}
              <strong>{formatAmount(paymentBalance, currencySymbol)}</strong> se
              registrará en cuentas por cobrar.
            </p>
          )}
        </div>
      )}

      {/* ── Apartado (layaway) panel ─────────────────────────────────────── */}
      {isApartado && step === "items" && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-semibold text-sm">
              A
            </span>
            <h2 className="text-lg font-semibold text-amber-900">
              Venta en apartado
            </h2>
          </div>
          <p className="text-sm text-amber-800 mb-4">
            Registre el abono inicial en la sección de métodos de pago. La
            mercancía queda reservada y el saldo restante se liquida en un
            pago futuro.
          </p>
          <Input
            label="Fecha límite de pago"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            hint="Fecha en que el cliente debe liquidar el saldo"
            required
          />
          <div className="mt-4 bg-white rounded-xl border border-amber-200 p-4">
            <p className="text-xs uppercase tracking-wider text-amber-700">
              Saldo pendiente
            </p>
            <p className="text-2xl font-bold text-amber-900 mt-1">
              {formatAmount(Math.max(apartadoBalance, 0), currencySymbol)}
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Total: {formatAmount(totalAmountDisplay, currencySymbol)} · Abono
              ingresado:{" "}
              {formatAmount(apartadoAmountDisplay, currencySymbol)}
            </p>
          </div>
        </div>
      )}

      {/* ── Payment splits panel ─────────────────────────────────────────── */}
      {step === "items" && (
        <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center font-semibold">
                3
              </span>
              <h2 className="text-lg font-semibold text-gray-900">
                Métodos de pago
              </h2>
            </div>
            <CashDrawerStatus />
          </div>

          {/* Partial payment checkbox */}
          {!usePoints && (
            <label className="flex items-center gap-3 cursor-pointer mb-6 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <input
                type="checkbox"
                checked={isPartialPayment}
                onChange={(e) => setIsPartialPayment(e.target.checked)}
                disabled={usePoints}
                className="w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span
                className={`text-sm font-medium ${usePoints ? "text-gray-500" : "text-gray-700"}`}
              >
                Pago por partes
              </span>
            </label>
          )}

          {usePoints ? (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 mt-1">
                    Se pagará todo el total con puntos de fidelidad
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-purple-600">Puntos a usar</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {pointsToRedeem.toLocaleString("es-CR")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* {isPartialPayment && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addPaymentSplit}
                  className="ml-auto"
                >
                  <IconPlus /> Agregar método
                </Button>
              )} */}
              {paymentSplits.map((split, idx) => (
                <div
                  key={split.id}
                  className="flex flex-col md:flex-row md:items-end gap-3"
                >
                  <div className="flex-1">
                    <Select
                      label={idx === 0 ? "Método de pago" : undefined}
                      disabled={isPartialPayment}
                      value={String(split.methodId)}
                      onChange={(e) =>
                        updatePaymentSplit(
                          split.id,
                          "methodId",
                          Number(e.target.value),
                        )
                      }
                      options={paymentOptions}
                    />
                  </div>
                  <div className="flex-1">
                    {idx === 0 && (
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          {Number(split.methodId) === 5
                            ? "Puntos a canjear"
                            : "Monto"}
                        </label>
                        {Number(split.methodId) === 5 &&
                        split.amount &&
                        pointsRate > 0 ? (
                          <span className="text-xs text-gray-600">
                            {(() => {
                              const pointsValue = parseFloat(split.amount);
                              const crcEquiv = round2(pointsValue / pointsRate);
                              return `≈ ${formatAmount(crcEquiv, "Bs.")}`;
                            })()}
                          </span>
                        ) : null}
                      </div>
                    )}
                    <Input
                      required
                      label={
                        idx !== 0
                          ? Number(split.methodId) === 5
                            ? "Puntos a canjear"
                            : "Monto"
                          : undefined
                      }
                      type="number"
                      min={0}
                      max={
                        Number(split.methodId) === 5
                          ? availablePoints
                          : undefined
                      }
                      step={Number(split.methodId) === 5 ? "1" : "0.01"}
                      placeholder={Number(split.methodId) === 5 ? "0" : "0.00"}
                      value={
                        Number(split.methodId) === 5 &&
                        split.amount &&
                        pointsRate > 0
                          ? String(
                              Math.round(parseFloat(split.amount) * pointsRate),
                            )
                          : split.amount
                      }
                      hint={
                        Number(split.methodId) === 5 &&
                        split.amount &&
                        parseFloat(split.amount) > 0
                          ? `Equivale a ${formatAmount(round2(parseFloat(split.amount)), "Bs.")}`
                          : undefined
                      }
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (Number(split.methodId) === 5 && pointsRate > 0) {
                          const pointsValue = parseFloat(newValue) || 0;
                          const amountInCurrency = round2(
                            pointsValue / pointsRate,
                          );
                          updatePaymentSplit(
                            split.id,
                            "amount",
                            String(amountInCurrency),
                          );
                        } else {
                          updatePaymentSplit(split.id, "amount", newValue);
                        }
                      }}
                    />
                    {/* {Number(split.methodId) === 5 &&
                    split.amount &&
                    pointsRate > 0 &&
                    idx !== 0 ? (
                      <div className="mt-1.5 text-xs text-gray-600">
                        {(() => {
                          const pointsValue = Math.round(
                            parseFloat(split.amount) * pointsRate,
                          );
                          return `${pointsValue.toLocaleString("es-CR")} puntos`;
                        })()}
                      </div>
                    ) : split.currencyId !== CRC_CURRENCY_ID &&
                      split.amount &&
                      Number(split.methodId) !== 5 ? (
                      <div className="mt-1.5 text-xs text-gray-500">
                        {(() => {
                          const equiv = convertSplitCurrencyToCrc(
                            split.id,
                            parseFloat(split.amount),
                          );
                          if (equiv !== null) {
                            return `≈ Bs. ${equiv.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;
                          }
                          return "Tasa no disponible";
                        })()}
                      </div>
                    ) : null} */}
                  </div>
                  <div className={`flex gap-2 ${idx === 0 ? "mb-0" : ""}`}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fillRemainder(split.id)}
                      title="Completar con el monto pendiente"
                    >
                      ↓
                    </Button>
                    {/* {paymentSplits.length > 1 && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removePaymentSplit(split.id)}
                      >
                        <IconTrash />
                      </Button>
                    )} */}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!usePoints && (
            <div
              className={`mt-4 flex flex-col gap-2 rounded-xl p-3 text-sm font-medium ${
                paymentBalance > 0.01
                  ? "bg-amber-50 border border-amber-200 text-amber-800"
                  : paymentBalance < -0.01
                    ? "bg-blue-50 border border-blue-200 text-blue-800"
                    : "bg-emerald-50 border border-emerald-200 text-emerald-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>
                  Total ingresado:{" "}
                  {formatAmount(splitTotalInSaleCurrency, currencySymbol)} /{" "}
                  {formatAmount(targetPayment, currencySymbol)}
                </span>
                {paymentBalance > 0.01 && (
                  <span>
                    Pendiente:{" "}
                    {formatAmount(Math.abs(paymentBalance), currencySymbol)}
                  </span>
                )}
                {paymentBalance < -0.01 && (
                  <span>
                    Vuelto:{" "}
                    {formatAmount(Math.abs(paymentBalance), currencySymbol)}
                  </span>
                )}
                {Math.abs(paymentBalance) < 0.01 && (
                  <span>Pagos cuadrados</span>
                )}
              </div>

              {isPartialPayment && paymentCurrenciesUsed.length > 1 && (
                <div className="text-xs border-t border-current opacity-60 pt-1">
                  Pago con múltiples monedas - el saldo pendiente se muestra en
                  la moneda de la compra ({currencySymbol})
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Submit row ────────────────────────────────────────────────────── */}
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
              {formatAmount(totalAmountDisplay, currencySymbol)}
            </span>
            <Button
              variant="primary"
              onClick={handleSubmitSale}
              loading={isSubmitting}
              disabled={
                (!customer && !isWalkInSale) ||
                items.length === 0 ||
                !branchId ||
                !cashRegisterId ||
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
        cartSubtotal={grossSubtotal}
        currencySymbol={currencySymbol}
        totalAmount={totalAmount}
        onClose={() => setIsPromotionModalOpen(false)}
        onApply={handleApplyPromotion}
        onAddRoyaltyItems={(royaltyItems) => {
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
              .map((ri) => ({
                ...ri,
                group_ids: [],
              })),
          ]);
        }}
      />

      <QuickCashRegisterModal
        isOpen={isCashRegisterModalOpen}
        branchId={branchId}
        branchName={branches.find((b) => b.branch_id === branchId)?.branch_name}
        onClose={() => setIsCashRegisterModalOpen(false)}
        onSessionsChanged={refreshOpenCashRegisters}
      />
    </div>
  );
}
