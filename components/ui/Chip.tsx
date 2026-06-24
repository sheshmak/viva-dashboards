import { cn } from "@/lib/utils";

type ChipVariant = "red" | "amber" | "green" | "blue" | "muted";

interface ChipProps {
  variant: ChipVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClass: Record<ChipVariant, string> = {
  red: "chip-red",
  amber: "chip-amber",
  green: "chip-green",
  blue: "chip-blue",
  muted: "chip-muted",
};

export function Chip({ variant, children, className }: ChipProps) {
  return (
    <span className={cn("chip-base", variantClass[variant], className)}>
      {children}
    </span>
  );
}

export function taskStatusChip(status: string) {
  switch (status) {
    case "Active": return <Chip variant="blue">Active</Chip>;
    case "Completed": return <Chip variant="green">Done</Chip>;
    case "Deferred": return <Chip variant="muted">Deferred</Chip>;
    case "Cancelled": return <Chip variant="red">Cancelled</Chip>;
    default: return <Chip variant="muted">{status}</Chip>;
  }
}

export function projectStatusChip(status?: string) {
  switch (status) {
    case "Green": return <Chip variant="green">On track</Chip>;
    case "Yellow": return <Chip variant="amber">On watch</Chip>;
    case "Red": return <Chip variant="red">At risk</Chip>;
    case "Completed": return <Chip variant="blue">Completed</Chip>;
    case "OnHold": return <Chip variant="muted">On hold</Chip>;
    case "Cancelled": return <Chip variant="red">Cancelled</Chip>;
    default: return <Chip variant="muted">Planning</Chip>;
  }
}
