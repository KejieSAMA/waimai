export function dialogCloseDecision(pending: boolean, dirty: boolean) {
  return pending ? "block" : dirty ? "confirm" : "close";
}
export function rowActivation(
  interactive: boolean,
  nestedControl: boolean,
  key?: string,
) {
  return (
    interactive &&
    !nestedControl &&
    (key === undefined || key === "Enter" || key === " ")
  );
}
