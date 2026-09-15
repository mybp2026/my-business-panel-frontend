import { useEffect, useState } from "react";

import { loyaltyApi } from "@/api/loyalty.api";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

import type { LoyaltyProgram } from "@/interfaces/entities/LoyaltyProgram.interface";

export function LoyaltyTab({ tenantId }: { tenantId: string }) {
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    points_earned_per_currency_unit: "",
    points_redeemed_per_currency_unit: "",
    minimum_purchase_for_points: "",
  });

  const loadPrograms = async () => {
    setIsLoading(true);
    loyaltyApi
      .getByTenant(tenantId)
      .then((data) => setPrograms(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error(error);
        setPrograms([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadPrograms();
  }, [tenantId]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const earned = parseFloat(form.points_earned_per_currency_unit);
    const redeemed = parseFloat(form.points_redeemed_per_currency_unit);
    if (!form.points_earned_per_currency_unit || isNaN(earned) || earned <= 0)
      errs.points_earned_per_currency_unit = "Debe ser mayor a 0";
    if (
      !form.points_redeemed_per_currency_unit ||
      isNaN(redeemed) ||
      redeemed <= 0
    )
      errs.points_redeemed_per_currency_unit = "Debe ser mayor a 0";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    try {
      await loyaltyApi.create({
        tenant_id: tenantId,
        points_earned_per_currency_unit: earned,
        points_redeemed_per_currency_unit: redeemed,
        minimum_purchase_for_points: form.minimum_purchase_for_points
          ? parseFloat(form.minimum_purchase_for_points)
          : undefined,
      });
      await loadPrograms();
      setForm({
        points_earned_per_currency_unit: "",
        points_redeemed_per_currency_unit: "",
        minimum_purchase_for_points: "",
      });
    } catch (error) {
      setErrors({
        points_earned_per_currency_unit:
          error instanceof Error ? error.message : "Error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (program: LoyaltyProgram) => {
    setIsTogglingActive(true);
    try {
      await loyaltyApi.update(program.loyalty_program_id, {
        is_active: !program.is_active,
      });
      await loadPrograms();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error");
    } finally {
      setIsTogglingActive(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este programa de lealtad?")) return;
    setIsDeleting(true);
    try {
      await loyaltyApi.delete(id);
      await loadPrograms();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error");
    } finally {
      setIsDeleting(false);
    }
  };

  const program = programs[0];

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="p-4 bg-amber-100 border border-amber-300 rounded-xl text-sm text-amber-800">
        <p className="font-semibold mb-1">¿Qué es el programa de lealtad?</p>
        <p>
          El programa de lealtad permite a tus clientes acumular{" "}
          <strong>puntos</strong> por cada compra y canjearlos en futuras
          transacciones. Puedes configurar cuántos puntos se otorgan por unidad
          de moneda gastada y cuántos puntos equivalen a una unidad de moneda al
          canjear. También puedes establecer un monto mínimo de compra para
          acumular puntos.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : program ? (
        <div className="border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <Badge variant={program.is_active ? "success" : "secondary"}>
              {program.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {program.points_earned_per_currency_unit}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Puntos por Bs. 1 gastado
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {program.points_redeemed_per_currency_unit}
              </p>
              <p className="text-xs text-gray-600 mt-1">Puntos = Bs. 1 de canje</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {program.minimum_purchase_for_points
                  ? `Bs. ${Number(program.minimum_purchase_for_points).toLocaleString("es-VE")}`
                  : "Sin mínimo"}
              </p>
              <p className="text-xs text-gray-600 mt-1">Compra mínima</p>
            </div>
          </div>
          <div className="flex gap-3">
            {program.is_active ? (
              <Button
                variant="warning"
                onClick={() => handleToggle(program)}
                loading={isTogglingActive}
                disabled={isDeleting}
              >
                Desactivar
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => handleToggle(program)}
                loading={isTogglingActive}
                disabled={isDeleting}
              >
                Activar
              </Button>
            )}
            <Button
              variant="danger"
              onClick={() => handleDelete(program.loyalty_program_id)}
              loading={isDeleting}
              disabled={isTogglingActive}
            >
              Eliminar
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-4 font-medium">
            Configurar nuevo programa de lealtad
          </p>
          <form onSubmit={handleActivate} className="space-y-4 max-w-lg">
            <Input
              label="Puntos otorgados por Bs. 1 gastado"
              type="number"
              placeholder="Ej: 1"
              step="0.01"
              min="0.01"
              value={form.points_earned_per_currency_unit}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  points_earned_per_currency_unit: e.target.value,
                }))
              }
              error={errors.points_earned_per_currency_unit}
              hint="Cantidad de puntos que gana el cliente por cada bolívar gastado"
              required
            />
            <Input
              label="Puntos necesarios para canjear Bs. 1"
              type="number"
              placeholder="Ej: 100"
              step="1"
              min="1"
              value={form.points_redeemed_per_currency_unit}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  points_redeemed_per_currency_unit: e.target.value,
                }))
              }
              error={errors.points_redeemed_per_currency_unit}
              hint="Cuántos puntos acumulados equivalen a Bs. 1 de descuento"
              required
            />
            <Input
              label="Monto mínimo de compra para acumular puntos (opcional)"
              type="number"
              placeholder="Ej: 5000"
              step="1"
              min="0"
              value={form.minimum_purchase_for_points}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  minimum_purchase_for_points: e.target.value,
                }))
              }
              hint="Dejar vacío para acumular puntos en cualquier compra"
            />
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Activar Programa de Lealtad
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}