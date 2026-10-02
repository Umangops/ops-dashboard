'use client';
import { useState } from 'react';
import {
  FileText, CheckCircle, Ban, Clock, Download, Upload,
  Bell, ChevronRight, MoreHorizontal, TrendingUp, X,
  Copy, Filter, RefreshCw, ChevronDown, Smartphone
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Pill from '@/components/ui/Pill';
import type { Tone } from '@/components/ui/Pill';
import Modal from '@/components/ui/Modal';
import Drawer from '@/components/ui/Drawer';
import Skeleton from '@/components/ui/Skeleton';

// ── Brand configs for preview ────────────────────────────────────────────────

const brands = {
  Hitachi: {
    cards: [
      { label: 'Total Plans',      value: '4,312', tone: '#4F5FE8', soft: '#E8EBFD', icon: FileText },
      { label: 'Plan Active',      value: '3,950', tone: '#2E9E5B', soft: '#DDF5E7', icon: CheckCircle },
      { label: 'Plan Inactive',    value: '210',   tone: '#E5252A', soft: '#FDE2E2', icon: Ban },
      { label: 'Pending Payment',  value: '152',   tone: '#D4A017', soft: '#FDF3D0', icon: Clock },
    ],
    columns: ['Plan ID', 'Purchase Date', 'Customer Name', 'Phone Number', 'Serial Number', 'CRM ID', 'Status', 'Additional Remarks'],
    rows: [
      { id: 'WBN3560015', date: '05 Apr 2025', name: 'Shyam Sundar Ghosh', phone: '9732568546', serial: 'SE230S29811', crm: 'CRM10045', status: 'Plan Active',      tone: 'success'  as Tone, remarks: 'Warranty activated on time' },
      { id: 'WBN3560089', date: '12 Apr 2025', name: 'Priya Mehta',         phone: '9876543210', serial: 'SE231A11234', crm: 'CRM10089', status: 'Pending Payment', tone: 'warning'  as Tone, remarks: 'Payment follow-up pending' },
      { id: 'WBN3560102', date: '18 Apr 2025', name: 'Rajesh Kumar',        phone: '8800112233', serial: 'SE232B98765', crm: 'CRM10103', status: 'Plan Active',      tone: 'success'  as Tone, remarks: '-' },
      { id: 'WBN3560134', date: '22 Apr 2025', name: 'Anita Sharma',        phone: '7991234567', serial: 'SE233C45678', crm: 'CRM10134', status: 'Plan Inactive',   tone: 'danger'   as Tone, remarks: 'Customer requested cancellation' },
      { id: 'WBN3560198', date: '30 Apr 2025', name: 'Vikram Singh',        phone: '9001122334', serial: 'SE234D56789', crm: 'CRM10198', status: 'Plan Active',      tone: 'success'  as Tone, remarks: '-' },
    ],
  },
  Godrej: {
    cards: [
      { label: 'Total Plans',      value: '2,841', tone: '#4F5FE8', soft: '#E8EBFD', icon: FileText },
      { label: 'Contract Booked',  value: '2,310', tone: '#2E9E5B', soft: '#DDF5E7', icon: CheckCircle },
      { label: 'Not Booked',       value: '531',   tone: '#E5252A', soft: '#FDE2E2', icon: Ban },
    ],
    columns: ['Plan ID', 'Warranty Status', 'Customer Name', 'Phone Number', 'Serial Number', 'Payment Status', 'Contract ID', 'Status', 'Additional Remarks'],
    rows: [
      { id: 'GDR2040011', warrantyStatus: 'Active',  name: 'Mohan Das',     phone: '9812345678', serial: 'GR101A', payStatus: 'Paid',   contract: 'CON-4401', status: 'Contract Booked', tone: 'success' as Tone, remarks: 'Extended warranty applied' },
      { id: 'GDR2040045', warrantyStatus: 'Pending', name: 'Sunita Rao',    phone: '9988776655', serial: 'GR102B', payStatus: 'Unpaid', contract: 'CON-4445', status: 'Not Booked',      tone: 'danger'  as Tone, remarks: 'Awaiting payment confirmation' },
      { id: 'GDR2040078', warrantyStatus: 'Active',  name: 'Deepak Verma',  phone: '9700123456', serial: 'GR103C', payStatus: 'Paid',   contract: 'CON-4478', status: 'Contract Booked', tone: 'success' as Tone, remarks: '-' },
      { id: 'GDR2040099', warrantyStatus: 'Pending', name: 'Kavita Joshi',  phone: '8899001122', serial: 'GR104D', payStatus: 'Unpaid', contract: 'CON-4499', status: 'Not Booked',      tone: 'danger'  as Tone, remarks: 'Customer unreachable' },
      { id: 'GDR2040112', warrantyStatus: 'Active',  name: 'Arun Tiwari',   phone: '9600445566', serial: 'GR105E', payStatus: 'Paid',   contract: 'CON-4512', status: 'Contract Booked', tone: 'success' as Tone, remarks: '-' },
    ],
  },
  Samsung: {
    cards: [
      { label: 'Total Plans',     value: '3,190', tone: '#4F5FE8', soft: '#E8EBFD', icon: FileText },
      { label: 'Screen Protect',  value: '1,420', tone: '#2E9E5B', soft: '#DDF5E7', icon: CheckCircle },
      { label: 'Combo Plan',      value: '980',   tone: '#D4A017', soft: '#FDF3D0', icon: Smartphone },
      { label: 'Others',          value: '790',   tone: '#7C3AED', soft: '#EDE7FD', icon: Clock },
    ],
    columns: ['Plan ID', 'Purchase Date', 'IMEI / Serial Number', 'Device Model', 'Plan Name', 'Store Name', 'Branch Name'],
    rows: [
      { id: 'SAM5010021', date: '03 Apr 2025', serial: '352094112345678', model: 'Galaxy S24 Ultra', plan: 'Screen Protect', store: 'Croma Andheri',   branch: 'Mumbai West' },
      { id: 'SAM5010056', date: '10 Apr 2025', serial: '352094187654321', model: 'Galaxy A55',       plan: 'Combo Plan',     store: 'Reliance Digital', branch: 'Delhi NCR' },
      { id: 'SAM5010089', date: '15 Apr 2025', serial: '352094198765432', model: 'Galaxy S23 FE',    plan: 'Screen Protect', store: 'Samsung Shop',     branch: 'Bangalore' },
      { id: 'SAM5010104', date: '21 Apr 2025', serial: '352094176543219', model: 'Galaxy M34',       plan: 'Basic Cover',    store: 'Vijay Sales',      branch: 'Pune' },
      { id: 'SAM5010131', date: '28 Apr 2025', serial: '352094154321987', model: 'Galaxy Z Fold 5',  plan: 'Combo Plan',     store: 'Croma BKC',        branch: 'Mumbai East' },
    ],
  },
};

type BrandKey = keyof typeof brands;

export default function PreviewPage() {
  const [activeBrand, setActiveBrand] = useState<BrandKey>('Hitachi');
  const [modalOpen, setModalOpen]     = useState(false);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [activeCard, setActiveCard]   = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [copied, setCopied]           = useState<string | null>(null);

  const brand = brands[activeBrand];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  const CopyBtn = ({ value }: { value: string }) => (
    <button
      onClick={(e) => { e.stopPropagation(); handleCopy(value); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-3 hover:text-primary ml-1.5"
    >
      {copied === value
        ? <span className="text-[10px] text-success font-semibold">Copied!</span>
        : <Copy size={12} />}
    </button>
  );

  // Render a table cell based on column + row data
  const renderCell = (col: string, row: Record<string, string>) => {
    switch (col) {
      case 'Plan ID':
        return (
          <div className="flex items-center">
            <span className="text-sm font-semibold text-primary tabular">{row.id}</span>
            <CopyBtn value={row.id} />
          </div>
        );
      case 'Purchase Date':
        return <span className="text-sm tabular text-ink-2">{row.date ?? '—'}</span>;
      case 'Customer Name':
        return <span className="text-sm text-ink">{row.name ?? '—'}</span>;
      case 'Phone Number':
        return (
          <div className="flex items-center">
            <span className="text-sm tabular text-ink-2">{row.phone ?? '—'}</span>
            {row.phone && <CopyBtn value={row.phone} />}
          </div>
        );
      case 'Serial Number':
      case 'IMEI / Serial Number':
        return (
          <div className="flex items-center">
            <span className="text-sm tabular text-ink-2 truncate max-w-[140px]">{row.serial ?? '—'}</span>
            {row.serial && <CopyBtn value={row.serial} />}
          </div>
        );
      case 'CRM ID':
        return <span className="text-sm tabular text-ink-2">{row.crm ?? '—'}</span>;
      case 'Contract ID':
        return <span className="text-sm tabular text-ink-2">{row.contract ?? '—'}</span>;
      case 'Warranty Status':
        return <Pill tone={row.warrantyStatus === 'Active' ? 'success' : 'warning'}>{row.warrantyStatus}</Pill>;
      case 'Payment Status':
        return <Pill tone={row.payStatus === 'Paid' ? 'success' : 'danger'}>{row.payStatus}</Pill>;
      case 'Status':
        return <Pill tone={row.tone as Tone}>{row.status}</Pill>;
      case 'Additional Remarks':
        return (
          <span className="text-sm text-ink-2 truncate max-w-[180px] block" title={row.remarks}>
            {row.remarks === '-' || !row.remarks ? <span className="text-ink-3">—</span> : row.remarks}
          </span>
        );
      case 'Device Model':
        return <span className="text-sm text-ink">{row.model ?? '—'}</span>;
      case 'Plan Name':
        return <Pill tone="info">{row.plan}</Pill>;
      case 'Store Name':
        return <span className="text-sm text-ink-2">{row.store ?? '—'}</span>;
      case 'Branch Name':
        return <span className="text-sm text-ink-2">{row.branch ?? '—'}</span>;
      default:
        return <span className="text-sm text-ink-3">—</span>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-canvas font-sans">

      {/* ── Sidebar ── */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex h-[72px] items-center gap-3 border-b border-line px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary">
            <TrendingUp size={18} className="text-white" />
          </div>
          <span className="text-[17px] font-semibold text-ink">Ops Dashboard</span>
        </div>

        <nav className="flex-1 px-3 py-4">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-ink-3">Brands</p>
          {(['Hitachi', 'Godrej', 'Samsung'] as BrandKey[]).map((item) => (
            <button
              key={item}
              onClick={() => { setActiveBrand(item); setActiveCard(null); }}
              className={`relative mb-0.5 flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium transition-all ${
                activeBrand === item ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-subtle hover:text-ink'
              }`}
            >
              {activeBrand === item && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />
              )}
              <div className={`flex h-7 w-7 items-center justify-center rounded-[6px] text-xs font-bold ${
                activeBrand === item ? 'bg-primary text-white' : 'bg-subtle text-ink-2'
              }`}>
                {item[0]}
              </div>
              {item}
              {activeBrand === item && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </button>
          ))}

          <div className="my-3 border-t border-line" />
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-ink-3">Admin</p>
          {['Upload History', 'Users'].map((item) => (
            <button key={item} className="mb-0.5 flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-subtle hover:text-ink transition-all">
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-subtle text-ink-3 text-xs">
                {item === 'Upload History' ? <Upload size={13} /> : <Bell size={13} />}
              </div>
              {item}
            </button>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-[8px] p-3 hover:bg-subtle cursor-pointer transition-all">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">US</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">Umang Sinha</p>
              <p className="text-xs text-ink-3">Admin</p>
            </div>
            <MoreHorizontal size={16} className="text-ink-3" />
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-line bg-surface px-8" style={{ boxShadow: '0 2px 4px rgba(16,24,40,0.06)' }}>
          <div>
            <h1 className="text-xl font-semibold text-ink">{activeBrand} Overview</h1>
            <p className="text-xs text-ink-3 mt-0.5">Last updated: 02 Oct 2026, 10:42 by Umang Sinha</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSkeleton(!showSkeleton)}
              className="mr-2 text-xs text-ink-3 underline hover:text-primary transition-colors"
            >
              {showSkeleton ? 'Show real data' : 'Preview loading'}
            </button>
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />}>Reset</Button>
            <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => setModalOpen(true)}>Import</Button>
            <Button variant="primary" size="sm" icon={<Download size={14} />}>Export</Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">

          {/* Summary Cards */}
          {showSkeleton ? (
            <div className="mb-6 grid gap-5" style={{ gridTemplateColumns: `repeat(${brand.cards.length}, 1fr)` }}>
              {brand.cards.map((_, i) => <Skeleton key={i} variant="card" />)}
            </div>
          ) : (
            <div className="mb-6 grid gap-5" style={{ gridTemplateColumns: `repeat(${brand.cards.length}, 1fr)` }}>
              {brand.cards.map((card) => {
                const Icon = card.icon;
                const isActive = activeCard === card.label;
                return (
                  <button
                    key={card.label}
                    onClick={() => setActiveCard(isActive ? null : card.label)}
                    className="text-left rounded-[10px] border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    style={{
                      borderColor: isActive ? card.tone : '#E5E7EB',
                      borderWidth: isActive ? 2 : 1,
                      boxShadow: isActive
                        ? `0 0 0 3px ${card.tone}18, 0 4px 12px rgba(16,24,40,0.1)`
                        : '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3">{card.label}</p>
                      <div className="flex h-10 w-10 items-center justify-center rounded-[8px]" style={{ color: card.tone, backgroundColor: card.soft }}>
                        <Icon size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-[34px] font-bold leading-none tabular" style={{ color: card.tone }}>{card.value}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Filter bar */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1">
              <Input searchIcon placeholder="Search by Plan ID, phone, serial, CRM ID, Contract ID…" />
            </div>
            <button className="flex h-10 items-center gap-2 rounded-[6px] border border-line bg-surface px-4 text-sm text-ink-2 hover:border-line-strong hover:text-ink transition-colors whitespace-nowrap">
              <Filter size={15} />
              Filters
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">2</span>
            </button>
            <button className="flex h-10 items-center gap-2 rounded-[6px] border border-line bg-surface px-4 text-sm text-ink-2 hover:border-line-strong transition-colors whitespace-nowrap">
              Sep 01 – Oct 01, 2026 <ChevronDown size={14} />
            </button>
          </div>

          {/* Table */}
          <div className="rounded-[10px] border border-line bg-surface overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)' }}>
            <div className="overflow-x-auto">
              {showSkeleton ? (
                <>
                  {[1,2,3,4,5].map(i => <Skeleton key={i} variant="row" />)}
                </>
              ) : (
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b border-line bg-canvas">
                      {brand.columns.map((col) => (
                        <th key={col} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-3 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b border-line bg-surface">
                      {brand.columns.map((col) => (
                        <td key={col} className="px-3 py-2">
                          {col === 'Status' || col === 'Payment Status' || col === 'Warranty Status' || col === 'Plan Name' ? (
                            <select className="h-8 w-full appearance-none rounded-[6px] border border-line bg-canvas px-2 text-xs text-ink-2 outline-none focus:border-primary min-w-[120px]">
                              <option>All</option>
                            </select>
                          ) : col === 'Purchase Date' ? (
                            <Input placeholder="Date range" className="h-8 text-xs min-w-[120px]" />
                          ) : (
                            <Input searchIcon placeholder="Search" className="h-8 text-xs min-w-[120px]" />
                          )}
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {brand.rows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => { setSelectedRow(row); setDrawerOpen(true); }}
                        className="group cursor-pointer border-b border-line transition-colors hover:bg-subtle last:border-0"
                      >
                        {brand.columns.map((col) => (
                          <td key={col} className="px-5 py-4 whitespace-nowrap">
                            {renderCell(col, row as unknown as Record<string, string>)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-line px-5 py-3">
              <p className="text-sm text-ink-3">Showing <span className="font-medium text-ink">1–25</span> of <span className="font-medium text-ink">{brand.cards[0].value}</span> records</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, '…', 173].map((p, i) => (
                  <button key={i} className={`flex h-8 min-w-[32px] items-center justify-center rounded-[6px] text-sm px-2 transition-colors ${p === 1 ? 'bg-primary text-white font-medium' : 'text-ink-2 hover:bg-subtle'}`}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Import Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg" title={`Import ${activeBrand} Data`}>
        <div className="space-y-5">
          <div className="flex flex-col items-center justify-center rounded-[8px] border-2 border-dashed border-line bg-canvas py-10 hover:border-primary hover:bg-primary-soft/30 cursor-pointer transition-colors">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
              <Upload size={22} className="text-primary" />
            </div>
            <p className="text-sm font-medium text-ink">Drag & drop your file here</p>
            <p className="mt-1 text-xs text-ink-3">or <span className="text-primary underline">browse</span> · .xlsx or .csv · max 25 MB</p>
          </div>
          <div className="rounded-[8px] border border-line bg-canvas p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">{activeBrand}_Data_Oct2026.xlsx</p>
              <button><X size={14} className="text-ink-3 hover:text-ink" /></button>
            </div>
            <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
              <div className="h-full w-3/4 rounded-full bg-primary" />
            </div>
            <p className="mt-1.5 text-xs text-ink-3">Processing… 75%</p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Rows', value: '3,200', color: '#4B5563' },
              { label: 'Inserted',   value: '2,980', color: '#2E9E5B' },
              { label: 'Updated',    value: '195',   color: '#4F5FE8' },
              { label: 'Skipped',    value: '25',    color: '#E5252A' },
            ].map(s => (
              <div key={s.label} className="rounded-[8px] border border-line bg-surface p-3 text-center">
                <p className="text-[11px] uppercase tracking-wider text-ink-3">{s.label}</p>
                <p className="mt-1 text-2xl font-bold tabular" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>

      {/* ── Record Drawer ── */}
      {selectedRow && (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Record Details">
          <div>
            <div className="mb-5 flex items-center gap-3 flex-wrap">
              <p className="text-xl font-bold text-primary tabular">{selectedRow.id}</p>
              {selectedRow.status && <Pill tone={selectedRow.tone}>{selectedRow.status}</Pill>}
            </div>

            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-3">Key Details</p>
            <div className="divide-y divide-line rounded-[10px] border border-line overflow-hidden mb-5">
              {Object.entries(selectedRow)
                .filter(([k]) => !['id', 'tone'].includes(k))
                .map(([key, val]) => {
                  const label = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, s => s.toUpperCase())
                    .replace('Crm', 'CRM')
                    .replace('Pay Status', 'Payment Status')
                    .replace('Warranty Status', 'Warranty Status');
                  return (
                    <div key={key} className="flex items-start justify-between bg-surface px-4 py-3">
                      <p className="text-xs text-ink-3 w-28 shrink-0 pt-0.5">{label}</p>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        {key === 'status'
                          ? <Pill tone={selectedRow.tone}>{String(val)}</Pill>
                          : key === 'warrantyStatus'
                            ? <Pill tone={val === 'Active' ? 'success' : 'warning'}>{String(val)}</Pill>
                            : key === 'payStatus'
                              ? <Pill tone={val === 'Paid' ? 'success' : 'danger'}>{String(val)}</Pill>
                              : <p className="text-sm font-medium text-ink text-right tabular">
                                  {String(val) === '-' || !val ? <span className="text-ink-3">—</span> : String(val)}
                                </p>
                        }
                        {['phone', 'serial', 'crm', 'contract', 'id'].includes(key) && Boolean(val) && (
                          <button onClick={() => handleCopy(String(val))} className="text-ink-3 hover:text-primary transition-colors">
                            <Copy size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="rounded-[8px] border border-line bg-canvas p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3 mb-1">All Raw Data</p>
              <p className="text-xs text-ink-3">All columns from the original Excel file are stored and visible here.</p>
            </div>
            <p className="mt-4 text-xs text-ink-3 text-center">
              Last updated via <span className="font-medium text-ink">{activeBrand}_Oct2026.xlsx</span>
            </p>
          </div>
        </Drawer>
      )}
    </div>
  );
}
