import type { Metadata } from 'next';
import { DemoOwnerView } from '../../../components/demo/DemoOwnerView.tsx';

export const metadata: Metadata = {
  title: 'Demo Mi Automotors — Portal de Propietario | Automotors Garage',
  description:
    'Demostración pública interactiva de Mi Automotors: gestión de vehículos, pasaporte de mantenimiento y alertas preventivas.',
};

export default function DemoPropietarioPage() {
  return <DemoOwnerView />;
}
