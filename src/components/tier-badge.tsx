import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TierBadgeProps {
  tier: "hot" | "warm" | "cold";
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <Badge
      className={cn(
        "font-semibold",
        tier === "hot" && "bg-red-500 hover:bg-red-600 text-white",
        tier === "warm" && "bg-yellow-500 hover:bg-yellow-600 text-black",
        tier === "cold" && "bg-blue-500 hover:bg-blue-600 text-white",
        className
      )}
    >
      {tier.toUpperCase()}
    </Badge>
  );
}
