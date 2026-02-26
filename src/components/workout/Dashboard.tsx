import { useMemo } from "react";
import { WorkoutSession } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, parseISO } from "date-fns";

interface DashboardProps {
  sessions: WorkoutSession[];
}

const Dashboard = ({ sessions }: DashboardProps) => {
  const weeklyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStr = format(date, "yyyy-MM-dd");
      const dayLabel = format(date, "EEE");
      const vol = sessions
        .filter((s) => format(parseISO(s.date), "yyyy-MM-dd") === dayStr)
        .reduce((sum, s) => sum + s.totalVolume, 0);
      return { day: dayLabel, volume: vol };
    });
  }, [sessions]);

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Weekly Volume</h3>
      {weeklyData.some((d) => d.volume > 0) ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="day" tick={{ fill: "hsl(215 14% 50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: "hsl(220 30% 9%)", border: "1px solid hsl(215 20% 16%)", borderRadius: 8, color: "hsl(210 20% 92%)" }}
              formatter={(value: number) => [`${value.toLocaleString()} kg`, "Volume"]}
            />
            <Bar dataKey="volume" fill="hsl(160 84% 39%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-center text-muted-foreground text-sm py-8">No data yet. Complete a workout!</p>
      )}
    </div>
  );
};

export default Dashboard;
