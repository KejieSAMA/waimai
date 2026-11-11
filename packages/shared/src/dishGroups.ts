export interface GroupPosition {
  id: string;
  top: number;
}
export function groupScrollTop(
  groups: GroupPosition[],
  id: string,
  max: number,
): number {
  return Math.max(
    0,
    Math.min(max, groups.find((group) => group.id === id)?.top ?? 0),
  );
}
export function activeScrollGroup(
  groups: GroupPosition[],
  top: number,
  max: number,
): string {
  if (top <= 0 || !groups.length) return "";
  if (max > 0 && top >= max - 1) return groups.at(-1)!.id;
  return groups.filter((group) => group.top <= top + 1).at(-1)?.id ?? "";
}
