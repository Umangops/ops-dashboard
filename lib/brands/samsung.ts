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
      filter: 'dropdown',
      globalSearch: true,
    },
    {
      field: 'branch_name',
      header: 'Branch_Name',
      label: 'Branch Name',
      type: 'text',
      filter: 'dropdown',
      globalSearch: true,
    },
  ],

  statusTones: {
    // Samsung plan names shown as info pills; unknown values → neutral
  },

  summary: {
    type: 'partner',
    field: 'store_name',
    maxCards: 4,   // Total + top 4 partners + Other Partners
  },

  mobileFields: ['serial_number', 'model_name', 'plan_name', 'store_name'],

  // Only trigram-indexed columns — store/branch filtering now via dropdowns.
  globalSearchColumns: ['activation_code', 'serial_number'],

  maskedColumnKeywords: ['mobile', 'phone', 'contact', 'email', 'address', 'city', 'state'],
};
