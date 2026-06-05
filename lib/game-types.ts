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
  "寮€鏀句笘鐣?,
  "绛栫暐",
  "MOBA",
  "鍏绘垚",
  "RPG",
  "FPS",
  "鍏朵粬",
] as const;

export const GAME_STATUS_OPTIONS = [
  { value: "playing", label: "姝ｅ湪鐜? },
  { value: "completed", label: "宸插畬鎴? },
  { value: "paused", label: "鏆傚仠涓? },
  { value: "dropped", label: "宸叉斁寮? },
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
