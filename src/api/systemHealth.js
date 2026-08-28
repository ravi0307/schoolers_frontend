import axios from "axios";
import { BASE_URL } from "./client";

// The gateway's own /health and /health/services live one level up from
// /api/v1 (they're gateway-level, not behind any single microservice).
const GATEWAY_ROOT = BASE_URL.replace(/\/api\/v1\/?$/, "");

export const gatewayHealth = () => axios.get(`${GATEWAY_ROOT}/health`).then((r) => r.data);
export const servicesHealth = () => axios.get(`${GATEWAY_ROOT}/health/services`).then((r) => r.data);
