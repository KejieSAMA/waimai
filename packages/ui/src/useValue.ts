import { computed, ref } from "vue";
export function useValue<T>(
  get: () => T | undefined,
  initial: T,
  emit: (value: T) => void,
) {
  const internal = ref(initial);
  return computed<T>({
    get: () => get() ?? (internal.value as T),
    set: (value) => {
      internal.value = value as typeof internal.value;
      emit(value);
    },
  });
}
