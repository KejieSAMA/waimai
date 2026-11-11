export interface SelectOption {
  value: string;
  label: string;
}

export function selectOptions(
  options: (string | SelectOption)[],
  placeholder?: string,
): SelectOption[] {
  const entries = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );
  return placeholder
    ? [{ value: "", label: placeholder }, ...entries]
    : entries;
}

export function moveSelectIndex(
  index: number,
  length: number,
  direction: number,
): number {
  return length ? Math.max(0, Math.min(length - 1, index + direction)) : -1;
}

export function matchSelectOption(
  options: SelectOption[],
  query: string,
  start: number,
): number {
  if (!query || !options.length) return -1;
  const text = query.toLocaleLowerCase();
  for (let offset = 0; offset < options.length; offset++) {
    const index =
      (((start + offset) % options.length) + options.length) % options.length;
    if (options[index].label.toLocaleLowerCase().startsWith(text)) return index;
  }
  return -1;
}
