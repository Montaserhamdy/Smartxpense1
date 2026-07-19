export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface HealthStatus {
  status: "ok" | "error";
  uptime: number;
  timestamp: string;
  database?: {
    status: "connected" | "disconnected" | "not_configured";
    error?: string;
  };
}

export interface StatusInfo {
  service: string;
  environment: string;
  version: string;
}
