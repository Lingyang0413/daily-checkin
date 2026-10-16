import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  dailyStats,
  demoData,
  dietSuggestion,
  duration,
  emptyData,
  formatDate,
  money,
  recentDays,
  streak,
  today,
  uid,
  validateData,
  weightPrediction,
} from "./data";
import type { AppData } from "./types";
import StudyPage from "../pages/Study";
import ExpensesPage from "../pages/Expenses";
import DietPage from "../pages/Diet";

afterEach(() => {
  vi.useRealTimers();
});

function withWeight(values: [string, number][], target = 65): AppData {
  const data = emptyData();
  data.settings.targetWeight = target;
  data.weights = values.map(([date, value], index) => ({
    id: `w${index}`,
    date,
    value,
  }));
  return data;
}

describe("local calendar and formatting", () => {
  it("uses local date fields instead of deriving today from UTC text", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 0, 1, 0, 15));
    expect(today()).toBe("2026-01-01");
  });

  it("handles month, leap-year, and year boundaries in ascending order", () => {
    expect(recentDays(3, "2024-03-01")).toEqual([
      "2024-02-28",
      "2024-02-29",
      "2024-03-01",
    ]);
    expect(recentDays(3, "2026-01-01")).toEqual([
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
    ]);
    expect(recentDays(0)).toEqual([]);
    expect(recentDays(2, "2026-02-30")).toEqual([]);
    expect(formatDate("invalid")).toBe("—");
    expect(formatDate("2026-01-01")).toContain("1");
  });

  it("formats money and useful durations", () => {
    expect(money(1234.5)).toBe("1,234.50");
    expect(money(Number.NaN)).toBe("0.00");
    expect(duration(90)).toBe("1小时30分钟");
    expect(duration(120)).toBe("2小时");
    expect(duration(0)).toBe("0分钟");
    expect(new Set(Array.from({ length: 100 }, uid)).size).toBe(100);
  });
});

describe("daily statistics and completed-day streaks", () => {
  it("aggregates only the selected day and avoids floating point currency noise", () => {
    const data = emptyData();
    data.tasks = [
      { id: "a", title: "阅读", date: "2026-10-15", completed: true },
      { id: "b", title: "散步", date: "2026-10-15", completed: false },
      { id: "c", title: "昨天", date: "2026-10-14", completed: true },
    ];
    data.expenses = [0.1, 0.2].map((amount, index) => ({
      id: `e${index}`,
      amount,
      category: "餐饮",
      date: "2026-10-15",
      time: "12:00",
      note: "",
    }));
    data.studies = [
      {
        id: "s",
        content: "阅读",
        topic: "书籍",
        minutes: 45,
        date: "2026-10-15",
        note: "",
      },
    ];
    data.meals = [
      {
        id: "m",
        type: "早餐",
        food: "鸡蛋",
        quantity: "1 个",
        calories: 80,
        date: "2026-10-15",
        note: "",
      },
    ];
    data.weights = [{ id: "w", date: "2026-10-14", value: 68 }];
    expect(dailyStats(data, "2026-10-15")).toEqual({
      totalTasks: 2,
      completedTasks: 1,
      completion: 50,
      expense: 0.3,
      study: 45,
      calories: 80,
      weight: null,
    });
    expect(dailyStats(data, "2026-10-14").weight).toBe(68);
    expect(dailyStats(data, "2026-10-13").completion).toBe(0);
  });

  it("requires every task to be complete and allows today to remain unfinished", () => {
    const data = emptyData();
    data.tasks = recentDays(4, "2026-01-01").map((date, index) => ({
      id: `${index}`,
      title: "阅读",
      date,
      completed: index !== 3,
    }));
    expect(streak(data, "2026-01-01")).toBe(3);
    data.tasks[3].completed = true;
    expect(streak(data, "2026-01-01")).toBe(4);
    data.tasks[1].completed = false;
    expect(streak(data, "2026-01-01")).toBe(2);
    data.tasks.push({
      id: "second",
      title: "运动",
      date: "2026-01-01",
      completed: false,
    });
    expect(streak(data, "2026-01-01")).toBe(1);
    expect(streak(emptyData(), "2026-01-01")).toBe(0);
  });
});

describe("weight predictions", () => {
  it("uses date spacing in regression and reports a reasonable future estimate", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00Z"));
    const result = weightPrediction(
      withWeight(
        [
          ["2026-10-02", 72],
          ["2026-10-09", 71],
          ["2026-10-16", 70],
        ],
        68,
      ),
    );
    expect(result.current).toBe(70);
    expect(result.delta).toBe(2);
    expect(result.weeklyChange).toBe(-1);
    expect(result.estimatedDate).toBe("2026-10-30");
  });

  it("does not predict from too little data, flat or wrong-direction trends", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00Z"));
    const sparse = weightPrediction(
      withWeight([
        ["2026-10-10", 70],
        ["2026-10-16", 69],
      ]),
    );
    expect(sparse.estimatedDate).toBeNull();
    expect(sparse.weeklyChange).toBeNull();
    const short = weightPrediction(
      withWeight([
        ["2026-10-14", 70],
        ["2026-10-15", 69],
        ["2026-10-16", 68],
      ]),
    );
    expect(short.estimatedDate).toBeNull();
    expect(short.weeklyChange).toBeNull();
    const flat = weightPrediction(
      withWeight([
        ["2026-10-02", 70],
        ["2026-10-09", 70],
        ["2026-10-16", 70],
      ]),
    );
    expect(flat.reason).toContain("稳定");
    expect(flat.weeklyChange).toBe(0);
    expect(
      weightPrediction(
        withWeight([
          ["2026-10-02", 68],
          ["2026-10-09", 69],
          ["2026-10-16", 70],
        ]),
      ).reason,
    ).toContain("方向");
  });

  it("ignores future records and handles achieved goals and missing targets", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00Z"));
    const data = withWeight([
      ["2026-10-16", 65],
      ["2026-11-01", 60],
    ]);
    expect(weightPrediction(data).current).toBe(65);
    expect(weightPrediction(data).reason).toContain("已达到");
    expect(weightPrediction(data).estimatedDate).toBeNull();
    data.settings.targetWeight = null;
    expect(weightPrediction(data).reason).toContain("设置目标");
    expect(weightPrediction(emptyData()).current).toBeNull();
  });

  it("fits only recent records, so old history cannot reverse the current trend", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00Z"));
    const data = withWeight(
      [
        ["2025-10-16", 40],
        ["2026-10-02", 72],
        ["2026-10-09", 71],
        ["2026-10-16", 70],
      ],
      68,
    );
    expect(weightPrediction(data).weeklyChange).toBe(-1);
    expect(weightPrediction(data).estimatedDate).toBe("2026-10-30");
  });

  it("keeps the latest known weight but never predicts from stale records", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00Z"));
    const data = withWeight(
      [
        ["2026-08-01", 72],
        ["2026-08-08", 71],
        ["2026-08-15", 70],
      ],
      68,
    );
    const result = weightPrediction(data);
    expect(result.current).toBe(70);
    expect(result.weeklyChange).toBeNull();
    expect(result.estimatedDate).toBeNull();
    expect(result.reason).toContain("超过 30 天");
  });

  it("allows a supported gain trend and guards extremely distant estimates", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00Z"));
    const gain = weightPrediction(
      withWeight(
        [
          ["2026-10-02", 60],
          ["2026-10-09", 61],
          ["2026-10-16", 62],
        ],
        64,
      ),
    );
    expect(gain.estimatedDate).toBe("2026-10-30");
    expect(gain.weeklyChange).toBe(1);
    const distant = weightPrediction(
      withWeight(
        [
          ["2026-10-02", 500.14],
          ["2026-10-09", 500.07],
          ["2026-10-16", 500],
        ],
        65,
      ),
    );
    expect(distant.estimatedDate).toBeNull();
    expect(distant.reason).toContain("较慢");
  });
});

describe("validated import boundary", () => {
  it("accepts complete backups and creates independent safe data", () => {
    const data = demoData();
    const imported = validateData(JSON.parse(JSON.stringify(data)));
    expect(imported).toEqual(data);
    expect(imported).not.toBe(data);
    expect(imported.tasks).not.toBe(data.tasks);
    expect(validateData(emptyData())).toEqual(emptyData());
  });

  it("rejects malformed structure, prototype keys, unknown versions and missing fields", () => {
    expect(() => validateData(null)).toThrow();
    expect(() => validateData({ ...emptyData(), version: 2 })).toThrow();
    expect(() =>
      validateData(JSON.parse('{"__proto__":{"polluted":true}}')),
    ).toThrow();
    expect(() =>
      validateData({
        ...emptyData(),
        settings: { ...emptyData().settings, constructor: {} },
      }),
    ).toThrow();
    expect(() => validateData({ ...emptyData(), tasks: [{}] })).toThrow();
  });

  it("rejects invalid calendar dates, enums, nonfinite amounts and duplicate IDs", () => {
    const data = demoData();
    data.expenses[0].amount = Infinity;
    expect(() => validateData(data)).toThrow("消费金额");
    data.expenses[0].amount = 20;
    data.tasks[0].date = "2026-02-30";
    expect(() => validateData(data)).toThrow("日期");
    data.tasks[0].date = today();
    data.tasks.push({ ...data.tasks[0] });
    expect(() => validateData(data)).toThrow("重复");
    data.tasks.pop();
    const invalid = JSON.parse(JSON.stringify(data));
    invalid.meals[0].type = "夜宵";
    expect(() => validateData(invalid)).toThrow("餐次");
    invalid.meals[0].type = "早餐";
    invalid.expenses[0].time = "24:01";
    expect(() => validateData(invalid)).toThrow("时间");
  });

  it("enforces the same required fields and one-weight-per-day rule as the forms", () => {
    const original = demoData();
    const zeroExpense = structuredClone(original);
    zeroExpense.expenses[0].amount = 0;
    expect(() => validateData(zeroExpense)).toThrow("消费金额");
    const noTopic = structuredClone(original);
    noTopic.studies[0].topic = "   ";
    expect(() => validateData(noTopic)).toThrow("学习主题");
    const noQuantity = structuredClone(original);
    noQuantity.meals[0].quantity = "   ";
    expect(() => validateData(noQuantity)).toThrow("食物数量");
    const duplicateWeight = structuredClone(original);
    duplicateWeight.weights.push({
      ...duplicateWeight.weights[0],
      id: "another-weight",
    });
    expect(() => validateData(duplicateWeight)).toThrow("重复的记录日期");
    const invalidMinutes = structuredClone(original);
    invalidMinutes.studies[0].minutes = 2.5;
    expect(() => validateData(invalidMinutes)).toThrow("学习分钟数");
  });
});

describe("imported records in real page summaries", () => {
  function textOf(component: typeof StudyPage, data: AppData): string {
    return renderToStaticMarkup(
      createElement(component, {
        data: validateData(data),
        update: () => {},
        notify: () => {},
        navigate: () => {},
      }),
    ).replace(/<[^>]*>/g, "");
  }

  it("separates month totals while keeping the Monday–Sunday week across New Year", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 0, 1, 12));
    const data = emptyData();
    data.studies = [
      ["2025-12-28", 90],
      ["2025-12-29", 30],
      ["2025-12-31", 40],
      ["2026-01-01", 10],
      ["2026-01-04", 20],
      ["2026-01-05", 400],
      ["2026-01-10", 30],
    ].map(([date, minutes], index) => ({
      id: `s${index}`,
      date: String(date),
      minutes: Number(minutes),
      topic: "阅读",
      content: "读书",
      note: "",
    }));
    const text = textOf(StudyPage, data);
    expect(text).toContain("今日学习10分钟");
    expect(text).toContain("所选周学习1小时40分钟");
    expect(text).toContain("所选月份学习7小时40分钟");
  });

  it("aggregates multiple decimal expenses and multiple entries in the same meal", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 0, 1, 12));
    const data = emptyData();
    data.expenses = [
      ["2025-12-31", 10],
      ["2026-01-01", 0.1],
      ["2026-01-01", 0.2],
      ["2026-01-04", 34.4],
    ].map(([date, amount], index) => ({
      id: `e${index}`,
      date: String(date),
      amount: Number(amount),
      category: "餐饮",
      time: "12:00",
      note: "",
    }));
    expect(textOf(ExpensesPage, data)).toContain("今日消费¥0.30");
    expect(textOf(ExpensesPage, data)).toContain("所选月份消费¥34.70");
    data.meals = [200, 350].map((calories, index) => ({
      id: `m${index}`,
      date: today(),
      calories,
      type: "早餐",
      food: "早餐",
      quantity: "1 份",
      note: "",
    }));
    data.meals.push({
      id: "old-meal",
      date: "2025-12-31",
      calories: 999,
      type: "午餐",
      food: "昨日午餐",
      quantity: "1 份",
      note: "",
    });
    const text = textOf(DietPage, data);
    expect(text).toContain("今日预计摄入550kcal");
    expect(text).toContain("已记录餐次1/ 4 类");
    expect(text).toContain("早餐约 550 kcal");
  });
});

describe("optional samples and ordinary dietary suggestions", () => {
  it("starts empty and makes examples relative to today", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 0, 1, 12));
    expect(emptyData().tasks).toHaveLength(0);
    const demo = demoData();
    expect([...new Set(demo.tasks.map((task) => task.date))]).toEqual(
      recentDays(7),
    );
    expect(demo.tasks.at(-1)?.date).toBe("2026-01-01");
    expect(dailyStats(demo, today()).completion).toBe(50);
    expect(streak(demo)).toBe(6);
    expect(validateData(demo)).toEqual(demo);
  });

  it("uses completed meals and configured reference without recommending skipped meals", () => {
    const data = emptyData();
    expect(dietSuggestion(data).title).toContain("早餐");
    data.meals.push({
      id: "m",
      date: today(),
      type: "早餐",
      food: "面包",
      quantity: "1 份",
      calories: 2500,
      note: "",
    });
    const suggestion = dietSuggestion(data);
    expect(suggestion.title).toContain("午餐");
    expect(suggestion.message).toContain("2500");
    expect(suggestion.message).toContain("仍然按时吃");
    expect(suggestion.message).toContain("仅供日常生活管理参考");
  });
});
