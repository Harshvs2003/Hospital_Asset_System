// src/lib/api.ts
import axios from "axios";

export const API_BASE =
  (import.meta.env.VITE_API_BASE?.replace(/\/$/, "")) ||
  "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE + "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

// Automatically attach Bearer token
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<any | null> | null = null;
export const refreshSession = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await api.get("/auth/refresh", {
          headers: { "x-skip-auth-refresh": "1" },
        });
        const token = res.data?.accessToken || null;
        setAccessToken(token);
        return res.data;
      } catch {
        setAccessToken(null);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const status = error?.response?.status;
    const isRefreshCall = original?.url?.includes("/auth/refresh");
    const skip = original?.headers?.["x-skip-auth-refresh"];

    if (status === 401 && !original._retry && !isRefreshCall && !skip) {
      original._retry = true;
      const data = await refreshSession();
      const token = data?.accessToken;
      if (token) {
        original.headers = original.headers ?? {};
        original.headers["Authorization"] = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

// Simple helpers (no type imports)
export const get = async (path: string, config?: any) =>
  (await api.get(path, config)).data;

export const post = async (path: string, data?: any, config?: any) =>
  (await api.post(path, data, config)).data;

export const put = async (path: string, data?: any, config?: any) =>
  (await api.put(path, data, config)).data;

export const patch = async (path: string, data?: any, config?: any) =>
  (await api.patch(path, data, config)).data;

export const del = async (path: string, config?: any) =>
  (await api.delete(path, config)).data;

export default api;
