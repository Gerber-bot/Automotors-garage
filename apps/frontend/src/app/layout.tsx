import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext.tsx';

export const metadata: Metadata = {
  title: 'Automotors Garage — El Historial de tu Vehículo y la Gestión de tu Taller',
  description:
    'Plataforma integral de gestión vehicular y de taller: Mi Automotors para propietarios particulares y Automotors Pro para administración operativa de talleres mecánicos.',
  keywords: [
    'gestión de taller mecánico',
    'historial de mantenimiento vehicular',
    'órdenes de trabajo',
    'diagnóstico obd2',
    'pasaporte de mantenimiento',
    'quick service mecánico',
  ],
  authors: [{ name: 'Automotors Garage Engineering' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#020617',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-slate-950">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
