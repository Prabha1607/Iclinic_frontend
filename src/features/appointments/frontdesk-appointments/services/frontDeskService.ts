import api from '../../../../lib/axios';
import type { Appointment } from '../../../../common/DataModels/Appointments';
import type { Patient } from '../../../../common/DataModels/Patient';
import type { ProviderDetail } from '../../../../common/DataModels/Appointments';
import type { PatientUpdatePayload } from '../../../patientManagement/frontdesk-patient/services/frontDeskService';

export interface AppointmentFilters {
  page?: number;
  page_size?: number;
  status?: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | null;
  provider_id?: number | null;
  user_id?: number | null;
  scheduled_date_from?: string | null;
  scheduled_date_to?: string | null;
  is_active?: boolean | null;
}

const getRawAppointments = (
  filters: AppointmentFilters = {},
): Promise<Appointment[]> => {
  const params: Record<string, string | number | boolean> = {};
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;
  if (filters.status) params.status = filters.status;
  if (filters.provider_id != null) params.provider_id = filters.provider_id;
  if (filters.user_id != null) params.user_id = filters.user_id;
  if (filters.scheduled_date_from)
    params.scheduled_date_from = filters.scheduled_date_from;
  if (filters.scheduled_date_to) params.scheduled_date_to = filters.scheduled_date_to;
  if (filters.is_active != null) params.is_active = filters.is_active;

  return api
    .get<Appointment[]>('/api/v1/booking/list', { params })
    .then((res) => res.data);
};

export const cancelAppointment = (
  appointment_id: number,
  cancellation_reason: string,
): Promise<{ message: string }> =>
  api
    .patch<{
      message: string;
    }>(`/api/v1/booking/cancel/${appointment_id}`, cancellation_reason, {
      headers: { 'Content-Type': 'application/json' },
    })
    .then((res) => res.data);

const fetchPatientById = (id: number): Promise<Patient> =>
  api.get<Patient>(`/api/v1/users/patient/${id}`).then((res) => res.data);

const fetchAllProviders = (): Promise<ProviderDetail[]> =>
  api.get<ProviderDetail[]>('/api/v1/users/providers/full').then((res) => res.data);

export const getAppointments = async (
  filters: AppointmentFilters = {},
): Promise<Appointment[]> => {
  const [appointments, providers] = await Promise.all([
    getRawAppointments(filters),
    fetchAllProviders().catch(() => [] as ProviderDetail[]),
  ]);

  const missingUserIds = [
    ...new Set(appointments.filter((a) => !a.user && a.user_id).map((a) => a.user_id)),
  ];

  const patientResults = await Promise.all(
    missingUserIds.map((id) => fetchPatientById(id).catch(() => null)),
  );

  const patientMap = new Map<number, Patient>();
  patientResults.forEach((p) => {
    if (p) patientMap.set(p.id, p);
  });

  const providerMap = new Map(providers.map((p) => [p.id, p]));

  return appointments.map((appt) => ({
    ...appt,
    user:
      appt.user ?? (appt.user_id ? (patientMap.get(appt.user_id) as any) : undefined),
    provider:
      appt.provider ??
      (appt.provider_id ? providerMap.get(appt.provider_id) : undefined),
  }));
};

export interface PatientFilters {
  page?: number;
  page_size?: number;
  is_active?: boolean | null;
}

export const updatePatient = (
  user_id: number,
  data: PatientUpdatePayload,
): Promise<Patient> =>
  api.put<Patient>(`/api/v1/users/update/${user_id}`, data).then((res) => res.data);