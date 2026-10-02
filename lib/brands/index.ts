import { hitachi } from './hitachi';
import { godrej }   from './godrej';
import { samsung }  from './samsung';
import type { BrandConfig } from './types';

export { hitachi, godrej, samsung };
export type { BrandConfig };
export type { BrandColumn, FilterType, Tone, StatusSummary, DynamicSummary } from './types';

const brandMap: Record<string, BrandConfig> = { hitachi, godrej, samsung };

export function getBrand(key: string): BrandConfig | null {
  return brandMap[key.toLowerCase()] ?? null;
}
