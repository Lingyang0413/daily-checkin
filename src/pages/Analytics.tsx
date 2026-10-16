import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CheckCheck,
  Flame,
  Scale,
  Utensils,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  ChartTooltip,
  EmptyState,
  PageHeader,
  StatCard,
} from "../components/ui";
import {
  dailyStats,
  duration,
  formatDate,
  money,
  recentDays,
} from "../lib/data";
import type { PageId, PageProps } from "../lib/types";

type Point = {
  date: string;
  completion: number | null;
  expense: number | null;
  study: number | null;
  weight: number | null;
  calories: number | null;
};
type Metric = Exclude<keyof Point, "date">;
interface TrendChartProps {
  points: Point[];
  metric: Metric;
  label: string;
  unit: string;
  color: string;
  type?: "area" | "bar" | "line";
  icon: LucideIcon;
  navigate: (page: PageId) => void;
  page: PageId;
}

function TrendChart({
  points,
  metric,
  label,
  unit,
  color,
  type = "area",
  icon,
  navigate,
  page,
}: TrendChartProps) {
  if (!points.some((point) => point[metric] !== null))
    return (
      <EmptyState
        icon={icon}
        title={`这段时间还没有${label}记录`}
        description="记录后，你的积累和变化就会在这里呈现。"
        action={
          <button className="text-link" onClick={() => navigate(page)}>
            去记录
            <ArrowRight size={14} />
          </button>
        }
      />
    );
  const axes = (
    <>
      <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#edf0ec" />
      <XAxis
        dataKey="date"
        tickFormatter={(value) => value.slice(5).replace("-", "/")}
        minTickGap={25}
        axisLine={false}
        tickLine={false}
        tickMargin={11}
        stroke="#9ba49e"
        fontSize={11}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        stroke="#9ba49e"
        fontSize={11}
        domain={
          metric === "completion"
            ? [0, 100]
            : metric === "weight"
              ? ["auto", "auto"]
              : [0, "auto"]
        }
      />
      <Tooltip content={<ChartTooltip />} />
    </>
  );
  return (
    <div
      className="chart-box analytics-chart"
      role="img"
      aria-label={`${points.length} 天${label}趋势图，单位${unit}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart
            data={points}
            margin={{
              top: 20,
              right: 10,
              left: metric === "calories" ? -7 : -17,
              bottom: 5,
            }}
            barCategoryGap={points.length > 30 ? "15%" : "45%"}
          >
            {axes}
            <Bar
              isAnimationActive={false}
              dataKey={metric}
              name={`${label}（${unit}）`}
              fill={color}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        ) : type === "line" ? (
          <LineChart
            data={points}
            margin={{ top: 20, right: 15, left: -12, bottom: 5 }}
          >
            {axes}
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey={metric}
              name={`${label}（${unit}）`}
              stroke={color}
              strokeWidth={2.5}
              dot={{
                r: points.length <= 7 ? 4 : 2,
                strokeWidth: 2,
                fill: "#fff",
              }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        ) : (
          <AreaChart
            data={points}
            margin={{ top: 20, right: 10, left: -17, bottom: 5 }}
          >
            <defs>
              <linearGradient
                id={`analytics-${metric}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {axes}
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey={metric}
              name={`${label}（${unit}）`}
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#analytics-${metric})`}
              dot={{
                r: points.length <= 7 ? 3 : 1.5,
                strokeWidth: 2,
                fill: "#fff",
              }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default function Analytics({ data, navigate }: PageProps) {
  const [range, setRange] = useState(7);
  const days = recentDays(range);
  const dateSet = new Set(days);
  const rangeTasks = data.tasks.filter((item) => dateSet.has(item.date));
  const rangeExpenses = data.expenses.filter((item) => dateSet.has(item.date));
  const rangeStudies = data.studies.filter((item) => dateSet.has(item.date));
  const rangeMeals = data.meals.filter((item) => dateSet.has(item.date));
  const rangeWeights = data.weights
    .filter((item) => dateSet.has(item.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  const completedTasks = rangeTasks.filter((task) => task.completed).length;
  const completion = rangeTasks.length
    ? Math.round((completedTasks / rangeTasks.length) * 100)
    : null;
  const totalExpense = rangeExpenses.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const totalStudy = rangeStudies.reduce((sum, item) => sum + item.minutes, 0);
  const activeDays = new Set(
    [
      ...rangeTasks,
      ...rangeExpenses,
      ...rangeStudies,
      ...rangeMeals,
      ...rangeWeights,
    ].map((item) => item.date),
  ).size;
  const mealDays = new Set(rangeMeals.map((item) => item.date)).size;
  const averageCalories = mealDays
    ? Math.round(
        rangeMeals.reduce((sum, item) => sum + item.calories, 0) / mealDays,
      )
    : null;
  const weightChange =
    rangeWeights.length >= 2
      ? rangeWeights.at(-1)!.value - rangeWeights[0].value
      : null;
  const points: Point[] = days.map((date) => {
    const stats = dailyStats(data, date);
    return {
      date,
      completion: stats.totalTasks ? stats.completion : null,
      expense: rangeExpenses.some((item) => item.date === date)
        ? stats.expense
        : null,
      study: rangeStudies.some((item) => item.date === date)
        ? stats.study
        : null,
      weight: stats.weight,
      calories: rangeMeals.some((item) => item.date === date)
        ? stats.calories
        : null,
    };
  });

  return (
    <div className="page-stack analytics-page">
      <PageHeader
        eyebrow="SMALL STEPS, VISIBLE PROGRESS"
        title="数据统计"
        description="把微小的坚持连起来，看见属于自己的生活轨迹。"
        action={
          <div className="segmented range-tabs">
            {[7, 30, 90].map((days) => (
              <button
                className={range === days ? "active" : ""}
                key={days}
                onClick={() => setRange(days)}
              >
                近 {days} 天
              </button>
            ))}
          </div>
        }
      />
      <div className="analytics-period">
        <span>
          <CalendarCheck size={15} />
          {formatDate(days[0], {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          — {formatDate(days.at(-1)!, { month: "long", day: "numeric" })}
        </span>
        <span className="muted">留白表示当天没有记录，不计作零</span>
      </div>
      <div className="stats-grid">
        <StatCard
          label="总任务完成率"
          value={completion === null ? "—" : completion}
          unit={completion !== null ? "%" : undefined}
          icon={CheckCheck}
          tone="green"
          hint={
            rangeTasks.length
              ? `完成 ${completedTasks} / ${rangeTasks.length} 项任务`
              : "每个小目标，都值得被完成"
          }
        />
        <StatCard
          label="累计消费"
          value={rangeExpenses.length ? money(totalExpense) : "—"}
          unit={rangeExpenses.length ? "元" : undefined}
          icon={Wallet}
          tone="orange"
          hint={
            rangeExpenses.length
              ? `这段时间共记录 ${rangeExpenses.length} 笔开销`
              : "让每一笔开销都清清楚楚"
          }
        />
        <StatCard
          label="累计学习"
          value={rangeStudies.length ? duration(totalStudy) : "—"}
          icon={BookOpen}
          tone="blue"
          hint={
            rangeStudies.length
              ? `这段时间共专注学习 ${rangeStudies.length} 次`
              : "每天的积累，时间会给出答案"
          }
        />
        <StatCard
          label="有记录的日子"
          value={activeDays}
          unit="天"
          icon={Flame}
          tone="purple"
          hint={`最近 ${range} 天中，${activeDays} 天留下了生活的痕迹`}
        />
      </div>

      <div className="content-grid analytics-grid">
        <Card
          title="打卡完成率"
          description="完成率按当天全部任务计算"
          action={<span className="chart-unit">%</span>}
        >
          <TrendChart
            points={points}
            metric="completion"
            label="打卡"
            unit="%"
            color="#6a9275"
            icon={CheckCheck}
            page="tasks"
            navigate={navigate}
          />
          <div className="chart-footnote">
            <span className="chart-key">
              <i style={{ background: "#6a9275" }} />
              每日完成率
            </span>
            <span>
              {rangeTasks.length
                ? `${completedTasks} 项小目标已完成`
                : "未记录任务的日期留白"}
            </span>
          </div>
        </Card>
        <Card
          title="消费趋势"
          description="花得明白，生活更有余地"
          action={<span className="chart-unit">元</span>}
        >
          <TrendChart
            points={points}
            metric="expense"
            label="消费"
            unit="元"
            color="#c6a070"
            type="bar"
            icon={Wallet}
            page="expenses"
            navigate={navigate}
          />
          <div className="chart-footnote">
            <span className="chart-key">
              <i style={{ background: "#c6a070" }} />
              每日消费
            </span>
            <span>
              {rangeExpenses.length
                ? `记录日均 ¥ ${money(totalExpense / new Set(rangeExpenses.map((item) => item.date)).size)}`
                : "从一笔日常开销开始"}
            </span>
          </div>
        </Card>
        <Card
          title="学习时间"
          description="专注的每一分钟，都算数"
          action={<span className="chart-unit">分钟</span>}
        >
          <TrendChart
            points={points}
            metric="study"
            label="学习"
            unit="分钟"
            color="#879cc2"
            type="bar"
            icon={BookOpen}
            page="study"
            navigate={navigate}
          />
          <div className="chart-footnote">
            <span className="chart-key">
              <i style={{ background: "#879cc2" }} />
              每日学习时间
            </span>
            <span>
              {rangeStudies.length
                ? `共积累 ${duration(totalStudy)}`
                : "给成长留一点时间"}
            </span>
          </div>
        </Card>
        <Card
          title="体重变化"
          description="短期的波动，是生活的一部分"
          action={<span className="chart-unit">kg</span>}
        >
          <TrendChart
            points={points}
            metric="weight"
            label="体重"
            unit="kg"
            color="#a297b6"
            type="line"
            icon={Scale}
            page="weight"
            navigate={navigate}
          />
          <div className="chart-footnote">
            <span className="chart-key">
              <i style={{ background: "#a297b6" }} />
              每日体重
            </span>
            <span>
              {weightChange === null
                ? `共 ${rangeWeights.length} 次记录`
                : `期间变化 ${weightChange > 0 ? "+" : ""}${weightChange.toFixed(2)} kg`}
            </span>
          </div>
        </Card>
        <Card
          className="calorie-analytics"
          title="每日热量摄入"
          description="来自手动记录的估算，帮助了解自己的饮食节奏"
          action={<span className="chart-unit">kcal</span>}
        >
          <TrendChart
            points={points}
            metric="calories"
            label="热量摄入"
            unit="kcal"
            color="#adbe8a"
            icon={Utensils}
            page="diet"
            navigate={navigate}
          />
          <div className="chart-footnote">
            <span className="chart-key">
              <i style={{ background: "#adbe8a" }} />
              每日估算摄入
            </span>
            <span>
              {averageCalories !== null
                ? `${mealDays} 个记录日日均 ${averageCalories.toLocaleString()} kcal`
                : "好好吃饭，好好记录"}
            </span>
          </div>
        </Card>
      </div>

      <div className="analytics-note">
        <BarChart3 size={18} />
        <p>
          统计基于你手动填写的记录。没有记录的日期显示留白；消费、热量的日均值仅包含有对应记录的日期。热量可能只覆盖当天已记录的餐次，体重与饮食数据仅供个人日常管理参考。
        </p>
      </div>
    </div>
  );
}
