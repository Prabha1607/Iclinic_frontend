import api from '../../../../lib/axios'
import type { Patient } from '../../../../common/DataModels/Patient'
import type { AppointmentType, AvailableSlot } from '../../../../common/DataModels/Booking'
import type { ProviderDetail } from '../../../../common/DataModels/Appointments'
import type { Appointment } from '../../../../common/DataModels/Appointments'

export interface CreatePatientPayload {
  first_name: string
  last_name: string
  role_id: number
  country_code: string
  email: string
  phone_no: string
  password: string
  patient_profile: {
    date_of_birth: string
    gender: string
    address?: string
    preferred_language?: string
  }
}

export interface BookAppointmentPayload {
  user_id: number
  provider_id: number
  appointment_type_id: number
  availability_slot_id: number
  patient_name: string
  scheduled_date: string
  scheduled_start_time: string
  scheduled_end_time: string
  reason_for_visit?: string
  notes?: string
  booking_channel?: 'VOICE' | 'WEB'
  instructions?: string
}

// ── MAIN SERVICE (:8000) routes ───────────────────────────────────────────────

/** POST /api/v1/voice/make-call → main-service */
export const initiateCall = (
  to_number: string,
): Promise<{ status: string; call_sid?: string }> =>
  api
    .post<{ status: string; call_sid?: string }>('/api/v1/voice/make-call', null, {
      params: { to_number },
    })
    .then((res) => res.data)

/** GET /api/v1/appointment-types → main-service */
export const fetchAppointmentTypes = (): Promise<AppointmentType[]> =>
  api.get<AppointmentType[]>('/api/v1/appointment-types').then((res) => res.data)

/** POST /api/v1/booking/create → main-service */
export const bookAppointment = (data: BookAppointmentPayload): Promise<{ message: string }> =>
  api.post<{ message: string }>('/api/v1/booking/create', data).then((res) => res.data)

/** GET /api/v1/booking/list → main-service */
export const getUserAppointments = (user_id: number): Promise<Appointment[]> =>
  api
    .get<Appointment[]>('/api/v1/booking/list', { params: { user_id, page: 1, page_size: 100 } })
    .then((res) => res.data)

/**
 * GET /api/v1/users/providers/{provider_id}/slots → main-service
 *
 * This route lives in main-service (available_slots.py), but the path starts
 * with /api/v1/users/ which the axios interceptor normally routes to auth-service.
 *
 * Fix: explicitly set baseURL to MAIN_URL for this call so it bypasses the
 * prefix-based routing. The nginx config also has a dedicated regex location
 * for this path that routes it to main-service before the generic /api/v1/users/
 * block catches it.
 */
export const fetchProviderSlots = (provider_id: number): Promise<AvailableSlot[]> =>
  api
    .get<AvailableSlot[]>(`/api/v1/users/providers/${provider_id}/slots`, {
      baseURL: (import.meta.env.VITE_MAIN_URL ?? 'http://localhost:8000').replace(/\/$/, ''),
    })
    .then((res) => res.data)

// ── AUTH SERVICE (:8001) routes ───────────────────────────────────────────────

/** GET /api/v1/users/list → auth-service (patient search) */
export const searchPatients = (query: string): Promise<Patient[]> =>
  api
    .get<Patient[]>('/api/v1/users/list', { params: { page: 1, page_size: 100 } })
    .then((res) =>
      res.data.filter(
        (p) =>
          p.first_name.toLowerCase().includes(query.toLowerCase()) ||
          p.last_name.toLowerCase().includes(query.toLowerCase()) ||
          p.email.toLowerCase().includes(query.toLowerCase()) ||
          p.phone_no.includes(query),
      ),
    )

/** POST /api/v1/users/patients/create → auth-service */
export const createPatient = (data: CreatePatientPayload): Promise<Patient> =>
  api.post<Patient>('/api/v1/users/patients/create', data).then((res) => res.data)

/** GET /api/v1/users/providers/by-type → auth-service */
export const fetchProvidersByType = (appointment_type_id: number): Promise<ProviderDetail[]> =>
  api
    .get<ProviderDetail[]>('/api/v1/users/providers/by-type', {
      params: { appointment_type_id, is_active: true },
    })
    .then((res) => res.data)

export default api