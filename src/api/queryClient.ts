import { QueryClient, QueryFunctionContext } from "@tanstack/react-query";
import axios, {
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import { FAKE_LATENCY_MS } from "@/sandbox/config";
import { MockHttpError, resolveMock, type MockMethod } from "@/sandbox/mock-api";

/**
 * SANDBOX BUILD — there is no backend.
 *
 * A custom axios adapter answers every request from static fixtures, so no
 * request ever leaves the browser. Pages and hooks are untouched: they still
 * call `apiInstance` and still receive an AxiosResponse.
 */

export const BASE_URL = "";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const sandboxAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? "get").toLowerCase() as MockMethod;
  const url = config.url ?? "";

  let body: unknown = config.data;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      /* leave as-is (FormData, plain text, etc.) */
    }
  }

  // Small delay so skeletons and spinners are visible during the demo.
  await sleep(FAKE_LATENCY_MS);

  const response = (payload: unknown, status: number): AxiosResponse => ({
    data: payload,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {},
    config,
  });

  try {
    const payload = resolveMock(url, method, body);
    // Real API wraps results as { data: ... }; keep that so `res.data.data` works.
    return response({ data: payload, success: true }, 200);
  } catch (err) {
    const status = err instanceof MockHttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Sandbox error";
    const axiosError: any = new Error(message);
    axiosError.isAxiosError = true;
    axiosError.config = config;
    axiosError.response = response({ message, success: false }, status);
    axiosError.status = status;
    throw axiosError;
  }
};

const apiInstance = axios.create({
  baseURL: BASE_URL,
  adapter: sandboxAdapter,
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      queryFn: async ({ queryKey, signal }: QueryFunctionContext) => {
        const { data } = await apiInstance.get(String(queryKey[0]), { signal });
        return data;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export default apiInstance;
