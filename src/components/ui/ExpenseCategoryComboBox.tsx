import { useState, useEffect, useRef, useCallback } from "react";
import { financesApi } from "@/api/finances.api";
import type { ExpenseCategory } from "@/interfaces/entities/FnzExpense.interface";

interface ExpenseCategoryComboBoxProps {
  tenantId: string;
  value: string;
  displayValue?: string;
  onChange: (categoryId: string, categoryName: string) => void;
  error?: string;
  required?: boolean;
  label?: string;
  disabled?: boolean;
}

export function ExpenseCategoryComboBox({
  tenantId,
  value,
  displayValue,
  onChange,
  error,
  required,
  label,
  disabled,
}: ExpenseCategoryComboBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedName, setSelectedName] = useState(displayValue ?? "");

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (displayValue !== undefined) setSelectedName(displayValue);
  }, [displayValue]);

  const fetchCategories = useCallback(
    async (term: string) => {
      if (!tenantId) return;
      setIsLoading(true);
      try {
        const data = await financesApi.getCategories(tenantId, term);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [tenantId],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCategories(search);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, isOpen, fetchCategories]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearch("");
    fetchCategories("");
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const handleSelect = (cat: ExpenseCategory) => {
    onChange(cat.category_id, cat.name);
    setSelectedName(cat.name);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", "");
    setSelectedName("");
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={[
          "w-full px-3 py-2 text-left border rounded-lg text-sm bg-white transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500",
          error ? "border-red-300 bg-red-50" : "border-gray-300",
          disabled
            ? "opacity-50 cursor-not-allowed bg-gray-50"
            : "cursor-pointer hover:border-gray-400",
          value ? "text-gray-900" : "text-gray-400",
        ].join(" ")}
      >
        <span className="block truncate pr-8">
          {value && selectedName ? selectedName : "Buscar categoria..."}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1">
          {value && !disabled && (
            <button
              aria-label="limpiar seleccion"
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-accent-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {isLoading
                ? "Cargando..."
                : `${results.length} resultado${results.length !== 1 ? "s" : ""}${results.length === 50 ? " (max. mostrados)" : ""}`}
            </p>
          </div>

          <ul className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <li className="flex items-center justify-center py-6">
                <div className="w-5 h-5 border-2 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
              </li>
            ) : results.length === 0 ? (
              <li className="px-4 py-4 text-sm text-gray-500 text-center">
                {search
                  ? `Sin resultados para "${search}"`
                  : "Sin categorias disponibles"}
              </li>
            ) : (
              results.map((cat) => (
                <li key={cat.category_id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(cat)}
                    className={[
                      "w-full text-left px-4 py-2 text-sm transition-colors",
                      value === cat.category_id
                        ? "bg-accent-50 text-accent-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="block truncate">{cat.name}</span>
                      <span
                        className={[
                          "text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap",
                          cat.is_fixed
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700",
                        ].join(" ")}
                      >
                        {cat.is_fixed ? "Fijo" : "Variable"}
                      </span>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
