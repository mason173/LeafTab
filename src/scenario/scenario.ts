import type { ComponentType } from "react";
import {
  RiBookOpenFill,
  RiBriefcaseFill,
  RiFileTextFill,
  RiFireFill,
  RiGamepadFill,
  RiGiftFill,
  RiGraduationCapFill,
  RiHeartFill,
  RiHomeFill,
  RiLeafFill,
  RiLightbulbFill,
  RiMusicFill,
  RiRestaurantFill,
  RiRocketFill,
  RiShoppingCartFill,
  RiSnowflakeFill,
  RiUserFill,
} from "@remixicon/react";

type ScenarioIconKey =
  | "home"
  | "book"
  | "shopping"
  | "briefcase"
  | "music"
  | "game"
  | "food"
  | "fire"
  | "graduation"
  | "gift"
  | "file"
  | "rocket"
  | "user"
  | "leaf"
  | "snow"
  | "heart"
  | "idea";

type ScenarioMode = {
  id: string;
  name: string;
  color: string;
  icon: ScenarioIconKey;
};

const SCENARIO_MODES_KEY = "scenario_modes_v1";
const SCENARIO_SELECTED_KEY = "scenario_selected_v1";

const defaultScenarioModes: ScenarioMode[] = [
  { id: "life-mode-001", name: "生活模式", color: "#3DD6C5", icon: "leaf" },
];

const scenarioColorOptions = [
  "#55C26A",
  "#6D4AFF",
  "#8B8BFF",
  "#9B4DFF",
  "#35B7FF",
  "#3DD6C5",
  "#FF4B3A",
  "#FF3D7F",
  "#FF7B64",
  "#FF9A1E",
  "#FFB020",
  "#FFD400",
];

const scenarioIconOptions: Array<{
  key: ScenarioIconKey;
  Icon: ComponentType<{ className?: string }>;
}> = [
  { key: "home", Icon: RiHomeFill },
  { key: "book", Icon: RiBookOpenFill },
  { key: "shopping", Icon: RiShoppingCartFill },
  { key: "briefcase", Icon: RiBriefcaseFill },
  { key: "music", Icon: RiMusicFill },
  { key: "game", Icon: RiGamepadFill },
  { key: "food", Icon: RiRestaurantFill },
  { key: "rocket", Icon: RiRocketFill },
  { key: "user", Icon: RiUserFill },
  { key: "leaf", Icon: RiLeafFill },
  { key: "heart", Icon: RiHeartFill },
  { key: "idea", Icon: RiLightbulbFill },
];

const scenarioIconAll: Array<{
  key: ScenarioIconKey;
  Icon: ComponentType<{ className?: string }>;
}> = [
  { key: "home", Icon: RiHomeFill },
  { key: "book", Icon: RiBookOpenFill },
  { key: "shopping", Icon: RiShoppingCartFill },
  { key: "briefcase", Icon: RiBriefcaseFill },
  { key: "music", Icon: RiMusicFill },
  { key: "game", Icon: RiGamepadFill },
  { key: "food", Icon: RiRestaurantFill },
  { key: "fire", Icon: RiFireFill },
  { key: "graduation", Icon: RiGraduationCapFill },
  { key: "gift", Icon: RiGiftFill },
  { key: "file", Icon: RiFileTextFill },
  { key: "rocket", Icon: RiRocketFill },
  { key: "user", Icon: RiUserFill },
  { key: "leaf", Icon: RiLeafFill },
  { key: "snow", Icon: RiSnowflakeFill },
  { key: "heart", Icon: RiHeartFill },
  { key: "idea", Icon: RiLightbulbFill },
];

function makeScenarioId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function getScenarioIconByKey(key: ScenarioIconKey) {
  return scenarioIconAll.find((i) => i.key === key)?.Icon ?? RiHomeFill;
}

export type { ScenarioIconKey, ScenarioMode };
export {
  SCENARIO_MODES_KEY,
  SCENARIO_SELECTED_KEY,
  defaultScenarioModes,
  scenarioColorOptions,
  scenarioIconOptions,
  makeScenarioId,
  getScenarioIconByKey,
};
