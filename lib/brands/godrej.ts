import type { BrandConfig } from './types';

export const godrej: BrandConfig = {
  key: 'godrej',
  label: 'Godrej',
  table: 'godrej_records',
  sheetName: 'Godrej',
  dateField: 'created_at',   // Godrej has no display date; filter by upload date

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
      field: 'warranty_status',
      header: 'Warranty Status',
      label: 'Warranty Status',
      type: 'status',
      filter: 'select',
      options: ['Active', 'Pending'],
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
      field: 'payment_status',
      header: 'Payment_Status',
      label: 'Payment Status',
      type: 'boolean',         // stored as boolean in DB; shown as Paid / Unpaid
      filter: 'select',
      options: ['Paid', 'Unpaid'],
    },
    {
      field: 'contract_id',
      header: 'Contract ID',
      label: 'Contract ID',
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
      options: ['Contract Booked', 'Not Booked'],
    },
    {
      field: 'additional_remarks',
      header: 'Additional Remarks',
      label: 'Additional Remarks',
      type: 'text',
      filter: 'search',
    },
  ],

  statusTones: {
    'Contract Booked': 'success',
    'Not Booked':      'danger',
    'Active':          'success',
    'Pending':         'warning',
    'Paid':            'success',
    'Unpaid':          'danger',
  },

  summary: {
    type: 'status',
    field: 'remarks',
    cards: [
      { label: 'Contract Booked', value: 'Contract Booked', tone: 'success' },
      { label: 'Not Booked',      value: 'Not Booked',      tone: 'danger'  },
    ],
  },

  mobileFields: ['customer_name', 'customer_mobile', 'serial_number', 'remarks'],
};
