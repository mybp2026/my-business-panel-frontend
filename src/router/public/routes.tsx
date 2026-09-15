import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/onboarding/Step1/RegisterPage';
import { SetupTenantPage } from '@/pages/onboarding/Step2/SetupTenantPage';
import { PaymentPage } from '@/pages/onboarding/Step4/PaymentPage';
import { SuccessPage } from '@/pages/onboarding/SuccessPage';
import { getRegions } from '../loaders/region.loaders';

// Cómo agregar una ruta pública con loader:
// { path: '/nueva', element: <NuevaPagina />, loader: getNuevaPageData }
// Cómo agregar una ruta pública sin loader:
// { path: '/otra', element: <OtraPagina /> }

export const publicRoutes: RouteObject[] = [
  { path: '/', element: <Navigate to="/auth/login" replace /> },
  { path: '/auth/login', element: <LoginPage /> },
  { path: '/auth/register', element: <RegisterPage /> },
  {
    path: '/auth/register/setup-tenant',
    element: <SetupTenantPage />,
    loader: getRegions,
  },
  { path: '/auth/register/payment', element: <PaymentPage /> },
  { path: '/auth/register/success', element: <SuccessPage /> },
];
