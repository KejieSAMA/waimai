import { invalidateRoleData } from "@waimai/shared";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useAuth } from "./auth";
export function useOrderStream(
  reload: () => Promise<unknown>,
  options: { autoConnect?: boolean } = {},
) {
  const enabled = ref(false);
  const connected = ref(false);
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let audio: AudioContext | undefined;
  let stopped = true;
  function sound() {
    if (!audio || audio.state !== "running") return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.3);
  }
  async function connect() {
    if (stopped) return;
    controller = new AbortController();
    try {
      const auth = useAuth();
      if (!auth.tokens.MERCHANT) await auth.refresh("MERCHANT");
      const response = await fetch("/api/v1/merchant/orders/stream", {
        headers: { Authorization: "Bearer " + auth.tokens.MERCHANT },
        signal: controller.signal,
      });
      if (response.status === 401) {
        await auth.refresh("MERCHANT");
        throw new Error("登录已刷新");
      }
      if (!response.ok || !response.body) throw new Error("连接失败");
      connected.value = true;
      await reload();
      invalidateRoleData("MERCHANT");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const event = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          if (event.startsWith("event: order")) {
            sound();
            await reload();
            invalidateRoleData("MERCHANT");
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (error) {
      if (!stopped && error instanceof Error && error.name !== "AbortError")
        connected.value = false;
    } finally {
      connected.value = false;
      if (!stopped) timer = setTimeout(() => void connect(), 3000);
    }
  }
  async function toggle(value: boolean) {
    enabled.value = value;
    stopped = !value;
    if (!value) {
      controller?.abort();
      clearTimeout(timer);
      return;
    }
    audio ??= new AudioContext();
    await audio.resume();
    void connect();
  }
  onMounted(() => {
    if (options.autoConnect) {
      stopped = false;
      void connect();
    }
  });
  onBeforeUnmount(() => {
    stopped = true;
    controller?.abort();
    clearTimeout(timer);
    void audio?.close();
  });
  return { enabled, connected, toggle };
}
