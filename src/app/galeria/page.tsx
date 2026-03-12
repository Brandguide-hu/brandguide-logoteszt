import { AppLayout } from '@/components/layout/AppLayout';

export default function GaleriaPage() {
  return (
    <AppLayout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <span className="text-5xl mb-6">🎨</span>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Logó galéria — hamarosan!
        </h1>
        <p className="text-gray-500 text-center max-w-md">
          Dolgozunk rajta, hogy a legjobb logó elemzéseket itt böngészhessétek. Nézz vissza hamarosan!
        </p>
      </div>
    </AppLayout>
  );
}
