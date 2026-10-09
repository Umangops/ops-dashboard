import type { BrandConfig } from './types';

export const samsung: BrandConfig = {
  key: 'samsung',
  label: 'Samsung',
  table: 'samsung_records',
  sheetName: 'Samsung',
  dateField: 'purchase_date',

  // Column order per design.md §7.2: IMEI right after Plan ID (primary lookup key)
  columns: [
    {
      field: 'activation_code',
      header: 'Warranty Activation Code',
      label: 'Plan ID',
      type: 'text',
      filter: 'search',
      required: true,
      copyable: true,
      globalSearch: true,
    },
    {
      field: 'purchase_date',
      header: 'Warranty Purchase Date',
      label: 'Purchase Date',
      type: 'date',
      filter: 'dateRange',
    },
    {
      field: 'serial_number',
      header: 'Product_Serial_Number',
      label: 'IMEI / Serial Number',
      type: 'text',
      filter: 'search',
      copyable: true,
      globalSearch: true,
    },
    {
      field: 'model_name',
      header: 'Appliance Model Name',
      label: 'Device Model',
      type: 'text',
      filter: 'search',
      globalSearch: true,
    },
    {
      field: 'plan_name',
      header: 'display_plan_name',
      label: 'Plan Name',
      type: 'text',
      filter: 'select',
      globalSearch: true,
    },
    {
      field: 'store_name',
      header: 'Store_Name',
      label: 'Store Name',
      type: 'text',
      filter: 'search',
      globalSearch: true,
    },
    {
      field: 'branch_name',
      header: 'Branch_Name',
      label: 'Branch Name',
      type: 'text',
      filter: 'search',
      globalSearch: true,
    },
  ],

  statusTones: {
    // Samsung plan names shown as info pills; unknown values → neutral
  },

  summary: {
    type: 'dynamic',
    field: 'plan_name',
    maxCards: 3,    // Total + top 3 plan names + Others
  },

  mobileFields: ['serial_number', 'model_name', 'plan_name', 'store_name'],

  // No search_text GIN index (disk full on Free plan). Per-column OR uses existing
  // sam_code_trgm / sam_serial_trgm / sam_store_trgm trigram indexes instead.
  globalSearchColumns: ['activation_code', 'serial_number', 'store_name', 'branch_name', 'model_name', 'plan_name'],

  maskedColumnKeywords: ['mobile', 'phone', 'contact', 'email', 'address', 'city', 'state'],
};
