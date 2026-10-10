import axios from "axios";
import client, { BASE_URL } from "./client";
import { schoolSiteSlug } from "../utils/siteFlow";
import { readLocalWebsiteDraft } from "../utils/websiteBuilder";

export const getBuilderState = async (schoolId) => {
  try {
    const response = await client.get(`/website/${schoolId}`);
    return response.data;
  } catch (error) {
    let localDraft;
    try {
      localDraft = readLocalWebsiteDraft(window.localStorage, schoolId);
    } catch {
      throw error;
    }
    if (!localDraft) throw error;
    return { draft: localDraft, updated_at: null, published_at: null, published: null, source: "localStorage" };
  }
};

export const saveBuilderDraft = (content) =>
  client.put("/website/builder/draft", content).then((response) => response.data);

export const publishBuilderSite = () =>
  client.post("/website/builder/publish").then((response) => response.data);

export const uploadBuilderAsset = (file) => {
  const form = new FormData();
  form.append("file", file);
  return client.post("/website/builder/assets", form).then((response) => response.data);
};

export const getWebsiteQueries = () =>
  client.get("/website/queries").then((response) => response.data);

export const submitWebsiteQuery = (schoolId, payload) =>
  axios.post(`${BASE_URL}/public/sites/${schoolId}/queries`, payload).then((response) => response.data);

/** Public, unauthenticated — anyone can view a school's published site. */
export const getPublicSite = (schoolId) =>
  axios.get(`${BASE_URL}/public/sites/${schoolId}`).then((response) => response.data);

/** Public, unauthenticated — look up a published school site by its URL slug. */
export const getPublicSiteByName = (schoolName) =>
  axios.get(`${BASE_URL}/public/sites/by-name/${encodeURIComponent(schoolSiteSlug(schoolName))}`)
    .then((response) => response.data);
