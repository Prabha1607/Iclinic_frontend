export interface ProviderProfile {
  specialization?: string;
  bio?: string;
  years_of_experience?: number;
  qualification?: string;
  experience?: number;
}

export interface ProviderDetail {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_no: string;
  country_code: string;
  role_id: number;
  is_active: boolean;
  created_at: string;
  specialization?: string;
  provider_profile?: ProviderProfile;
}

export interface AppointmentUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_no: string;
  country_code: string;
}

export interface AppointmentTypeDetail {
  id: number;
  name: string;
  duration_minutes?: number;
  description?: string;
  instructions?: string;
}

export interface Appointment {
  id: number;
  user_id: number;
  provider_id: number;
  appointment_type_id: number;
  availability_slot_id: number;
  patient_name: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED";
  reason_for_visit?: string;
  notes?: string;
  instructions?: string;
  booking_channel?: "VOICE" | "WEB";
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  user?: AppointmentUser;
  provider?: ProviderDetail;
  appointment_type?: AppointmentTypeDetail;
}
