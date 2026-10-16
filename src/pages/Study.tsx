import { useMemo, useState, type FormEvent } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
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
  Field,
  Modal,
  PageHeader,
  StatCard,
} from "../components/ui";
import { duration, today, uid } from "../lib/data";
import type { PageProps, Study as StudyRecord } from "../lib/types";

type Draft = Omit<StudyRecord, "id">;

function shiftDate(date: string, offset: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + offset);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export default function Study({ data, update, notify }: PageProps) {
  const [date, setDate] = useState(today());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<StudyRecord | null>(null);
  const [error, setError] = useState("");
  const records = useMemo(
    () =>
      data.studies
        .filter((record) => record.date === date)
        .slice()
        .reverse(),
    [data.studies, date],
  );
  const total = records.reduce((sum, record) => sum + record.minutes, 0);
  const weekStart = shiftDate(
    date,
    -((new Date(`${date}T12:00:00`).getDay() + 6) % 7),
  );
  const weekEnd = shiftDate(weekStart, 6);
  const weekTotal = data.studies
    .filter((record) => record.date >= weekStart && record.date <= weekEnd)
    .reduce((sum, record) => sum + record.minutes, 0);
  const monthTotal = data.studies
    .filter((record) => record.date.startsWith(date.slice(0, 7)))
    .reduce((sum, record) => sum + record.minutes, 0);
  const goal = data.settings.dailyStudyGoal;
  const progress = Math.min(100, goal > 0 ? (total / goal) * 100 : 0);
  const trend = Array.from({ length: 7 }, (_, index) => {
    const day = shiftDate(date, index - 6);
    return {
      date: `${Number(day.slice(5, 7))}/${Number(day.slice(8))}`,
      minutes: data.studies
        .filter((record) => record.date === day)
        .reduce((sum, record) => sum + record.minutes, 0),
    };
  });
  const topicMap = new Map<string, number>();
  data.studies
    .filter((record) => record.date.startsWith(date.slice(0, 7)))
    .forEach((record) =>
      topicMap.set(
        record.topic,
        (topicMap.get(record.topic) ?? 0) + record.minutes,
      ),
    );
  const topics = Array.from(topicMap, ([topic, minutes]) => ({
    topic,
    minutes,
  })).sort((a, b) => b.minutes - a.minutes);

  function openForm(record?: StudyRecord) {
    setEditingId(record?.id ?? null);
    setDraft(
      record
        ? { ...record }
        : { content: "", topic: "", minutes: 0, date, note: "" },
    );
    setError("");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (
      !draft.content.trim() ||
      !draft.topic.trim() ||
      !draft.date ||
      !Number.isFinite(draft.minutes) ||
      draft.minutes <= 0 ||
      !Number.isInteger(draft.minutes)
    ) {
      setError("请填写学习内容、主题和日期，学习时长须为大于 0 的整数分钟。");
      return;
    }
    const record: StudyRecord = {
      ...draft,
      content: draft.content.trim(),
      topic: draft.topic.trim(),
      note: draft.note.trim(),
      id: editingId ?? uid(),
    };
    update((current) => ({
      ...current,
      studies: editingId
        ? current.studies.map((item) => (item.id === editingId ? record : item))
        : [...current.studies, record],
    }));
    setDate(record.date);
    setDraft(null);
    notify(editingId ? "学习记录已更新" : "每一次专注，都在积累成长");
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="SMALL STEPS, REAL GROWTH"
        title="学习记录"
        description="留一点时间给成长，看见每一份专注的积累。"
        action={
          <button className="btn primary" onClick={() => openForm()}>
            <Plus size={18} />
            记录学习
          </button>
        }
      />
      <div className="stats-grid three">
        <StatCard
          label={date === today() ? "今日学习" : "当日学习"}
          value={duration(total)}
          icon={Clock3}
          tone="blue"
          hint={`${records.length} 次学习 · ${date.slice(5).replace("-", "月")}日`}
        />
        <StatCard
          label="所选周学习"
          value={duration(weekTotal)}
          icon={BookOpen}
          tone="green"
          hint={`${weekStart.slice(5).replace("-", "/")} – ${weekEnd.slice(5).replace("-", "/")} · 周一至周日`}
        />
        <StatCard
          label="所选月份学习"
          value={duration(monthTotal)}
          icon={GraduationCap}
          tone="purple"
          hint={`${date.slice(0, 7).replace("-", " 年 ")} 月 · ${topics.length} 个学习主题`}
        />
      </div>

      <div className="content-grid">
        <Card title="近 7 天学习" description="以所选日期为终点，单位：分钟">
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="studyGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#7398c1" stopOpacity={0.25} />
                    <stop
                      offset="100%"
                      stopColor="#7398c1"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 5"
                  vertical={false}
                  stroke="#e9eeeb"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8a9691", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8a9691", fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  isAnimationActive={false}
                  name="学习（分钟）"
                  type="monotone"
                  dataKey="minutes"
                  stroke="#7398c1"
                  strokeWidth={2.5}
                  fill="url(#studyGradient)"
                  dot={{ r: 3, fill: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="专注的积累" description="每天前进一点点，也很了不起">
          <div style={{ marginTop: 20, marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span className="record-subtitle">当日学习目标</span>
              <strong className="record-title">
                {goal > 0 ? `${Math.round(progress)}%` : "未设置"}
              </strong>
            </div>
            <div
              className="progress-track"
              style={{
                height: 9,
                borderRadius: 5,
                background: "#f0f3f1",
                overflow: "hidden",
              }}
            >
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "#7398c1",
                  borderRadius: 5,
                }}
              />
            </div>
            <p className="record-subtitle" style={{ marginTop: 10 }}>
              {goal > 0
                ? `${duration(total)} / ${duration(goal)}${total >= goal ? " · 已完成，保持自己的节奏" : " · 目标可在设置中调整"}`
                : "在设置中添加每日学习目标"}
            </p>
          </div>
          <div style={{ borderTop: "1px solid #edf0ee", paddingTop: 19 }}>
            <span className="record-subtitle">本月常学主题</span>
            {topics.length === 0 ? (
              <p className="muted" style={{ marginTop: 16 }}>
                记录第一次学习，让积累有迹可循。
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 13,
                }}
              >
                {topics.slice(0, 5).map((topic) => (
                  <span key={topic.topic} className="badge blue">
                    {topic.topic} · {duration(topic.minutes)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card
        title="学习足迹"
        description="学过什么、想过什么，都值得被记住"
        action={
          <div className="date-filter">
            <button
              type="button"
              className="btn icon ghost"
              aria-label="查看前一天学习"
              onClick={() => setDate(shiftDate(date, -1))}
            >
              <ChevronLeft size={17} />
            </button>
            <label className="date-input-wrap">
              <CalendarDays size={15} />
              <input
                className="input"
                type="date"
                min="0001-01-01"
                max="9999-12-31"
                aria-label="学习记录日期"
                value={date}
                onChange={(event) =>
                  event.target.value && setDate(event.target.value)
                }
              />
            </label>
            <button
              type="button"
              className="btn icon ghost"
              aria-label="查看后一天学习"
              onClick={() => setDate(shiftDate(date, 1))}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        }
      >
        {records.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="为今天留下一点成长"
            description="读一章书、练一道题、学一个新技能，都是进步。"
            action={
              <button className="btn secondary" onClick={() => openForm()}>
                <Plus size={16} />
                记录一次学习
              </button>
            }
          />
        ) : (
          <div className="record-list">
            {records.map((record) => (
              <div className="record-row" key={record.id}>
                <div className="record-icon blue">
                  <BookOpen size={19} />
                </div>
                <div className="record-main">
                  <div className="record-title">{record.content}</div>
                  <div className="record-subtitle">
                    <span className="badge blue">{record.topic}</span>
                    {record.note && (
                      <span style={{ marginLeft: 10 }}>{record.note}</span>
                    )}
                  </div>
                </div>
                <strong className="amount">{duration(record.minutes)}</strong>
                <div className="record-actions">
                  <button
                    className="btn icon ghost"
                    onClick={() => openForm(record)}
                    aria-label={`编辑学习记录${record.content}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="btn icon ghost"
                    onClick={() => setDeleting(record)}
                    aria-label={`删除学习记录${record.content}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {draft && (
        <Modal
          title={editingId ? "编辑学习记录" : "记录一次学习"}
          onClose={() => setDraft(null)}
        >
          <form
            aria-label={editingId ? "编辑学习表单" : "新增学习表单"}
            onSubmit={save}
          >
            <Field label="学习内容">
              <input
                className="input"
                required
                autoFocus
                maxLength={150}
                placeholder="例如：阅读《原子习惯》第 2 章"
                value={draft.content}
                onChange={(event) =>
                  setDraft({ ...draft, content: event.target.value })
                }
              />
            </Field>
            <div className="form-grid">
              <Field label="学习主题">
                <input
                  className="input"
                  required
                  maxLength={40}
                  placeholder="例如：阅读、英语、编程"
                  value={draft.topic}
                  onChange={(event) =>
                    setDraft({ ...draft, topic: event.target.value })
                  }
                />
              </Field>
              <Field label="学习时长（分钟）">
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="1440"
                  step="1"
                  required
                  placeholder="30"
                  value={draft.minutes || ""}
                  onChange={(event) =>
                    setDraft({ ...draft, minutes: event.target.valueAsNumber })
                  }
                />
              </Field>
              <Field label="学习日期">
                <input
                  className="input"
                  type="date"
                  min="0001-01-01"
                  max="9999-12-31"
                  required
                  value={draft.date}
                  onChange={(event) =>
                    setDraft({ ...draft, date: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="学习笔记（选填）">
              <textarea
                className="textarea"
                rows={3}
                maxLength={1000}
                placeholder="一个收获、一点思考，或下一次想继续的内容…"
                value={draft.note}
                onChange={(event) =>
                  setDraft({ ...draft, note: event.target.value })
                }
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
                onClick={() => setDraft(null)}
              >
                取消
              </button>
              <button type="submit" className="btn primary">
                保存学习
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="删除这条学习记录？"
          description={`「${deleting.content}」及对应的 ${deleting.minutes} 分钟学习时间将被删除，此操作无法撤销。`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            update((current) => ({
              ...current,
              studies: current.studies.filter(
                (record) => record.id !== deleting.id,
              ),
            }));
            setDeleting(null);
            notify("学习记录已删除");
          }}
        />
      )}
    </div>
  );
}
