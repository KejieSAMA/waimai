import { describe, expect, it } from "vitest";
import {
  scrollbarMetrics,
  scrollOffsetFromThumb,
  scrollbarTrackOffset,
} from "./scrollbar";

describe("覆盖式滚动条几何计算", () => {
  it("外置轨道完整进入已有间隙，内外置不改变滚动映射", () => {
    expect(scrollbarTrackOffset("inside", 16, 12)).toBe(0);
    expect(scrollbarTrackOffset("outside", 16, 12)).toBe(-16);
    expect(scrollbarTrackOffset("outside", 8, 12)).toBe(-12);
    expect(scrollbarTrackOffset("outside", NaN, NaN)).toBe(-16);
    const metrics = scrollbarMetrics(200, 800, 300);
    for (const placement of ["inside", "outside"] as const) {
      const right = scrollbarTrackOffset(placement, 16, 12);
      if (placement === "outside")
        expect(-right - 12).toBeGreaterThanOrEqual(0);
      expect(scrollOffsetFromThumb(metrics.thumbOffset, metrics)).toBe(300);
    }
  });
  it("内容未溢出或容器不可见时隐藏滑块", () => {
    for (const [viewport, content, track] of [
      [100, 80, 100],
      [100, 100, 100],
      [0, 400, 0],
      [100, 400, 0],
    ]) {
      expect(scrollbarMetrics(viewport, content, 0, track).visible).toBe(false);
    }
  });
  it("滑块尺寸和位置反映内容比例", () => {
    const metrics = scrollbarMetrics(100, 400, 150);
    expect(metrics.thumbSize).toBe(25);
    expect(metrics.thumbOffset).toBe(37.5);
    expect(metrics.maxScroll).toBe(300);
  });
  it("新增内容时缩短滑块，删除至不溢出时隐藏", () => {
    expect(scrollbarMetrics(200, 800, 0).thumbSize).toBeLessThan(
      scrollbarMetrics(200, 400, 0).thumbSize,
    );
    expect(scrollbarMetrics(200, 150, 0).visible).toBe(false);
  });
  it("容器增高后同步更新滑块长度和滚动范围", () => {
    const smaller = scrollbarMetrics(200, 800, 0);
    const larger = scrollbarMetrics(400, 800, 0);
    expect(larger.thumbSize).toBe(200);
    expect(larger.thumbSize).toBeGreaterThan(smaller.thumbSize);
    expect(larger.maxScroll).toBe(400);
  });
  it("将弹性滚动和拖拽限制在上下边界", () => {
    const metrics = scrollbarMetrics(100, 400, 0);
    expect(scrollbarMetrics(100, 400, -20).thumbOffset).toBe(0);
    expect(scrollbarMetrics(100, 400, 500).thumbOffset).toBe(metrics.travel);
    expect(scrollOffsetFromThumb(-20, metrics)).toBe(0);
    expect(scrollOffsetFromThumb(500, metrics)).toBe(300);
  });
  it("长列表滑块保持可拖动尺寸，拖到末端可到达最后一项", () => {
    const metrics = scrollbarMetrics(200, 10000, 0);
    expect(metrics.thumbSize).toBe(24);
    expect(scrollOffsetFromThumb(metrics.travel, metrics)).toBe(9800);
  });
  it("短容器仍保留滑块移动空间", () => {
    const metrics = scrollbarMetrics(16, 1000, 0);
    expect(metrics.thumbSize).toBe(8);
    expect(scrollOffsetFromThumb(metrics.travel, metrics)).toBe(984);
  });
  it("支持购物车 5.5 行产生的小数高度", () => {
    const metrics = scrollbarMetrics(49 * 5.5, 49 * 6, 49 * 0.5);
    expect(metrics.visible).toBe(true);
    expect(metrics.thumbOffset).toBeCloseTo(metrics.travel);
    expect(scrollOffsetFromThumb(metrics.travel, metrics)).toBe(24.5);
  });
  it("使用实际轨道长度映射横向和纵向滑块位置", () => {
    const metrics = scrollbarMetrics(200, 800, 300, 188);
    expect(metrics.thumbSize).toBe(47);
    expect(scrollOffsetFromThumb(metrics.thumbOffset, metrics)).toBe(300);
    expect(scrollOffsetFromThumb(10, scrollbarMetrics(100, 50, 0))).toBe(0);
  });
});
