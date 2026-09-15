import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useOnboarding } from "@/context/OnboardingContext";

import { tenantApi } from "@/api/tenant.api";
import {
  specialCodeApi,
  type SpecialCodeValidationReason,
} from "@/api/specialCode.api";

import { useDebounce } from "@/hooks/useDebounce";

import { OnboardingLayout } from "@/components/layout/OnboardingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import { SUBSCRIPTION_PLANS } from "@/constants/subscription-plans";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string,
);

const PLAN = SUBSCRIPTION_PLANS[0];

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "14px",
      color: "#111827",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: {
      color: "#ef4444",
      iconColor: "#ef4444",
    },
  },
};

type PaymentMode = "card" | "special_code";
type CodeStatus =
  | "idle"
  | "checking"
  | "valid"
  | "invalid";

const codeReasonLabel = (
  reason?: SpecialCodeValidationReason,
): string => {
  switch (reason) {
    case "already_used":
      return "Este código ya fue canjeado.";
    case "expired":
      return "El código está vencido.";
    case "not_found":
    default:
      return "Código no encontrado.";
  }
};

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { data, clear } = useOnboarding();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState("");
  const [cardComplete, setCardComplete] = useState(false);

  // Modo de pago: tarjeta (Stripe) o código especial
  const [mode, setMode] = useState<PaymentMode>("card");
  const [specialCode, setSpecialCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<CodeStatus>("idle");
  const [codeError, setCodeError] = useState<string | null>(null);

  // Debounced validation: el usuario escribe el código y a los 500 ms
  // sin teclear validamos contra el backend. NO consume el código.
  const debouncedCode = useDebounce(specialCode.trim().toUpperCase(), 500);

  useEffect(() => {
    if (mode !== "special_code") {
      setCodeStatus("idle");
      setCodeError(null);
      return;
    }
    if (!debouncedCode || debouncedCode.length < 4) {
      setCodeStatus("idle");
      setCodeError(null);
      return;
    }

    let cancelled = false;
    setCodeStatus("checking");
    setCodeError(null);

    specialCodeApi
      .validate(debouncedCode)
      .then((result) => {
        if (cancelled) return;
        if (result.valid) {
          setCodeStatus("valid");
          setCodeError(null);
        } else {
          setCodeStatus("invalid");
          setCodeError(codeReasonLabel(result.reason));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCodeStatus("invalid");
        setCodeError("No se pudo verificar el código. Intenta más tarde.");
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedCode, mode]);

  const handleSubscribe = async () => {
    setError("");

    if (mode === "card" && (!stripe || !elements)) return;

    setIsLoading(true);

    try {
      // 1. Si es modo tarjeta: crear payment method en Stripe
      let stripePaymentMethodId: string | undefined;
      if (mode === "card") {
        const cardElement = elements!.getElement(CardElement);
        if (!cardElement) throw new Error("Tarjeta no inicializada");

        setCurrentStep("Preparando el pago...");
        const { error: pmError, paymentMethod } =
          await stripe!.createPaymentMethod({
            type: "card",
            card: cardElement,
          });

        if (pmError || !paymentMethod) {
          throw new Error(
            pmError?.message ?? "No se pudo crear el método de pago.",
          );
        }
        stripePaymentMethodId = paymentMethod.id;
      } else {
        // Validamos una vez más antes de comprometer el onboarding.
        if (codeStatus !== "valid") {
          throw new Error(
            codeError ?? "Ingresa un código especial válido para continuar.",
          );
        }
      }

      // 2. Calcular fechas de suscripción
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + PLAN.months);

      // 3. Enviar solicitud única de onboarding al backend
      setCurrentStep(
        mode === "special_code"
          ? "Canjeando tu código de acceso..."
          : "Creando tu cuenta...",
      );
      const result = await tenantApi.onboard({
        tenant_name: data.tenantName,
        contact_email: data.email,
        contact_phone: data.contactPhone,
        identification_type_id: data.identificationType,
        identification: data.identification,
        economic_activity: data.economicActivity,
        sign: data.sign,
        region_id: data.regionId || 1,
        branch: {
          branch_name: data.branchName || `${data.tenantName} - Principal`,
          branch_number: data.branchNumber || "1",
          branch_address: data.branchAddress || undefined,
        },
        user: {
          email: data.email,
          password: data.password,
          first_name: data.firstName,
          last_name: data.lastName,
          document_number: data.docNumber,
          phone: data.phone,
        },
        subscription: {
          stripe_payment_method_id: stripePaymentMethodId,
          plan: PLAN.plan,
          payment_method_id: 1,
          payment_amount: mode === "special_code" ? 0 : PLAN.price,
          subscription_type_id: PLAN.id,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          special_code:
            mode === "special_code" ? debouncedCode : undefined,
        },
      });

      // 4. Si es modo tarjeta: confirmar el pago en Stripe.
      // Si es modo special_code: el backend ya finalizó la transacción y no
      // hay clientSecret, así que saltamos directo al success.
      if (mode === "card") {
        if (!result.subscription?.clientSecret) {
          throw new Error("No se recibió el token de pago del servidor.");
        }
        setCurrentStep("Procesando el pago...");
        const { error: stripeError, paymentIntent } =
          await stripe!.confirmCardPayment(result.subscription.clientSecret);

        if (stripeError) {
          throw new Error(
            stripeError.message ?? "Error al procesar el pago.",
          );
        }

        if (paymentIntent?.status !== "succeeded") {
          throw new Error(
            `Pago no completado. Estado: ${paymentIntent?.status}`,
          );
        }
      }

      const credentials = { email: data.email, password: data.password };
      clear();
      navigate("/auth/register/success", {
        replace: true,
        state: { credentials },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error. Intenta nuevamente.",
      );
    } finally {
      setIsLoading(false);
      setCurrentStep("");
    }
  };

  const submitDisabled =
    isLoading ||
    (mode === "card" && (!cardComplete || !stripe)) ||
    (mode === "special_code" && codeStatus !== "valid");

  const submitLabel =
    mode === "special_code"
      ? "Activar acceso con código"
      : `Pagar — $${PLAN.price}/mes`;

  return (
    <OnboardingLayout
      currentStep={3}
      panelHeadline="Tu plan"
      panelSubtext="Acceso completo a todas las funcionalidades de la plataforma desde el primer día."
    >
      <div>
        <div className="mb-7">
          <p className="text-xs font-semibold text-gray-800 uppercase tracking-widest mb-2">
            Paso 4 de 4
          </p>
          <h2 className="text-2xl font-bold text-gray-900 mb-1.5 font-display">
            Resumen de suscripción
          </h2>
          <p className="text-sm text-gray-500">
            Puedes cancelar en cualquier momento.
          </p>
        </div>

        {/* Plan único */}
        <div className="rounded-2xl border-2 border-gray-800 bg-gray-50 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-display">
                {PLAN.name}
              </h3>
              <p className="text-sm text-gray-800 font-medium mt-0.5">
                {PLAN.description}
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-gray-900">
                ${PLAN.price}
              </span>
              <span className="text-gray-400 text-sm ml-1">/ mes</span>
            </div>
          </div>

          <ul className="space-y-2">
            {PLAN.features.map((f) => (
              <li
                key={f}
                className="flex items-center gap-2.5 text-sm text-gray-700"
              >
                <span className="w-4 h-4 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Selector de modo de pago */}
        <div className="grid grid-cols-2 gap-2 mb-5 p-1 rounded-xl bg-gray-100">
          <button
            type="button"
            onClick={() => setMode("card")}
            className={[
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              mode === "card"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            ].join(" ")}
            disabled={isLoading}
          >
            Pagar con tarjeta
          </button>
          <button
            type="button"
            onClick={() => setMode("special_code")}
            className={[
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              mode === "special_code"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            ].join(" ")}
            disabled={isLoading}
          >
            Tengo un código especial
          </button>
        </div>

        {mode === "card" ? (
          <div className="mb-5">
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Datos de tarjeta
            </label>
            <div className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all duration-150 focus-within:border-gray-800 focus-within:ring-2 focus-within:ring-gray-800/20">
              <CardElement
                options={CARD_ELEMENT_OPTIONS}
                onChange={(e) => {
                  setCardComplete(e.complete);
                  if (e.error) setError(e.error.message ?? "");
                  else setError("");
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Pago cifrado y seguro procesado por Stripe
            </p>
          </div>
        ) : (
          <div className="mb-5">
            <Input
              label="Código especial"
              placeholder="Ej: VIP-2026-001"
              value={specialCode}
              onChange={(e) =>
                setSpecialCode(e.target.value.toUpperCase().replace(/\s/g, ""))
              }
              maxLength={64}
              error={codeStatus === "invalid" ? codeError ?? undefined : undefined}
              hint={
                codeStatus === "checking"
                  ? "Verificando código..."
                  : codeStatus === "valid"
                    ? "Código válido. Puedes activar tu cuenta sin cargo."
                    : "Solo los superusuarios pueden emitir estos códigos. Cada código se usa una sola vez."
              }
              required
              autoComplete="off"
            />
          </div>
        )}

        {/* Resumen */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 mb-5 text-sm">
          <div className="flex justify-between text-gray-600 mb-1.5">
            <span>{PLAN.name}</span>
            <span>${PLAN.price} USD</span>
          </div>
          <div className="flex justify-between text-gray-400 text-xs mb-3">
            <span>Ciclo de facturación</span>
            <span>Mensual</span>
          </div>
          <div className="border-t border-gray-200 pt-2.5 flex justify-between font-semibold text-gray-900">
            <span>Total hoy</span>
            <span>
              {mode === "special_code"
                ? "$0 USD (código especial)"
                : `$${PLAN.price} USD`}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex gap-2.5 items-start p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
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
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && currentStep && (
          <div className="mb-4 flex gap-2 items-center text-sm text-gray-800 font-medium">
            <span className="inline-block w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
            {currentStep}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => navigate("/auth/register/setup-tenant")}
            disabled={isLoading}
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
            type="button"
            loading={isLoading}
            size="lg"
            className="flex-2"
            onClick={handleSubscribe}
            disabled={submitDisabled}
          >
            {submitLabel}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          {mode === "special_code"
            ? "Los códigos especiales son emitidos por el equipo y se canjean una sola vez."
            : "Pago procesado de forma segura. Cancela cuando quieras."}
        </p>
      </div>
    </OnboardingLayout>
  );
}

export function PaymentPage() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm />
    </Elements>
  );
}
