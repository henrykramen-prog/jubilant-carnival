"use strict";

const memoryVisits = new Map();
const memoryPending = new Map();
const memoryNs = new Map();
let memorySdk = null;

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

function kvEnabled() {
  return redisConfig() !== null;
}

let redisClient = null;
function redis() {
  const cfg = redisConfig();
  if (!cfg) return null;
  if (!redisClient) {
    try {
      const { Redis } = require("@upstash/redis");
      redisClient = new Redis(cfg);
    } catch (e) {
      console.error("Redis client init failed:", e.message);
      return null;
    }
  }
  return redisClient;
}

const TTL = 60 * 60;

async function getSdk() {
  if (!kvEnabled()) return memorySdk;
  const client = redis();
  if (!client) return memorySdk;
  try {
    return await client.get("px:sdk");
  } catch (e) {
    console.error("Redis get sdk:", e.message);
    return memorySdk;
  }
}

async function setSdk(value) {
  memorySdk = value;
  const client = redis();
  if (!client) return;
  try {
    await client.set("px:sdk", value, { ex: TTL });
  } catch (e) {
    console.error("Redis set sdk:", e.message);
  }
}

async function getVisit(uuid) {
  if (!kvEnabled()) return memoryVisits.get(uuid) || null;
  const client = redis();
  if (!client) return memoryVisits.get(uuid) || null;
  try {
    return await client.get(`px:visit:${uuid}`);
  } catch (e) {
    console.error("Redis get visit:", e.message);
    return memoryVisits.get(uuid) || null;
  }
}

async function saveVisit(visit) {
  if (!visit || !visit.uuid) return;
  memoryVisits.set(visit.uuid, visit);
  const client = redis();
  if (!client) return;
  try {
    await client.set(`px:visit:${visit.uuid}`, visit, { ex: TTL });
    for (const part of [visit.seq0, visit.seq1]) {
      if (part && part.id) await client.set(`px:cid:${part.id}`, visit.uuid, { ex: TTL });
    }
  } catch (e) {
    console.error("Redis save visit:", e.message);
  }
}

async function findVisitByCaptureId(id) {
  if (!id) return null;
  if (!kvEnabled()) {
    for (const visit of memoryVisits.values()) {
      if (visit.seq0 && visit.seq0.id === id) return visit;
      if (visit.seq1 && visit.seq1.id === id) return visit;
    }
    return null;
  }
  const client = redis();
  if (!client) return null;
  try {
    const uuid = await client.get(`px:cid:${id}`);
    if (!uuid) return null;
    return await getVisit(uuid);
  } catch (e) {
    console.error("Redis find by capture id:", e.message);
    return null;
  }
}

async function getPending(id) {
  if (!kvEnabled()) return memoryPending.get(id) || null;
  const client = redis();
  if (!client) return memoryPending.get(id) || null;
  try {
    return await client.get(`px:pending:${id}`);
  } catch (e) {
    return memoryPending.get(id) || null;
  }
}

async function setPending(id, value) {
  memoryPending.set(id, value);
  const client = redis();
  if (!client) return;
  try {
    await client.set(`px:pending:${id}`, value, { ex: TTL });
  } catch (e) {
    console.error("Redis set pending:", e.message);
  }
}

async function deletePending(id) {
  memoryPending.delete(id);
  const client = redis();
  if (!client) return;
  try {
    await client.del(`px:pending:${id}`);
  } catch (e) {
    console.error("Redis del pending:", e.message);
  }
}

async function getNs(uuid) {
  if (!uuid) return null;
  if (!kvEnabled()) return memoryNs.get(uuid) || null;
  const client = redis();
  if (!client) return memoryNs.get(uuid) || null;
  try {
    return await client.get(`px:ns:${uuid}`);
  } catch (e) {
    return memoryNs.get(uuid) || null;
  }
}

async function setNs(uuid, value) {
  memoryNs.set(uuid, value);
  const client = redis();
  if (!client) return;
  try {
    await client.set(`px:ns:${uuid}`, value, { ex: TTL });
  } catch (e) {
    console.error("Redis set ns:", e.message);
  }
}

module.exports = {
  kvEnabled,
  getSdk,
  setSdk,
  getVisit,
  saveVisit,
  findVisitByCaptureId,
  getPending,
  setPending,
  deletePending,
  getNs,
  setNs
};
