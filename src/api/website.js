import client from "./client";
import axios from "axios";
import { BASE_URL } from "./client";

export const getSettings = () => client.get("/website/settings").then((r) => r.data);
export const updateSettings = (data) => client.put("/website/settings", data).then((r) => r.data);

export const getPage = (slug) => client.get(`/website/pages/${slug}`).then((r) => r.data);
export const upsertPage = (slug, data) => client.put(`/website/pages/${slug}`, data).then((r) => r.data);

export const listTestimonials = () => client.get("/website/testimonials").then((r) => r.data);
export const addTestimonial = (data) => client.post("/website/testimonials", data).then((r) => r.data);
export const deleteTestimonial = (id) => client.delete(`/website/testimonials/${id}`);
export const goLive = () => client.post("/website/go-live").then((r) => r.data);

/** Public, unauthenticated — anyone can view a school's published site. */
export const getPublicSite = (schoolId) =>
  axios.get(`${BASE_URL}/public/sites/${schoolId}`).then((r) => r.data);
