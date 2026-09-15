import { useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";

import { royaltyApi } from "@/api/royalty.api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";

import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";
import type {
  TenantProductGroup,
  TenantProductGroupType,
} from "@/interfaces/entities/ProductGroup.interface";
import type {
  RoyaltyOption,
  RoyaltyRule,
} from "@/interfaces/entities/Royalty.interface";
import type { RoyaltiesPageLoaderData } from "@/router/loaders/royalties.loaders";

const fmt = (v: number) =>
  `Bs. ${Number(v).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;

export function RoyaltiesPage() {
  const {
    rules: initialRules,
    productGroups,
    productGroupTypes,
    tenantId,
  } = useLoaderData() as RoyaltiesPageLoaderData;

  const [rules, setRules] = useState<RoyaltyRule[]>(initialRules);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ mode: ToastMode; message: string } | null>(
    null,
  );

  const [showNewRule, setShowNewRule] = useState(false);
  const [newRuleAmount, setNewRuleAmount] = useState("");
  const [isSavingRule, setIsSavingRule] = useState(false);

  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, number>>({});

  const selectedRule =
    rules.find((r) => r.royalty_rule_id === selectedRuleId) ?? null;

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => a.min_amount - b.min_amount),
    [rules],
  );

  const groupById = useMemo(() => {
    const m = new Map<string, TenantProductGroup>();
    for (const g of productGroups) m.set(g.tenant_product_group_id, g);
    return m;
  }, [productGroups]);

  const childrenOf = useMemo(() => {
    const m = new Map<string | null, TenantProductGroup[]>();
    for (const g of productGroups) {
      if (!g.is_active) continue;
      const key = g.parent_group_id ?? null;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(g);
    }
    for (const arr of m.values())
      arr.sort((a, b) => a.group_name.localeCompare(b.group_name));
    return m;
  }, [productGroups]);

  const activeTypes = useMemo<TenantProductGroupType[]>(
    () => productGroupTypes.filter((t) => t.is_active),
    [productGroupTypes],
  );

  // Dimensions actually attached to the selected rule
  const ruleDimensionTypeIds = useMemo(() => {
    if (!selectedRule) return new Set<string>();
    return new Set(
      selectedRule.dimensions.map((d) => d.tenant_product_group_type_id),
    );
  }, [selectedRule]);

  const ruleActiveTypes = useMemo<TenantProductGroupType[]>(
    () =>
      activeTypes.filter((t) =>
        ruleDimensionTypeIds.has(t.tenant_product_group_type_id),
      ),
    [activeTypes, ruleDimensionTypeIds],
  );

  // Effective tab: pick a still-active dimension
  const effectiveTypeId =
    activeTypeId &&
    ruleActiveTypes.some((t) => t.tenant_product_group_type_id === activeTypeId)
      ? activeTypeId
      : ruleActiveTypes[0]?.tenant_product_group_type_id ?? null;

  const optionByGroupId = useMemo(() => {
    const m = new Map<string, RoyaltyOption>();
    if (selectedRule) {
      for (const o of selectedRule.options) m.set(o.tenant_product_group_id, o);
    }
    return m;
  }, [selectedRule]);

  const ancestorCoverage = (groupId: string): RoyaltyOption | null => {
    let current = groupById.get(groupId);
    while (current?.parent_group_id) {
      const parentOpt = optionByGroupId.get(current.parent_group_id);
      if (parentOpt) return parentOpt;
      current = groupById.get(current.parent_group_id);
    }
    return null;
  };

  const notify = (mode: ToastMode, message: string) =>
    setToast({ mode, message });

  // ── API helpers ─────────────────────────────────────────────────────────────

  const reloadRules = async () => {
    const fresh = await royaltyApi.listRules(tenantId);
    setRules(fresh);
    return fresh;
  };

  // ── Rule actions ────────────────────────────────────────────────────────────

  const handleCreateRule = async () => {
    const amount = parseFloat(newRuleAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      notify("error", "Ingresa un monto valido mayor a 0");
      return;
    }
    setIsSavingRule(true);
    try {
      const created = await royaltyApi.createRule(tenantId, amount);

      const predecessor = [...rules]
        .filter((r) => r.min_amount < amount)
        .sort((a, b) => b.min_amount - a.min_amount)[0];

      if (predecessor) {
        // Inherit dimensions from predecessor (if any)
        if (predecessor.dimensions.length > 0) {
          await royaltyApi.setRuleDimensions(
            created.royalty_rule_id,
            predecessor.dimensions.map((d) => d.tenant_product_group_type_id),
          );
        }
        // Inherit options from predecessor
        for (const opt of predecessor.options) {
          await royaltyApi.createOption({
            royalty_rule_id: created.royalty_rule_id,
            tenant_product_group_id: opt.tenant_product_group_id,
            quantity: opt.quantity,
          });
        }
      }

      await reloadRules();
      setSelectedRuleId(created.royalty_rule_id);
      setShowNewRule(false);
      setNewRuleAmount("");
      notify(
        "success",
        predecessor && predecessor.options.length > 0
          ? `Regla creada con ${predecessor.options.length} grupo(s) heredados`
          : "Regla de regalia creada",
      );
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Error al crear regla");
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (
      !confirm("Eliminar esta regla de regalia? Esta accion no se puede deshacer.")
    )
      return;
    try {
      await royaltyApi.deleteRule(ruleId);
      const fresh = await reloadRules();
      if (selectedRuleId === ruleId) {
        setSelectedRuleId(fresh[0]?.royalty_rule_id ?? null);
      }
      notify("success", "Regla eliminada");
    } catch (e) {
      notify(
        "error",
        e instanceof Error ? e.message : "Error al eliminar regla",
      );
    }
  };

  // ── Dimension toggle ────────────────────────────────────────────────────────

  const handleToggleDimension = async (
    typeId: string,
    enable: boolean,
  ) => {
    if (!selectedRule) return;
    const currentIds = selectedRule.dimensions.map(
      (d) => d.tenant_product_group_type_id,
    );
    const nextIds = enable
      ? Array.from(new Set([...currentIds, typeId]))
      : currentIds.filter((id) => id !== typeId);

    if (!enable && selectedRule.options.some((o) => o.tenant_product_group_type_id === typeId)) {
      if (
        !confirm(
          "Desactivar esta dimension eliminara todos sus grupos seleccionados. Continuar?",
        )
      ) {
        return;
      }
    }

    try {
      await royaltyApi.setRuleDimensions(selectedRule.royalty_rule_id, nextIds);
      await reloadRules();
      if (!enable && activeTypeId === typeId) setActiveTypeId(null);
    } catch (e) {
      notify(
        "error",
        e instanceof Error ? e.message : "Error al actualizar dimensiones",
      );
    }
  };

  // ── Option actions ──────────────────────────────────────────────────────────

  const handleToggleGroup = async (
    group: TenantProductGroup,
    enable: boolean,
  ) => {
    if (!selectedRule) return;
    try {
      if (enable) {
        await royaltyApi.createOption({
          royalty_rule_id: selectedRule.royalty_rule_id,
          tenant_product_group_id: group.tenant_product_group_id,
          quantity: 1,
        });
      } else {
        const opt = optionByGroupId.get(group.tenant_product_group_id);
        if (!opt) return;
        await royaltyApi.deleteOption(opt.royalty_option_id);
      }
      await reloadRules();
    } catch (e) {
      notify(
        "error",
        e instanceof Error ? e.message : "Error al actualizar grupo",
      );
    }
  };

  const handleQuantityCommit = async (opt: RoyaltyOption) => {
    const draft = quantityDrafts[opt.royalty_option_id];
    if (draft === undefined || draft === opt.quantity) return;
    const next = Math.max(1, Math.floor(draft));
    try {
      await royaltyApi.updateOption(opt.royalty_option_id, { quantity: next });
      setQuantityDrafts((prev) => {
        const { [opt.royalty_option_id]: _omit, ...rest } = prev;
        void _omit;
        return rest;
      });
      await reloadRules();
    } catch (e) {
      notify(
        "error",
        e instanceof Error ? e.message : "Error al actualizar cantidad",
      );
    }
  };

  // ── Group tree row ─────────────────────────────────────────────────────────

  const renderGroup = (
    group: TenantProductGroup,
    depth: number,
  ): React.ReactNode => {
    const opt = optionByGroupId.get(group.tenant_product_group_id);
    const inheritedFrom = !opt ? ancestorCoverage(group.tenant_product_group_id) : null;
    const inheritedFromGroup = inheritedFrom
      ? groupById.get(inheritedFrom.tenant_product_group_id)
      : null;
    const children = childrenOf.get(group.tenant_product_group_id) ?? [];
    const draftQty = opt ? quantityDrafts[opt.royalty_option_id] ?? opt.quantity : 1;

    return (
      <div key={group.tenant_product_group_id} className="flex flex-col">
        <div
          className={`flex items-center gap-3 py-2 px-3 rounded-lg border ${
            opt
              ? "border-blue-300 bg-blue-50"
              : inheritedFrom
                ? "border-amber-200 bg-amber-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
          style={{ marginLeft: depth * 20 }}
        >
          <input
            type="checkbox"
            disabled={!!inheritedFrom}
            checked={!!opt}
            onChange={(e) =>
              void handleToggleGroup(group, e.target.checked)
            }
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-sm font-medium ${
                  inheritedFrom ? "text-amber-800" : "text-gray-800"
                }`}
              >
                {group.group_name}
              </span>
              {children.length > 0 && (
                <Badge variant="secondary">
                  {children.length} subgrupo{children.length !== 1 ? "s" : ""}
                </Badge>
              )}
              {inheritedFrom && (
                <span className="text-xs text-amber-700">
                  Heredado de {inheritedFromGroup?.group_name ?? "grupo padre"}
                </span>
              )}
            </div>
          </div>
          {opt && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Cantidad</label>
              <input
                type="number"
                min={1}
                step={1}
                value={draftQty}
                onChange={(e) =>
                  setQuantityDrafts((prev) => ({
                    ...prev,
                    [opt.royalty_option_id]: parseInt(e.target.value) || 1,
                  }))
                }
                onBlur={() => void handleQuantityCommit(opt)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleQuantityCommit(opt);
                }}
                className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
        {children.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            {children.map((child) => renderGroup(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootGroupsForActiveType = useMemo(() => {
    if (!effectiveTypeId) return [];
    return (childrenOf.get(null) ?? []).filter(
      (g) => g.tenant_product_group_type_id === effectiveTypeId,
    );
  }, [childrenOf, effectiveTypeId]);

  const optionsByTypeId = useMemo(() => {
    const m = new Map<string, number>();
    if (selectedRule) {
      for (const o of selectedRule.options) {
        m.set(
          o.tenant_product_group_type_id,
          (m.get(o.tenant_product_group_type_id) ?? 0) + 1,
        );
      }
    }
    return m;
  }, [selectedRule]);

  return (
    <div className="p-6 lg:p-8">
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Regalias</h1>
        <p className="text-gray-600">
          Configura bonificaciones automaticas para clientes mayoristas segun
          monto de compra. Cada regla puede aplicar a multiples dimensiones; en
          cada dimension se eligen los grupos (los subgrupos se heredan).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: rules list ─────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-2xl border border-gray-300 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Escalas de monto
              </h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setShowNewRule((v) => !v);
                  setNewRuleAmount("");
                }}
              >
                {showNewRule ? "Cancelar" : "+ Nueva"}
              </Button>
            </div>

            {showNewRule && (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-2">
                <Input
                  label="Monto minimo (Bs.)"
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="0.00"
                  value={newRuleAmount}
                  onChange={(e) => setNewRuleAmount(e.target.value)}
                />
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  loading={isSavingRule}
                  onClick={handleCreateRule}
                  disabled={!newRuleAmount || isSavingRule}
                >
                  Crear regla
                </Button>
              </div>
            )}

            {sortedRules.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Sin reglas configuradas
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {sortedRules.map((rule) => (
                  <button
                    key={rule.royalty_rule_id}
                    onClick={() => {
                      setSelectedRuleId(rule.royalty_rule_id);
                      setQuantityDrafts({});
                      setActiveTypeId(null);
                    }}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                      selectedRuleId === rule.royalty_rule_id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 text-sm">
                        {fmt(rule.min_amount)}
                      </span>
                      <Badge variant="secondary">
                        {rule.dimensions.length} dim
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {rule.options.length} grupo
                      {rule.options.length !== 1 ? "s" : ""} seleccionado
                      {rule.options.length !== 1 ? "s" : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: rule editor ───────────────────────────── */}
        <div className="lg:col-span-2">
          {!selectedRule ? (
            <div className="bg-white rounded-2xl border border-gray-300 p-8 flex items-center justify-center">
              <p className="text-gray-400 text-sm">
                Selecciona una regla para editarla
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-300 p-6 flex flex-col gap-6">
              {/* Rule header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Regla: {fmt(selectedRule.min_amount)}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    El cliente aplica{" "}
                    <span className="font-medium">
                      floor(compra / {fmt(selectedRule.min_amount)})
                    </span>{" "}
                    veces a esta regla.
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    void handleDeleteRule(selectedRule.royalty_rule_id)
                  }
                >
                  Eliminar regla
                </Button>
              </div>

              {/* Dimension toggle bank */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Dimensiones que aplican
                </p>
                {activeTypes.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No hay dimensiones activas en el tenant.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeTypes.map((t) => {
                      const enabled = ruleDimensionTypeIds.has(
                        t.tenant_product_group_type_id,
                      );
                      const count =
                        optionsByTypeId.get(t.tenant_product_group_type_id) ?? 0;
                      return (
                        <button
                          key={t.tenant_product_group_type_id}
                          type="button"
                          onClick={() =>
                            void handleToggleDimension(
                              t.tenant_product_group_type_id,
                              !enabled,
                            )
                          }
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            enabled
                              ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                              : "bg-white text-gray-600 border-gray-300 hover:border-emerald-400"
                          }`}
                        >
                          <span className="mr-1">{enabled ? "x" : "+"}</span>
                          {t.type_name}
                          {enabled && count > 0 && (
                            <span className="ml-2 text-xs rounded-full px-1.5 bg-white/20 text-white">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dimension tabs + group tree */}
              {ruleActiveTypes.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Activa al menos una dimension para configurar grupos.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
                    {ruleActiveTypes.map((t) => {
                      const active =
                        t.tenant_product_group_type_id === effectiveTypeId;
                      const count =
                        optionsByTypeId.get(t.tenant_product_group_type_id) ?? 0;
                      return (
                        <button
                          key={t.tenant_product_group_type_id}
                          type="button"
                          onClick={() =>
                            setActiveTypeId(t.tenant_product_group_type_id)
                          }
                          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            active
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                          }`}
                        >
                          {t.type_name}
                          {count > 0 && (
                            <span
                              className={`ml-2 text-xs rounded-full px-1.5 ${
                                active
                                  ? "bg-white/20 text-white"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-gray-500 mb-1">
                      Marca los grupos que aplican. Al marcar un grupo padre,
                      sus subgrupos se incluyen automaticamente. Solo
                      productos con regalable = true reciben regalia.
                    </p>
                    {rootGroupsForActiveType.length === 0 ? (
                      <p className="text-sm text-gray-400 py-3">
                        Sin grupos activos en esta dimension
                      </p>
                    ) : (
                      rootGroupsForActiveType.map((g) => renderGroup(g, 0))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
