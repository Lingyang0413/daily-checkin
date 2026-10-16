import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { AppData } from "../src/lib/types";

const KEY = "daykeep:data:v1";
const TODAY = "2026-10-16";
const YESTERDAY = "2026-10-15";
const runtimeErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-10-16T10:00:00+08:00"));
});

test.afterEach(async ({ page }) => {
  expect(
    runtimeErrors.get(page),
    "用户操作不应产生未捕获的浏览器运行错误",
  ).toEqual([]);
});

function emptyBackup(): AppData {
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

async function stored(page: Page): Promise<AppData | null> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    KEY,
  );
}

async function go(page: Page, label: string) {
  await page.getByRole("link", { name: label, exact: true }).click();
}

function stat(page: Page, label: string) {
  return page
    .locator(".stat-card")
    .filter({ has: page.locator(".stat-top", { hasText: label }) })
    .locator(".stat-value");
}

async function addTask(page: Page, title: string, date = TODAY) {
  await page.getByRole("button", { name: "新增任务", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("任务名称").fill(title);
  await dialog.getByLabel("所属日期").fill(date);
  await dialog.getByRole("button", { name: "添加任务", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

async function addExpense(
  page: Page,
  amount: string,
  category: string,
  note: string,
  date = TODAY,
) {
  await page.getByRole("button", { name: "记一笔消费", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("消费金额（元）").fill(amount);
  await dialog.getByLabel("消费类别").selectOption(category);
  await dialog.getByLabel("消费日期").fill(date);
  await dialog.getByLabel("消费时间").fill("12:30");
  await dialog.getByLabel("备注（选填）").fill(note);
  await dialog.getByRole("button", { name: "保存消费", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

async function addStudy(
  page: Page,
  content: string,
  minutes: string,
  date = TODAY,
) {
  await page.getByRole("button", { name: "记录学习", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("学习内容").fill(content);
  await dialog.getByLabel("学习主题").fill("自我成长");
  await dialog.getByLabel("学习时长（分钟）").fill(minutes);
  await dialog.getByLabel("学习日期").fill(date);
  await dialog.getByRole("button", { name: "保存学习", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

async function addWeight(page: Page, value: string, date = TODAY) {
  await page.getByRole("button", { name: "记录体重", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("记录日期").fill(date);
  await dialog.getByLabel("体重（kg）", { exact: true }).fill(value);
  await dialog.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

test("首次使用为空，示例数据必须确认后加载，首页展示真实的示例记录", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "今天，想完成什么？" }),
  ).toBeVisible();
  await expect(page.getByText("今天还没有称重", { exact: true })).toBeVisible();
  expect(await stored(page)).toBeNull();
  await page.getByRole("button", { name: "体验示例数据" }).click();
  await expect(page.getByRole("dialog")).toContainText("虚构的演示记录");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "取消", exact: true })
    .click();
  expect(await stored(page)).toBeNull();
  await page.getByRole("button", { name: "体验示例数据" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: /小满/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(
    page.getByRole("button", { name: "取消完成：喝够 8 杯水" }),
  ).toBeVisible();
  await expect(stat(page, "今日消费")).toContainText("38.50");
  await expect(stat(page, "今日学习")).toContainText("65");
  await expect(stat(page, "今日体重")).toContainText("68.2");
  await expect(stat(page, "今日摄入")).toContainText("850");
  await page.reload();
  await expect(page.getByRole("heading", { name: /小满/ })).toBeVisible();
});

test("任务新增、编辑、完成与取消、首页快捷打卡、历史日期及删除确认", async ({
  page,
}) => {
  await page.goto("/#tasks");
  await addTask(page, "阅读二十分钟");
  const checkbox = page.getByRole("checkbox", {
    name: "完成任务：阅读二十分钟",
  });
  await expect(checkbox).not.toBeChecked();
  await checkbox.click();
  await expect(
    page.getByRole("checkbox", { name: "取消完成：阅读二十分钟" }),
  ).toBeChecked();
  await expect(page.locator(".progress-ring strong")).toHaveText("100%");
  await page.getByRole("button", { name: "编辑任务：阅读二十分钟" }).click();
  await page.getByRole("dialog").getByLabel("任务名称").fill("晚间阅读");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存修改" })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "取消完成：晚间阅读" }),
  ).toBeChecked();
  await go(page, "今日首页");
  await page.getByRole("button", { name: "取消完成：晚间阅读" }).click();
  await expect(
    page.getByRole("button", { name: "完成：晚间阅读" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "完成：晚间阅读" }).click();
  await go(page, "每日打卡");
  await addTask(page, "昨天散步", YESTERDAY);
  await expect(page.getByLabel("任务日期")).toHaveValue(YESTERDAY);
  await page.getByRole("checkbox", { name: "完成任务：昨天散步" }).click();
  await expect(page.getByText("连续完整打卡 2 天")).toBeVisible();
  await page.getByLabel("任务日期").fill(TODAY);
  await page.getByRole("button", { name: "删除任务：晚间阅读" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "取消", exact: true })
    .click();
  await expect(page.getByText("晚间阅读", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "删除任务：晚间阅读" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认", exact: true })
    .click();
  expect((await stored(page))?.tasks).toEqual([
    expect.objectContaining({
      title: "昨天散步",
      date: YESTERDAY,
      completed: true,
    }),
  ]);
  await page.reload();
  await page.getByLabel("任务日期").fill(YESTERDAY);
  await expect(
    page.getByRole("checkbox", { name: "取消完成：昨天散步" }),
  ).toBeChecked();
});

test("消费增改删会同步每日、本月合计与历史日期，刷新后保留", async ({
  page,
}) => {
  await page.goto("/#expenses");
  await addExpense(page, "25.50", "餐饮", "午饭");
  await addExpense(page, "12", "交通", "地铁");
  await expect(stat(page, "今日消费")).toHaveText("¥37.50");
  await expect(stat(page, "所选月份消费")).toHaveText("¥37.50");
  await page.getByRole("button", { name: "编辑餐饮25.50元消费" }).click();
  await page.getByRole("dialog").getByLabel("消费金额（元）").fill("30");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存消费" })
    .click();
  await expect(stat(page, "今日消费")).toHaveText("¥42.00");
  await page.getByRole("button", { name: "删除交通12.00元消费" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认", exact: true })
    .click();
  await addExpense(page, "10", "购物", "昨天的文具", YESTERDAY);
  await expect(stat(page, "当日消费")).toHaveText("¥10.00");
  await expect(stat(page, "所选月份消费")).toHaveText("¥40.00");
  await page.getByLabel("消费记录日期").fill(TODAY);
  await expect(stat(page, "今日消费")).toHaveText("¥30.00");
  await page.reload();
  await expect(stat(page, "所选月份消费")).toHaveText("¥40.00");
  expect((await stored(page))?.expenses).toHaveLength(2);
});

test("学习增改删正确区分今日、周一至周日及本月累计", async ({ page }) => {
  await page.goto("/#study");
  await addStudy(page, "阅读", "30");
  await addStudy(page, "英语", "45", YESTERDAY);
  await addStudy(page, "写作", "15", "2026-10-01");
  await page.getByLabel("学习记录日期").fill(TODAY);
  await expect(stat(page, "今日学习")).toHaveText("30分钟");
  await expect(stat(page, "所选周学习")).toHaveText("1小时15分钟");
  await expect(stat(page, "所选月份学习")).toHaveText("1小时30分钟");
  await page.getByRole("button", { name: "编辑学习记录阅读" }).click();
  await page.getByRole("dialog").getByLabel("学习时长（分钟）").fill("60");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存学习" })
    .click();
  await expect(stat(page, "今日学习")).toHaveText("1小时");
  await expect(stat(page, "所选周学习")).toHaveText("1小时45分钟");
  await expect(stat(page, "所选月份学习")).toHaveText("2小时");
  await page.getByRole("button", { name: "删除学习记录阅读" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认", exact: true })
    .click();
  await expect(stat(page, "今日学习")).toHaveText("0分钟");
  await expect(stat(page, "所选周学习")).toHaveText("45分钟");
  await expect(stat(page, "所选月份学习")).toHaveText("1小时");
  expect((await stored(page))?.studies).toHaveLength(2);
});

test("四餐记录支持编辑删除，并更新热量合计及普通饮食建议", async ({ page }) => {
  await page.goto("/#diet");
  for (const [type, food, calories] of [
    ["早餐", "鸡蛋面包", "350"],
    ["午餐", "鸡肉饭", "600"],
    ["晚餐", "鱼肉蔬菜", "700"],
    ["加餐", "酸奶", "100"],
  ]) {
    await page.getByRole("button", { name: `添加${type}记录` }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("餐次")).toHaveValue(type);
    await dialog.getByLabel("吃了什么").fill(food);
    await dialog.getByLabel("大概数量").fill("一份");
    await dialog.getByLabel("估算热量（kcal）").fill(calories);
    await dialog.getByRole("button", { name: "保存饮食" }).click();
  }
  await expect(stat(page, "今日预计摄入")).toHaveText("1,750kcal");
  await expect(stat(page, "已记录餐次")).toHaveText("4/ 4 类");
  await expect(page.getByText(/今天的三餐都已记录/)).toBeVisible();
  await page.getByRole("button", { name: "编辑午餐鸡肉饭" }).click();
  await page.getByRole("dialog").getByLabel("估算热量（kcal）").fill("650");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存饮食" })
    .click();
  await expect(stat(page, "今日预计摄入")).toHaveText("1,800kcal");
  await page.getByRole("button", { name: "删除加餐酸奶" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认", exact: true })
    .click();
  await expect(stat(page, "今日预计摄入")).toHaveText("1,700kcal");
  await expect(stat(page, "已记录餐次")).toHaveText("3/ 4 类");
  await page.reload();
  expect((await stored(page))?.meals).toHaveLength(3);
  await expect(stat(page, "今日预计摄入")).toHaveText("1,700kcal");
});

test("体重同日更新保持唯一，历史新增保留今天，编辑日期冲突受保护，目标可达成", async ({
  page,
}) => {
  await page.goto("/#weight");
  await addWeight(page, "68");
  await page.getByRole("button", { name: "设置目标体重", exact: true }).click();
  await page.getByRole("dialog").getByLabel("目标体重（kg）").fill("65");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存目标" })
    .click();
  await expect(stat(page, "距离目标")).toHaveText("3.0kg");
  await addWeight(page, "67.8");
  expect((await stored(page))?.weights).toHaveLength(1);
  await addWeight(page, "68.1", YESTERDAY);
  const weights = (await stored(page))!.weights;
  expect(weights).toHaveLength(2);
  expect(weights).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ date: TODAY, value: 67.8 }),
      expect.objectContaining({ date: YESTERDAY, value: 68.1 }),
    ]),
  );
  await page.getByRole("button", { name: `编辑 ${YESTERDAY} 的体重` }).click();
  await page.getByRole("dialog").getByLabel("记录日期").fill(TODAY);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存记录" })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "这一天已有体重记录",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "取消", exact: true })
    .click();
  expect((await stored(page))?.weights).toEqual(weights);
  await page.getByRole("button", { name: `删除 ${YESTERDAY} 的体重` }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认", exact: true })
    .click();
  await page.getByRole("button", { name: "调整目标", exact: true }).click();
  await page.getByRole("dialog").getByLabel("目标体重（kg）").fill("67.8");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存目标" })
    .click();
  await expect(page.getByText("已到达目标", { exact: true })).toBeVisible();
  await page.reload();
  await expect(stat(page, "当前体重")).toHaveText("67.8kg");
  await expect(stat(page, "目标体重")).toHaveText("67.8kg");
  expect((await stored(page))?.weights).toHaveLength(1);
});

test("偏好可持久化，JSON导出导入完整、无效备份受拒，清空须确认", async ({
  page,
}) => {
  await page.goto("/#tasks");
  await addTask(page, "需要备份的任务");
  await go(page, "设置");
  await page.getByLabel("怎么称呼你").fill("小林");
  await page.getByLabel("每日学习目标（分钟）").fill("75");
  await page.getByLabel("每日热量记录参考（kcal）").fill("1900");
  await page.getByRole("button", { name: "保存偏好" }).click();
  await page.reload();
  await expect(page.getByLabel("怎么称呼你")).toHaveValue("小林");
  await expect(page.getByLabel("每日学习目标（分钟）")).toHaveValue("75");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出备份" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`daykeep-backup-${TODAY}.json`);
  const exported = JSON.parse(
    await readFile((await download.path())!, "utf8"),
  ) as AppData;
  expect(exported).toEqual(await stored(page));
  expect(exported.tasks[0].title).toBe("需要备份的任务");
  const imported = {
    ...exported,
    settings: { ...exported.settings, name: "恢复后的我" },
  };
  const fileInput = page.getByLabel("选择备份文件");
  const validFile = {
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported)),
  };
  await fileInput.setInputFiles(validFile);
  await expect(page.getByRole("dialog")).toContainText("恢复这份备份");
  expect((await stored(page))?.settings.name).toBe("小林");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "取消", exact: true })
    .click();
  await fileInput.setInputFiles(validFile);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认", exact: true })
    .click();
  await expect(page.getByLabel("怎么称呼你")).toHaveValue("恢复后的我");
  expect(await stored(page)).toEqual(imported);
  await fileInput.setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await expect(page.getByRole("alert")).toContainText("导入失败");
  expect(await stored(page)).toEqual(imported);
  await fileInput.setInputFiles({
    name: "wrong-schema.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ version: 999 })),
  });
  await expect(page.getByRole("alert")).toContainText("导入失败");
  expect(await stored(page)).toEqual(imported);
  await page.getByRole("button", { name: "清空数据", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "取消", exact: true })
    .click();
  expect(await stored(page)).toEqual(imported);
  await page.getByRole("button", { name: "清空数据", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认", exact: true })
    .click();
  expect(await stored(page)).toEqual(emptyBackup());
});

test("统计7/30/90天切换显示对应累计和五类趋势，空白与零记录区分", async ({
  page,
}) => {
  const backup = emptyBackup();
  backup.tasks = [
    { id: "t1", title: "今日完成", date: TODAY, completed: true },
    { id: "t2", title: "昨日未完", date: YESTERDAY, completed: false },
    { id: "t3", title: "月初完成", date: "2026-10-01", completed: true },
  ];
  backup.expenses = [
    {
      id: "e1",
      amount: 10.5,
      category: "餐饮",
      date: TODAY,
      time: "12:00",
      note: "",
    },
    {
      id: "e2",
      amount: 20,
      category: "购物",
      date: "2026-10-01",
      time: "12:00",
      note: "",
    },
    {
      id: "e3",
      amount: 30,
      category: "交通",
      date: "2026-08-27",
      time: "12:00",
      note: "",
    },
  ];
  backup.studies = [
    {
      id: "s1",
      content: "阅读",
      topic: "读书",
      minutes: 60,
      date: TODAY,
      note: "",
    },
    {
      id: "s2",
      content: "阅读",
      topic: "读书",
      minutes: 30,
      date: "2026-09-26",
      note: "",
    },
    {
      id: "s3",
      content: "阅读",
      topic: "读书",
      minutes: 10,
      date: "2026-08-17",
      note: "",
    },
  ];
  backup.weights = [
    { id: "w1", date: TODAY, value: 68 },
    { id: "w2", date: "2026-10-01", value: 69 },
  ];
  backup.meals = [
    {
      id: "m1",
      date: TODAY,
      type: "午餐",
      food: "午饭",
      quantity: "一份",
      calories: 500,
      note: "",
    },
    {
      id: "m2",
      date: YESTERDAY,
      type: "加餐",
      food: "白开水",
      quantity: "一杯",
      calories: 0,
      note: "",
    },
  ];
  await page.goto("/#analytics");
  await expect(
    page.getByRole("heading", { name: "这段时间还没有消费记录" }),
  ).toBeVisible();
  await page.evaluate(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key: KEY, data: backup },
  );
  await page.reload();
  await expect(stat(page, "总任务完成率")).toHaveText("50%");
  await expect(stat(page, "累计消费")).toHaveText("10.50元");
  await expect(stat(page, "累计学习")).toHaveText("1小时");
  await expect(
    page.getByText("记录日均 ¥ 10.50", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("2 个记录日日均 250 kcal", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /趋势图/ })).toHaveCount(5);
  await page.getByRole("button", { name: "近 30 天", exact: true }).click();
  await expect(stat(page, "总任务完成率")).toHaveText("67%");
  await expect(stat(page, "累计消费")).toHaveText("30.50元");
  await expect(stat(page, "累计学习")).toHaveText("1小时30分钟");
  await page.getByRole("button", { name: "近 90 天", exact: true }).click();
  await expect(stat(page, "累计消费")).toHaveText("60.50元");
  await expect(stat(page, "累计学习")).toHaveText("1小时40分钟");
  await expect(
    page.getByText("留白表示当天没有记录，不计作零", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "近 7 天", exact: true }).click();
  await expect(stat(page, "累计消费")).toHaveText("10.50元");
});

test("手机端八个页面可通过折叠导航访问，所有页面没有横向溢出", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const [label, hash] of [
    ["每日打卡", "tasks"],
    ["消费管理", "expenses"],
    ["学习记录", "study"],
    ["体重管理", "weight"],
    ["饮食记录", "diet"],
    ["数据统计", "analytics"],
    ["设置", "settings"],
    ["今日首页", "dashboard"],
  ]) {
    await page.getByRole("button", { name: "打开导航", exact: true }).click();
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${hash}$`));
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `${label}不应横向溢出`,
    ).toBe(true);
  }
});

test("异常本地数据不会自动覆盖，恢复副本保存后才替换；存储失败明确提示且页面仍可使用", async ({
  page,
}) => {
  const corrupt = '{"version":1,"tasks":"broken"}';
  await page.goto("/");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: KEY,
    value: corrupt,
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("本地历史数据格式异常");
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(
    corrupt,
  );
  await go(page, "设置");
  await page.reload();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(
    corrupt,
  );
  await go(page, "每日打卡");
  await addTask(page, "恢复后的第一条记录");
  const recovery = await page.evaluate(
    (key) =>
      Object.keys(localStorage)
        .filter((item) => item.startsWith(`${key}:recovery:`))
        .map((item) => localStorage.getItem(item)),
    KEY,
  );
  expect(recovery).toEqual([corrupt]);
  expect((await stored(page))?.tasks[0].title).toBe("恢复后的第一条记录");
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("模拟容量不足", "QuotaExceededError");
    };
  });
  await addTask(page, "这条记录暂未保存");
  await expect(page.getByRole("alert")).toContainText("本地保存失败");
  await expect(
    page.getByText("这条记录暂未保存", { exact: true }),
  ).toBeVisible();
  expect((await stored(page))?.tasks).toHaveLength(1);
  await page.reload();
  await expect(
    page.getByText("恢复后的第一条记录", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("这条记录暂未保存", { exact: true }),
  ).not.toBeVisible();
});
