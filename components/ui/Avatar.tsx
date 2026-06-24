import { avatarGradient } from "@/lib/utils";
import { initials } from "@/lib/wrike";
import Image from "next/image";

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, imageUrl, size = 32, className = "" }: AvatarProps) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 text-white font-display font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        background: avatarGradient(name),
        fontSize: size * 0.38,
      }}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}
