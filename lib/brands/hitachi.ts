import type { BrandConfig } from './types';

export const hitachi: BrandConfig = {
  key: 'hitachi',
  label: 'Hitachi',
  table: 'hitachi_records',
  sheetName: 'Hitachi',
  dateField: 'purchase_date',

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
      field: 'customer_name',
      header: 'Customer_Name',
      label: 'Customer Name',
      type: 'text',
      filter: 'search',
      globalSearch: true,
    },
    {
      field: 'customer_mobile',
      header: 'Customer_Mobile',
      label: 'Phone Number',
      type: 'text',
      filter: 'search',
      copyable: true,
      globalSearch: true,
    },
    {
      field: 'serial_number',
      header: 'Product_Serial_Number',
      label: 'Serial Number',
      type: 'text',
      filter: 'search',
      copyable: true,
      globalSearch: true,
    },
    {
      field: 'crm_id',
      header: 'CRM ID',
      label: 'CRM ID',
      type: 'text',
      filter: 'search',
      globalSearch: true,
    },
    {
      field: 'remarks',
      header: 'Remarks',
      label: 'Status',
      type: 'status',
      filter: 'select',
      keyField: 'remarks_key',
      // options populated dynamically from status_groups RPC
    },
    {
      field: 'additional_remarks',
      header: 'Additional Remarks',
      label: 'Additional Remarks',
      type: 'text',
      filter: 'search',
    },
  ],

  ignoredHeaders: ['Month', 'Year'],

  statusTones: {
    'Plan Active':     'success',
    'Plan Inactive':   'danger',
    'Pending Payment': 'warning',
  },

  summary: {
    type: 'live-status',
    field: 'remarks',
    keyField: 'remarks_key',
    hiddenKeys: ['plan inactive'],
    keyTones: {
      'plan active':     'success',
      'pending payment': 'warning',
      'plan inactive':   'danger',
    },
  },

  mobileFields: ['customer_name', 'customer_mobile', 'serial_number', 'purchase_date'],
};
