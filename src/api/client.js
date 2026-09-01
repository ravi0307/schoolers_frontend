import axios from "axios";

export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

/** Turn a stored upload path into a browser-loadable URL. */
export function resolveMediaUrl(url) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  const origin = BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

const client = axios.create({ baseURL: BASE_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("schoolers_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && localStorage.getItem("schoolers_refresh_token")) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refresh_token = localStorage.getItem("schoolers_refresh_token");
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token });
        localStorage.setItem("schoolers_access_token", data.access_token);
        queue.forEach((p) => p.resolve(data.access_token));
        queue = [];
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return client(original);
      } catch (refreshErr) {
        queue.forEach((p) => p.reject(refreshErr));
        queue = [];
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

/** Extracts a readable message from an API error for display. */
export function apiErrorMessage(err) {
  return err?.response?.data?.detail || err?.message || "Something went wrong";
}

export default client;
