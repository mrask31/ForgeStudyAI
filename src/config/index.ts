import { highConfig } from "./gradeBands/high";
import { middleConfig } from "./gradeBands/middle";

export type GradeBand = "middle" | "high";

export function getGradeBandConfig(gradeBand: GradeBand) {
  switch (gradeBand) {
    case "middle":
      return middleConfig;
    case "high":
    default:
      return highConfig;
  }
}
