export type FilterType = 'search' | 'select' | 'dateRange';
export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface BrandColumn {
  field: string;
  header: string;         // exact Excel header text
  label: string;          // shown in UI
  type: 'text' | 'date' | 'status' | 'boolean';
  filter: FilterType;
  required?: boolean;     // must exist in uploaded file
  copyable?: boolean;     // show one-click copy icon
  globalSearch?: boolean; // included in global search bar
  options?: string[];     // fixed values for select filter
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

export interface BrandConfig {
  key: 'hitachi' | 'godrej' | 'samsung';
  label: string;
  table: string;
  sheetName: string;
  dateField: string;
  columns: BrandColumn[];
  ignoredHeaders?: string[];
  statusTones: Record<string, Tone>;
  summary: StatusSummary | DynamicSummary;
  mobileFields: string[];
}
