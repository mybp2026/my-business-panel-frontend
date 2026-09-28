import { useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { customerApi } from "@/api/customer.api";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";

import { useUniqueAvailability } from "@/hooks/useUniqueAvailability";

import { identificationTypes } from "@/constants/identification-types";
import { defaultCustomerSegments } from "@/constants/default-customer-segments";

import type { Customer } from "@/interfaces/entities/Customer.interface";
import type { Tenant } from "@/interfaces/entities/Tenant.interface";
import type { CreateCustomerRequest } from "@/interfaces/api/requests/CreateCustomerRequest.interface";
import type { UpdateCustomerRequest } from "@/interfaces/api/requests/UpdateCustomerRequest.interface";

import {
  buildCustomerUpsertSchema,
  type CustomerUpsertFormData,
} from "./customer-upsert.schema";

interface CustomerUpsertModalProps {
  mode: "create" | "edit";
  isOpen: boolean;
  customer?: Customer;
  currentTenantId: string;
  tenants: Tenant[];
  isSuperAdmin: boolean;
  defaultSegmentId: number;
  onClose: () => void;
  onCreate: (data: CreateCustomerRequest) => void;
  onUpdate: (customerId: string, data: UpdateCustomerRequest) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CustomerUpsertModal({
  mode,
  isOpen,
  customer,
  currentTenantId,
  tenants,
  isSuperAdmin,
  defaultSegmentId,
  onClose,
  onCreate,
  onUpdate,
}: CustomerUpsertModalProps) {
  const isEditing = mode === "edit";
  const requireTenant = isSuperAdmin && !isEditing;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CustomerUpsertFormData>({
    resolver: zodResolver(buildCustomerUpsertSchema(requireTenant)) as any,
    defaultValues:
      isEditing && customer
        ? {
            first_name: customer.first_name,
            last_name: customer.last_name,
            document_type_id: customer.identification_type,
            document_number: customer.document_number,
            birthdate: customer.birthdate ?? "",
            economic_activity: customer.econ_activity ?? "",
            email: customer.email ?? "",
            phone: customer.phone ?? "",
            address: customer.address ?? "",
            city: customer.city ?? "",
            province: customer.province ?? "",
            postal_code: customer.postal_code ?? "",
            segment_id: customer.segment_id ? String(customer.segment_id) : "",
            tenant_id: "",
          }
        : {
            first_name: "",
            last_name: "",
            document_type_id: 1,
            document_number: "",
            birthdate: "",
            economic_activity: "",
            email: "",
            phone: "",
            address: "",
            city: "",
            province: "",
            postal_code: "",
            segment_id: String(defaultSegmentId),
            tenant_id: "",
          },
  });

  // The tenant scope of the unique probes: edit mode locks the customer's
  // tenant; create mode follows the form selector for superadmins (which can
  // be empty until they pick one).
  const watchedTenantId = watch("tenant_id");
  const probeTenantId = isEditing
    ? customer?.tenant_id ?? currentTenantId
    : isSuperAdmin
      ? watchedTenantId || ""
      : currentTenantId;

  const watchedDoc = watch("document_number") ?? "";
  const watchedEmail = watch("email") ?? "";
  const watchedPhone = watch("phone") ?? "";

  const excludeId = isEditing ? customer?.customer_id : undefined;

  const checkDoc = useCallback(
    async (value: string) => {
      if (!probeTenantId) return false;
      const { exists } = await customerApi.checkAvailability({
        tenantId: probeTenantId,
        field: "document_number",
        value,
        excludeId,
      });
      return exists;
    },
    [probeTenantId, excludeId],
  );

  const checkEmail = useCallback(
    async (value: string) => {
      if (!probeTenantId) return false;
      const { exists } = await customerApi.checkAvailability({
        tenantId: probeTenantId,
        field: "email",
        value,
        excludeId,
      });
      return exists;
    },
    [probeTenantId, excludeId],
  );

  const checkPhone = useCallback(
    async (value: string) => {
      if (!probeTenantId) return false;
      const { exists } = await customerApi.checkAvailability({
        tenantId: probeTenantId,
        field: "phone",
        value,
        excludeId,
      });
      return exists;
    },
    [probeTenantId, excludeId],
  );

  const docStatus = useUniqueAvailability(watchedDoc, checkDoc, {
    skip: isEditing || !probeTenantId,
    minLength: 3,
  });

  const emailStatus = useUniqueAvailability(watchedEmail, checkEmail, {
    skip: !probeTenantId || !watchedEmail,
    minLength: 5,
    isWellFormed: (value) => EMAIL_REGEX.test(value),
  });

  const phoneStatus = useUniqueAvailability(watchedPhone, checkPhone, {
    skip: !probeTenantId || !watchedPhone,
    minLength: 5,
  });

  const docHint = useMemo(() => {
    if (isEditing) {
      return "No se puede cambiar el documento de un cliente existente";
    }
    if (docStatus === "checking") return "Verificando disponibilidad…";
    if (docStatus === "available") return "Documento disponible";
    return undefined;
  }, [docStatus, isEditing]);

  const emailHint = useMemo(() => {
    if (!watchedEmail) return undefined;
    if (emailStatus === "checking") return "Verificando disponibilidad…";
    if (emailStatus === "available") return "Email disponible";
    return undefined;
  }, [emailStatus, watchedEmail]);

  const phoneHint = useMemo(() => {
    if (!watchedPhone) return undefined;
    if (phoneStatus === "checking") return "Verificando disponibilidad…";
    if (phoneStatus === "available") return "Teléfono disponible";
    return undefined;
  }, [phoneStatus, watchedPhone]);

  const docError =
    errors.document_number?.message ??
    (docStatus === "taken"
      ? "Ya existe un cliente con este documento"
      : undefined);

  const emailError =
    errors.email?.message ??
    (emailStatus === "taken"
      ? "Ya existe un cliente con este email"
      : undefined);

  const phoneError =
    phoneStatus === "taken"
      ? "Ya existe un cliente con este teléfono"
      : undefined;

  const hasUniquenessConflict =
    docStatus === "taken" ||
    emailStatus === "taken" ||
    phoneStatus === "taken";

  const isProbing =
    docStatus === "checking" ||
    emailStatus === "checking" ||
    phoneStatus === "checking";

  const onSubmit = (data: CustomerUpsertFormData) => {
    if (hasUniquenessConflict) return;

    const segmentId = data.segment_id ? Number(data.segment_id) : null;

    if (isEditing && customer) {
      onUpdate(customer.customer_id, {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        province: data.province || undefined,
        postal_code: data.postal_code || undefined,
        segment_id: segmentId,
      });
    } else {
      onCreate({
        tenant_id: isSuperAdmin ? (data.tenant_id || "") : currentTenantId,
        first_name: data.first_name,
        last_name: data.last_name,
        document_type_id: data.document_type_id,
        document_number: data.document_number,
        birthdate: data.birthdate || undefined,
        economic_activity: data.economic_activity || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        province: data.province || undefined,
        postal_code: data.postal_code || undefined,
        segment_id: segmentId,
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Cliente" : "Nuevo Cliente"}
      size="md"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 max-h-[80vh] overflow-y-auto pr-1"
      >
        {isSuperAdmin && !isEditing && (
          <Controller
            name="tenant_id"
            control={control}
            render={({ field }) => (
              <Select
                label="Empresa (Tenant)"
                value={field.value}
                onChange={field.onChange}
                name={field.name}
                options={tenants.map((t) => ({
                  value: t.tenant_id,
                  label: t.tenant_name,
                }))}
                error={errors.tenant_id?.message}
                required
              />
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nombre"
            placeholder="Ej: Juan"
            error={errors.first_name?.message}
            required
            {...register("first_name")}
          />
          <Input
            label="Apellido"
            placeholder="Ej: Pérez"
            error={errors.last_name?.message}
            required
            {...register("last_name")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="document_type_id"
            control={control}
            render={({ field }) => (
              <Select
                label="Tipo de Documento"
                value={String(field.value ?? "")}
                onChange={(e) => field.onChange(Number(e.target.value))}
                name={field.name}
                options={identificationTypes.map((t) => ({
                  value: String(t.value),
                  label: t.label,
                }))}
                error={errors.document_type_id?.message}
                disabled={isEditing}
                required
              />
            )}
          />
          <Input
            label="Número de Documento"
            placeholder="Ej: 123456789"
            error={docError}
            disabled={isEditing}
            required
            hint={docHint}
            {...register("document_number")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Fecha de Nacimiento"
            type="date"
            error={errors.birthdate?.message}
            {...register("birthdate")}
          />
          <Input
            label="Código Actividad Económica"
            placeholder="Ej: 123456"
            maxLength={6}
            error={errors.economic_activity?.message}
            {...register("economic_activity")}
          />
        </div>

        <Input
          label="Email"
          type="email"
          placeholder="cliente@ejemplo.com"
          error={emailError}
          hint={emailHint}
          {...register("email")}
        />

        <Input
          label="Teléfono"
          placeholder="+506 2234 5678"
          error={phoneError}
          hint={phoneHint}
          {...register("phone")}
        />

        <Input
          label="Dirección"
          placeholder="Calle principal, número 123"
          {...register("address")}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ciudad"
            placeholder="Ej: San José"
            {...register("city")}
          />
          <Input
            label="Provincia"
            placeholder="Ej: San José"
            {...register("province")}
          />
        </div>

        <Input
          label="Código Postal"
          placeholder="Ej: 10101"
          {...register("postal_code")}
        />

        <Controller
          name="segment_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Segmento"
              value={field.value}
              onChange={field.onChange}
              name={field.name}
              options={[
                { value: "", label: "Sin segmento" },
                ...defaultCustomerSegments,
              ]}
            />
          )}
        />

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={hasUniquenessConflict || isProbing}
          >
            {isEditing ? "Guardar Cambios" : "Crear Cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
