export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  role_id: number;
  country_code: string;
  phone_no: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface Role {
  id: number;
  name: string;
}

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  userId: number | null;
  roleId: number | null;
}
