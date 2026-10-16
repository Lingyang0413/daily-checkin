import { useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Flame,
  Leaf,
  Lightbulb,
  Pencil,
  Plus,
  Soup,
  Trash2,
  Utensils,
} from "lucide-react";
import {
  Bar,
  BarChart,
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
  Field,
  Modal,
  PageHeader,
  StatCard,
} from "../components/ui";
import { dietSuggestion, today, uid } from "../lib/data";
import {
  MEAL_TYPES,
  type Meal,
  type MealType,
  type PageProps,
} from "../lib/types";

type Draft = Omit<Meal, "id">;
const mealIcons = { 早餐: Coffee, 午餐: Soup, 晚餐: Utensils, 加餐: Leaf };

function shiftDate(date: string, offset: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + offset);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export default function Diet({ data, update, notify }: PageProps) {
  const [date, setDate] = useState(today());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Meal | null>(null);
  const [error, setError] = useState("");
  const records = useMemo(
    () => data.meals.filter((record) => record.date === date),
    [data.meals, date],
  );
  const calories = records.reduce((sum, record) => sum + record.calories, 0);
  const mealCount = new Set(records.map((record) => record.type)).size;
  const goal = data.settings.dailyCalorieGoal;
  const mealTypes = new Set(records.map((record) => record.type));
  const nextMeal =
    (["早餐", "午餐", "晚餐"] as MealType[]).find(
      (type) => !mealTypes.has(type),
    ) ?? "加餐";
  const suggestion = dietSuggestion(data, date);
  const trend = Array.from({ length: 7 }, (_, index) => {
    const day = shiftDate(date, index - 6);
    return {
      date: `${Number(day.slice(5, 7))}/${Number(day.slice(8))}`,
      calories: data.meals
        .filter((record) => record.date === day)
        .reduce((sum, record) => sum + record.calories, 0),
    };
  });

  function openForm(record?: Meal, type?: MealType) {
    setEditingId(record?.id ?? null);
    setDraft(
      record
        ? { ...record }
        : {
            date,
            type: type ?? nextMeal,
            food: "",
            quantity: "",
            calories: 0,
            note: "",
          },
    );
    setError("");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (
      !draft.food.trim() ||
      !draft.quantity.trim() ||
      !draft.date ||
      !Number.isFinite(draft.calories) ||
      draft.calories < 0
    ) {
      setError("请填写食物、数量和日期，估算热量须为不小于 0 的有效数字。");
      return;
    }
    const record: Meal = {
      ...draft,
      food: draft.food.trim(),
      quantity: draft.quantity.trim(),
      note: draft.note.trim(),
      calories: Math.round(draft.calories),
      id: editingId ?? uid(),
    };
    update((current) => ({
      ...current,
      meals: editingId
        ? current.meals.map((item) => (item.id === editingId ? record : item))
        : [...current.meals, record],
    }));
    setDate(record.date);
    setDraft(null);
    notify(editingId ? "饮食记录已更新" : "好好吃饭，也是照顾自己");
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="EAT WELL, FEEL GOOD"
        title="饮食记录"
        description="好好吃饭，认真生活。记录每一餐，找到舒服的节奏。"
        action={
          <button className="btn primary" onClick={() => openForm()}>
            <Plus size={18} />
            记录一餐
          </button>
        }
      />
      <div className="stats-grid three">
        <StatCard
          label={date === today() ? "今日预计摄入" : "当日预计摄入"}
          value={calories.toLocaleString("zh-CN")}
          unit="kcal"
          icon={Flame}
          tone="orange"
          hint="根据已填写的热量估算，非精确测量"
        />
        <StatCard
          label="已记录餐次"
          value={mealCount}
          unit="/ 4 类"
          icon={Utensils}
          tone="green"
          hint={`${records.length} 条记录 · 早餐、午餐、晚餐、加餐`}
        />
        <StatCard
          label="每日热量参考"
          value={goal > 0 ? goal.toLocaleString("zh-CN") : "未设置"}
          unit={goal > 0 ? "kcal" : undefined}
          icon={Leaf}
          tone="purple"
          hint="由你在设置中设定，不代表营养处方"
        />
      </div>

      <div className="content-grid">
        <Card
          title="近 7 天热量记录"
          description="仅统计已记录的估算热量，单位：kcal"
        >
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trend}
                margin={{ top: 15, right: 5, left: -15, bottom: 0 }}
              >
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
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "#faf5ef" }}
                />
                <Bar
                  isAnimationActive={false}
                  name="估算热量（kcal）"
                  dataKey="calories"
                  fill="#d0a26a"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card
          title="下一餐的小建议"
          description={`${date === today() ? "今天" : date} · ${suggestion.title}`}
          action={
            <span className="badge green">
              <Lightbulb size={13} />
              温和建议
            </span>
          }
        >
          <div className="diet-advice">
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.9,
                color: "#52645a",
                margin: "18px 0 14px",
              }}
            >
              {suggestion.message}
            </p>
            <div
              className="inline-note"
              style={{
                marginTop: 20,
                paddingTop: 14,
                borderTop: "1px solid #edf0ee",
                fontSize: 11,
                lineHeight: 1.8,
                color: "#99a29c",
              }}
            >
              仅作普通生活管理参考，不用于医学诊断。热量为个人估算；是否记录完整也会影响建议，请以身体感受为先。
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="一日三餐与小确幸"
        description="可以按餐次添加多条记录，也可以回看历史"
        action={
          <div className="date-filter">
            <button
              type="button"
              className="btn icon ghost"
              aria-label="查看前一天饮食"
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
                aria-label="饮食记录日期"
                value={date}
                onChange={(event) =>
                  event.target.value && setDate(event.target.value)
                }
              />
            </label>
            <button
              type="button"
              className="btn icon ghost"
              aria-label="查看后一天饮食"
              onClick={() => setDate(shiftDate(date, 1))}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        }
      >
        {records.length === 0 && (
          <div
            className="inline-note"
            style={{ padding: "8px 0 18px", color: "#88948c", fontSize: 13 }}
          >
            今天吃了什么？不必追求精确，从记下第一餐开始。
          </div>
        )}
        <div className="meal-groups">
          {MEAL_TYPES.map((type) => {
            const entries = records.filter((record) => record.type === type);
            const Icon = mealIcons[type];
            return (
              <section className="meal-group" key={type}>
                <div className="meal-group-head">
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span className="record-icon orange">
                      <Icon size={18} />
                    </span>
                    <strong>{type}</strong>
                    <span className="record-subtitle">
                      {entries.length > 0
                        ? `约 ${entries.reduce((sum, entry) => sum + entry.calories, 0)} kcal`
                        : "还未记录"}
                    </span>
                  </div>
                  <button
                    className="btn ghost"
                    aria-label={`添加${type}记录`}
                    onClick={() => openForm(undefined, type)}
                  >
                    <Plus size={15} />
                    添加
                  </button>
                </div>
                {entries.length === 0 ? (
                  <p
                    className="record-subtitle"
                    style={{ padding: "4px 0 14px 46px", margin: 0 }}
                  >
                    给这一天留下一份{type}记录。
                  </p>
                ) : (
                  <div className="record-list">
                    {entries.map((record) => (
                      <div className="record-row" key={record.id}>
                        <div className="record-main">
                          <div className="record-title">{record.food}</div>
                          <div className="record-subtitle">
                            {record.quantity}
                            {record.note && ` · ${record.note}`}
                          </div>
                        </div>
                        <strong className="amount">
                          约 {record.calories}{" "}
                          <span
                            className="muted"
                            style={{ fontSize: 11, fontWeight: 400 }}
                          >
                            kcal
                          </span>
                        </strong>
                        <div className="record-actions">
                          <button
                            className="btn icon ghost"
                            onClick={() => openForm(record)}
                            aria-label={`编辑${type}${record.food}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="btn icon ghost"
                            onClick={() => setDeleting(record)}
                            aria-label={`删除${type}${record.food}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </Card>

      {draft && (
        <Modal
          title={editingId ? "编辑饮食记录" : "记录一餐"}
          onClose={() => setDraft(null)}
        >
          <form
            aria-label={editingId ? "编辑饮食表单" : "新增饮食表单"}
            onSubmit={save}
          >
            <div className="form-grid">
              <Field label="餐次">
                <select
                  className="select"
                  value={draft.type}
                  onChange={(event) =>
                    setDraft({ ...draft, type: event.target.value as MealType })
                  }
                >
                  {MEAL_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </Field>
              <Field label="饮食日期">
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
            <Field label="吃了什么">
              <input
                className="input"
                required
                autoFocus
                maxLength={150}
                placeholder="例如：糙米饭、番茄炒蛋、青菜"
                value={draft.food}
                onChange={(event) =>
                  setDraft({ ...draft, food: event.target.value })
                }
              />
            </Field>
            <div className="form-grid">
              <Field label="大概数量">
                <input
                  className="input"
                  required
                  maxLength={80}
                  placeholder="例如：一碗饭 + 一份菜"
                  value={draft.quantity}
                  onChange={(event) =>
                    setDraft({ ...draft, quantity: event.target.value })
                  }
                />
              </Field>
              <Field label="估算热量（kcal）" hint="可以参考食物包装或自行估算">
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  required
                  min="0"
                  max="50000"
                  step="1"
                  placeholder="例如：550"
                  value={Number.isNaN(draft.calories) ? "" : draft.calories}
                  onChange={(event) =>
                    setDraft({ ...draft, calories: event.target.valueAsNumber })
                  }
                />
              </Field>
            </div>
            <Field label="备注（选填）">
              <textarea
                className="textarea"
                rows={3}
                maxLength={500}
                placeholder="今天的口味、饱腹感，或用餐时的小心情…"
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
                保存饮食
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="删除这条饮食记录？"
          description={`${deleting.date} ${deleting.type}的「${deleting.food}」将被删除，此操作无法撤销。`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            update((current) => ({
              ...current,
              meals: current.meals.filter(
                (record) => record.id !== deleting.id,
              ),
            }));
            setDeleting(null);
            notify("饮食记录已删除");
          }}
        />
      )}
    </div>
  );
}
