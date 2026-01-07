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
  primary: "from-primary/20 via-primary/10 to-transparent border-primary/30 hover:border-primary/50",
  success: "from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500/30 hover:border-emerald-500/50",
  warning: "from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/30 hover:border-amber-500/50",
  danger: "from-rose-500/20 via-rose-500/10 to-transparent border-rose-500/30 hover:border-rose-500/50",
};

const iconColorClasses = {
  primary: "text-primary bg-gradient-to-br from-primary/30 to-primary/10 shadow-lg shadow-primary/20",
  success: "text-emerald-400 bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 shadow-lg shadow-emerald-500/20",
  warning: "text-amber-400 bg-gradient-to-br from-amber-500/30 to-amber-500/10 shadow-lg shadow-amber-500/20",
  danger: "text-rose-400 bg-gradient-to-br from-rose-500/30 to-rose-500/10 shadow-lg shadow-rose-500/20",
};

const glowClasses = {
  primary: "group-hover:shadow-[0_0_40px_-10px_hsl(var(--primary))]",
  success: "group-hover:shadow-[0_0_40px_-10px_rgb(16,185,129)]",
  warning: "group-hover:shadow-[0_0_40px_-10px_rgb(245,158,11)]",
  danger: "group-hover:shadow-[0_0_40px_-10px_rgb(244,63,94)]",
};

const KPICard = ({ title, value, change, icon: Icon, color = "primary" }: KPICardProps) => {
  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className="w-3.5 h-3.5" />;
    if (change < 0) return <TrendingDown className="w-3.5 h-3.5" />;
    return <Minus className="w-3.5 h-3.5" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return "";
    if (change > 0) return "text-emerald-400 bg-emerald-500/10";
    if (change < 0) return "text-rose-400 bg-rose-500/10";
    return "text-muted-foreground bg-muted";
  };

  return (
    <Card className={cn(
      "group bg-gradient-to-br border relative overflow-hidden transition-all duration-500",
      colorClasses[color],
      glowClasses[color]
    )}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,_currentColor_1px,_transparent_1px)] bg-[length:20px_20px]" />
      
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold tracking-tight truncate">{value}</p>
            {change !== undefined && (
              <div className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full", getTrendColor())}>
                {getTrendIcon()}
                <span>{Math.abs(change).toFixed(1)}%</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn("p-3 rounded-xl transition-transform duration-300 group-hover:scale-110", iconColorClasses[color])}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;
