import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function avatarGradient(name: string): string {
  const colors = [
    ["#FF6B6B", "#FFB020"],
    ["#7CB9FF", "#3DD68C"],
    ["#3DD68C", "#7CB9FF"],
    ["#FFB020", "#FF6B6B"],
    ["#B07CB9", "#7CB9FF"],
    ["#FF6B6B", "#B07CB9"],
  ];
  const i = name.charCodeAt(0) % colors.length;
  return `linear-gradient(135deg, ${colors[i][0]}, ${colors[i][1]})`;
}
