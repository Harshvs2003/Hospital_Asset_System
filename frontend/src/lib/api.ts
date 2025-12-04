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

// Automatically attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

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
