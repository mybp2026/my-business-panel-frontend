import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { IconPlus, IconUser } from "@/assets/icons";

import type { CustomerLookupSectionProps } from "./CustomerLookupSectionProps";

export function CustomerLookupSection({
  customer,
  step,
  isWalkInSale,
  isApartado,
  documentTypes,
  lookup,
}: CustomerLookupSectionProps) {
  const {
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
  } = lookup;

  return (
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
          <Button variant="ghost" size="sm" onClick={cancelWalkIn}>
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
            options={documentTypes.map((t) => ({
              value: String(t.identification_type_id),
              label: `${t.type_name} (${t.ident_code})`,
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
              onClick={cancelInlineCreate}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isCreatingCustomer}
              disabled={
                inlineUniquenessBlocked ||
                inlineUniquenessProbing ||
                isCreatingCustomer
              }
              title={
                inlineUniquenessBlocked
                  ? "Hay datos duplicados que deben corregirse"
                  : inlineUniquenessProbing
                    ? "Verificando disponibilidad…"
                    : undefined
              }
            >
              {!isCreatingCustomer && <IconPlus />}
              {isCreatingCustomer ? "Creando..." : "Crear cliente y continuar"}
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
          <Button variant="ghost" size="sm" onClick={changeCustomer}>
            Cambiar
          </Button>
        </div>
      )}
    </div>
  );
}
