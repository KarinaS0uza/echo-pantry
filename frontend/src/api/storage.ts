/** Both obtaining storage and invoking it can throw in private/restricted contexts. */
export const storage = {
  read(key: string): string | null {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  write(key: string, value: string): boolean {
    try { window.localStorage.setItem(key, value); return true; } catch { return false; }
  },
  remove(key: string): boolean {
    try { window.localStorage.removeItem(key); return true; } catch { return false; }
  },
};
