import { highConfig } from "./gradeBands/high";
import { middleConfig } from "./gradeBands/middle";
import { elementaryConfig } from "./gradeBands/elementary";

export type GradeBand = "elementary" | "middle" | "high";

export function getGradeBandConfig(gradeBand: GradeBand) {
  switch (gradeBand) {
    case "elementary":
      return elementaryConfig;
    case "middle":
      return middleConfig;
    case "high":
    default:
      return highConfig;
  }
}
