export interface ScrollbarMetrics {
  visible: boolean;
  thumbSize: number;
  thumbOffset: number;
  maxScroll: number;
  travel: number;
}

// The caller selects an existing gutter; placement never changes viewport size.
export function scrollbarTrackOffset(
  placement: "inside" | "outside",
  gutter: number,
  trackWidth: number,
): number {
  if (placement === "inside") return 0;
  const width = Number.isFinite(trackWidth) ? Math.max(0, trackWidth) : 12;
  return -Math.max(width, Number.isFinite(gutter) ? gutter : 16);
}

export function scrollbarMetrics(
  viewportSize: number,
  contentSize: number,
  scrollOffset: number,
  trackSize = viewportSize,
  minThumbSize = 24,
): ScrollbarMetrics {
  const maxScroll = Math.max(0, contentSize - viewportSize);
  if (viewportSize <= 0 || trackSize <= 0 || maxScroll <= 1) {
    return {
      visible: false,
      thumbSize: 0,
      thumbOffset: 0,
      maxScroll: 0,
      travel: 0,
    };
  }
  const thumbSize = Math.min(
    trackSize,
    Math.max(
      Math.min(minThumbSize, trackSize / 2),
      (trackSize * viewportSize) / contentSize,
    ),
  );
  const travel = trackSize - thumbSize;
  const thumbOffset =
    (Math.max(0, Math.min(maxScroll, scrollOffset)) / maxScroll) * travel;
  return { visible: true, thumbSize, thumbOffset, maxScroll, travel };
}

export function scrollOffsetFromThumb(
  thumbOffset: number,
  metrics: ScrollbarMetrics,
): number {
  if (!metrics.visible || metrics.travel <= 0) return 0;
  return (
    (Math.max(0, Math.min(metrics.travel, thumbOffset)) / metrics.travel) *
    metrics.maxScroll
  );
}
