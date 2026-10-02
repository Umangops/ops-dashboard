'use client';
import { useState } from 'react';
import { FileText, CheckCircle, Ban, Clock, Inbox } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Pill from '@/components/ui/Pill';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Drawer from '@/components/ui/Drawer';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink-2">{title}</h2>
      <div className="rounded-[10px] border border-line bg-surface p-6">{children}</div>
    </section>
  );
}

export default function PreviewPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas p-10">
      <h1 className="mb-2 text-2xl font-semibold text-ink">Component Preview</h1>
      <p className="mb-8 text-sm text-ink-2">All UI components — delete this page after checking.</p>

      {/* Buttons */}
      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" icon={<FileText size={16} />}>With Icon</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="secondary" size="sm">Small Secondary</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </Section>

      {/* Inputs */}
      <Section title="Inputs">
        <div className="grid gap-4 max-w-sm">
          <Input placeholder="Default input" />
          <Input searchIcon placeholder="Search Plan ID, phone, IMEI…" />
          <Input placeholder="With error" error="This field is required" />
        </div>
      </Section>

      {/* Select */}
      <Section title="Select">
        <div className="max-w-xs">
          <Select
            options={[
              { label: 'Plan Active', value: 'Plan Active' },
              { label: 'Plan Inactive', value: 'Plan Inactive' },
              { label: 'Pending Payment', value: 'Pending Payment' },
            ]}
            placeholder="All statuses"
          />
        </div>
      </Section>

      {/* Pills */}
      <Section title="Status Pills">
        <div className="flex flex-wrap gap-3">
          <Pill tone="info">Total Plans</Pill>
          <Pill tone="success">Plan Active</Pill>
          <Pill tone="success">Contract Booked</Pill>
          <Pill tone="warning">Pending Payment</Pill>
          <Pill tone="danger">Plan Inactive</Pill>
          <Pill tone="danger">Not Booked</Pill>
          <Pill tone="neutral">Unknown</Pill>
        </div>
      </Section>

      {/* Summary Cards (mini preview) */}
      <Section title="Summary Cards (preview)">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Total Plans', value: '4,312', tone: '#4F5FE8', bg: '#E8EBFD', icon: <FileText size={20} /> },
            { label: 'Plan Active', value: '3,950', tone: '#2E9E5B', bg: '#DDF5E7', icon: <CheckCircle size={20} /> },
            { label: 'Plan Inactive', value: '210', tone: '#E5252A', bg: '#FDE2E2', icon: <Ban size={20} /> },
            { label: 'Pending Payment', value: '152', tone: '#D4A017', bg: '#FDF3D0', icon: <Clock size={20} /> },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-[10px] border border-line bg-surface p-5 cursor-pointer hover:shadow-md transition-shadow"
              style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-2">{card.label}</p>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[8px]"
                  style={{ color: card.tone, backgroundColor: card.bg }}
                >
                  {card.icon}
                </div>
              </div>
              <p className="text-[36px] font-bold leading-none tabular" style={{ color: card.tone }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Skeletons */}
      <Section title="Skeletons (loading state)">
        <div className="space-y-4">
          <Skeleton variant="text" className="w-48" />
          <Skeleton variant="number" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Skeleton variant="card" />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
          <div className="rounded-[10px] border border-line bg-surface overflow-hidden">
            <Skeleton variant="row" />
            <Skeleton variant="row" />
            <Skeleton variant="row" />
          </div>
        </div>
      </Section>

      {/* Empty State */}
      <Section title="Empty State">
        <EmptyState
          icon={<Inbox size={40} />}
          title="No records match your filters"
          message="Try adjusting your search or filters to find what you're looking for."
          action={<Button variant="secondary">Reset filters</Button>}
        />
      </Section>

      {/* Modal */}
      <Section title="Modal">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Example Modal" size="md">
          <p className="text-sm text-ink-2">
            This is a modal dialog. It closes when you press <strong>Esc</strong>, click the X, or
            click the dark overlay behind it.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>Confirm</Button>
          </div>
        </Modal>
      </Section>

      {/* Drawer */}
      <Section title="Drawer / Side Sheet">
        <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open Drawer</Button>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Record Details">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Plan ID</p>
              <p className="mt-1 font-semibold text-primary tabular">WBN3560015</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Customer</p>
              <p className="mt-1 text-sm text-ink">Shyam Sundar Ghosh</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Phone</p>
              <p className="mt-1 text-sm text-ink tabular">9732568546</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Status</p>
              <Pill tone="warning" className="mt-1">Pending Payment</Pill>
            </div>
          </div>
        </Drawer>
      </Section>
    </div>
  );
}
