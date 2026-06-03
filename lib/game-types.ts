export type GameRecord = {
  id: number | string;
  name: string;
  icon?: string;
  playtime?: number | string;
  progress?: number;
  status?: string;
  type?: string;
  description?: string;
  lastPlayed?: string;
  screenshots?: string[];
  videos?: string[];
  steamAppId?: string | number;
  steamPlaytimeMinutes?: number;
  cloudSource?: string;
};

export const GAME_TYPE_OPTIONS = [
  "开放世界",
  "策略",
  "MOBA",
  "养成",
  "RPG",
  "FPS",
  "其他",
] as const;

export const GAME_STATUS_OPTIONS = [
  { value: "playing", label: "正在玩" },
  { value: "completed", label: "已完成" },
  { value: "paused", label: "暂停中" },
  { value: "dropped", label: "已放弃" },
] as const;

export type GameFormValues = {
  name: string;
  icon: string;
  type: string;
  status: string;
  progress: number;
  playtime: number;
  description: string;
};
