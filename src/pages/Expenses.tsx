import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  ReceiptText,
  ShoppingBag,
  Trash2,
  Wallet,
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
  EmptyState,
  Field,
  Modal,
  PageHeader,
  StatCard,
} from "../components/ui";
import { money, today, uid } from "../lib/data";
import { EXPENSE_CATEGORIES, type Expense, type PageProps } from "../lib/types";

type Draft = Omit<Expense, "id">;

function shiftDate(date: string, offset: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + offset);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export default function Expenses({ data, update, notify }: PageProps) {
  const [date, setDate] = useState(today());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [error, setError] = useState("");
  const records = useMemo(
    () =>
      data.expenses
        .filter((record) => record.date === date)
        .sort((a, b) => b.time.localeCompare(a.time)),
    [data.expenses, date],
  );
  const dailyTotal = records.reduce((sum, record) => sum + record.amount, 0);
  const monthRecords = data.expenses.filter((record) =>
    record.date.startsWith(date.slice(0, 7)),
  );
  const monthlyTotal = monthRecords.reduce(
    (sum, record) => sum + record.amount,
    0,
  );
  const categories = EXPENSE_CATEGORIES.map((category) => ({
    category,
    amount: monthRecords
      .filter((record) => record.category === category)
      .reduce((sum, record) => sum + record.amount, 0),
  })).sort((a, b) => b.amount - a.amount);
  const trend = Array.from({ length: 7 }, (_, index) => {
    const day = shiftDate(date, index - 6);
    return {
      date: `${Number(day.slice(5, 7))}/${Number(day.slice(8))}`,
      amount: data.expenses
        .filter((record) => record.date === day)
        .reduce((sum, record) => sum + record.amount, 0),
    };
  });

  function openForm(record?: Expense) {
    setEditingId(record?.id ?? null);
    setDraft(
      record
        ? { ...record }
        : {
            amount: 0,
            category: "餐饮",
            date,
            time: new Date().toLocaleTimeString("sv-SE").slice(0, 5),
            note: "",
          },
    );
    setError("");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (
      !Number.isFinite(draft.amount) ||
      draft.amount <= 0 ||
      !draft.date ||
      !draft.time
    ) {
      setError("请填写有效日期、时间，以及大于 0 的消费金额。");
      return;
    }
    const record: Expense = {
      ...draft,
      amount: Math.round(draft.amount * 100) / 100,
      note: draft.note.trim(),
      id: editingId ?? uid(),
    };
    update((current) => ({
      ...current,
      expenses: editingId
        ? current.expenses.map((item) =>
            item.id === editingId ? record : item,
          )
        : [...current.expenses, record],
    }));
    setDate(record.date);
    setDraft(null);
    notify(editingId ? "消费记录已更新" : "记下这一笔，消费更有数");
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="MONEY & MINDFULNESS"
        title="消费管理"
        description="每一笔都清楚，把钱花在值得的地方。"
        action={
          <button className="btn primary" onClick={() => openForm()}>
            <Plus size={18} />
            记一笔消费
          </button>
        }
      />
      <div className="stats-grid three">
        <StatCard
          label={date === today() ? "今日消费" : "当日消费"}
          value={`¥${money(dailyTotal)}`}
          icon={Wallet}
          tone="green"
          hint={`${records.length} 笔消费 · ${date.slice(5).replace("-", "月")}日`}
        />
        <StatCard
          label="所选月份消费"
          value={`¥${money(monthlyTotal)}`}
          icon={ShoppingBag}
          tone="orange"
          hint={`${date.slice(0, 7).replace("-", " 年 ")} 月 · ${monthRecords.length} 笔`}
        />
        <StatCard
          label="本月主要消费"
          value={categories[0].amount > 0 ? categories[0].category : "待记录"}
          icon={ArrowDownLeft}
          tone="blue"
          hint={
            monthlyTotal > 0
              ? `占当月消费 ${Math.round((categories[0].amount / monthlyTotal) * 100)}%`
              : "从第一笔记录开始了解自己"
          }
        />
      </div>

      <div className="content-grid">
        <Card title="近 7 天消费" description="以所选日期为终点，单位：元">
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trend}
                margin={{ top: 15, right: 5, left: -20, bottom: 0 }}
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
                  cursor={{ fill: "#f2f6f4" }}
                />
                <Bar
                  isAnimationActive={false}
                  name="消费（元）"
                  dataKey="amount"
                  fill="#4b9474"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card
          title="消费去向"
          description={`${date.slice(0, 7).replace("-", " 年 ")} 月分类统计`}
        >
          {monthlyTotal === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="还没有本月消费"
              description="记下消费，看看你的生活偏好。"
            />
          ) : (
            <div className="category-list">
              {categories.map(({ category, amount }, index) => (
                <div key={category} style={{ marginTop: 17 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                      gap: 12,
                    }}
                  >
                    <span className="record-title">{category}</span>
                    <span className="record-subtitle">
                      ¥{money(amount)}{" "}
                      <span className="muted" style={{ marginLeft: 8 }}>
                        {Math.round((amount / monthlyTotal) * 100)}%
                      </span>
                    </span>
                  </div>
                  <div
                    className="progress-track"
                    style={{
                      height: 6,
                      borderRadius: 4,
                      background: "#f0f3f1",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(amount / monthlyTotal) * 100}%`,
                        height: "100%",
                        background: [
                          "#4b9474",
                          "#87aaa0",
                          "#b0bb94",
                          "#d6b98a",
                          "#a8accc",
                          "#c9ccca",
                        ][index],
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card
        title="消费明细"
        description="为日常留一份清晰的账本"
        action={
          <div className="date-filter">
            <button
              type="button"
              className="btn icon ghost"
              aria-label="查看前一天消费"
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
                aria-label="消费记录日期"
                value={date}
                onChange={(event) =>
                  event.target.value && setDate(event.target.value)
                }
              />
            </label>
            <button
              type="button"
              className="btn icon ghost"
              aria-label="查看后一天消费"
              onClick={() => setDate(shiftDate(date, 1))}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        }
      >
        {records.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="这一天，还没有消费记录"
            description="一杯咖啡、一次出行，都可以在这里轻松记下。"
            action={
              <button className="btn secondary" onClick={() => openForm()}>
                <Plus size={16} />
                记第一笔
              </button>
            }
          />
        ) : (
          <div className="record-list">
            {records.map((record) => (
              <div className="record-row" key={record.id}>
                <div className="record-icon orange">
                  <ReceiptText size={19} />
                </div>
                <div className="record-main">
                  <div className="record-title">
                    {record.category}
                    <span
                      className="record-subtitle"
                      style={{ marginLeft: 10 }}
                    >
                      {record.time}
                    </span>
                  </div>
                  <div className="record-subtitle">
                    {record.note || "日常消费"}
                  </div>
                </div>
                <strong className="amount">¥{money(record.amount)}</strong>
                <div className="record-actions">
                  <button
                    className="btn icon ghost"
                    onClick={() => openForm(record)}
                    aria-label={`编辑${record.category}${money(record.amount)}元消费`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="btn icon ghost"
                    onClick={() => setDeleting(record)}
                    aria-label={`删除${record.category}${money(record.amount)}元消费`}
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
          title={editingId ? "编辑消费" : "记一笔消费"}
          onClose={() => setDraft(null)}
        >
          <form
            aria-label={editingId ? "编辑消费表单" : "新增消费表单"}
            onSubmit={save}
          >
            <div className="form-grid">
              <Field label="消费金额（元）">
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  max="999999999"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={draft.amount || ""}
                  onChange={(event) =>
                    setDraft({ ...draft, amount: event.target.valueAsNumber })
                  }
                />
              </Field>
              <Field label="消费类别">
                <select
                  className="select"
                  value={draft.category}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      category: event.target.value as Draft["category"],
                    })
                  }
                >
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </Field>
              <Field label="消费日期">
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
              <Field label="消费时间">
                <input
                  className="input"
                  type="time"
                  required
                  value={draft.time}
                  onChange={(event) =>
                    setDraft({ ...draft, time: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="备注（选填）">
              <textarea
                className="textarea"
                rows={3}
                maxLength={500}
                placeholder="这笔钱花在了哪里？"
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
                保存消费
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="删除这笔消费？"
          description={`${deleting.date} 的${deleting.category}消费 ¥${money(deleting.amount)} 将被删除，此操作无法撤销。`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            update((current) => ({
              ...current,
              expenses: current.expenses.filter(
                (record) => record.id !== deleting.id,
              ),
            }));
            setDeleting(null);
            notify("消费记录已删除");
          }}
        />
      )}
    </div>
  );
}
