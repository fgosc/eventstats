import { fetchAuthSession } from "aws-amplify/auth";
import type { EventData, EventsResponse, Exclusion } from "../types";

const API_URL = import.meta.env.VITE_API_URL as string;

async function authHeaders(): Promise<Record<string, string>> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString() ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export function getEvents() {
  return request<EventsResponse>("/events");
}

export function createEvent(data: Omit<EventData, "eventId">) {
  return request<EventData>("/events", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateEvent(eventId: string, data: Omit<EventData, "eventId">) {
  return request<EventData>(`/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteEvent(eventId: string) {
  return request<{ message: string }>(`/events/${eventId}`, {
    method: "DELETE",
  });
}

export function getExclusions(questId: string) {
  return request<Exclusion[]>(`/exclusions/${questId}`);
}

export function updateExclusions(questId: string, exclusions: Exclusion[]) {
  return request<Exclusion[]>(`/exclusions/${questId}`, {
    method: "PUT",
    body: JSON.stringify(exclusions),
  });
}
