import client from "./client";

export const listActivities = () => client.get("/activities").then((r) => r.data);
export const createActivity = (data) => client.post("/activities", data).then((r) => r.data);
