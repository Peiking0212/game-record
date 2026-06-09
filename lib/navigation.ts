import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Gamepad2,
  Heart,
  Home,
  Image,
  MessageSquare,
  ShoppingCart,
  Sparkles,
  Trophy,
  User,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  inMore?: boolean;
};

export const MAIN_NAV: NavItem[] = [
  { href: "/", label: "首页", icon: Home },
  { href: "/profile", label: "个人主页", icon: User },
  { href: "/games", label: "游戏收藏", icon: Gamepad2 },
  { href: "/achievements", label: "成就系统", icon: Trophy },
  { href: "/stats", label: "数据统计", icon: BarChart3 },
  { href: "/report", label: "年度报告", icon: Sparkles },
  { href: "/spending", label: "消费记录", icon: ShoppingCart },
];

export const MORE_NAV: NavItem[] = [
  { href: "/gallery", label: "媒体库", icon: Image, inMore: true },
  { href: "/wishlist", label: "游戏愿望单", icon: Heart, inMore: true },
  { href: "/reviews", label: "游戏评测", icon: MessageSquare, inMore: true },
];