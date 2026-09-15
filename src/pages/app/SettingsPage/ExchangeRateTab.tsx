import { useEffect, useMemo, useState } from "react";

import { currencyApi, exchangeRateApi } from "@/api";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/context/AuthContext";

import type { Currency } from "@/interfaces/entities/Currency.interface";
import type { ExchangeRate } from "@/interfaces/entities/ExchangeRate.interface";

const todayIso = () => new Date().toISOString().slice(0, 10);

export function ExchangeRateTab() {
  const { user } = useAuth();
  const canEdit =
    user?.role.role_name === "admin" || user?.role.role_name === "superuser";

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<string>("");

  const [form, setForm] = useState({
    from_currency_id: "",
    to_currency_id: "",
    rate: "",
    effective_date: todayIso(),
    source: "MANUAL",
  });

  const currencyOptions = useMemo(
    () =>
      currencies.map((c) => ({
        value: String(c.currency_id),
        label: `${c.currency_code} — ${c.currency_name}`,
      })),
    [currencies],
  );

  const reload = async () => {
    setIsLoading(true);
    try {
      const [currencyList, rateList] = await Promise.all([
        currencyApi.getAll(),
        exchangeRateApi.getAll(),
      ]);
      setCurrencies(currencyList);
      setRates(rateList);
    } catch (error) {
      console.error(error);
      setErrors({
        _form: error instanceof Error ? error.message : "Error cargando datos",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const errs: Record<string, string> = {};
    const fromId = Number(form.from_currency_id);
    const toId = Number(form.to_currency_id);
    const rateVal = parseFloat(form.rate);

    if (!fromId) errs.from_currency_id = "Selecciona una moneda origen";
    if (!toId) errs.to_currency_id = "Selecciona una moneda destino";
    if (fromId && toId && fromId === toId)
      errs.to_currency_id = "Debe ser diferente a la moneda origen";
    if (!form.rate || isNaN(rateVal) || rateVal <= 0)
      errs.rate = "Ingresa una tasa mayor a 0";
    if (!form.effective_date) errs.effective_date = "Fecha requerida";

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    try {
      await exchangeRateApi.create({
        from_currency_id: fromId,
        to_currency_id: toId,
        rate: rateVal,
        effective_date: form.effective_date,
        source: form.source.trim() || "MANUAL",
      });
      setForm((p) => ({
        ...p,
        rate: "",
        from_currency_id: "",
        to_currency_id: "",
        effective_date: todayIso(),
      }));
      await reload();
    } catch (error) {
      setErrors({
        _form: error instanceof Error ? error.message : "Error guardando tasa",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (rate: ExchangeRate) => {
    setEditingId(rate.exchange_rate_id);
    setEditingRate(String(rate.rate));
  };

  const handleSaveEdit = async (rate: ExchangeRate) => {
    const newRate = parseFloat(editingRate);
    if (isNaN(newRate) || newRate <= 0) {
      alert("Ingresa una tasa mayor a 0");
      return;
    }
    try {
      await exchangeRateApi.update(rate.exchange_rate_id, { rate: newRate });
      setEditingId(null);
      setEditingRate("");
      await reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error actualizando tasa");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingRate("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este registro de tasa de cambio?")) return;
    try {
      await exchangeRateApi.delete(id);
      await reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error eliminando tasa");
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-100 border border-blue-300 rounded-xl text-sm text-blue-800">
        <p className="font-semibold mb-1">¿Para qué sirven las tasas de cambio?</p>
        <p>
          Las tasas de cambio permiten convertir montos entre monedas (por
          ejemplo, dólares estadounidenses a bolívares) en ventas y
          pagos. Solo los administradores pueden crear, modificar o eliminar
          registros. La tasa se aplica por moneda origen, moneda destino y fecha
          efectiva.
        </p>
      </div>

      {errors._form && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errors._form}
        </div>
      )}

      {canEdit && (
        <div>
          <p className="text-sm text-gray-600 mb-4 font-medium">
            Registrar nueva tasa de cambio
          </p>
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl"
          >
            <Select
              label="Moneda origen"
              value={form.from_currency_id}
              onChange={(e) =>
                setForm((p) => ({ ...p, from_currency_id: e.target.value }))
              }
              options={currencyOptions}
              placeholder="Selecciona moneda"
              error={errors.from_currency_id}
              required
            />
            <Select
              label="Moneda destino"
              value={form.to_currency_id}
              onChange={(e) =>
                setForm((p) => ({ ...p, to_currency_id: e.target.value }))
              }
              options={currencyOptions}
              placeholder="Selecciona moneda"
              error={errors.to_currency_id}
              required
            />
            <Input
              label="Tasa (1 unidad origen = X unidades destino)"
              type="number"
              step="0.000001"
              min="0.000001"
              placeholder="Ej: 510.50"
              value={form.rate}
              onChange={(e) =>
                setForm((p) => ({ ...p, rate: e.target.value }))
              }
              error={errors.rate}
              required
            />
            <Input
              label="Fecha efectiva"
              type="date"
              value={form.effective_date}
              onChange={(e) =>
                setForm((p) => ({ ...p, effective_date: e.target.value }))
              }
              error={errors.effective_date}
              required
            />
            <Input
              label="Fuente"
              placeholder="MANUAL"
              value={form.source}
              onChange={(e) =>
                setForm((p) => ({ ...p, source: e.target.value }))
              }
              hint="Origen del dato (ej: MANUAL, BCCR, API)"
            />
            <div className="flex items-end">
              <Button type="submit" variant="primary" loading={isSubmitting}>
                Guardar tasa
              </Button>
            </div>
          </form>
        </div>
      )}

      <div>
        <p className="text-sm text-gray-600 mb-3 font-medium">
          Tasas de cambio registradas
        </p>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
          </div>
        ) : rates.length === 0 ? (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
            No hay tasas registradas todavía.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Origen</th>
                  <th className="text-left px-4 py-3 font-medium">Destino</th>
                  <th className="text-right px-4 py-3 font-medium">Tasa</th>
                  <th className="text-left px-4 py-3 font-medium">
                    Fecha efectiva
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Fuente</th>
                  {canEdit && (
                    <th className="text-right px-4 py-3 font-medium">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rates.map((rate) => {
                  const isEditing = editingId === rate.exchange_rate_id;
                  return (
                    <tr key={rate.exchange_rate_id} className="bg-white">
                      <td className="px-4 py-3">
                        {rate.from_currency_code}{" "}
                        <span className="text-gray-400">
                          ({rate.from_currency_symbol})
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {rate.to_currency_code}{" "}
                        <span className="text-gray-400">
                          ({rate.to_currency_symbol})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.000001"
                            min="0.000001"
                            value={editingRate}
                            onChange={(e) => setEditingRate(e.target.value)}
                            className="w-32 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
                          />
                        ) : (
                          Number(rate.rate).toLocaleString("es-CR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {String(rate.effective_date).slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {rate.source ?? "MANUAL"}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleSaveEdit(rate)}
                                >
                                  Guardar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                >
                                  Cancelar
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleStartEdit(rate)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() =>
                                    handleDelete(rate.exchange_rate_id)
                                  }
                                >
                                  Eliminar
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
