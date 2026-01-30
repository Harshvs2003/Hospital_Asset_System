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

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        // Try to refresh token
        await get("/auth/refresh");
        // Retry the original request
        return api(error.config);
      } catch (refreshError) {
        // Refresh failed, user needs to login again
        // Optionally, redirect to login or clear user state
        return Promise.reject(refreshError);
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

export const del = async (path: string, config?: any) =>
  (await api.delete(path, config)).data;

export default api;
