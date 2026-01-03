import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TierBadgeProps {
  tier: "hot" | "warm" | "cold";
  className?: string;
  isProcessing?: boolean;
}

export function TierBadge({ tier, className, isProcessing }: TierBadgeProps) {
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
      {isProcessing && (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      )}
      {tier.toUpperCase()}
    </Badge>
  );
}
