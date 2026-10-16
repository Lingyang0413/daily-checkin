import { useCallback, useEffect, useRef, useState } from "react";
import { EXPENSE_CATEGORIES, MEAL_TYPES } from "./types";
import type { AppData, UpdateData } from "./types";

export const STORAGE_KEY = "daykeep:data:v1";
const DAY = 86_400_000;

export function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function uid(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  );
}

function validDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith("0000")
  )
    return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function dayNumber(value: string): number {
  return new Date(`${value}T12:00:00.000Z`).getTime() / DAY;
}

function shiftDate(value: string, days: number): string {
  return new Date((dayNumber(value) + days) * DAY).toISOString().slice(0, 10);
}

export function recentDays(count: number, end = today()): string[] {
  if (
    !Number.isInteger(count) ||
    count < 0 ||
    count > 36_600 ||
    !validDate(end)
  )
    return [];
  return Array.from({ length: count }, (_, index) =>
    shiftDate(end, index - count + 1),
  );
}

export function formatDate(
  date: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!validDate(date)) return "—";
  return new Intl.DateTimeFormat(
    "zh-CN",
    options ?? { month: "long", day: "numeric" },
  ).format(new Date(`${date}T12:00:00`));
}

export function money(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function duration(minutes: number): string {
  const total = Math.max(0, Math.round(Number.isFinite(minutes) ? minutes : 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return hours > 0 ? `${hours}小时${rest ? `${rest}分钟` : ""}` : `${rest}分钟`;
}

export function emptyData(): AppData {
  return {
    version: 1,
    tasks: [],
    expenses: [],
    studies: [],
    weights: [],
    meals: [],
    settings: {
      name: "朋友",
      targetWeight: null,
      dailyStudyGoal: 60,
      dailyCalorieGoal: 2000,
    },
  };
}

/** Optional sample records. A fresh installation always uses emptyData(). */
export function demoData(): AppData {
  const data = emptyData();
  data.settings = {
    name: "小满",
    targetWeight: 65,
    dailyStudyGoal: 90,
    dailyCalorieGoal: 2000,
  };
  const days = recentDays(7);
  const expenses = [68, 42, 126, 55, 81, 46, 38.5];
  const minutes = [60, 90, 45, 120, 75, 100, 65];
  const calories = [1880, 1920, 2050, 1810, 1960, 1900, 850];
  const topics = ["英语", "阅读", "产品设计", "英语", "编程", "阅读", "英语"];
  days.forEach((date, index) => {
    const isToday = index === days.length - 1;
    [
      "喝够 8 杯水",
      "阅读 20 分钟",
      "散步 / 运动 30 分钟",
      "睡前整理今日记录",
    ].forEach((title, taskIndex) => {
      data.tasks.push({
        id: uid(),
        title,
        date,
        completed: !isToday || taskIndex < 2,
      });
    });
    data.expenses.push({
      id: uid(),
      date,
      time: "12:20",
      category: "餐饮",
      amount: expenses[index],
      note: isToday ? "午餐 · 鸡肉蔬菜饭" : "三餐与咖啡",
    });
    if (index === 2)
      data.expenses.push({
        id: uid(),
        date,
        time: "18:30",
        category: "购物",
        amount: 89,
        note: "一本喜欢的书和收纳盒",
      });
    if (index === 4)
      data.expenses.push({
        id: uid(),
        date,
        time: "08:45",
        category: "交通",
        amount: 6,
        note: "地铁通勤",
      });
    data.studies.push({
      id: uid(),
      date,
      content: [
        "听力练习与生词整理",
        "《习惯的力量》阅读笔记",
        "整理优秀产品交互案例",
        "口语跟读与复习",
        "练习 TypeScript 基础",
        "读书与摘录",
        "英语听力 · 每天进步一点",
      ][index],
      topic: topics[index],
      minutes: minutes[index],
      note: "专注学习，慢慢积累",
    });
    data.weights.push({
      id: uid(),
      date,
      value: Math.round((68.8 - index * 0.1 + (index % 2) * 0.1) * 10) / 10,
    });
    data.meals.push({
      id: uid(),
      date,
      type: "早餐",
      food: "全麦面包、鸡蛋、牛奶",
      quantity: "面包 2 片 · 鸡蛋 1 个 · 牛奶 1 杯",
      calories: 350,
      note: "",
    });
    data.meals.push({
      id: uid(),
      date,
      type: "午餐",
      food: "鸡胸肉蔬菜饭",
      quantity: "1 份",
      calories: isToday ? 500 : 650,
      note: "蔬菜多一点",
    });
    if (!isToday)
      data.meals.push({
        id: uid(),
        date,
        type: "晚餐",
        food: "杂粮饭、清蒸鱼、时蔬",
        quantity: "1 碗饭 · 1 份鱼 · 2 份蔬菜",
        calories: calories[index] - 1000,
        note: "",
      });
  });
  return data;
}

type RecordValue = Record<string, unknown>;

function object(value: unknown, keys: string[], label: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label}格式不正确`);
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    throw new Error(`${label}不是有效的数据对象`);
  const record = value as RecordValue;
  if (
    Object.keys(record).some((key) => !keys.includes(key)) ||
    keys.some((key) => !Object.hasOwn(record, key))
  )
    throw new Error(`${label}字段不完整或包含未知字段`);
  return record;
}

function string(
  value: unknown,
  label: string,
  required = false,
  limit = 5000,
): string {
  if (
    typeof value !== "string" ||
    value.length > limit ||
    (required && !value.trim())
  )
    throw new Error(
      `${label}应为${required ? "非空" : ""}文本（最多 ${limit} 字符）`,
    );
  return required ? value.trim() : value;
}

function number(
  value: unknown,
  label: string,
  min: number,
  max: number,
  integer = false,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new Error(`${label}数值不正确`);
  return value;
}

function date(value: unknown): string {
  if (!validDate(value))
    throw new Error("记录日期无效，请使用 YYYY-MM-DD 格式");
  return value;
}

function list<T>(
  value: unknown,
  label: string,
  convert: (entry: unknown) => T & { id: string },
): T[] {
  if (!Array.isArray(value) || value.length > 100_000)
    throw new Error(`${label}列表格式不正确或记录过多`);
  const ids = new Set<string>();
  return value.map((entry) => {
    const item = convert(entry);
    if (ids.has(item.id)) throw new Error(`${label}包含重复的记录 ID`);
    ids.add(item.id);
    return item;
  });
}

/** Rebuild each object from known fields; imported JSON never becomes application state directly. */
export function validateData(input: unknown): AppData {
  const root = object(
    input,
    ["version", "tasks", "expenses", "studies", "weights", "meals", "settings"],
    "备份",
  );
  if (root.version !== 1)
    throw new Error("不支持此备份版本，请导入 Daykeep v1 备份");
  const settings = object(
    root.settings,
    ["name", "targetWeight", "dailyStudyGoal", "dailyCalorieGoal"],
    "设置",
  );
  const weightDates = new Set<string>();
  return {
    version: 1,
    tasks: list(root.tasks, "任务", (entry) => {
      const row = object(entry, ["id", "title", "date", "completed"], "任务");
      if (typeof row.completed !== "boolean")
        throw new Error("任务完成状态必须为 true 或 false");
      return {
        id: string(row.id, "记录 ID", true, 200),
        title: string(row.title, "任务名称", true, 500),
        date: date(row.date),
        completed: row.completed,
      };
    }),
    expenses: list(root.expenses, "消费", (entry) => {
      const row = object(
        entry,
        ["id", "amount", "category", "date", "time", "note"],
        "消费",
      );
      if (!(EXPENSE_CATEGORIES as readonly unknown[]).includes(row.category))
        throw new Error("消费类别无效");
      if (
        typeof row.time !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time)
      )
        throw new Error("消费时间无效，请使用 HH:mm 格式");
      return {
        id: string(row.id, "记录 ID", true, 200),
        amount: number(row.amount, "消费金额", Number.MIN_VALUE, 1_000_000_000),
        category: row.category as AppData["expenses"][number]["category"],
        date: date(row.date),
        time: row.time,
        note: string(row.note, "消费备注"),
      };
    }),
    studies: list(root.studies, "学习", (entry) => {
      const row = object(
        entry,
        ["id", "content", "topic", "minutes", "date", "note"],
        "学习",
      );
      return {
        id: string(row.id, "记录 ID", true, 200),
        content: string(row.content, "学习内容", true),
        topic: string(row.topic, "学习主题", true, 200),
        minutes: number(row.minutes, "学习分钟数", 1, 1440, true),
        date: date(row.date),
        note: string(row.note, "学习备注"),
      };
    }),
    weights: list(root.weights, "体重", (entry) => {
      const row = object(entry, ["id", "date", "value"], "体重");
      const recordDate = date(row.date);
      if (weightDates.has(recordDate))
        throw new Error("体重包含重复的记录日期，每天只能保留一条体重记录");
      weightDates.add(recordDate);
      return {
        id: string(row.id, "记录 ID", true, 200),
        date: recordDate,
        value: number(row.value, "体重", 1, 1000),
      };
    }),
    meals: list(root.meals, "饮食", (entry) => {
      const row = object(
        entry,
        ["id", "date", "type", "food", "quantity", "calories", "note"],
        "饮食",
      );
      if (!(MEAL_TYPES as readonly unknown[]).includes(row.type))
        throw new Error("餐次无效");
      return {
        id: string(row.id, "记录 ID", true, 200),
        date: date(row.date),
        type: row.type as AppData["meals"][number]["type"],
        food: string(row.food, "饮食内容", true),
        quantity: string(row.quantity, "食物数量", true, 500),
        calories: number(row.calories, "估算热量", 0, 100_000),
        note: string(row.note, "饮食备注"),
      };
    }),
    settings: {
      name: string(settings.name, "称呼", false, 80),
      targetWeight:
        settings.targetWeight === null
          ? null
          : number(settings.targetWeight, "目标体重", 1, 1000),
      dailyStudyGoal: number(
        settings.dailyStudyGoal,
        "每日学习目标",
        1,
        1440,
        true,
      ),
      dailyCalorieGoal: number(
        settings.dailyCalorieGoal,
        "每日参考热量",
        1,
        100_000,
        true,
      ),
    },
  };
}

interface LocalState {
  data: AppData;
  storageError: string | null;
}
interface InitialState extends LocalState {
  recovery: string | null;
}

function readLocalData(): InitialState {
  if (typeof window === "undefined")
    return { data: emptyData(), storageError: null, recovery: null };
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
    return {
      data: raw === null ? emptyData() : validateData(JSON.parse(raw)),
      storageError: null,
      recovery: null,
    };
  } catch {
    return {
      data: emptyData(),
      recovery: raw,
      storageError:
        raw === null
          ? "无法访问浏览器存储。你仍可在本次页面中记录，请在关闭前导出备份。"
          : "本地历史数据格式异常，原始内容已保留。下次保存时会先为原始数据创建恢复备份。",
    };
  }
}

/** Storage is an adapter boundary; pages only call update(), ready for a future cloud adapter. */
export function useLocalData(): {
  data: AppData;
  update: UpdateData;
  storageError: string | null;
} {
  const [state, setState] = useState<InitialState>(readLocalData);
  const current = useRef(state);
  const update = useCallback<UpdateData>((updater) => {
    const next = validateData(updater(current.current.data));
    let storageError: string | null = null;
    let recovery = current.current.recovery;
    try {
      if (recovery !== null) {
        window.localStorage.setItem(
          `${STORAGE_KEY}:recovery:${Date.now()}:${uid()}`,
          recovery,
        );
        recovery = null;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      storageError =
        "本地保存失败，可能是存储空间不足或浏览器限制。记录暂保存在本次页面中，请在关闭前导出备份。";
    }
    const nextState = { data: next, storageError, recovery };
    current.current = nextState;
    setState(nextState);
  }, []);

  useEffect(() => {
    const synchronize = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      let nextState: InitialState;
      try {
        nextState = {
          data:
            event.newValue === null
              ? emptyData()
              : validateData(JSON.parse(event.newValue)),
          storageError: null,
          recovery: null,
        };
      } catch {
        nextState = {
          ...current.current,
          recovery: event.newValue,
          storageError:
            "另一个页面写入的数据格式异常。当前记录仍然保留，保存前会自动备份异常内容。",
        };
      }
      current.current = nextState;
      setState(nextState);
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);

  return { data: state.data, update, storageError: state.storageError };
}

export function dailyStats(
  data: AppData,
  date: string,
): {
  totalTasks: number;
  completedTasks: number;
  completion: number;
  expense: number;
  study: number;
  calories: number;
  weight: number | null;
} {
  const tasks = data.tasks.filter((task) => task.date === date);
  const completedTasks = tasks.filter((task) => task.completed).length;
  const weight =
    data.weights.filter((item) => item.date === date).at(-1)?.value ?? null;
  return {
    totalTasks: tasks.length,
    completedTasks,
    completion: tasks.length
      ? Math.round((completedTasks / tasks.length) * 100)
      : 0,
    expense:
      Math.round(
        data.expenses
          .filter((item) => item.date === date)
          .reduce((sum, item) => sum + item.amount, 0) * 100,
      ) / 100,
    study: data.studies
      .filter((item) => item.date === date)
      .reduce((sum, item) => sum + item.minutes, 0),
    calories: data.meals
      .filter((item) => item.date === date)
      .reduce((sum, item) => sum + item.calories, 0),
    weight,
  };
}

export function streak(data: AppData, asOf = today()): number {
  if (!validDate(asOf)) return 0;
  const tasksByDate = new Map<string, { count: number; completed: number }>();
  for (const task of data.tasks) {
    const day = tasksByDate.get(task.date) ?? { count: 0, completed: 0 };
    day.count += 1;
    day.completed += Number(task.completed);
    tasksByDate.set(task.date, day);
  }
  const complete = (day: string) => {
    const row = tasksByDate.get(day);
    return !!row && row.count > 0 && row.completed === row.count;
  };
  let cursor = complete(asOf) ? asOf : shiftDate(asOf, -1);
  let count = 0;
  while (complete(cursor)) {
    count++;
    cursor = shiftDate(cursor, -1);
  }
  return count;
}

export function weightPrediction(data: AppData): {
  current: number | null;
  target: number | null;
  delta: number | null;
  weeklyChange: number | null;
  estimatedDate: string | null;
  reason: string;
} {
  const recordsByDate = new Map(
    data.weights
      .filter((item) => item.date <= today())
      .map((item) => [item.date, item]),
  );
  const history = [...recordsByDate.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const last = history.at(-1);
  const current = last?.value ?? null;
  const target = data.settings.targetWeight;
  const result = {
    current,
    target,
    delta:
      current !== null && target !== null
        ? Math.round(Math.abs(current - target) * 100) / 100
        : null,
    weeklyChange: null as number | null,
    estimatedDate: null as string | null,
    reason: "",
  };
  if (current === null || !last)
    return { ...result, reason: "先记录体重，开始了解自己的变化。" };
  if (dayNumber(today()) - dayNumber(last.date) > 30)
    return {
      ...result,
      reason: "最新体重记录已超过 30 天，请补充近期记录后再观察趋势。",
    };
  const records = history.filter(
    (row) => row.date >= shiftDate(last.date, -29),
  );
  let slope = 0;
  const firstDay = records[0] ? dayNumber(records[0].date) : 0;
  const enoughRecords =
    records.length >= 3 && dayNumber(last.date) - firstDay >= 7;
  if (enoughRecords) {
    const meanX =
      records.reduce((sum, row) => sum + dayNumber(row.date) - firstDay, 0) /
      records.length;
    const meanY =
      records.reduce((sum, row) => sum + row.value, 0) / records.length;
    const numerator = records.reduce(
      (sum, row) =>
        sum + (dayNumber(row.date) - firstDay - meanX) * (row.value - meanY),
      0,
    );
    const denominator = records.reduce(
      (sum, row) => sum + (dayNumber(row.date) - firstDay - meanX) ** 2,
      0,
    );
    slope = denominator > 0 ? numerator / denominator : 0;
    result.weeklyChange = Math.round(slope * 7 * 100) / 100;
  }
  if (target === null)
    return { ...result, reason: "设置目标体重后，可查看距离目标的变化。" };
  if (Math.abs(current - target) <= 0.05)
    return { ...result, reason: "已达到目标体重，继续保持规律生活。" };
  if (!enoughRecords)
    return {
      ...result,
      reason:
        "最近 30 天内至少需要 3 次称重，且记录跨度达到 7 天，才能估算趋势。",
    };
  if (Math.abs(slope) < 0.005)
    return { ...result, reason: "近期体重较稳定，继续记录后再观察趋势。" };
  if ((target - current) * slope <= 0)
    return { ...result, reason: "近期变化方向与目标不同，暂不估算到达日期。" };
  // Avoid a mathematically integral interval becoming one day longer due to float noise.
  const days = Math.ceil((target - current) / slope - 1e-8);
  if (days > 3650)
    return { ...result, reason: "距离目标的变化较慢，暂不估算具体日期。" };
  const estimatedDate = shiftDate(last.date, Math.max(1, days));
  if (estimatedDate < today())
    return { ...result, reason: "最新体重记录较早，请补充近期记录后再估算。" };
  return {
    ...result,
    estimatedDate,
    reason:
      "按已记录体重的线性趋势估算。体重会自然波动，此日期仅供生活管理参考，不作为医学建议。",
  };
}

export function dietSuggestion(
  data: AppData,
  date = today(),
): { title: string; message: string } {
  const meals = data.meals.filter((item) => item.date === date);
  const total = meals.reduce((sum, item) => sum + item.calories, 0);
  const nextMeal =
    MEAL_TYPES.find(
      (type) => type !== "加餐" && !meals.some((item) => item.type === type),
    ) ?? "加餐";
  const weight = [...data.weights]
    .filter((item) => item.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1)?.value;
  const target = data.settings.targetWeight;
  const goalNote =
    weight !== undefined && target !== null && weight > target + 0.05
      ? "关注体重变化时，也请保持三餐规律，不必跳餐。"
      : weight !== undefined && target !== null && weight < target - 0.05
        ? "若希望体重平稳增加，可以在正常三餐之外适量补充牛奶、豆制品或坚果。"
        : "以规律、均衡和适合自己的份量为主。";
  const suggestion =
    total >= data.settings.dailyCalorieGoal
      ? `今天已记录约 ${Math.round(total)} 千卡，已达到你设置的参考值。下一餐仍然按时吃，可搭配蔬菜、适量主食和鱼、蛋或豆制品，根据饥饿感调整份量。${goalNote}`
      : nextMeal === "加餐"
        ? `今天的三餐都已记录，预计共 ${Math.round(total)} 千卡。若有饥饿感，可选择一份水果、原味酸奶或少量坚果；不饿也不必额外加餐。${goalNote}`
        : `今天${meals.length ? `已记录约 ${Math.round(total)} 千卡` : "还没有饮食记录"}。${nextMeal}可以安排一份主食、一份蛋白质食物，再配蔬菜或水果，记下大概份量即可。${goalNote}`;
  return {
    title: `下一餐建议 · ${nextMeal}`,
    message: `${suggestion}仅供日常生活管理参考。`,
  };
}
