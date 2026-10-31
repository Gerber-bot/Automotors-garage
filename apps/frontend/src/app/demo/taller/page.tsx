import type { Metadata } from 'next';
import { DemoWorkshopView } from '../../../components/demo/DemoWorkshopView.tsx';

export const metadata: Metadata = {
  title: 'Demo Automotors Pro — Gestión de Taller Mecánico | Automotors Garage',
  description:
    'Demostración pública interactiva de Automotors Pro: órdenes de trabajo, Quick Service, boxes y diagnóstico OBD-II.',
};

export default function DemoTallerPage() {
  return <DemoWorkshopView />;
}
