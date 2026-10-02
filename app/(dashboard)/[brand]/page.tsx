import { notFound } from 'next/navigation';

const BRANDS = ['hitachi', 'godrej', 'samsung'] as const;

interface Props {
  params: Promise<{ brand: string }>;
}

export default async function BrandPage({ params }: Props) {
  const { brand } = await params;

  if (!BRANDS.includes(brand as (typeof BRANDS)[number])) {
    notFound();
  }

  const label = brand.charAt(0).toUpperCase() + brand.slice(1);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">{label} Overview</h1>
      <p className="mt-2 text-sm text-ink-3">Data table coming in Phase 3.</p>
    </div>
  );
}
