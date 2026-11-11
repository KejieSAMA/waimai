export function createOverlayStack() {
  const entries: symbol[] = [];
  return {
    push(key: symbol) {
      if (!entries.includes(key)) entries.push(key);
    },
    remove(key: symbol) {
      const index = entries.indexOf(key);
      if (index >= 0) entries.splice(index, 1);
    },
    isTop(key: symbol) {
      return entries.at(-1) === key;
    },
    get size() {
      return entries.length;
    },
  };
}
export const dialogStack = createOverlayStack();
