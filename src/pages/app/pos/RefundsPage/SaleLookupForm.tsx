import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface SaleLookupFormProps {
  saleIdInput: string;
  onChange: (value: string) => void;
  onLookup: () => void;
  onClear: () => void;
  isLoading: boolean;
  error: string | null;
  hasContext: boolean;
}

export function SaleLookupForm({
  saleIdInput,
  onChange,
  onLookup,
  onClear,
  isLoading,
  error,
  hasContext,
}: SaleLookupFormProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <Input
            label="ID de venta (sale_id)"
            placeholder="UUID de pos_schema.sale"
            value={saleIdInput}
            onChange={(e) => onChange(e.target.value)}
            error={error ?? undefined}
            required
          />
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={onLookup}
          loading={isLoading}
          disabled={isLoading}
        >
          Buscar venta
        </Button>
        {hasContext && (
          <Button type="button" variant="ghost" onClick={onClear}>
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}
