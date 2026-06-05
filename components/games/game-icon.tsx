"use client";

import Image from "next/image";
import { useState } from "react";
import { defaultGameCover, gameIconUrl } from "@/lib/game-utils";

type Props = {
  src?: string;
  name: string;
  className?: string;
  width?: number;
  height?: number;
};

export function GameIcon({
  src,
  name,
  className = "",
  width = 80,
  height = 80,
}: Props) {
  // 初始化拼接图标地址
  const [imgSrc, setImgSrc] = useState(() => gameIconUrl(src, name));

  return (
    <Image
      src={imgSrc}
      alt={name}
      width={width}
      height={height}
      className={className}
      unoptimized
      // 图片加载失败自动替换默认封面
      onError={() => setImgSrc(defaultGameCover(name))}
    />
  );
}