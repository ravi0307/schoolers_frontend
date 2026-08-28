import client from "./client";

export const createBroadcast = (data) => client.post("/broadcasts", data).then((r) => r.data);
export const listBroadcasts = (params) => client.get("/broadcasts", { params }).then((r) => r.data);

export const createMedia = (data) => client.post("/media", data).then((r) => r.data);
export const listMedia = (params) => client.get("/media", { params }).then((r) => r.data);
