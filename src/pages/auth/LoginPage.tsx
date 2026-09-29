import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { OnboardingLayout } from '../../components/layout/OnboardingLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const schema = z.object({
  email: z.string().min(1, 'El email es requerido').email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
  rememberMe: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rememberMe: true },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    try {
      const currentUser = await login(values);
      const isEmployee = currentUser?.role.role_id === 4;
      navigate(isEmployee ? '/app/pos/sales/new' : '/app/dashboard', {
        replace: true,
      });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Credenciales incorrectas');
    }
  };

  return (
    <OnboardingLayout
      panelHeadline="Bienvenido de vuelta"
      panelSubtext="Accede a tu panel de control y gestiona tu negocio desde cualquier lugar."
    >
      <div>
        {/* Header del form */}
        <div className="mb-8">
          <h2
            className="text-2xl font-bold text-gray-900 mb-1.5"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Iniciar sesión
          </h2>
          <p className="text-sm text-gray-500">
            ¿No tienes cuenta?{' '}
            <Link
              to="/auth/register"
              className="text-gray-900 font-medium hover:text-gray-700 hover:underline"
            >
              Regístrate gratis
            </Link>
          </p>
        </div>

        {/* Error del servidor */}
        {serverError && (
          <div className="mb-5 flex gap-2.5 items-start p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="tu@empresa.com"
            autoComplete="email"
            required
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...register('password')}
          />

          <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              {...register('rememberMe')}
            />
            Recordarme
          </label>

          <Button type="submit" fullWidth loading={isSubmitting} size="lg" className="mt-2">
            Ingresar
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-400">
          Al continuar aceptas nuestros{' '}
          <span className="text-gray-500 underline cursor-pointer">Términos de Servicio</span>{' '}
          y{' '}
          <span className="text-gray-500 underline cursor-pointer">Política de Privacidad</span>.
        </p>
      </div>
    </OnboardingLayout>
  );
}
