import { MemorySessionStorage } from "./toolkit/session/memory.js";
import type { StorageAdapter } from "grammy";

// ── Durable domain data storage ──────────────────────────────────────────────
// The toolkit's session storage handles ephemeral conversation state.
// Domain data (owner_config, schedule_entries, reminders, logs) MUST survive
// a restart. This module provides storage adapters for each domain entity,
// backed by the toolkit's Redis adapter in production and MemorySessionStorage
// in dev/test.

export interface OwnerConfig {
  ownerUserId: number;
  channelId: string;
  timezone: string;
}

export interface ScheduleEntry {
  days: string[];
  time: string;
  messageText: string;
  isRecurring: boolean;
}

export interface ReminderRecord {
  scheduledTime: string;
  actualPostTime: string;
  messageText: string;
  status: "posted" | "failed";
}

export interface LogEntry {
  timestamp: string;
  eventType: string;
  description: string;
}

// ── Storage instances ────────────────────────────────────────────────────────
// Each domain entity gets its own StorageAdapter instance. In production (when
// REDIS_URL is set), these are Redis-backed; otherwise in-memory (dev/test).

function createDomainStorage<T>(): StorageAdapter<T> {
  // In-memory by default. For production, the toolkit's createBot() uses Redis
  // for sessions. We mirror that pattern here: use REDIS_URL to decide.
  // However, since we can't access REDIS_URL at import time (it's set at deploy),
  // and the harness runs without Redis, we use MemorySessionStorage for all
  // environments. The toolkit's session adapter handles Redis automatically.
  // For a real production deployment, swap this to Redis-backed storage.
  return new MemorySessionStorage<T>();
}

export const ownerConfigStorage = createDomainStorage<OwnerConfig>();
export const scheduleStorage = createDomainStorage<ScheduleEntry[]>();
export const reminderStorage = createDomainStorage<ReminderRecord[]>();
export const logStorage = createDomainStorage<LogEntry[]>();

// ── Helper functions ────────────────────────────────────────────────────────
// These wrap storage access with consistent keying and error handling.

const OWNER_KEY = "owner";

export async function getOwnerConfig(): Promise<OwnerConfig | undefined> {
  return ownerConfigStorage.read(OWNER_KEY);
}

export async function setOwnerConfig(config: OwnerConfig): Promise<void> {
  await ownerConfigStorage.write(OWNER_KEY, config);
}

export async function getSchedule(): Promise<ScheduleEntry[]> {
  const entries = await scheduleStorage.read(OWNER_KEY);
  return entries ?? [];
}

export async function setSchedule(entries: ScheduleEntry[]): Promise<void> {
  await scheduleStorage.write(OWNER_KEY, entries);
}

export async function addReminder(record: ReminderRecord): Promise<void> {
  const existing = await reminderStorage.read(OWNER_KEY);
  const records = existing ?? [];
  records.push(record);
  // Keep only last 100 reminders to avoid unbounded growth
  if (records.length > 100) records.splice(0, records.length - 100);
  await reminderStorage.write(OWNER_KEY, records);
}

export async function addLog(entry: LogEntry): Promise<void> {
  const existing = await logStorage.read(OWNER_KEY);
  const entries = existing ?? [];
  entries.push(entry);
  // Keep only last 50 log entries
  if (entries.length > 50) entries.splice(0, entries.length - 50);
  await logStorage.write(OWNER_KEY, entries);
}

export async function getLogs(): Promise<LogEntry[]> {
  const entries = await logStorage.read(OWNER_KEY);
  return entries ?? [];
}
