import { onBeforeUnmount, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { profileLeaveDecision } from "@waimai/shared";
import { useAuth } from "./auth";
export function useDraftLeave(dirty: () => boolean, saving: () => boolean) {
  const auth = useAuth(),
    revision = auth.revision,
    open = ref(false);
  let resolve: ((value: boolean) => void) | undefined;
  function choose(value: boolean) {
    open.value = false;
    resolve?.(value);
    resolve = undefined;
  }
  onBeforeRouteLeave(() => {
    const decision = profileLeaveDecision(
      dirty(),
      saving(),
      auth.revision === revision && !!auth.account,
    );
    if (decision === "allow") return true;
    if (decision === "block") return false;
    open.value = true;
    return new Promise<boolean>((done) => {
      resolve?.(false);
      resolve = done;
    });
  });
  function unload(event: BeforeUnloadEvent) {
    if (dirty() && auth.revision === revision && auth.account) {
      event.preventDefault();
      event.returnValue = "";
    }
  }
  window.addEventListener("beforeunload", unload);
  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", unload);
    resolve?.(true);
  });
  return { open, choose };
}
