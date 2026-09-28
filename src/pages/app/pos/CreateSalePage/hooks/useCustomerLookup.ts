import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { customerApi } from "@/api/customer.api";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useUniqueAvailability,
  type UniqueAvailabilityStatus,
} from "@/hooks/useUniqueAvailability";
import { createCustomer } from "@/router/actions/customer.actions";
import { getCustomerByDocNumber } from "@/router/loaders/customer.loaders";
import type { Customer } from "@/interfaces/entities/Customer.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

import { blankCustomer, EMAIL_REGEX } from "../create-sale.constants";
import {
  customerLookupSchema,
  type CustomerLookupForm,
  inlineCustomerSchema,
  type InlineCustomerForm,
} from "../create-sale.schema";

interface UseCustomerLookupParams {
  tenantId: string;
  setStep: (step: "lookup" | "items") => void;
  setCustomer: (customer: Customer | null) => void;
  setIsWalkInSale: (value: boolean) => void;
  showToast: (mode: ToastMode, message: string) => void;
}

export interface UseCustomerLookupResult {
  lookupForm: ReturnType<typeof useForm<CustomerLookupForm>>;
  inlineCustomerForm: ReturnType<typeof useForm<InlineCustomerForm>>;
  showInlineCreate: boolean;
  isLookingUp: boolean;
  isCreatingCustomer: boolean;
  inlineDocStatus: UniqueAvailabilityStatus;
  inlineEmailStatus: UniqueAvailabilityStatus;
  inlinePhoneStatus: UniqueAvailabilityStatus;
  inlineUniquenessBlocked: boolean;
  inlineUniquenessProbing: boolean;
  handleInlineCreate: (data: InlineCustomerForm) => Promise<void>;
  startWalkInSale: () => void;
  changeCustomer: () => void;
  cancelInlineCreate: () => void;
  cancelWalkIn: () => void;
}

export function useCustomerLookup({
  tenantId,
  setStep,
  setCustomer,
  setIsWalkInSale,
  showToast,
}: UseCustomerLookupParams): UseCustomerLookupResult {
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

  const [showInlineCreate, setShowInlineCreateState] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

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

  useEffect(() => {
    const trimmed = debouncedDocNumber.trim();
    if (trimmed.length < 3) {
      setShowInlineCreateState(false);
      return;
    }

    let cancelled = false;
    setIsLookingUp(true);

    getCustomerByDocNumber(trimmed)
      .then((found) => {
        if (cancelled) return;
        if (found && (found as Customer).document_number) {
          setCustomer(found);
          setShowInlineCreateState(false);
          setStep("items");
          showToast(
            "success",
            `Cliente encontrado: ${found.first_name} ${found.last_name}`,
          );
        } else {
          inlineCustomerForm.reset({
            ...blankCustomer(),
            document_number: trimmed,
          });
          setShowInlineCreateState(true);
          showToast(
            "info",
            "Cliente no encontrado. Complete los datos para crearlo.",
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        inlineCustomerForm.reset({
          ...blankCustomer(),
          document_number: trimmed,
        });
        setShowInlineCreateState(true);
        showToast(
          "info",
          "Cliente no encontrado. Complete los datos para crearlo.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLookingUp(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDocNumber]);

  const handleInlineCreate = async (data: InlineCustomerForm) => {
    if (!tenantId) {
      showToast("error", "No se identificó el tenant");
      return;
    }
    if (inlineUniquenessBlocked) {
      showToast("error", "Hay datos del cliente que ya están registrados");
      return;
    }
    if (inlineUniquenessProbing) {
      showToast(
        "info",
        "Verificando disponibilidad… intenta de nuevo en un momento",
      );
      return;
    }
    setIsCreatingCustomer(true);
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
      setShowInlineCreateState(false);
      setStep("items");
      showToast("success", "Cliente creado correctamente");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Error al crear cliente",
      );
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const startWalkInSale = () => {
    setIsWalkInSale(true);
    setShowInlineCreateState(false);
    setStep("items");
    showToast(
      "info",
      "Venta de mostrador (sin cliente). Los puntos de fidelidad no aplican.",
    );
  };

  const changeCustomer = () => {
    setCustomer(null);
    setStep("lookup");
    setShowInlineCreateState(false);
    lookupForm.reset({ document_number: "" });
  };

  const cancelInlineCreate = () => setShowInlineCreateState(false);

  const cancelWalkIn = () => {
    setIsWalkInSale(false);
    setStep("lookup");
  };

  return {
    lookupForm,
    inlineCustomerForm,
    showInlineCreate,
    isLookingUp,
    isCreatingCustomer,
    inlineDocStatus,
    inlineEmailStatus,
    inlinePhoneStatus,
    inlineUniquenessBlocked,
    inlineUniquenessProbing,
    handleInlineCreate,
    startWalkInSale,
    changeCustomer,
    cancelInlineCreate,
    cancelWalkIn,
  };
}
