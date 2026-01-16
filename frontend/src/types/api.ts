export interface ConfigResponse {
  token_configured: boolean;
}

export interface ValidatePathResponse {
  success: boolean;
  error?: string;
  error_code?: string;
  metadata_size?: number;
}

export interface DownloadLinkResponse {
  success: boolean;
  link?: string;
  error?: string;
  error_code?: string;
}

export interface CoversResponse {
  success: boolean;
  covers?: Record<string, string>;
  error?: string;
  error_code?: string;
}

// Error codes returned by the backend
export const ERROR_CODES = {
  DROPBOX_AUTH_FAILED: 'DROPBOX_AUTH_FAILED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
