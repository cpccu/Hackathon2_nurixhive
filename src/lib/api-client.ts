import toast from "react-hot-toast";

type ApiMeta = {
  page?: number;
  limit?: number;
  nextCursor?: string | null;
  total?: number;
};

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: any };
  meta?: ApiMeta;
};

type FetchOptions = RequestInit & {
  showToastOnError?: boolean;
  showToastOnSuccess?: string | boolean;
};

export class ApiError extends Error {
  code: string;
  details?: any;
  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

async function fetcher<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { showToastOnError = true, showToastOnSuccess = false, ...init } = options;

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    const json = (await res.json()) as ApiResponse<T>;

    if (!json.success || !res.ok) {
      const errorMessage = json.error?.message || "An unexpected error occurred.";
      const errorCode = json.error?.code || "UNKNOWN_ERROR";
      
      if (showToastOnError) {
        toast.error(errorMessage);
      }
      
      throw new ApiError(errorMessage, errorCode, json.error?.details);
    }

    if (showToastOnSuccess) {
      toast.success(typeof showToastOnSuccess === "string" ? showToastOnSuccess : "Success!");
    }

    return json.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Network error";
    if (showToastOnError) {
      toast.error(message);
    }
    throw new ApiError(message, "NETWORK_ERROR");
  }
}

export const apiClient = {
  get: <T>(url: string, options?: FetchOptions) => fetcher<T>(url, { ...options, method: "GET" }),
  post: <T>(url: string, body: any, options?: FetchOptions) => fetcher<T>(url, { ...options, method: "POST", body: JSON.stringify(body) }),
  put: <T>(url: string, body: any, options?: FetchOptions) => fetcher<T>(url, { ...options, method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(url: string, body: any, options?: FetchOptions) => fetcher<T>(url, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(url: string, options?: FetchOptions) => fetcher<T>(url, { ...options, method: "DELETE" }),
};
