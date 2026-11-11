import { defineStore } from "pinia";
import { ref } from "vue";
import type { Account, Role } from "@waimai/shared";
export const useAuth = defineStore("auth", () => {
  const accounts = ref<Partial<Record<Role, Account>>>({});
  const tokens = ref<Partial<Record<Role, string>>>({});
  const refreshing = new Map<Role, Promise<boolean>>();
  function save(role: Role, session: { accessToken: string; user: Account }) {
    accounts.value[role] = session.user;
    tokens.value[role] = session.accessToken;
  }
  async function refresh(role: Role): Promise<boolean> {
    const pending = refreshing.get(role);
    if (pending) return pending;
    const task = (async () => {
      try {
        const response = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });
        const result = await response.json();
        if (!response.ok) {
          delete accounts.value[role];
          delete tokens.value[role];
          return false;
        }
        save(role, result.data);
        return true;
      } catch {
        return false;
      } finally {
        refreshing.delete(role);
      }
    })();
    refreshing.set(role, task);
    return task;
  }
  async function logout(role: Role) {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    delete accounts.value[role];
    delete tokens.value[role];
  }
  return { accounts, tokens, save, refresh, logout };
});
