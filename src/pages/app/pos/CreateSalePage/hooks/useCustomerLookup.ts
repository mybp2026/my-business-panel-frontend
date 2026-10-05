import { useCallback, useEffect, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { customerApi } from "@/api/customer.api";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useUniqueAvailability,
  type UniqueAvailabilityStatus,
} from "@/hooks/useUniqueAvailability";
import {
  createCustomer,
  updateCustomer,
} from "@/router/actions/customer.actions";
import { getCustomerByDocNumber } from "@/router/loaders/customer.loaders";
import { customerDisplayName, missingInvoiceFields } from "@/utils/customerInvoice";
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
  showToast: (mode: ToastMode, message: string) => void;
}

export interface UseCustomerLookupResult {
  lookupForm: ReturnType<typeof useForm<CustomerLookupForm>>;
  inlineCustomerForm: ReturnType<typeof useForm<InlineCustomerForm>>;
  showInlineCreate: boolean;
  /**
   * Cliente existente al que le faltan datos para facturar. Mientras esta
   * seteado el formulario inline actualiza ese cliente en lugar de crear uno.
   */
  customerToComplete: Customer | null;
  isLookingUp: boolean;
  isCreatingCustomer: boolean;
  inlineDocStatus: UniqueAvailabilityStatus;
  inlineEmailStatus: UniqueAvailabilityStatus;
  inlinePhoneStatus: UniqueAvailabilityStatus;
  inlineUniquenessBlocked: boolean;
  inlineUniquenessProbing: boolean;
  handleInlineCreate: (data: InlineCustomerForm) => Promise<void>;
  handleInlineInvalid: (errors: FieldErrors<InlineCustomerForm>) => void;
  changeCustomer: () => void;
  cancelInlineCreate: () => void;
}

const toInlineForm = (customer: Customer): InlineCustomerForm => ({
  first_name: customer.first_name ?? "",
  last_name: customer.last_name ?? "",
  business_name: customer.business_name ?? "",
  document_type_id: Number(customer.identification_type),
  document_number: customer.document_number,
  email: customer.email ?? "",
  phone: customer.phone ?? "",
  address: customer.address ?? "",
});

export function useCustomerLookup({
  tenantId,
  setStep,
  setCustomer,
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
  const [customerToComplete, setCustomerToComplete] = useState<Customer | null>(
    null,
  );
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const inlineDoc = inlineCustomerForm.watch("document_number") ?? "";
  const inlineEmail = inlineCustomerForm.watch("email") ?? "";
  const inlinePhone = inlineCustomerForm.watch("phone") ?? "";

  // Al completar un cliente existente sus propios datos no cuentan como
  // duplicados: se excluye su id de las sondas de unicidad.
  const excludeId = customerToComplete?.customer_id;

  const checkInlineDoc = useCallback(
    async (value: string) => {
      if (!tenantId) return false;
      const { exists } = await customerApi.checkAvailability({
        tenantId,
        field: "document_number",
        value,
        excludeId,
      });
      return exists;
    },
    [tenantId, excludeId],
  );

  const checkInlineEmail = useCallback(
    async (value: string) => {
      if (!tenantId) return false;
      const { exists } = await customerApi.checkAvailability({
        tenantId,
        field: "email",
        value,
        excludeId,
      });
      return exists;
    },
    [tenantId, excludeId],
  );

  const checkInlinePhone = useCallback(
    async (value: string) => {
      if (!tenantId) return false;
      const { exists } = await customerApi.checkAvailability({
        tenantId,
        field: "phone",
        value,
        excludeId,
      });
      return exists;
    },
    [tenantId, excludeId],
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
      setCustomerToComplete(null);
      return;
    }

    let cancelled = false;
    setIsLookingUp(true);

    const openCreateForm = () => {
      setCustomerToComplete(null);
      inlineCustomerForm.reset({
        ...blankCustomer(),
        document_number: trimmed,
      });
      setShowInlineCreateState(true);
      showToast(
        "info",
        "Cliente no encontrado. Complete los datos para crearlo.",
      );
    };

    getCustomerByDocNumber(trimmed)
      .then((found) => {
        if (cancelled) return;
        if (!found || !(found as Customer).document_number) {
          openCreateForm();
          return;
        }

        // La factura exige los datos del comprador: un cliente existente al
        // que le falta direccion o razon social no pasa a la venta hasta
        // completarlos.
        const missing = missingInvoiceFields(found);
        if (missing.length > 0) {
          setCustomerToComplete(found);
          inlineCustomerForm.reset(toInlineForm(found));
          setShowInlineCreateState(true);
          showToast(
            "info",
            `Complete los datos del cliente para facturar. Falta: ${missing.join(", ")}.`,
          );
          return;
        }

        setCustomerToComplete(null);
        setCustomer(found);
        setShowInlineCreateState(false);
        setStep("items");
        showToast("success", `Cliente encontrado: ${customerDisplayName(found)}`);
      })
      .catch(() => {
        if (cancelled) return;
        openCreateForm();
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
      let saved: Customer;

      if (customerToComplete) {
        const updated = await updateCustomer(customerToComplete.customer_id, {
          first_name: data.first_name,
          last_name: data.last_name,
          business_name: data.business_name?.trim() || undefined,
          email: data.email || undefined,
          phone: data.phone || undefined,
          address: data.address,
        });
        if (!updated?.customer_id) {
          throw new Error("No se pudo actualizar el cliente");
        }
        saved = { ...customerToComplete, ...updated };
      } else {
        saved = await createCustomer({
          tenant_id: tenantId,
          first_name: data.first_name,
          last_name: data.last_name,
          business_name: data.business_name?.trim() || undefined,
          document_type_id: Number(data.document_type_id),
          document_number: data.document_number,
          email: data.email || undefined,
          phone: data.phone || undefined,
          address: data.address,
          segment_id: 4,
        });
      }

      setCustomer(saved);
      setCustomerToComplete(null);
      setShowInlineCreateState(false);
      setStep("items");
      showToast(
        "success",
        customerToComplete
          ? "Datos del cliente actualizados"
          : "Cliente creado correctamente",
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Error al guardar el cliente",
      );
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Campos sin input propio (tipo de documento) o con el error fuera de vista
  // dejaban el submit en silencio: se avisa con el primer mensaje de error.
  const handleInlineInvalid = (errors: FieldErrors<InlineCustomerForm>) => {
    const [field, error] = Object.entries(errors)[0] ?? [];
    showToast(
      "error",
      error?.message
        ? String(error.message)
        : `Revise el campo "${field ?? "del cliente"}" antes de continuar`,
    );
  };

  const changeCustomer = () => {
    setCustomer(null);
    setCustomerToComplete(null);
    setStep("lookup");
    setShowInlineCreateState(false);
    lookupForm.reset({ document_number: "" });
  };

  const cancelInlineCreate = () => {
    setShowInlineCreateState(false);
    setCustomerToComplete(null);
  };

  return {
    lookupForm,
    inlineCustomerForm,
    showInlineCreate,
    customerToComplete,
    isLookingUp,
    isCreatingCustomer,
    inlineDocStatus,
    inlineEmailStatus,
    inlinePhoneStatus,
    inlineUniquenessBlocked,
    inlineUniquenessProbing,
    handleInlineCreate,
    handleInlineInvalid,
    changeCustomer,
    cancelInlineCreate,
  };
}
