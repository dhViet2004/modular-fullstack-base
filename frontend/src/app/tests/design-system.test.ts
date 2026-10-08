import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../globals.css", import.meta.url), "utf8");
const colors = new Map(
  Array.from(css.matchAll(/--([a-z-]+): (#[0-9a-f]{6});/g), (match) => [
    match[1],
    match[2],
  ]),
);

function luminance(token: string) {
  const hex = colors.get(token);
  if (!hex) throw new Error(`Missing color token: ${token}`);

  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

describe("shared design system text contrast", () => {
  it.each([
    ["text-primary", "background-default"],
    ["text-primary", "surface-default"],
    ["text-secondary", "background-default"],
    ["text-secondary", "surface-default"],
    ["action-primary", "surface-default"],
    ["action-primary", "action-subtle"],
    ["surface-default", "action-primary"],
    ["surface-default", "action-hover"],
    ["text-success", "surface-default"],
    ["text-warning", "surface-default"],
    ["status-danger", "surface-default"],
    ["surface-default", "status-danger"],
    ["surface-default", "status-danger-hover"],
    ["text-danger", "surface-danger"],
    ["text-success", "surface-success"],
    ["text-primary", "surface-muted"],
  ])("keeps %s on %s at WCAG AA for normal text", (foreground, background) => {
    const first = luminance(foreground);
    const second = luminance(background);
    const contrast =
      (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });
});
