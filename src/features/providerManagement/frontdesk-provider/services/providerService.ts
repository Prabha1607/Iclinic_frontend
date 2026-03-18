import api from '../../../../lib/axios'
import type { ProviderDetail } from '../../../../common/DataModels/Appointments'
import type { AppointmentType } from '../../../../common/DataModels/Booking'

export interface ProviderFilters {
  page?: number
  page_size?: number
  is_active?: boolean | null
}

export interface CreateProviderPayload {
  first_name: string
  last_name: string
  role_id: number
  country_code: string
  phone_no: string
  email: string
  password: string
  appointment_type_id?: number | null
  provider_profile?: {
    specialization?: string
    qualification?: string
    experience?: number
    bio?: string
  }
}

export const getProviders = (filters: ProviderFilters = {}): Promise<ProviderDetail[]> => {
  const params: Record<string, string | number | boolean> = {}
  if (filters.page) params.page = filters.page
  if (filters.page_size) params.page_size = filters.page_size
  if (filters.is_active != null) params.is_active = filters.is_active
  return api.get<ProviderDetail[]>('/api/v1/users/providers', { params }).then((res) => res.data)
}

export const getAllProviders = (): Promise<ProviderDetail[]> =>
  api.get<ProviderDetail[]>('/api/v1/users/providers/full').then((res) => res.data)

export const createProvider = (data: CreateProviderPayload): Promise<ProviderDetail> =>
  api.post<ProviderDetail>('/api/v1/users/providers/create', data).then((res) => res.data)

export const fetchAppointmentTypes = (): Promise<AppointmentType[]> =>
  api.get<AppointmentType[]>('/api/v1/appointment-types').then((res) => res.data)