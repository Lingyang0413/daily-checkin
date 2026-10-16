import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Flag,
  Leaf,
  Pencil,
  Plus,
  Scale,
  Trash2,
  TrendingDown,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
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
  Field,
  Modal,
  PageHeader,
  StatCard,
} from "../components/ui";
import {
  formatDate,
  recentDays,
  today,
  uid,
  weightPrediction,
} from "../lib/data";
import type { PageProps, Weight as WeightRecord } from "../lib/types";

export default function Weight({ data, update, notify }: PageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WeightRecord | null>(null);
  const [date, setDate] = useState(today());
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<WeightRecord | null>(null);
  const [showTarget, setShowTarget] = useState(false);
  const [target, setTarget] = useState("");
  const [targetError, setTargetError] = useState("");
  const [range, setRange] = useState(30);
  const [historyPage, setHistoryPage] = useState(0);
  const prediction = weightPrediction(data);
  const records = [...data.weights].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const cutoff = recentDays(range)[0];
  const chartRecords = records
    .filter((item) => item.date >= cutoff && item.date <= today())
    .reverse();
  const current = prediction.current;
  const targetWeight = data.settings.targetWeight;
  const latestDate = records.find((item) => item.date <= today())?.date;
  const change = prediction.weeklyChange;
  const reachedTarget = prediction.delta !== null && prediction.delta <= 0.05;
  const historySize = 8;
  const historyPages = Math.max(1, Math.ceil(records.length / historySize));
  const activeHistoryPage = Math.min(historyPage, historyPages - 1);

  function openForm(record?: WeightRecord) {
    const existing =
      record ?? data.weights.find((item) => item.date === today());
    setEditing(record ?? null);
    setDate(existing?.date ?? today());
    setValue(existing ? String(existing.value) : "");
    setError("");
    setShowForm(true);
  }

  function saveRecord(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(value);
    if (!date || date > today()) {
      setError("请选择今天或之前的日期");
      return;
    }
    if (!Number.isFinite(amount) || amount < 1 || amount > 1000) {
      setError("请输入 1–1000 kg 范围内的有效体重");
      return;
    }
    const duplicate = data.weights.find(
      (item) => item.date === date && item.id !== editing?.id,
    );
    if (duplicate && editing) {
      setError("这一天已有体重记录，请在列表中编辑对应记录");
      return;
    }
    const id = editing?.id ?? duplicate?.id ?? uid();
    const record = { id, date, value: Math.round(amount * 100) / 100 };
    update((currentData) => ({
      ...currentData,
      weights: [
        ...currentData.weights.filter((item) => item.id !== id),
        record,
      ],
    }));
    setShowForm(false);
    setHistoryPage(0);
    notify(
      editing || duplicate
        ? "体重记录已更新"
        : "体重记录已保存，慢慢看见自己的变化",
    );
  }

  function openTarget() {
    setTarget(targetWeight ? String(targetWeight) : "");
    setTargetError("");
    setShowTarget(true);
  }
  function saveTarget(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(target);
    if (!Number.isFinite(amount) || amount < 1 || amount > 1000) {
      setTargetError("请输入 1–1000 kg 范围内的有效目标体重");
      return;
    }
    update((currentData) => ({
      ...currentData,
      settings: {
        ...currentData.settings,
        targetWeight: Math.round(amount * 100) / 100,
      },
    }));
    setShowTarget(false);
    notify("目标体重已更新");
  }

  return (
    <div className="page-stack weight-page">
      <PageHeader
        eyebrow="YOUR BODY, YOUR PACE"
        title="体重管理"
        description="关注长期的变化，接纳每一天的小小起伏。"
        action={
          <button className="btn primary" onClick={() => openForm()}>
            <Plus size={17} />
            记录体重
          </button>
        }
      />
      <div className="stats-grid">
        <StatCard
          label="当前体重"
          value={current ?? "—"}
          unit={current !== null ? "kg" : undefined}
          icon={Scale}
          tone="green"
          hint={
            latestDate
              ? `最近记录于 ${formatDate(latestDate)}`
              : "先记录一次，开始了解自己"
          }
        />
        <StatCard
          label="目标体重"
          value={targetWeight ?? "—"}
          unit={targetWeight !== null ? "kg" : undefined}
          icon={Flag}
          tone="purple"
          hint={
            targetWeight !== null
              ? "循序渐进，找到舒服的状态"
              : "设置一个适合自己的目标"
          }
        />
        <StatCard
          label="距离目标"
          value={
            current !== null && targetWeight !== null
              ? Math.abs(current - targetWeight).toFixed(1)
              : "—"
          }
          unit={current !== null && targetWeight !== null ? "kg" : undefined}
          icon={
            current !== null && targetWeight !== null && current < targetWeight
              ? ArrowUpRight
              : ArrowDownRight
          }
          tone="blue"
          hint={
            current === null || targetWeight === null
              ? "记录体重并设置目标后可查看"
              : reachedTarget
                ? "已经到达目标，保持自己的节奏"
                : current > targetWeight
                  ? "距离设定目标还需下降"
                  : "距离设定目标还需增加"
          }
        />
        <StatCard
          label="近期每周变化"
          value={
            change === null
              ? "—"
              : `${change > 0 ? "+" : ""}${change.toFixed(2)}`
          }
          unit={change !== null ? "kg / 周" : undefined}
          icon={TrendingDown}
          tone="orange"
          hint="近 30 天至少 3 次称重，且跨度达 7 天"
        />
      </div>

      <div className="weight-layout">
        <Card
          title="体重变化曲线"
          description="变化不必是一条直线，坚持记录就很好"
          action={
            <div className="segmented compact">
              {[30, 90, 365].map((days) => (
                <button
                  key={days}
                  className={range === days ? "active" : ""}
                  onClick={() => setRange(days)}
                >
                  {days === 365 ? "一年" : `${days} 天`}
                </button>
              ))}
            </div>
          }
        >
          {chartRecords.length ? (
            <>
              <div className="chart-box weight-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartRecords}
                    margin={{ top: 28, right: 35, left: -5, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="4 5"
                      vertical={false}
                      stroke="#edf0ec"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      stroke="#9ba49e"
                      fontSize={11}
                      tickMargin={12}
                      tickFormatter={(item) => item.slice(5).replace("-", "/")}
                      minTickGap={25}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      stroke="#9ba49e"
                      fontSize={11}
                      domain={["auto", "auto"]}
                      tickFormatter={(number) => `${number}`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    {targetWeight !== null && (
                      <ReferenceLine
                        ifOverflow="extendDomain"
                        y={targetWeight}
                        stroke="#a4ad88"
                        strokeDasharray="6 5"
                        label={{
                          value: `目标 ${targetWeight}`,
                          position: "insideTopRight",
                          fill: "#83916f",
                          fontSize: 11,
                        }}
                      />
                    )}
                    <Line
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="value"
                      name="体重（kg）"
                      stroke="#4e7c64"
                      strokeWidth={2.5}
                      dot={{
                        r: chartRecords.length < 20 ? 4 : 2,
                        strokeWidth: 2,
                        fill: "#fff",
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-footnote">
                <span className="chart-key">
                  <i style={{ background: "#4e7c64" }} />
                  每日体重
                </span>
                {targetWeight !== null && (
                  <span className="chart-key">
                    <i style={{ background: "#a4ad88" }} />
                    目标体重
                  </span>
                )}
                <span>共 {chartRecords.length} 次记录 · kg</span>
              </div>
            </>
          ) : (
            <EmptyState
              icon={Scale}
              title="和自己的变化，打个照面"
              description={`最近 ${range === 365 ? "一年" : `${range} 天`}还没有记录。每天在相近时间称重，更方便观察长期趋势。`}
              action={
                <button className="btn secondary" onClick={() => openForm()}>
                  <Plus size={15} />
                  记录第一次体重
                </button>
              }
            />
          )}
        </Card>
        <div className="weight-side">
          <Card
            className="target-card"
            title="给自己一个方向"
            action={<Flag size={19} />}
          >
            <div className="target-number">
              {targetWeight ?? "未设置"}
              {targetWeight !== null && <small> kg</small>}
            </div>
            <p>
              适合自己的节奏，
              <br />
              比追赶数字更重要。
            </p>
            <button className="btn secondary" onClick={openTarget}>
              <Pencil size={14} />
              {targetWeight ? "调整目标" : "设置目标体重"}
            </button>
          </Card>
          <Card className="prediction-card">
            <div className="prediction-title">
              <Leaf size={17} />
              <span>关于未来的小小估算</span>
            </div>
            {reachedTarget ? (
              <>
                <p className="prediction-date">已到达目标</p>
                <p>好好照顾自己，继续保持规律、舒服的生活节奏。</p>
              </>
            ) : prediction.estimatedDate ? (
              <>
                <p className="prediction-date">
                  {formatDate(prediction.estimatedDate, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p>按历史趋势，预计在这个日期附近达到目标体重。</p>
              </>
            ) : (
              <p>
                {prediction.reason ||
                  "积累更多记录后，就可以观察趋势并估算到达目标的大致时间。"}
              </p>
            )}
            <small>
              基于历史记录的线性估算，不代表必然结果，仅作日常管理参考，不作为医学建议。
            </small>
          </Card>
        </div>
      </div>

      <Card
        title="体重记录"
        description="一天一条，记下身体的真实节奏"
        action={<span className="badge green">{records.length} 条记录</span>}
      >
        {records.length ? (
          <>
            <div className="weight-record-head">
              <span>记录日期</span>
              <span>体重</span>
              <span>较上次</span>
              <span>操作</span>
            </div>
            <div className="record-list">
              {records
                .slice(
                  activeHistoryPage * historySize,
                  (activeHistoryPage + 1) * historySize,
                )
                .map((item, localIndex) => {
                  const index = activeHistoryPage * historySize + localIndex;
                  const previous = records[index + 1];
                  const difference = previous
                    ? Math.round((item.value - previous.value) * 100) / 100
                    : null;
                  return (
                    <div className="weight-record-row" key={item.id}>
                      <div className="weight-record-date">
                        <CalendarDays size={15} />
                        <span>
                          {formatDate(item.date, {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })}
                          {item.date === today() && (
                            <span className="badge green">今天</span>
                          )}
                        </span>
                      </div>
                      <strong className="weight-record-number">
                        {item.value}
                        <small> kg</small>
                      </strong>
                      <span
                        className={`weight-difference ${difference === null || difference === 0 ? "" : difference < 0 ? "down" : "up"}`}
                      >
                        {difference === null
                          ? "首次记录"
                          : difference === 0
                            ? "持平"
                            : `${difference > 0 ? "+" : ""}${difference.toFixed(2)} kg`}
                      </span>
                      <div className="row-actions">
                        <button
                          className="btn icon ghost"
                          aria-label={`编辑 ${item.date} 的体重`}
                          onClick={() => openForm(item)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn icon ghost danger"
                          aria-label={`删除 ${item.date} 的体重`}
                          onClick={() => setDeleting(item)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
            {historyPages > 1 && (
              <div className="pagination">
                <span className="muted">
                  第 {activeHistoryPage + 1} / {historyPages} 页
                </span>
                <button
                  className="btn secondary"
                  disabled={activeHistoryPage === 0}
                  onClick={() => setHistoryPage(activeHistoryPage - 1)}
                >
                  上一页
                </button>
                <button
                  className="btn secondary"
                  disabled={activeHistoryPage === historyPages - 1}
                  onClick={() => setHistoryPage(activeHistoryPage + 1)}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="第一条记录，随时都可以开始"
            description="不用追求完美的数字，只需要真实记录。"
          />
        )}
      </Card>

      {showForm && (
        <Modal
          title={editing ? "编辑体重记录" : "记录体重"}
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={saveRecord} className="form-stack">
            <Field
              label="记录日期"
              hint="每天保留一条体重记录；同一天再次填写会更新原记录。"
            >
              <input
                className="input"
                type="date"
                min="0001-01-01"
                value={date}
                max={today()}
                required
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
            <Field label="体重（kg）">
              <input
                className="input"
                type="number"
                inputMode="decimal"
                min="1"
                max="1000"
                step="0.01"
                placeholder="例如 65.5"
                autoFocus
                value={value}
                required
                onChange={(event) => setValue(event.target.value)}
              />
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowForm(false)}
              >
                取消
              </button>
              <button type="submit" className="btn primary">
                保存记录
              </button>
            </div>
          </form>
        </Modal>
      )}
      {showTarget && (
        <Modal title="设置目标体重" onClose={() => setShowTarget(false)}>
          <form onSubmit={saveTarget} className="form-stack">
            <p className="muted">选择一个适合自己的目标，之后随时可以调整。</p>
            <Field label="目标体重（kg）">
              <input
                className="input"
                type="number"
                inputMode="decimal"
                min="1"
                max="1000"
                step="0.01"
                autoFocus
                placeholder="例如 60"
                value={target}
                required
                onChange={(event) => setTarget(event.target.value)}
              />
            </Field>
            {targetError && (
              <p className="form-error" role="alert">
                {targetError}
              </p>
            )}
            <div className="form-actions">
              {targetWeight !== null && (
                <button
                  type="button"
                  className="btn ghost danger"
                  onClick={() => {
                    update((currentData) => ({
                      ...currentData,
                      settings: { ...currentData.settings, targetWeight: null },
                    }));
                    setShowTarget(false);
                    notify("已移除目标体重");
                  }}
                >
                  移除目标
                </button>
              )}
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowTarget(false)}
              >
                取消
              </button>
              <button type="submit" className="btn primary">
                保存目标
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="删除这条体重记录？"
          description={`${formatDate(deleting.date)} 的 ${deleting.value} kg 记录将被删除，此操作无法撤销。`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            update((currentData) => ({
              ...currentData,
              weights: currentData.weights.filter(
                (item) => item.id !== deleting.id,
              ),
            }));
            setDeleting(null);
            notify("体重记录已删除");
          }}
        />
      )}
    </div>
  );
}
