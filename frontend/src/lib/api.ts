// src/lib/api.ts
import axios from "axios";

export const API_BASE =
  (import.meta.env.VITE_API_BASE?.replace(/\/$/, "")) ||
  "http://localhost:5000";

/**
 * Main API instance (has interceptors)
 */
const api = axios.create({
  baseURL: API_BASE + "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/**
 * Plain axios instance (NO interceptors)
 * Used ONLY for refresh to avoid infinite loop
 */
const refreshClient = axios.create({
  baseURL: API_BASE + "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: {
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}[] = [];

const processQueue = (error: any) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(true);
  });
  failedQueue = [];
};

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      isRefreshing = true;

      try {
        // 🔑 refresh using plain axios (NO interceptor)
        await refreshClient.post("/auth/refresh");

        processQueue(null);
        return api(originalRequest);
      } catch (err) {
        processQueue(err);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Simple helpers
export const get = async (path: string, config?: any) =>
  (await api.get(path, config)).data;

export const post = async (path: string, data?: any, config?: any) =>
  (await api.post(path, data, config)).data;

export const put = async (path: string, data?: any, config?: any) =>
  (await api.put(path, data, config)).data;

export const del = async (path: string, config?: any) =>
  (await api.delete(path, config)).data;

export default api;
