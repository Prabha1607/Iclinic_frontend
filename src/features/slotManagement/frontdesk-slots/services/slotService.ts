import api from '../../../../lib/axios';

export interface SlotResponse {
  id: number;
  provider_id: number;
  availability_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlotCreateItem {
  availability_date: string;
  start_time: string;
  end_time: string;
  notes?: string;
}

export interface SlotBulkCreatePayload {
  slots: SlotCreateItem[];
}

export interface SlotBulkCreateResponse {
  created: SlotResponse[];
  skipped: number;
}

export const getProviderSlots = (providerId: number): Promise<SlotResponse[]> =>
  api
    .get<SlotResponse[]>(`/api/v1/slots/providers/${providerId}`)
    .then((res) => res.data);

export const createProviderSlots = (
  providerId: number,
  payload: SlotBulkCreatePayload,
): Promise<SlotBulkCreateResponse> =>
  api
    .post<SlotBulkCreateResponse>(`/api/v1/slots/providers/${providerId}`, payload)
    .then((res) => res.data);
