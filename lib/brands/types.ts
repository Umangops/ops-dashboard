export type FilterType = 'search' | 'select' | 'dateRange';
export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface BrandColumn {
  field: string;
  header: string;
  label: string;
  type: 'text' | 'date' | 'status' | 'boolean';
  filter: FilterType;
  required?: boolean;
  copyable?: boolean;
  globalSearch?: boolean;
  options?: string[];
  keyField?: string;   // name of the generated normalised-key column (e.g. 'remarks_key')
}

export interface StatusSummary {
  type: 'status';
  field: string;
  cards: { label: string; value: string; tone: Tone }[];
}

export interface DynamicSummary {
  type: 'dynamic';
  field: string;
  maxCards: number;
}

export interface LiveStatusSummary {
  type: 'live-status';
  field: string;        // e.g. 'remarks'
  keyField: string;     // e.g. 'remarks_key'
  hiddenKeys: string[]; // normalised keys to hide from cards (still visible in table/filter)
  keyTones: Record<string, Tone>; // normalised key → tone
}

export interface BrandConfig {
  key: 'hitachi' | 'godrej' | 'samsung';
  label: string;
  table: string;
  sheetName: string;
  dateField: string;
  columns: BrandColumn[];
  ignoredHeaders?: string[];
  statusTones: Record<string, Tone>;
  summary: StatusSummary | DynamicSummary | LiveStatusSummary;
  mobileFields: string[];
}
