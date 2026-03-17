import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getProviders,
  createProvider,
  fetchAppointmentTypes,
} from '../services/providerService';
import type { CreateProviderPayload } from '../services/providerService';
import type { ProviderDetail } from '../../../../common/DataModels/Appointments';
import type { AppointmentType } from '../../../../common/DataModels/Booking';
import { rules, collectErrors, type FieldErrors } from '../../../../common/validation';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const COUNTRY_CODES = [
  '+91',
  '+1',
  '+44',
  '+61',
  '+971',
  '+65',
  '+60',
  '+66',
  '+81',
  '+49',
];

function formatDate(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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

function FieldMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      {msg}
    </p>
  );
}
function ic(base: string, err?: string) {
  return `${base} ${err ? '!border-red-400 !bg-red-50/30 focus:!ring-red-300 focus:!border-red-400' : ''}`;
}

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
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold ${type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
    >
      {type === 'success' ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      {message}
    </div>
  );
}

function CreateProviderModal({
  onClose,
  onCreated,
  appointmentTypes,
}: {
  onClose: () => void;
  onCreated: (p: ProviderDetail) => void;
  appointmentTypes: AppointmentType[];
}) {
  const base =
    'w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3b5bfc]/20 focus:border-[#3b5bfc] focus:bg-white transition';
  const overlayRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    country_code: '+91',
    phone_no: '',
    appointment_type_id: '',
    specialization: '',
    qualification: '',
    experience: '',
    bio: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const validate = (f = form): FieldErrors =>
    collectErrors({
      first_name:
        rules.required(f.first_name, 'First name') ||
        rules.maxLen(f.first_name, 100, 'First name'),
      last_name:
        rules.required(f.last_name, 'Last name') ||
        rules.maxLen(f.last_name, 100, 'Last name'),
      email: rules.required(f.email, 'Email') || rules.email(f.email),
      password: rules.required(f.password, 'Password') || rules.password(f.password),
      phone_no: rules.required(f.phone_no, 'Phone') || rules.phone(f.phone_no),
    });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const next = { ...form, [e.target.name]: e.target.value };
    setForm(next);
    if (touched[e.target.name]) setFieldErrors(validate(next));
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const name = e.target.name;
    setTouched((t) => ({ ...t, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validate()[name] }));
  };

  const handleSave = async () => {
    const allTouched = Object.fromEntries(Object.keys(form).map((k) => [k, true]));
    setTouched(allTouched);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setServerError('');
    setSaving(true);
    try {
      const payload: CreateProviderPayload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        country_code: form.country_code,
        phone_no: form.phone_no,
        role_id: 2, // provider role
        appointment_type_id: form.appointment_type_id
          ? Number(form.appointment_type_id)
          : null,
        provider_profile: {
          specialization: form.specialization || undefined,
          qualification: form.qualification || undefined,
          experience: form.experience ? Number(form.experience) : undefined,
          bio: form.bio || undefined,
        },
      };
      const created = await createProvider(payload);
      onCreated(created);
    } catch (e: any) {
      setServerError(e?.response?.data?.detail || 'Failed to create provider.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,19,64,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');`}</style>

        
        <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#3b5bfc] mb-0.5">
              Add New
            </p>
            <h2
              className="text-lg font-bold text-[#0f1340]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Create Provider
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        
        <div className="px-7 py-6 space-y-6 overflow-y-auto flex-1">
          
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-md bg-[#3b5bfc] flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f1340]">
                Account Information
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#0f1340] mb-1.5">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={ic(base, fieldErrors.first_name)}
                  placeholder="Arjun"
                />
                <FieldMsg msg={fieldErrors.first_name} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#0f1340] mb-1.5">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={ic(base, fieldErrors.last_name)}
                  placeholder="Kumar"
                />
                <FieldMsg msg={fieldErrors.last_name} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-[#0f1340] mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={ic(base, fieldErrors.email)}
                  placeholder="doctor@clinic.com"
                />
                <FieldMsg msg={fieldErrors.email} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#0f1340] mb-1.5">
                  Country Code <span className="text-red-400">*</span>
                </label>
                <select
                  name="country_code"
                  value={form.country_code}
                  onChange={handleChange}
                  className={base}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#0f1340] mb-1.5">
                  Phone <span className="text-red-400">*</span>
                </label>
                <input
                  name="phone_no"
                  value={form.phone_no}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={ic(base, fieldErrors.phone_no)}
                  placeholder="9000000001"
                />
                <FieldMsg msg={fieldErrors.phone_no} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-[#0f1340] mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={ic(base, fieldErrors.password)}
                  placeholder="Min 6 chars, 1 uppercase, 1 number, 1 symbol"
                />
                <FieldMsg msg={fieldErrors.password} />
              </div>
            </div>
          </div>

          
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
              Professional Details
            </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-md bg-violet-500 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f1340]">
                Provider Profile
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-[#0f1340] mb-1.5">
                  Appointment Type
                  <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-slate-400">
                    (which appointments this provider handles)
                  </span>
                </label>
                <select
                  name="appointment_type_id"
                  value={form.appointment_type_id}
                  onChange={handleChange}
                  className={base}
                >
                  <option value="">Select appointment type...</option>
                  {appointmentTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.duration_minutes ? ` (${t.duration_minutes} min)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#0f1340] mb-1.5">
                  Specialization
                </label>
                <input
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                  className={base}
                  placeholder="e.g. General Physician"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#0f1340] mb-1.5">
                  Qualification
                </label>
                <input
                  name="qualification"
                  value={form.qualification}
                  onChange={handleChange}
                  className={base}
                  placeholder="e.g. MBBS, MD"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#0f1340] mb-1.5">
                  Experience (years)
                </label>
                <input
                  name="experience"
                  type="number"
                  min="0"
                  max="60"
                  value={form.experience}
                  onChange={handleChange}
                  className={base}
                  placeholder="e.g. 8"
                />
              </div>
              <div></div>
              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-[#0f1340] mb-1.5">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={3}
                  className={`${base} resize-none`}
                  placeholder="Brief description about the provider..."
                />
              </div>
            </div>
          </div>

          {serverError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg
                className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-600">{serverError}</p>
            </div>
          )}
        </div>

        
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
                Creating...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Provider
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewProviderModal({
  provider,
  onClose,
}: {
  provider: ProviderDetail;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,19,64,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');`}</style>
        <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarColor(provider.id)} flex items-center justify-center text-white font-bold text-base flex-shrink-0`}
            >
              {getInitials(provider.first_name, provider.last_name)}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#3b5bfc] mb-0.5">
                Provider Profile
              </p>
              <h2
                className="text-lg font-bold text-[#0f1340]"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {provider.first_name} {provider.last_name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="px-7 py-6 space-y-5 overflow-y-auto flex-1">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md bg-[#3b5bfc] flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f1340]">
                Contact
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Email', value: provider.email },
                {
                  label: 'Phone',
                  value: `${provider.country_code} ${provider.phone_no}`,
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#3b5bfc] mb-1">
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-slate-700 truncate">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {provider.provider_profile && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-md bg-violet-500 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f1340]">
                  Professional Details
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {provider.provider_profile.specialization && (
                  <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#3b5bfc] mb-1">
                      Specialization
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {provider.provider_profile.specialization}
                    </p>
                  </div>
                )}
                {provider.provider_profile.qualification && (
                  <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#3b5bfc] mb-1">
                      Qualification
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {provider.provider_profile.qualification}
                    </p>
                  </div>
                )}
                {(provider.provider_profile.years_of_experience != null ||
                  provider.provider_profile.experience != null) && (
                  <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#3b5bfc] mb-1">
                      Experience
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {provider.provider_profile.years_of_experience ??
                        provider.provider_profile.experience}{' '}
                      yrs
                    </p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#3b5bfc] mb-1">
                    Joined
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatDate(provider.created_at)}
                  </p>
                </div>
              </div>
              {provider.provider_profile.bio && (
                <div className="mt-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#3b5bfc] mb-1">
                    Bio
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {provider.provider_profile.bio}
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#3b5bfc]">
              Status
            </p>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${provider.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${provider.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}
              />
              {provider.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="px-7 pb-6 pt-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterDropdown({
  isActiveFilter,
  setIsActiveFilter,
  onClear,
  hasFilters,
}: {
  isActiveFilter: boolean | null;
  setIsActiveFilter: (v: boolean | null) => void;
  onClear: () => void;
  hasFilters: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all shadow-sm ${open || hasFilters ? 'border-[#3b5bfc] text-[#3b5bfc] bg-[#eef2ff]' : 'border-slate-200 text-slate-600 bg-white hover:border-blue-300 hover:text-[#3b5bfc]'}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
          />
        </svg>
        Filters
        {hasFilters && (
          <span className="w-5 h-5 rounded-full bg-[#3b5bfc] text-white text-[10px] font-bold flex items-center justify-center">
            1
          </span>
        )}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-30 overflow-hidden">
          <div className="p-4">
            <p className="text-xs font-semibold text-[#0f1340] uppercase tracking-wider mb-2">
              Status
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {([null, true, false] as (boolean | null)[]).map((val) => (
                <button
                  key={String(val)}
                  onClick={() => setIsActiveFilter(val)}
                  className={`py-2 text-xs rounded-xl border font-medium transition-all ${isActiveFilter === val ? 'bg-[#3b5bfc] text-white border-[#3b5bfc]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'}`}
                >
                  {val === null ? 'All' : val ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 px-4 pb-4">
            {hasFilters && (
              <button
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="flex-1 py-2 text-xs font-medium rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-[#3b5bfc] text-white hover:bg-[#2f4edc] transition"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FrontDeskProviders() {
  const [providers, setProviders] = useState<ProviderDetail[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [viewingProvider, setViewingProvider] = useState<ProviderDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await getProviders({
        page,
        page_size: pageSize,
        is_active: isActiveFilter,
      });
      setProviders(data);
      setHasMore(data.length === pageSize);
    } catch {
      setFetchError('Failed to fetch providers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, isActiveFilter]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    fetchAppointmentTypes()
      .then(setAppointmentTypes)
      .catch(() => setAppointmentTypes([]));
  }, []);

  const filtered = providers.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone_no.includes(q) ||
      (p.provider_profile?.specialization ?? '').toLowerCase().includes(q)
    );
  });

  const handleCreated = (newProvider: ProviderDetail) => {
    setShowCreate(false);
    setToast({ message: 'Provider created successfully.', type: 'success' });
    fetchProviders();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        .skeleton{background:linear-gradient(90deg,#f0f4ff 25%,#e8eeff 50%,#f0f4ff 75%);background-size:200% 100%;animation:shimmer 1.4s infinite}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .trow:hover{background:#f8faff}
      `}</style>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3b5bfc] mb-1">
            Management
          </p>
          <h1
            className="text-3xl font-bold text-[#0f1340]"
            style={{ fontFamily: "'Syne',sans-serif" }}
          >
            Providers
          </h1>
          <p className="text-sm text-[#374151] mt-1">
            Browse and manage all registered doctors and care providers.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#3b5bfc] text-white text-sm font-semibold rounded-xl hover:bg-[#2f4edc] transition shadow-md shadow-blue-200 flex-shrink-0 mt-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Provider
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone or specialization..."
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3b5bfc]/30 focus:border-[#3b5bfc] shadow-sm transition"
          />
        </div>
        <FilterDropdown
          isActiveFilter={isActiveFilter}
          setIsActiveFilter={(v) => {
            setIsActiveFilter(v);
            setPage(1);
          }}
          onClear={() => {
            setIsActiveFilter(null);
            setPage(1);
          }}
          hasFilters={isActiveFilter !== null}
        />
      </div>

      <div className="bg-white rounded-2xl border border-blue-50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="skeleton h-3 rounded w-10" />
                <div className="skeleton w-9 h-9 rounded-xl flex-shrink-0" />
                <div className="flex-1">
                  <div className="skeleton h-3.5 rounded w-1/4" />
                </div>
                <div className="skeleton h-3 rounded w-36" />
                <div className="skeleton h-3 rounded w-28" />
                <div className="skeleton h-3 rounded w-24" />
                <div className="skeleton h-6 rounded-full w-14" />
                <div className="skeleton h-7 w-7 rounded-lg" />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-2xl mb-3">
              ⚠️
            </div>
            <p className="font-semibold text-slate-700 mb-1">Something went wrong</p>
            <p className="text-sm text-slate-400 mb-4">{fetchError}</p>
            <button
              onClick={fetchProviders}
              className="px-4 py-2 bg-[#3b5bfc] text-white text-sm font-medium rounded-xl hover:bg-[#2f4edc] transition"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-3xl mb-4">
              🩺
            </div>
            <p
              className="text-lg font-bold text-[#0f1340] mb-1"
              style={{ fontFamily: "'Syne',sans-serif" }}
            >
              No providers found
            </p>
            <p className="text-sm text-slate-400 mb-4">
              {isActiveFilter !== null || search
                ? 'Try adjusting your filters.'
                : 'No providers registered yet.'}
            </p>
            {!search && isActiveFilter === null && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-[#3b5bfc] text-white text-sm font-medium rounded-xl hover:bg-[#2f4edc] transition"
              >
                Add First Provider
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    {[
                      'ID',
                      'Name',
                      'Email',
                      'Phone',
                      'Specialization',
                      'Joined',
                      'Status',
                      'Actions',
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3.5 text-xs font-semibold text-[#0f1340] uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((p) => (
                    <tr key={p.id} className="trow transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-medium">
                        #{p.id}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(p.id)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}
                          >
                            {getInitials(p.first_name, p.last_name)}
                          </div>
                          <p className="font-semibold text-[#0f1340] whitespace-nowrap">
                            {p.first_name} {p.last_name}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 max-w-[180px]">
                        <span className="truncate block">{p.email}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {p.country_code} {p.phone_no}
                      </td>
                      <td className="px-5 py-3.5">
                        {p.provider_profile?.specialization ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-semibold border border-violet-100">
                            {p.provider_profile.specialization}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${p.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${p.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}
                          />
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setViewingProvider(p)}
                          title="View provider"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#3b5bfc] hover:bg-[#eef2ff] border border-transparent hover:border-blue-200 transition-all"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-400">
                Showing{' '}
                <span className="font-semibold text-slate-600">{filtered.length}</span>{' '}
                rows · Page <span className="font-semibold text-slate-600">{page}</span>
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Rows</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#3b5bfc]/30 focus:border-[#3b5bfc] transition cursor-pointer"
                  >
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-px h-5 bg-slate-200" />
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-[#3b5bfc] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMore || loading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-[#3b5bfc] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateProviderModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          appointmentTypes={appointmentTypes}
        />
      )}
      {viewingProvider && (
        <ViewProviderModal
          provider={viewingProvider}
          onClose={() => setViewingProvider(null)}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
