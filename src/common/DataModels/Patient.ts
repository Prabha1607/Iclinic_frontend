export interface PatientProfile {
  date_of_birth?: string;
  gender?: string;
  address?: string;
  preferred_language?: string;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_no: string;
  country_code: string;
  role_id: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  patient_profile?: PatientProfile;
}
