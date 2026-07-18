export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface HealthStatus {
  status: "ok" | "error";
  uptime: number;
  timestamp: string;
}

export interface StatusInfo {
  service: string;
  environment: string;
  version: string;
}
