import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { customerApi } from "@/api/customer.api";
import { updateCustomer } from "@/router/actions/customer.actions";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";

import { defaultCustomerSegments } from "@/constants/default-customer-segments";

import type { Customer } from "@/interfaces/entities/Customer.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

const searchSchema = z.object({
  search_term: z.string().min(1, "Ingresa un término de búsqueda"),
});

type SearchForm = z.infer<typeof searchSchema>;

interface QuickSegmentChangeModalProps {
  isOpen: boolean;
  tenantId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickSegmentChangeModal({
  isOpen,
  tenantId,
  onClose,
  onSuccess,
}: QuickSegmentChangeModalProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const searchForm = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: { search_term: "" },
  });

  const handleSearch = async (data: SearchForm) => {
    setIsSearching(true);
    try {
      const result = await customerApi.search(
        tenantId,
        data.search_term,
        1,
        10,
      );
      if (result.customers && result.customers.length > 0) {
        const found = result.customers[0];
        setCustomer(found);
        setSelectedSegmentId(String(found.segment_id ?? ""));
      } else {
        setToast({
          mode: "error",
          message: "No se encontró ningún cliente con ese criterio",
        });
        setCustomer(null);
      }
    } catch (error) {
      setToast({
        mode: "error",
        message: "Error al buscar cliente",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleChangeSegment = async () => {
    if (!customer || !selectedSegmentId) return;

    setIsUpdating(true);
    try {
      await updateCustomer(customer.customer_id, {
        segment_id: Number(selectedSegmentId),
      });
      setToast({
        mode: "success",
        message: `Segmento actualizado para ${customer.first_name} ${customer.last_name}`,
      });
      setTimeout(() => {
        setCustomer(null);
        searchForm.reset();
        setSelectedSegmentId("");
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (error) {
      setToast({
        mode: "error",
        message:
          error instanceof Error ? error.message : "Error al actualizar segmento",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setCustomer(null);
      searchForm.reset();
      setSelectedSegmentId("");
    }
  }, [isOpen, searchForm]);

  const currentSegmentName = customer
    ? defaultCustomerSegments.find((s) => String(s.value) === String(customer.segment_id))?.label ?? "Desconocido"
    : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cambiar segmento de cliente"
      size="md"
    >
      <div className="space-y-6">
        {!customer ? (
          <form
            onSubmit={searchForm.handleSubmit(handleSearch)}
            className="space-y-4"
          >
            <p className="text-sm text-gray-600">
              Busca un cliente por su número de documento, nombre o email para
              actualizar su segmento rápidamente.
            </p>
            <Input
              label="Buscar cliente"
              placeholder="Ej: 105550987, Juan Pérez, juan@example.com"
              {...searchForm.register("search_term")}
              error={searchForm.formState.errors.search_term?.message}
              required
            />
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                loading={isSearching}
                disabled={isSearching}
              >
                Buscar
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSearching}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs uppercase tracking-wider text-blue-600 mb-1">
                Cliente encontrado
              </p>
              <p className="text-lg font-semibold text-blue-900">
                {customer.first_name} {customer.last_name}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                {customer.document_number}
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Segmento actual</p>
                <p className="text-sm font-semibold text-gray-900">
                  {currentSegmentName}
                </p>
              </div>

              <Select
                label="Nuevo segmento"
                value={selectedSegmentId}
                onChange={(e) => setSelectedSegmentId(e.target.value)}
                options={defaultCustomerSegments.map((seg) => ({
                  value: String(seg.value),
                  label: seg.label,
                }))}
                required
              />
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCustomer(null);
                  searchForm.reset();
                  setSelectedSegmentId("");
                }}
                disabled={isUpdating}
              >
                Buscar otro
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="primary"
                onClick={handleChangeSegment}
                loading={isUpdating}
                disabled={isUpdating || !selectedSegmentId}
              >
                Actualizar segmento
              </Button>
            </div>
          </div>
        )}

        {toast && (
          <Toast
            mode={toast.mode}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </Modal>
  );
}
