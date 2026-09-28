import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { attributeValueApi, tenantAttributeApi } from "@/api/attribute.api";
import { productGroupApi, productGroupTypeApi } from "@/api/productGroup.api";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";

import type {
  AttributeValue,
  TenantAttribute,
} from "@/interfaces/entities/Attribute.interface";
import type {
  TenantProductGroup,
  TenantProductGroupType,
} from "@/interfaces/entities/ProductGroup.interface";
import type { ToastMode } from "@/interfaces/components/ui/ToastProps.interface";

type Tab = "attributes" | "groups";

export function AttributesPage() {
  const { user } = useAuth();
  const tenantId = user?.tenant.tenant_id ?? "";

  const [tab, setTab] = useState<Tab>("attributes");
  const [toast, setToast] = useState<{
    mode: ToastMode;
    message: string;
  } | null>(null);

  const showError = useCallback((err: unknown, fallback: string) => {
    setToast({
      mode: "error",
      message: err instanceof Error ? err.message : fallback,
    });
  }, []);
  const showSuccess = useCallback(
    (message: string) => setToast({ mode: "success", message }),
    [],
  );

  if (!tenantId) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Cargando información del tenant...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {toast && (
        <Toast
          mode={toast.mode}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <PageHeaderBanner
        eyebrow="General"
        title="Atributos y Clasificación"
        description="Define atributos (color, talla, marca, ...) con sus valores y clasifica tus productos por dimensiones (Departamento, Familia, Marca, ...)."
      />

      <nav className="mb-6 inline-flex border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setTab("attributes")}
          className={[
            "px-4 py-2 text-sm font-medium transition-colors",
            tab === "attributes"
              ? "bg-accent-500 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50",
          ].join(" ")}
        >
          Atributos y valores
        </button>
        <button
          type="button"
          onClick={() => setTab("groups")}
          className={[
            "px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200",
            tab === "groups"
              ? "bg-accent-500 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50",
          ].join(" ")}
        >
          Dimensiones y grupos
        </button>
      </nav>

      {tab === "attributes" ? (
        <AttributesSection
          tenantId={tenantId}
          onError={showError}
          onSuccess={showSuccess}
        />
      ) : (
        <GroupsSection
          tenantId={tenantId}
          onError={showError}
          onSuccess={showSuccess}
        />
      )}
    </div>
  );
}

// ─── Attributes section ────────────────────────────────────────────────────────

interface SectionProps {
  tenantId: string;
  onError: (err: unknown, fallback: string) => void;
  onSuccess: (message: string) => void;
}

function AttributesSection({ tenantId, onError, onSuccess }: SectionProps) {
  const [attributes, setAttributes] = useState<TenantAttribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newAttrName, setNewAttrName] = useState("");
  const [selectedAttrId, setSelectedAttrId] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const data = await tenantAttributeApi.listByTenant(tenantId);
      setAttributes(data);
      if (
        selectedAttrId &&
        !data.some((a) => a.tenant_attribute_id === selectedAttrId)
      ) {
        setSelectedAttrId(null);
      }
    } catch (err) {
      onError(err, "Error al cargar atributos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const createAttribute = async () => {
    const name = newAttrName.trim();
    if (!name) return;
    try {
      const created = await tenantAttributeApi.createCustom(tenantId, name);
      setAttributes((prev) => [...prev, created]);
      setNewAttrName("");
      onSuccess("Atributo creado");
    } catch (err) {
      onError(err, "Error al crear atributo");
    }
  };

  const removeAttribute = async (id: string) => {
    if (!confirm("¿Eliminar este atributo? Sus valores se borrarán.")) return;
    try {
      await tenantAttributeApi.remove(tenantId, id);
      setAttributes((prev) => prev.filter((a) => a.tenant_attribute_id !== id));
      if (selectedAttrId === id) setSelectedAttrId(null);
      onSuccess("Atributo eliminado");
    } catch (err) {
      onError(err, "Error al eliminar atributo");
    }
  };

  const renameAttribute = async (id: string, currentName: string) => {
    const next = prompt("Nuevo nombre del atributo:", currentName);
    if (!next || next.trim() === currentName) return;
    try {
      const updated = await tenantAttributeApi.update(
        tenantId,
        id,
        next.trim(),
      );
      setAttributes((prev) =>
        prev.map((a) => (a.tenant_attribute_id === id ? updated : a)),
      );
      onSuccess("Atributo actualizado");
    } catch (err) {
      onError(err, "Error al actualizar atributo");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Attributes list */}
      <section className="lg:col-span-1 bg-white rounded-2xl border border-gray-300 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Atributos del tenant
        </h2>

        <div className="flex gap-2 mb-4">
          <Input
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createAttribute();
              }
            }}
            placeholder="Nuevo atributo (ej: Color)"
          />
          <Button
            type="button"
            variant="primary"
            onClick={createAttribute}
            disabled={!newAttrName.trim()}
          >
            +
          </Button>
        </div>

        {isLoading ? (
          <p className="text-xs text-gray-500">Cargando...</p>
        ) : attributes.length === 0 ? (
          <p className="text-xs text-gray-500">
            Aún no hay atributos. Crea uno arriba.
          </p>
        ) : (
          <ul className="space-y-1">
            {attributes.map((a) => {
              const isSelected = selectedAttrId === a.tenant_attribute_id;
              return (
                <li key={a.tenant_attribute_id}>
                  <div
                    className={[
                      "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                      isSelected
                        ? "bg-accent-50 border border-accent-200"
                        : "hover:bg-gray-50 border border-transparent",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedAttrId(a.tenant_attribute_id)}
                      className="flex-1 text-left flex items-center gap-2 min-w-0"
                    >
                      <span className="truncate font-medium text-gray-800">
                        {a.attribute_name}
                      </span>
                      <span
                        className={[
                          "text-[10px] font-mono px-1.5 py-0.5 rounded",
                          a.is_custom
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700",
                        ].join(" ")}
                      >
                        {a.is_custom ? "Custom" : "Global"}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() =>
                          renameAttribute(
                            a.tenant_attribute_id,
                            a.attribute_name,
                          )
                        }
                        className="text-gray-400 hover:text-gray-700"
                        aria-label="Renombrar"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAttribute(a.tenant_attribute_id)}
                        className="text-gray-400 hover:text-red-600"
                        aria-label="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Values panel */}
      <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-300 p-5">
        {selectedAttrId ? (
          <AttributeValuesPanel
            tenantId={tenantId}
            tenantAttributeId={selectedAttrId}
            attributeName={
              attributes.find((a) => a.tenant_attribute_id === selectedAttrId)
                ?.attribute_name ?? ""
            }
            onError={onError}
            onSuccess={onSuccess}
          />
        ) : (
          <p className="text-sm text-gray-500">
            Selecciona un atributo a la izquierda para gestionar sus valores.
          </p>
        )}
      </section>
    </div>
  );
}

interface AttributeValuesPanelProps extends SectionProps {
  tenantAttributeId: string;
  attributeName: string;
}

function AttributeValuesPanel({
  tenantId,
  tenantAttributeId,
  attributeName,
  onError,
  onSuccess,
}: AttributeValuesPanelProps) {
  const [values, setValues] = useState<AttributeValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    attributeValueApi
      .listByAttribute(tenantId, tenantAttributeId)
      .then((data) => {
        if (!cancelled) setValues(data);
      })
      .catch((err) => {
        if (!cancelled) onError(err, "Error al cargar valores");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, tenantAttributeId, onError]);

  const create = async () => {
    const v = newValue.trim();
    if (!v) return;
    try {
      const created = await attributeValueApi.create(
        tenantId,
        tenantAttributeId,
        v,
      );
      setValues((prev) => [...prev, created]);
      setNewValue("");
      onSuccess("Valor creado");
    } catch (err) {
      onError(err, "Error al crear valor");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este valor?")) return;
    try {
      await attributeValueApi.remove(tenantId, id);
      setValues((prev) => prev.filter((v) => v.attribute_value_id !== id));
      onSuccess("Valor eliminado");
    } catch (err) {
      onError(err, "Error al eliminar valor");
    }
  };

  const rename = async (id: string, currentValue: string) => {
    const next = prompt("Nuevo valor:", currentValue);
    if (!next || next.trim() === currentValue) return;
    try {
      const updated = await attributeValueApi.update(tenantId, id, next.trim());
      setValues((prev) =>
        prev.map((v) => (v.attribute_value_id === id ? updated : v)),
      );
      onSuccess("Valor actualizado");
    } catch (err) {
      onError(err, "Error al actualizar valor");
    }
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900 mb-1">
        Valores de &ldquo;{attributeName}&rdquo;
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Estos valores serán seleccionables al asignar el atributo a un producto.
      </p>

      <div className="flex gap-2 mb-4">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              create();
            }
          }}
          placeholder="Nuevo valor (ej: Rojo, XL)"
        />
        <Button
          type="button"
          variant="primary"
          onClick={create}
          disabled={!newValue.trim()}
        >
          +
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-500">Cargando...</p>
      ) : values.length === 0 ? (
        <p className="text-xs text-gray-500">Aún no hay valores.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <div
              key={v.attribute_value_id}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50"
            >
              <span className="text-sm text-gray-800">{v.value}</span>
              <button
                type="button"
                onClick={() => rename(v.attribute_value_id, v.value)}
                className="text-gray-400 hover:text-gray-700 text-xs"
                aria-label="Renombrar"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => remove(v.attribute_value_id)}
                className="text-gray-400 hover:text-red-600 text-xs"
                aria-label="Eliminar"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Groups section ────────────────────────────────────────────────────────────

function GroupsSection({ tenantId, onError, onSuccess }: SectionProps) {
  const [types, setTypes] = useState<TenantProductGroupType[]>([]);
  const [groups, setGroups] = useState<TenantProductGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTypeName, setNewTypeName] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupParent, setNewGroupParent] = useState<string>("");

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [t, g] = await Promise.all([
        productGroupTypeApi.listByTenant(tenantId),
        productGroupApi.listByTenant(tenantId),
      ]);
      setTypes(t);
      setGroups(g);
      if (!selectedTypeId && t.length > 0) {
        setSelectedTypeId(t[0].tenant_product_group_type_id);
      }
    } catch (err) {
      onError(err, "Error al cargar dimensiones");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const groupsOfType = useMemo(
    () =>
      selectedTypeId
        ? groups.filter(
            (g) => g.tenant_product_group_type_id === selectedTypeId,
          )
        : [],
    [groups, selectedTypeId],
  );

  const createType = async () => {
    const name = newTypeName.trim();
    if (!name) return;
    try {
      const created = await productGroupTypeApi.create(tenantId, name);
      setTypes((prev) => [...prev, created]);
      setNewTypeName("");
      setSelectedTypeId(created.tenant_product_group_type_id);
      onSuccess("Dimensión creada");
    } catch (err) {
      onError(err, "Error al crear dimensión");
    }
  };

  const removeType = async (id: string) => {
    if (
      !confirm(
        "¿Eliminar esta dimensión y todos sus grupos? Esto afectará las asignaciones existentes.",
      )
    )
      return;
    try {
      await productGroupTypeApi.remove(tenantId, id);
      setTypes((prev) =>
        prev.filter((t) => t.tenant_product_group_type_id !== id),
      );
      setGroups((prev) =>
        prev.filter((g) => g.tenant_product_group_type_id !== id),
      );
      if (selectedTypeId === id) setSelectedTypeId(null);
      onSuccess("Dimensión eliminada");
    } catch (err) {
      onError(err, "Error al eliminar dimensión");
    }
  };

  const createGroup = async () => {
    if (!selectedTypeId) return;
    const name = newGroupName.trim();
    if (!name) return;
    try {
      const created = await productGroupApi.create({
        tenant_id: tenantId,
        tenant_product_group_type_id: selectedTypeId,
        parent_group_id: newGroupParent || null,
        group_name: name,
      });
      setGroups((prev) => [...prev, created]);
      setNewGroupName("");
      setNewGroupParent("");
      onSuccess("Grupo creado");
    } catch (err) {
      onError(err, "Error al crear grupo");
    }
  };

  const removeGroup = async (id: string) => {
    if (
      !confirm(
        "¿Eliminar este grupo y todos sus descendientes? Las asignaciones a productos se borrarán.",
      )
    )
      return;
    try {
      await productGroupApi.remove(tenantId, id);
      setGroups((prev) => prev.filter((g) => g.tenant_product_group_id !== id));
      onSuccess("Grupo eliminado");
    } catch (err) {
      onError(err, "Error al eliminar grupo");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Types list */}
      <section className="lg:col-span-1 bg-white rounded-2xl border border-gray-300 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Dimensiones (tipos)
        </h2>

        <div className="flex gap-2 mb-4">
          <Input
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createType();
              }
            }}
            placeholder="Ej: Departamento, Familia"
          />
          <Button
            type="button"
            variant="primary"
            onClick={createType}
            disabled={!newTypeName.trim()}
          >
            +
          </Button>
        </div>

        {isLoading ? (
          <p className="text-xs text-gray-500">Cargando...</p>
        ) : types.length === 0 ? (
          <p className="text-xs text-gray-500">Aún no hay dimensiones.</p>
        ) : (
          <ul className="space-y-1">
            {types.map((t) => {
              const isSelected =
                selectedTypeId === t.tenant_product_group_type_id;
              return (
                <li key={t.tenant_product_group_type_id}>
                  <div
                    className={[
                      "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                      isSelected
                        ? "bg-accent-50 border border-accent-200"
                        : "hover:bg-gray-50 border border-transparent",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTypeId(t.tenant_product_group_type_id)
                      }
                      className="flex-1 text-left truncate font-medium text-gray-800"
                    >
                      {t.type_name}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeType(t.tenant_product_group_type_id)}
                      className="text-gray-400 hover:text-red-600 ml-2"
                      aria-label="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Groups panel */}
      <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-300 p-5">
        {selectedTypeId ? (
          <>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              Grupos en &ldquo;
              {types.find(
                (t) => t.tenant_product_group_type_id === selectedTypeId,
              )?.type_name ?? ""}
              &rdquo;
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Los grupos pueden anidarse. Un producto se asigna a uno o más
              grupos por dimensión.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Nuevo grupo (ej: Camisas)"
              />
              <Select
                value={newGroupParent}
                onChange={(e) => setNewGroupParent(e.target.value)}
                options={[
                  { value: "", label: "— Sin padre (raíz) —" },
                  ...groupsOfType.map((g) => ({
                    value: g.tenant_product_group_id,
                    label: `${"— ".repeat(g.hierarchy_level ?? 0)}${g.group_name}`,
                  })),
                ]}
              />
              <Button
                type="button"
                variant="primary"
                onClick={createGroup}
                disabled={!newGroupName.trim()}
              >
                Crear grupo
              </Button>
            </div>

            {groupsOfType.length === 0 ? (
              <p className="text-xs text-gray-500">
                Aún no hay grupos en esta dimensión.
              </p>
            ) : (
              <ul className="space-y-1">
                {groupsOfType.map((g) => (
                  <li
                    key={g.tenant_product_group_id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-gray-50 border border-gray-100"
                    style={{
                      paddingLeft: `${0.75 + (g.hierarchy_level ?? 0) * 1.25}rem`,
                    }}
                  >
                    <span className="truncate text-gray-800">
                      {g.group_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeGroup(g.tenant_product_group_id)}
                      className="text-gray-400 hover:text-red-600 ml-2"
                      aria-label="Eliminar"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">
            Selecciona una dimensión a la izquierda para gestionar sus grupos.
          </p>
        )}
      </section>
    </div>
  );
}
