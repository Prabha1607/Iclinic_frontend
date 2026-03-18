export interface AppointmentType {
  id: number;
  name: string;
  description?: string;
  instructions?: string;
  duration_minutes?: number;
  is_active?: boolean;
}

export interface AvailableSlot {
  id: number;
  provider_id: number;
  availability_date: string;
  date?: string;
  start_time: string;
  end_time: string;
  status?: string;
  is_active?: boolean;
  is_available?: boolean;
}
