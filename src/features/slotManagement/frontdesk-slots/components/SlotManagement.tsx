import { useEffect, useState, useCallback, useRef } from 'react';
import { getAllProviders } from '../../../providerManagement/frontdesk-provider/services/providerService';
import { getProviderSlots, createProviderSlots } from '../services/slotService';
import type { SlotResponse, SlotCreateItem } from '../services/slotService';
import type { ProviderDetail } from '../../../../common/DataModels/Appointments';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getInitials(f: string, l: string) {
  return `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase();
}

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-[#3b5bfc] to-blue-500',
  'from-emerald-500 to-teal-500',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-orange-500',
];
function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function statusColor(s: string) {
  if (s === 'AVAILABLE') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (s === 'BOOKED') return 'bg-blue-50 text-blue-600 border-blue-100';
  return 'bg-slate-100 text-slate-400 border-slate-200';
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold ${
        type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      {type === 'success' ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {message}
    </div>
  );
}

// ─── Time options ─────────────────────────────────────────────────────────────

function buildTimeOptions() {
  const opts: string[] = [];
  for (let h = 6; h <= 21; h++) {
    for (const m of [0, 30]) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
}
const TIME_OPTIONS = buildTimeOptions();

// ─── Single slot row in form ──────────────────────────────────────────────────

function SlotRow({
  slot,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  slot: SlotCreateItem;
  index: number;
  onChange: (i: number, field: keyof SlotCreateItem, value: string) => void;
  onRemove: (i: number) => void;
  canRemove: boolean;
}) {
  const base =
    'w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3b5bfc]/20 focus:border-[#3b5bfc] focus:bg-white transition';

  return (
    <div className="flex items-end gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 group hover:border-blue-100 hover:bg-blue-50/20 transition">
      <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-[#3b5bfc]/10 flex items-center justify-center">
        <span className="text-[10px] font-bold text-[#3b5bfc]">{index + 1}</span>
      </div>

      <div className="flex-1 min-w-0">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          Date
        </label>
        <input
          type="date"
          value={slot.availability_date}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => onChange(index, 'availability_date', e.target.value)}
          className={base}
        />
      </div>

      <div className="w-28 flex-shrink-0">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          Start
        </label>
        <select
          value={slot.start_time}
          onChange={(e) => onChange(index, 'start_time', e.target.value)}
          className={base}
        >
          {TIME_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {formatTime(t)}
            </option>
          ))}
        </select>
      </div>

      <div className="w-28 flex-shrink-0">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          End
        </label>
        <select
          value={slot.end_time}
          onChange={(e) => onChange(index, 'end_time', e.target.value)}
          className={base}
        >
          {TIME_OPTIONS.filter((t) => t > slot.start_time).map((t) => (
            <option key={t} value={t}>
              {formatTime(t)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-0">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          Notes
        </label>
        <input
          type="text"
          value={slot.notes ?? ''}
          onChange={(e) => onChange(index, 'notes', e.target.value)}
          placeholder="e.g. Morning slot"
          className={base}
        />
      </div>

      <button
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        className="flex-shrink-0 mb-0.5 w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-red-100"
        title="Remove slot"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

// ─── Add Slots Modal ──────────────────────────────────────────────────────────

function AddSlotsModal({
  provider,
  onClose,
  onSuccess,
}: {
  provider: ProviderDetail;
  onClose: () => void;
  onSuccess: (created: number, skipped: number) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];

  const makeSlot = (): SlotCreateItem => ({
    availability_date: today,
    start_time: '09:00',
    end_time: '09:30',
    notes: '',
  });

  const [slots, setSlots] = useState<SlotCreateItem[]>([makeSlot()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (i: number, field: keyof SlotCreateItem, value: string) => {
    setSlots((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      // auto-fix end_time if it's no longer after start_time
      if (field === 'start_time' && next[i].end_time <= value) {
        const idx = TIME_OPTIONS.indexOf(value);
        next[i].end_time = TIME_OPTIONS[idx + 1] ?? value;
      }
      return next;
    });
  };

  const addRow = () => setSlots((prev) => [...prev, makeSlot()]);
  const removeRow = (i: number) => setSlots((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    // basic validation
    for (const s of slots) {
      if (!s.availability_date) {
        setError('All slots must have a date.');
        return;
      }
      if (s.end_time <= s.start_time) {
        setError('End time must be after start time for all slots.');
        return;
      }
    }
    setError('');
    setSaving(true);
    try {
      const payload = {
        slots: slots.map((s) => ({
          availability_date: s.availability_date,
          start_time: s.start_time,
          end_time: s.end_time,
          notes: s.notes || undefined,
        })),
      };
      const res = await createProviderSlots(provider.id, payload);
      onSuccess(res.created.length, res.skipped);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to create slots. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // bulk fill helper
  const [bulkDate, setBulkDate] = useState(today);
  const [bulkFrom, setBulkFrom] = useState('09:00');
  const [bulkTo, setBulkTo] = useState('17:00');
  const [showBulk, setShowBulk] = useState(false);

  const applyBulk = () => {
    const generated: SlotCreateItem[] = [];
    let cur = bulkFrom;
    while (cur < bulkTo) {
      const idx = TIME_OPTIONS.indexOf(cur);
      if (idx === -1) break;
      const next = TIME_OPTIONS[idx + 1];
      if (!next || next > bulkTo) break;
      generated.push({ availability_date: bulkDate, start_time: cur, end_time: next, notes: '' });
      cur = next;
    }
    if (generated.length === 0) return;
    setSlots((prev) => [...prev, ...generated]);
    setShowBulk(false);
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,19,64,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarColor(provider.id)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
              {getInitials(provider.first_name, provider.last_name)}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#3b5bfc] mb-0.5">
                Add Slots
              </p>
              <h2 className="text-lg font-bold text-[#0f1340]" style={{ fontFamily: "'Syne', sans-serif" }}>
                Dr. {provider.first_name} {provider.last_name}
              </h2>
              {provider.provider_profile?.specialization && (
                <p className="text-xs text-slate-400 mt-0.5">{provider.provider_profile.specialization}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Bulk Generator */}
        <div className="px-7 pt-4 pb-0 flex-shrink-0">
          <button
            onClick={() => setShowBulk((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-[#3b5bfc] hover:text-[#2f4edc] transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick fill — generate 30-min slots for a time range
            <svg className={`w-3.5 h-3.5 transition-transform ${showBulk ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showBulk && (
            <div className="mt-3 p-4 rounded-2xl bg-[#eef2ff] border border-blue-100 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#3b5bfc] mb-1">Date</label>
                <input
                  type="date"
                  value={bulkDate}
                  min={today}
                  onChange={(e) => setBulkDate(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-blue-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3b5bfc]/20 focus:border-[#3b5bfc] transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#3b5bfc] mb-1">From</label>
                <select
                  value={bulkFrom}
                  onChange={(e) => setBulkFrom(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-blue-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3b5bfc]/20 focus:border-[#3b5bfc] transition"
                >
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#3b5bfc] mb-1">To</label>
                <select
                  value={bulkTo}
                  onChange={(e) => setBulkTo(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-blue-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3b5bfc]/20 focus:border-[#3b5bfc] transition"
                >
                  {TIME_OPTIONS.filter((t) => t > bulkFrom).map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </div>
              <button
                onClick={applyBulk}
                className="px-4 py-2 bg-[#3b5bfc] text-white text-xs font-bold rounded-xl hover:bg-[#2f4edc] transition shadow-md shadow-blue-200"
              >
                Generate Slots
              </button>
            </div>
          )}
        </div>

        {/* Slot Rows */}
        <div className="px-7 py-4 space-y-2 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {slots.length} slot{slots.length !== 1 ? 's' : ''} to add
            </p>
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#3b5bfc] hover:text-[#2f4edc] transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Row
            </button>
          </div>

          {slots.map((slot, i) => (
            <SlotRow
              key={i}
              slot={slot}
              index={i}
              onChange={handleChange}
              onRemove={removeRow}
              canRemove={slots.length > 1}
            />
          ))}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-7 pb-6 pt-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 text-sm font-bold rounded-xl bg-[#3b5bfc] text-white hover:bg-[#2f4edc] disabled:opacity-50 transition shadow-md shadow-blue-200 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Save {slots.length} Slot{slots.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Slots Modal ─────────────────────────────────────────────────────────

function ViewSlotsModal({
  provider,
  onClose,
  onAddMore,
}: {
  provider: ProviderDetail;
  onClose: () => void;
  onAddMore: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<SlotResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getProviderSlots(provider.id);
      setSlots(data);
    } catch {
      setError('Failed to load slots.');
    } finally {
      setLoading(false);
    }
  }, [provider.id]);

  useEffect(() => { load(); }, [load]);

  // group by date
  const grouped = slots
    .filter((s) => {
      if (!search) return true;
      return (
        s.availability_date.includes(search) ||
        s.start_time.includes(search) ||
        (s.notes ?? '').toLowerCase().includes(search.toLowerCase())
      );
    })
    .reduce<Record<string, SlotResponse[]>>((acc, s) => {
      acc[s.availability_date] = acc[s.availability_date] ?? [];
      acc[s.availability_date].push(s);
      return acc;
    }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,19,64,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');`}</style>

        <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarColor(provider.id)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
              {getInitials(provider.first_name, provider.last_name)}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#3b5bfc] mb-0.5">Availability</p>
              <h2 className="text-lg font-bold text-[#0f1340]" style={{ fontFamily: "'Syne', sans-serif" }}>
                Dr. {provider.first_name} {provider.last_name}
              </h2>
              {provider.provider_profile?.specialization && (
                <p className="text-xs text-slate-400 mt-0.5">{provider.provider_profile.specialization}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAddMore}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#3b5bfc] text-white text-xs font-bold rounded-xl hover:bg-[#2f4edc] transition shadow-md shadow-blue-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add More
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-7 pt-4 pb-2 flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by date or notes..."
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3b5bfc]/20 focus:border-[#3b5bfc] focus:bg-white transition"
            />
          </div>
        </div>

        <div className="px-7 py-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="skeleton h-3 rounded w-24" />
                  <div className="skeleton h-10 rounded-xl w-full" />
                  <div className="skeleton h-10 rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-3xl mb-3">⚠️</div>
              <p className="text-sm text-slate-500">{error}</p>
              <button onClick={load} className="mt-3 px-4 py-2 bg-[#3b5bfc] text-white text-xs font-semibold rounded-xl hover:bg-[#2f4edc] transition">
                Retry
              </button>
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-3xl mb-4">📅</div>
              <p className="text-base font-bold text-[#0f1340] mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
                No slots found
              </p>
              <p className="text-sm text-slate-400 mb-4">
                {search ? 'Try a different search.' : 'No availability set for this provider.'}
              </p>
              {!search && (
                <button onClick={onAddMore} className="px-4 py-2 bg-[#3b5bfc] text-white text-sm font-semibold rounded-xl hover:bg-[#2f4edc] transition">
                  Add Slots
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {sortedDates.map((date) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-[#0f1340] uppercase tracking-wider">
                      {formatDate(date)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      ({grouped[date].length} slot{grouped[date].length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {grouped[date].map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition group"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#0f1340]">
                            {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                          </p>
                          {slot.notes && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{slot.notes}</p>
                          )}
                        </div>
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor(slot.status)}`}>
                          {slot.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-7 pb-6 pt-4 border-t border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Total: <span className="font-semibold text-slate-600">{slots.length} slots</span>
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SlotManagement() {
  const [providers, setProviders] = useState<ProviderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');

  const [addingFor, setAddingFor] = useState<ProviderDetail | null>(null);
  const [viewingFor, setViewingFor] = useState<ProviderDetail | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await getAllProviders();
      setProviders(data);
    } catch {
      setFetchError('Failed to load providers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = providers.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      (p.provider_profile?.specialization ?? '').toLowerCase().includes(q)
    );
  });

  const handleSlotSuccess = (created: number, skipped: number) => {
    setAddingFor(null);
    const msg =
      skipped > 0
        ? `${created} slot${created !== 1 ? 's' : ''} added · ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped`
        : `${created} slot${created !== 1 ? 's' : ''} added successfully`;
    setToast({ message: msg, type: 'success' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        .skeleton{background:linear-gradient(90deg,#f0f4ff 25%,#e8eeff 50%,#f0f4ff 75%);background-size:200% 100%;animation:shimmer 1.4s infinite}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .pcard:hover .pcard-actions{opacity:1;transform:translateY(0)}
        .pcard-actions{opacity:0;transform:translateY(4px);transition:opacity 0.18s ease,transform 0.18s ease}
      `}</style>

      {/* Page header */}
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3b5bfc] mb-1">
          Front Desk
        </p>
        <h1
          className="text-3xl font-bold text-[#0f1340]"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Slot Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Select a provider to view their availability or add new appointment slots.
        </p>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm mb-6">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or specialization..."
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3b5bfc]/30 focus:border-[#3b5bfc] shadow-sm transition"
        />
      </div>

      {/* Provider grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="skeleton w-12 h-12 rounded-2xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 rounded w-3/4" />
                  <div className="skeleton h-2.5 rounded w-1/2" />
                </div>
              </div>
              <div className="skeleton h-9 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="font-semibold text-slate-700 mb-1">Failed to load providers</p>
          <p className="text-sm text-slate-400 mb-4">{fetchError}</p>
          <button onClick={load} className="px-5 py-2.5 bg-[#3b5bfc] text-white text-sm font-semibold rounded-xl hover:bg-[#2f4edc] transition">
            Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-3xl mb-4">🩺</div>
          <p className="text-lg font-bold text-[#0f1340] mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
            No providers found
          </p>
          <p className="text-sm text-slate-400">
            {search ? 'Try adjusting your search.' : 'No providers registered yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="pcard bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200 overflow-hidden flex flex-col"
            >
              {/* Card body */}
              <div className="p-5 flex-1">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarColor(p.id)} flex items-center justify-center text-white font-bold text-base flex-shrink-0`}>
                    {getInitials(p.first_name, p.last_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#0f1340] text-sm leading-tight truncate">
                      Dr. {p.first_name} {p.last_name}
                    </p>
                    {p.provider_profile?.specialization ? (
                      <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700 text-[11px] font-semibold border border-violet-100">
                        {p.provider_profile.specialization}
                      </span>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1 italic">No specialization</p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${p.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {p.is_active ? 'Active' : 'Off'}
                  </span>
                </div>

                {p.provider_profile?.qualification && (
                  <p className="text-xs text-slate-400 mb-1 truncate">
                    <span className="font-medium text-slate-500">Qual:</span> {p.provider_profile.qualification}
                  </p>
                )}
                {p.provider_profile?.experience != null && (
                  <p className="text-xs text-slate-400 truncate">
                    <span className="font-medium text-slate-500">Exp:</span> {p.provider_profile.experience} yrs
                  </p>
                )}
              </div>

              {/* Card actions */}
              <div className="pcard-actions px-4 pb-4 flex gap-2">
                <button
                  onClick={() => setViewingFor(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-[#3b5bfc] hover:bg-[#f5f7ff] transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Slots
                </button>
                <button
                  onClick={() => setAddingFor(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl bg-[#3b5bfc] text-white hover:bg-[#2f4edc] transition shadow-sm shadow-blue-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Slots
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {addingFor && (
        <AddSlotsModal
          provider={addingFor}
          onClose={() => setAddingFor(null)}
          onSuccess={handleSlotSuccess}
        />
      )}
      {viewingFor && (
        <ViewSlotsModal
          provider={viewingFor}
          onClose={() => setViewingFor(null)}
          onAddMore={() => {
            setAddingFor(viewingFor);
            setViewingFor(null);
          }}
        />
      )}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
