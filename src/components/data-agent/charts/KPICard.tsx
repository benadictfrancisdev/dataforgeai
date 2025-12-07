import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  color?: "primary" | "success" | "warning" | "danger";
}

const colorClasses = {
  primary: "from-primary/20 to-primary/5 border-primary/30",
  success: "from-green-500/20 to-green-500/5 border-green-500/30",
  warning: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
  danger: "from-red-500/20 to-red-500/5 border-red-500/30",
};

const iconColorClasses = {
  primary: "text-primary bg-primary/20",
  success: "text-green-400 bg-green-500/20",
  warning: "text-yellow-400 bg-yellow-500/20",
  danger: "text-red-400 bg-red-500/20",
};

const KPICard = ({ title, value, change, icon: Icon, color = "primary" }: KPICardProps) => {
  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    if (change < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return "";
    if (change > 0) return "text-green-400";
    if (change < 0) return "text-red-400";
    return "text-muted-foreground";
  };

  return (
    <Card className={cn(
      "bg-gradient-to-br border",
      colorClasses[color]
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <div className={cn("flex items-center gap-1 text-xs font-medium", getTrendColor())}>
                {getTrendIcon()}
                <span>{Math.abs(change).toFixed(1)}%</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn("p-2 rounded-lg", iconColorClasses[color])}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;
