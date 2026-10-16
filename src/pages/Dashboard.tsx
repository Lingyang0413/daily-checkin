import { useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  Flame,
  Leaf,
  Plus,
  Scale,
  Sparkles,
  TrendingUp,
  Utensils,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  ChartTooltip,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  StatCard,
} from "../components/ui";
import {
  dailyStats,
  demoData,
  duration,
  formatDate,
  money,
  recentDays,
  streak,
  today,
} from "../lib/data";
import type { PageProps } from "../lib/types";

type Trend = "study" | "expense" | "completion";
const trends = {
  study: { label: "学习", unit: "分钟", color: "#6e927e" },
  expense: { label: "消费", unit: "元", color: "#d69d66" },
  completion: { label: "打卡", unit: "%", color: "#7e8eaa" },
};

export default function Dashboard({
  data,
  update,
  notify,
  navigate,
}: PageProps) {
  const date = today();
  const stats = dailyStats(data, date);
  const tasks = data.tasks.filter((task) => task.date === date);
  const expenses = data.expenses.filter((item) => item.date === date);
  const studies = data.studies.filter((item) => item.date === date);
  const meals = data.meals.filter((item) => item.date === date);
  const [trend, setTrend] = useState<Trend>("study");
  const [confirmDemo, setConfirmDemo] = useState(false);
  const allEmpty =
    !data.tasks.length &&
    !data.expenses.length &&
    !data.studies.length &&
    !data.weights.length &&
    !data.meals.length;
  const days = recentDays(7).map((day) => {
    const dayStats = dailyStats(data, day);
    return {
      date: day,
      study: data.studies.some((item) => item.date === day)
        ? dayStats.study
        : null,
      expense: data.expenses.some((item) => item.date === day)
        ? dayStats.expense
        : null,
      completion: dayStats.totalTasks ? dayStats.completion : null,
    };
  });
  const trendHasData = days.some((day) => day[trend] !== null);
  const latestWeight = [...data.weights]
    .filter((item) => item.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 11
      ? "早上好"
      : greetingHour < 14
        ? "中午好"
        : greetingHour < 18
          ? "下午好"
          : "晚上好";

  function toggleTask(id: string) {
    update((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    }));
  }

  return (
    <div className="page-stack dashboard-page">
      <PageHeader
        eyebrow="YOUR EVERYDAY, WELL LIVED"
        title={`${greeting}，${data.settings.name || "朋友"}`}
        description={`${formatDate(date, { year: "numeric", month: "long", day: "numeric", weekday: "long" })} · 留一点时间，照顾生活，也照顾自己。`}
        action={
          <button className="btn primary" onClick={() => navigate("tasks")}>
            <Plus size={17} />
            记录今天
          </button>
        }
      />

      <section className="dashboard-hero hero-card">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span className="hero-kicker-dot" /> A LITTLE BETTER, EVERY DAY
          </span>
          <h2>
            把日常，
            <br />
            过成喜欢的样子<span>。</span>
          </h2>
          <p>不必一下子改变很多。完成一件小事，也是向前一步。</p>
          <div className="hero-bottom">
            <span className="streak-pill">
              <Flame size={16} />
              连续打卡 <strong>{streak(data)}</strong> 天
            </span>
            <button className="hero-link" onClick={() => navigate("analytics")}>
              看看我的积累 <ArrowRight size={15} />
            </button>
          </div>
        </div>
        <div
          className="hero-visual"
          aria-label={
            stats.totalTasks
              ? `今日任务完成率 ${Math.round(stats.completion)}%`
              : "今日尚无任务"
          }
        >
          <span className="hero-orbit orbit-one" />
          <span className="hero-orbit orbit-two" />
          <div className="hero-progress">
            <svg viewBox="0 0 160 160" aria-hidden="true">
              <circle className="progress-track" cx="80" cy="80" r="70" />
              <circle
                className="progress-value"
                cx="80"
                cy="80"
                r="70"
                strokeDasharray={`${stats.completion * 4.398} 439.8`}
              />
            </svg>
            <div className="hero-progress-label">
              <Leaf size={22} />
              <strong>
                {stats.totalTasks ? Math.round(stats.completion) : "—"}
                {stats.totalTasks > 0 && <small>%</small>}
              </strong>
              <span>今日任务完成率</span>
            </div>
          </div>
          <div className="hero-note">
            <CheckCheck size={15} />
            {stats.totalTasks
              ? `已完成 ${stats.completedTasks} / ${stats.totalTasks} 项小目标`
              : "从今天的第一个小目标开始"}
          </div>
          <Sparkles className="hero-sparkle" size={23} />
        </div>
      </section>

      <div className="stats-grid dashboard-stats">
        <StatCard
          label="今日消费"
          value={expenses.length ? money(stats.expense) : "—"}
          unit={expenses.length ? "元" : undefined}
          icon={Wallet}
          tone="orange"
          hint={
            expenses.length
              ? `已记录 ${expenses.length} 笔日常开销`
              : "记下每一笔，让生活有数"
          }
        />
        <StatCard
          label="今日学习"
          value={studies.length ? stats.study : "—"}
          unit={studies.length ? "分钟" : undefined}
          icon={BookOpen}
          tone="blue"
          hint={
            studies.length
              ? `距离 ${data.settings.dailyStudyGoal} 分钟目标${stats.study >= data.settings.dailyStudyGoal ? "已达成" : `还差 ${data.settings.dailyStudyGoal - stats.study} 分钟`}`
              : "每天留一点时间给成长"
          }
        />
        <StatCard
          label="今日体重"
          value={stats.weight ?? "—"}
          unit={stats.weight !== null ? "kg" : undefined}
          icon={Scale}
          tone="purple"
          hint={
            stats.weight !== null
              ? "身体的变化，慢慢看见"
              : latestWeight
                ? `最近记录 ${latestWeight.value} kg · ${latestWeight.date.slice(5)}`
                : "用记录，了解自己的节奏"
          }
        />
        <StatCard
          label="今日摄入"
          value={meals.length ? stats.calories.toLocaleString() : "—"}
          unit={meals.length ? "kcal" : undefined}
          icon={Utensils}
          tone="green"
          hint={
            meals.length
              ? `已记录 ${meals.length} 餐饮食`
              : "好好吃饭，也是认真生活"
          }
        />
      </div>

      <div className="dashboard-panels content-grid">
        <Card
          title="今天的小目标"
          description="把注意力放在真正重要的事情上"
          action={
            <button
              className="btn icon ghost"
              aria-label="前往每日打卡"
              onClick={() => navigate("tasks")}
            >
              <ArrowRight size={18} />
            </button>
          }
        >
          {tasks.length ? (
            <>
              <div className="dashboard-task-summary">
                <span>
                  {stats.completedTasks} 项已完成 / {stats.totalTasks} 项任务
                </span>
                <span className="badge green">
                  {Math.round(stats.completion)}%
                </span>
              </div>
              <div className="compact-list">
                {tasks.slice(0, 4).map((task) => (
                  <button
                    className={`dashboard-task ${task.completed ? "is-complete" : ""}`}
                    onClick={() => toggleTask(task.id)}
                    key={task.id}
                    aria-label={`${task.completed ? "取消完成" : "完成"}：${task.title}`}
                    aria-pressed={task.completed}
                  >
                    <span className="task-checkbox">
                      {task.completed && <Check size={13} />}
                    </span>
                    <span>{task.title}</span>
                    <span className="task-state">
                      {task.completed ? "已完成" : "待完成"}
                    </span>
                  </button>
                ))}
              </div>
              <button
                className="text-link dashboard-card-footer"
                onClick={() => navigate("tasks")}
              >
                {tasks.length > 4
                  ? `查看全部 ${tasks.length} 项任务`
                  : "管理今日任务"}
                <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <EmptyState
              icon={CheckCheck}
              title="今天，想完成什么？"
              description="喝一杯水、读十页书，从一个小目标开始。"
              action={
                <button
                  className="btn secondary"
                  onClick={() => navigate("tasks")}
                >
                  <Plus size={15} />
                  添加今日任务
                </button>
              }
            />
          )}
        </Card>

        <Card
          title="一周的生活节奏"
          description="每一份小小的积累，都值得被看见"
          action={
            <div className="segmented compact">
              {(Object.keys(trends) as Trend[]).map((key) => (
                <button
                  className={trend === key ? "active" : ""}
                  onClick={() => setTrend(key)}
                  key={key}
                >
                  {trends[key].label}
                </button>
              ))}
            </div>
          }
        >
          {trendHasData ? (
            <div className="chart-box dashboard-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={days}
                  margin={{ top: 18, right: 8, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="dashboardTrend"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={trends[trend].color}
                        stopOpacity={0.24}
                      />
                      <stop
                        offset="100%"
                        stopColor={trends[trend].color}
                        stopOpacity={0.015}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 5"
                    vertical={false}
                    stroke="#edf0ec"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => value.slice(5).replace("-", "/")}
                    axisLine={false}
                    tickLine={false}
                    fontSize={11}
                    tickMargin={12}
                    stroke="#9ba49e"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    fontSize={11}
                    stroke="#9ba49e"
                    domain={trend === "completion" ? [0, 100] : [0, "auto"]}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey={trend}
                    name={`${trends[trend].label}（${trends[trend].unit}）`}
                    stroke={trends[trend].color}
                    strokeWidth={2.5}
                    fill="url(#dashboardTrend)"
                    dot={{ r: 3, fill: "#fff", strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="你的趋势，从第一条记录开始"
              description={`最近 7 天还没有${trends[trend].label}记录。记录后，变化就会在这里出现。`}
              action={
                <button
                  className="text-link"
                  onClick={() =>
                    navigate(
                      trend === "study"
                        ? "study"
                        : trend === "expense"
                          ? "expenses"
                          : "tasks",
                    )
                  }
                >
                  开始记录
                  <ArrowRight size={14} />
                </button>
              }
            />
          )}
        </Card>
      </div>

      <div className="section-head">
        <div>
          <span className="section-eyebrow">THE LITTLE THINGS</span>
          <h2>今天的生活切片</h2>
        </div>
        <span className="muted">认真记录，轻盈生活</span>
      </div>
      <div className="overview-grid">
        <Card
          className="overview-card"
          title="日常开销"
          action={<Wallet className="overview-icon orange" size={20} />}
        >
          <div className="overview-value">
            {expenses.length ? `¥ ${money(stats.expense)}` : "还没有消费记录"}
          </div>
          <div className="mini-records">
            {expenses
              .slice(-2)
              .reverse()
              .map((item) => (
                <div className="mini-record" key={item.id}>
                  <span>{item.note || item.category}</span>
                  <strong>¥ {money(item.amount)}</strong>
                </div>
              ))}
            {!expenses.length && (
              <p className="muted">一杯咖啡，一顿午餐，都有迹可循。</p>
            )}
          </div>
          <button className="text-link" onClick={() => navigate("expenses")}>
            记一笔消费
            <ArrowRight size={14} />
          </button>
        </Card>
        <Card
          className="overview-card"
          title="学习时光"
          action={<BookOpen className="overview-icon blue" size={20} />}
        >
          <div className="overview-value">
            {studies.length ? duration(stats.study) : "给自己一点成长时间"}
          </div>
          <div className="mini-records">
            {studies
              .slice(-2)
              .reverse()
              .map((item) => (
                <div className="mini-record" key={item.id}>
                  <span>{item.content}</span>
                  <strong>{item.minutes} 分钟</strong>
                </div>
              ))}
            {!studies.length && (
              <p className="muted">每一点专注，都在悄悄成就你。</p>
            )}
          </div>
          <button className="text-link" onClick={() => navigate("study")}>
            记录一次学习
            <ArrowRight size={14} />
          </button>
        </Card>
        <Card
          className="overview-card"
          title="身体状态"
          action={<Scale className="overview-icon purple" size={20} />}
        >
          <div className="overview-value">
            {stats.weight !== null ? (
              <>
                {stats.weight}
                <small> kg</small>
              </>
            ) : (
              "今天还没有称重"
            )}
          </div>
          <div className="mini-records">
            <p className="muted">
              {data.settings.targetWeight
                ? `向着 ${data.settings.targetWeight} kg 的目标，慢慢来。`
                : "关注长期变化，也接纳每天的起伏。"}
            </p>
            {latestWeight && stats.weight === null && (
              <div className="mini-record">
                <span>最近一次 · {latestWeight.date.slice(5)}</span>
                <strong>{latestWeight.value} kg</strong>
              </div>
            )}
          </div>
          <button className="text-link" onClick={() => navigate("weight")}>
            记录今日体重
            <ArrowRight size={14} />
          </button>
        </Card>
        <Card
          className="overview-card"
          title="好好吃饭"
          action={<Utensils className="overview-icon green" size={20} />}
        >
          <div className="overview-value">
            {meals.length ? (
              <>
                {stats.calories.toLocaleString()}
                <small> kcal</small>
              </>
            ) : (
              "下一餐，也好好吃"
            )}
          </div>
          <div className="mini-records">
            {meals
              .slice(-2)
              .reverse()
              .map((item) => (
                <div className="mini-record" key={item.id}>
                  <span>
                    {item.type} · {item.food}
                  </span>
                  <strong>{item.calories} kcal</strong>
                </div>
              ))}
            {!meals.length && (
              <p className="muted">记录吃过的美味，找到舒服的饮食节奏。</p>
            )}
          </div>
          <button className="text-link" onClick={() => navigate("diet")}>
            记录一餐饮食
            <ArrowRight size={14} />
          </button>
        </Card>
      </div>

      {allEmpty && (
        <div className="demo-banner">
          <div>
            <Sparkles size={19} />
            <span>第一次来？可以先用一组示例记录，看看生活被记录的样子。</span>
          </div>
          <button
            className="btn secondary"
            onClick={() => setConfirmDemo(true)}
          >
            体验示例数据
            <ArrowDownRight size={14} />
          </button>
        </div>
      )}
      {confirmDemo && (
        <ConfirmDialog
          title="加载示例数据？"
          description="这是一组虚构的演示记录，会替换当前全部记录及设置。你可以随后在设置中清空，开始自己的记录。"
          onClose={() => setConfirmDemo(false)}
          onConfirm={() => {
            update(() => demoData());
            setConfirmDemo(false);
            notify("已加载示例数据，可在设置中随时清空");
            window.scrollTo(0, 0);
          }}
        />
      )}
    </div>
  );
}
