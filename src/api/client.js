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
  const detail = err?.response?.data?.detail;
  // FastAPI 422 returns detail as an array of {loc,msg,type} objects; rendering
  // that array as a React child throws and unmounts the tree. Flatten it.
  if (Array.isArray(detail)) {
    const parts = detail.map((d) =>
      (d && typeof d === "object" ? d.msg || JSON.stringify(d) : String(d)));
    return parts.join("; ") || "Something went wrong";
  }
  return detail || err?.message || "Something went wrong";
}

/**
 * Friendly copy for end-user error banners. The raw backend detail for a
 * disabled feature flag reads like a server message; parents and teachers
 * get plain language instead, everyone else keeps the original text.
 */
export function friendlyApiMessage(message) {
  if (!message) return null;
  if (message === "Examinations are not enabled for this school") {
    return "Marks and exams aren't available yet — results will appear here once examinations are enabled for this school.";
  }
  return message;
}

export default client;
