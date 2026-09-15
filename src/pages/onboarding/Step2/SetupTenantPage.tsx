import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLoaderData, useNavigate, useNavigation } from "react-router-dom";

import { useOnboarding } from "@/context/OnboardingContext";

import { tenantApi } from "@/api/tenant.api";
import { useUniqueAvailability } from "@/hooks/useUniqueAvailability";

import { OnboardingLayout } from "@/components/layout/OnboardingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

import { identificationTypes } from "@/constants/identification-types";

import type { RegionLoaderData } from "@/router/loaders/region.loaders";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { setupTenantSchema } from "./setup-tenant.schema";

type FormValues = z.infer<typeof setupTenantSchema>;

export function SetupTenantPage() {
  const { data, setStep2 } = useOnboarding();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { regions, regionsError } = useLoaderData() as RegionLoaderData;
  const loadingRegions =
    navigation.state === "loading" &&
    navigation.location?.pathname === "/auth/register/setup-tenant";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(setupTenantSchema) as any,
    defaultValues: {
      tenantName: data.tenantName,
      identificationType: data.identificationType ?? 1,
      identification: data.identification,
      economicActivity: data.economicActivity,
      sign: data.sign,
      branchName: data.branchName,
      branchNumber: data.branchNumber,
      branchAddress: data.branchAddress,
      regionId: data.regionId ? String(data.regionId) : "",
      contactPhone: data.contactPhone,
    },
  });

  const selectedRegionId = watch("regionId");

  useEffect(() => {
    if (!selectedRegionId && regions.length > 0) {
      setValue("regionId", String(regions[0].region_id), {
        shouldValidate: true,
      });
    }
  }, [selectedRegionId, regions, setValue]);

  const countryCode = regions.find(
    (r) => String(r.region_id) === selectedRegionId,
  )?.country_code;

  // Sondeos de unicidad. La constraint UNIQUE de la BD sigue siendo la
  // fuente de verdad final — esto solo evita comprometer el flujo hasta
  // el último paso.
  const watchedTenantName = watch("tenantName") ?? "";
  const watchedIdentification = watch("identification") ?? "";

  const checkTenantName = useCallback(async (value: string) => {
    const { exists } = await tenantApi.checkOnboardingAvailability({
      field: "tenant_name",
      value,
    });
    return exists;
  }, []);

  const checkIdentification = useCallback(async (value: string) => {
    const { exists } = await tenantApi.checkOnboardingAvailability({
      field: "tenant_identification",
      value,
    });
    return exists;
  }, []);

  const tenantNameStatus = useUniqueAvailability(
    watchedTenantName,
    checkTenantName,
    { minLength: 2 },
  );

  const identificationStatus = useUniqueAvailability(
    watchedIdentification,
    checkIdentification,
    { minLength: 4 },
  );

  const uniquenessBlocked =
    tenantNameStatus === "taken" || identificationStatus === "taken";
  const uniquenessProbing =
    tenantNameStatus === "checking" || identificationStatus === "checking";

  const onSubmit = async (values: FormValues) => {
    if (uniquenessBlocked || uniquenessProbing) return;
    setStep2({
      tenantName: values.tenantName,
      contactPhone: values.contactPhone,
      identificationType: values.identificationType,
      identification: values.identification,
      economicActivity: values.economicActivity,
      sign: values.sign,
      branchName: values.branchName,
      branchNumber: values.branchNumber,
      branchAddress: values.branchAddress,
      regionId: Number(values.regionId),
    });
    navigate("/auth/register/payment");
  };

  const regionOptions = regions.map((region) => ({
    value: String(region.region_id),
    label: `${region.region_name}`,
  }));

  return (
    <OnboardingLayout
      currentStep={2}
      panelHeadline="Configura tu empresa"
      panelSubtext="Necesitamos algunos datos de tu negocio para crear tu cuenta empresarial."
    >
      <div>
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-800 uppercase tracking-widest mb-2">
            Paso 2 de 4
          </p>
          <h2 className="text-2xl font-bold text-gray-900 mb-1.5 font-display">
            Datos de la empresa
          </h2>
          <p className="text-sm text-gray-500">
            Esta información aparecerá en tus documentos y reportes.
          </p>
        </div>

        {regionsError && (
          <div className="mb-6 flex gap-2.5 items-start p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            <svg
              className="shrink-0 mt-0.5"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {regionsError}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Nombre de la empresa"
            placeholder="Mi Empresa S.A."
            required
            error={
              errors.tenantName?.message ??
              (tenantNameStatus === "taken"
                ? "Ya existe una empresa registrada con este nombre."
                : undefined)
            }
            hint={
              tenantNameStatus === "checking"
                ? "Verificando disponibilidad…"
                : tenantNameStatus === "available"
                  ? "Nombre disponible"
                  : undefined
            }
            {...register("tenantName")}
          />

          <Select
            label="Región"
            options={regionOptions}
            error={errors.regionId?.message}
            disabled
            className="disabled:cursor-not-allowed"
            hint={loadingRegions ? "Cargando regiones..." : undefined}
            {...register("regionId")}
          />

          <Input
            type="tel"
            label="Teléfono de contacto"
            placeholder="71045365"
            required
            leftAddon={countryCode ?? "+"}
            leftAddonClassName={countryCode ? "text-gray-700" : "text-gray-400"}
            error={errors.contactPhone?.message}
            hint="Número sin el código de país"
            {...register("contactPhone")}
          />

          <Select
            label="Tipo de identificación"
            options={identificationTypes.map((type) => ({
              value: type.value,
              label: type.label,
            }))}
            error={errors.identificationType?.message}
            hint={loadingRegions ? "Cargando regiones..." : undefined}
            {...register("identificationType")}
          />

          <Input
            label="Identificación fiscal"
            placeholder="3140002575"
            required
            error={
              errors.identification?.message ??
              (identificationStatus === "taken"
                ? "Ya existe una empresa registrada con esta identificación."
                : undefined)
            }
            hint={
              identificationStatus === "checking"
                ? "Verificando disponibilidad…"
                : identificationStatus === "available"
                  ? "Identificación disponible"
                  : "Identificación tributaria (máx. 12 caracteres)"
            }
            {...register("identification")}
          />

          <Input
            label="Código de actividad económica"
            placeholder="6110.0"
            required
            error={errors.economicActivity?.message}
            hint="Descripción de la actividad principal del negocio"
            {...register("economicActivity")}
          />

          <Input
            label="Nombre comercial"
            placeholder="MiMarca"
            required
            error={errors.sign?.message}
            hint="Nombre con que se identifica tu negocio en el mercado"
            {...register("sign")}
          />

          <Input
            label="Nombre de sucursal principal"
            placeholder="Sucursal Principal"
            required
            error={errors.branchName?.message}
            hint="Será la primera sucursal activa del tenant"
            {...register("branchName")}
          />

          <Input
            label="Número de sucursal principal"
            placeholder="1"
            required
            error={errors.branchNumber?.message}
            hint="Identificador interno de la sucursal"
            {...register("branchNumber")}
          />

          <Input
            label="Dirección de sucursal principal"
            placeholder="San José, Costa Rica"
            required
            error={errors.branchAddress?.message}
            hint="Dirección física de la sucursal"
            {...register("branchAddress")}
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => navigate("/auth/register")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Atrás
            </Button>
            <Button
              type="submit"
              loading={isSubmitting || loadingRegions}
              size="lg"
              className="flex-2"
              disabled={uniquenessBlocked || uniquenessProbing}
              title={
                uniquenessBlocked
                  ? "Hay datos duplicados que deben corregirse"
                  : uniquenessProbing
                    ? "Verificando disponibilidad…"
                    : undefined
              }
            >
              Continuar
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Button>
          </div>
        </form>
      </div>
    </OnboardingLayout>
  );
}
