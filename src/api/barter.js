import client from "./client";

export const listBarter = () => client.get("/barter").then((r) => r.data);
export const createBarter = (data) => client.post("/barter", data).then((r) => r.data);
export const updateBarter = (id, data) => client.patch(`/barter/${id}`, data).then((r) => r.data);
export const deleteBarter = (id) => client.delete(`/barter/${id}`);
