import { useState } from "react";
import {
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Pencil,
  Trash2,
  Flame,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import type { PageProps, Task } from "../lib/types";
import {
  dailyStats,
  formatDate,
  recentDays,
  streak,
  today,
  uid,
} from "../lib/data";
import {
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  PageHeader,
} from "../components/ui";
export default function Tasks({ data, update, notify }: PageProps) {
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [editing, setEditing] = useState<Task | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const stats = dailyStats(data, date);
  const tasks = data.tasks.filter((task) => task.date === date);
  const visible = tasks.filter(
    (task) =>
      filter === "all" ||
      (filter === "done" ? task.completed : !task.completed),
  );
  const shift = (n: number) => {
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() + n);
    setDate(
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`,
    );
  };
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) return;
    const item: Task = {
      id: editing?.id ?? uid(),
      title,
      date: String(form.get("date")),
      completed: editing?.completed ?? false,
    };
    update((current) => ({
      ...current,
      tasks: editing
        ? current.tasks.map((t) => (t.id === item.id ? item : t))
        : [...current.tasks, item],
    }));
    setDate(item.date);
    setEditing(undefined);
    notify(editing ? "任务已更新" : "新任务已加入，慢慢完成就好");
  }
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="BUILD YOUR EVERYDAY"
        title="每日打卡"
        description="让想做的事，有一个小小的开始。"
        action={
          <button className="btn primary" onClick={() => setEditing(null)}>
            <Plus size={17} />
            新增任务
          </button>
        }
      />
      <div className="task-overview">
        <div className="task-progress-copy">
          <span className="eyebrow">ONE STEP AT A TIME</span>
          <h2>
            {stats.totalTasks > 0 && stats.completedTasks === stats.totalTasks
              ? "今天的计划，全部完成。"
              : "每完成一件小事，都值得肯定。"}
          </h2>
          <p>
            已完成 <b>{stats.completedTasks}</b> / {stats.totalTasks} 项任务
            <span>给每一天，一点向前的力量。</span>
          </p>
          <span className="badge green">
            <Flame size={14} />
            连续完整打卡 {streak(data)} 天
          </span>
        </div>
        <div
          className="progress-ring"
          style={{
            background: `conic-gradient(#92b568 ${stats.completion * 3.6}deg, #e3e9da 0deg)`,
          }}
        >
          <div>
            <strong>
              {Math.round(stats.completion)}
              <small>%</small>
            </strong>
            <span>当日完成率</span>
          </div>
        </div>
      </div>
      <Card
        title="我的任务清单"
        description={
          date === today()
            ? "今天也为自己做一点喜欢的事"
            : formatDate(date, {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })
        }
        action={
          <div className="date-filter">
            <button
              className="btn icon ghost"
              aria-label="前一天"
              onClick={() => shift(-1)}
            >
              <ChevronLeft size={17} />
            </button>
            <input
              aria-label="任务日期"
              className="input"
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
            <button
              className="btn icon ghost"
              aria-label="后一天"
              onClick={() => shift(1)}
            >
              <ChevronRight size={17} />
            </button>
            {date !== today() && (
              <button className="btn ghost" onClick={() => setDate(today())}>
                今天
              </button>
            )}
          </div>
        }
      >
        <div className="tabs">
          <button
            className={filter === "all" ? "selected" : ""}
            onClick={() => setFilter("all")}
          >
            全部 <span>{tasks.length}</span>
          </button>
          <button
            className={filter === "pending" ? "selected" : ""}
            onClick={() => setFilter("pending")}
          >
            待完成 <span>{tasks.filter((t) => !t.completed).length}</span>
          </button>
          <button
            className={filter === "done" ? "selected" : ""}
            onClick={() => setFilter("done")}
          >
            已完成 <span>{stats.completedTasks}</span>
          </button>
        </div>
        {visible.length ? (
          <div className="task-list">
            {visible.map((task) => (
              <div
                className={`task-row ${task.completed ? "completed" : ""}`}
                key={task.id}
              >
                <button
                  className={`task-checkbox ${task.completed ? "checked" : ""}`}
                  role="checkbox"
                  aria-checked={task.completed}
                  aria-label={`${task.completed ? "取消完成" : "完成任务"}：${task.title}`}
                  onClick={() =>
                    update((current) => ({
                      ...current,
                      tasks: current.tasks.map((t) =>
                        t.id === task.id
                          ? { ...t, completed: !t.completed }
                          : t,
                      ),
                    }))
                  }
                >
                  {task.completed && <Check size={15} strokeWidth={3} />}
                </button>
                <div className="task-text">
                  <span>{task.title}</span>
                  <small>
                    {task.completed
                      ? "做得不错，又完成一件事"
                      : "给自己一点时间，按自己的节奏来"}
                  </small>
                </div>
                <span className={`badge ${task.completed ? "green" : ""}`}>
                  {task.completed ? "已完成" : "待完成"}
                </span>
                <div className="row-actions">
                  <button
                    className="btn icon ghost"
                    aria-label={`编辑任务：${task.title}`}
                    onClick={() => setEditing(task)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="btn icon ghost danger-text"
                    aria-label={`删除任务：${task.title}`}
                    onClick={() => setDeleting(task)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ListTodo}
            title={
              tasks.length ? "这里暂时没有任务" : "给这一天，写下第一个小计划"
            }
            description={
              tasks.length
                ? "试试切换其他筛选条件。"
                : "散步、读几页书，或者早点休息。小事也算数。"
            }
            action={
              !tasks.length && (
                <button
                  className="btn secondary"
                  onClick={() => setEditing(null)}
                >
                  <Plus size={15} />
                  添加一个任务
                </button>
              )
            }
          />
        )}
        {tasks.length > 0 && (
          <button className="add-task-inline" onClick={() => setEditing(null)}>
            <Plus size={17} />
            再添一个小计划
          </button>
        )}
      </Card>
      <Card
        title="最近 7 天"
        description="点击任意一天，回看那天的计划"
        action={<CalendarDays size={18} className="muted" />}
      >
        <div className="history-days">
          {recentDays(7).map((day) => {
            const s = dailyStats(data, day);
            return (
              <button
                key={day}
                className={`history-day ${date === day ? "selected" : ""}`}
                onClick={() => setDate(day)}
              >
                <span>{formatDate(day, { weekday: "short" })}</span>
                <strong>{Number(day.slice(-2))}</strong>
                <div className="history-bar">
                  <i style={{ height: `${Math.max(4, s.completion)}%` }} />
                </div>
                <small>
                  {s.totalTasks ? `${Math.round(s.completion)}%` : "未记录"}
                </small>
                {date === day && <ArrowRight size={12} />}
              </button>
            );
          })}
        </div>
      </Card>
      {editing !== undefined && (
        <Modal
          title={editing ? "编辑任务" : "新增任务"}
          onClose={() => setEditing(undefined)}
        >
          <form onSubmit={save}>
            <Field label="任务名称">
              <input
                name="title"
                className="input"
                placeholder="例如：阅读 30 分钟"
                defaultValue={editing?.title}
                required
                maxLength={120}
              />
            </Field>
            <Field label="所属日期">
              <input
                name="date"
                className="input"
                type="date"
                min="0001-01-01"
                max="9999-12-31"
                defaultValue={editing?.date ?? date}
                required
              />
            </Field>
            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setEditing(undefined)}
              >
                取消
              </button>
              <button className="btn primary" type="submit">
                {editing ? "保存修改" : "添加任务"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="删除这个任务？"
          description={`「${deleting.title}」删除后无法恢复。`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            update((current) => ({
              ...current,
              tasks: current.tasks.filter((t) => t.id !== deleting.id),
            }));
            setDeleting(null);
            notify("任务已删除");
          }}
        />
      )}
    </div>
  );
}
