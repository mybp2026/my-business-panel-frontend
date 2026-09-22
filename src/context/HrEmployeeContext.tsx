import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { employeeApi } from "@/api";
import { useAuth } from "@/context/AuthContext";

import type { HrEmployeeRecord } from "@/interfaces/entities/Hr.interface";

interface HrEmployeeContextValue {
  employees: HrEmployeeRecord[];
  employeeId: string;
  setEmployeeId: (id: string) => void;
  selectedEmployee: HrEmployeeRecord | undefined;
  employeeOptions: { value: string; label: string }[];
  isLoading: boolean;
}

const HrEmployeeContext = createContext<HrEmployeeContextValue | null>(null);

/**
 * Empleado seleccionado, compartido por todas las pestanas de un
 * modulo de RRHH. Antes cada pagina cargaba la lista y mantenia su
 * propio selector, asi que al cambiar de vista habia que volver a
 * elegir a la misma persona.
 */
export function HrEmployeeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const tenantId = user?.tenant?.tenant_id ?? "";

  const [employees, setEmployees] = useState<HrEmployeeRecord[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    setIsLoading(true);
    employeeApi
      .listByTenant(tenantId)
      .then((rows) => {
        if (!cancelled) setEmployees(rows);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.employee_id,
        label: `${e.first_name} ${e.last_name}`,
      })),
    [employees],
  );

  const value = useMemo<HrEmployeeContextValue>(
    () => ({
      employees,
      employeeId,
      setEmployeeId,
      selectedEmployee: employees.find((e) => e.employee_id === employeeId),
      employeeOptions,
      isLoading,
    }),
    [employees, employeeId, employeeOptions, isLoading],
  );

  return (
    <HrEmployeeContext.Provider value={value}>
      {children}
    </HrEmployeeContext.Provider>
  );
}

export function useHrEmployee(): HrEmployeeContextValue {
  const ctx = useContext(HrEmployeeContext);
  if (!ctx) {
    throw new Error("useHrEmployee debe usarse dentro de HrEmployeeProvider");
  }
  return ctx;
}
