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
  { href: "/", label: "棣栭〉", icon: Home },
  { href: "/profile", label: "涓汉绠€浠?, icon: User },
  { href: "/games", label: "娓告垙鏀惰棌", icon: Gamepad2 },
  { href: "/achievements", label: "鎴愬氨绯荤粺", icon: Trophy },
  { href: "/stats", label: "鏁版嵁缁熻", icon: BarChart3 },
  { href: "/report", label: "骞村害鎶ュ憡", icon: Sparkles },
  { href: "/spending", label: "娑堣垂璁板綍", icon: ShoppingCart },
];

export const MORE_NAV: NavItem[] = [
  { href: "/gallery", label: "濯掍綋搴?, icon: Image, inMore: true },
  { href: "/wishlist", label: "娓告垙鎰挎湜鍗?, icon: Heart, inMore: true },
  { href: "/reviews", label: "娓告垙璇勬祴", icon: MessageSquare, inMore: true },
];
