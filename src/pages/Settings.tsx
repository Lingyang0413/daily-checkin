import { useEffect, useRef, useState } from "react";
import {
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  Database,
  Sparkles,
  HardDrive,
  Save,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import type { AppData, PageProps } from "../lib/types";
import { demoData, emptyData, today, validateData } from "../lib/data";
import { Card, ConfirmDialog, Field, PageHeader } from "../components/ui";
export default function Settings({ data, update, notify }: PageProps) {
  const [settings, setSettings] = useState(data.settings);
  const [confirm, setConfirm] = useState<"clear" | "demo" | "import" | null>(
    null,
  );
  const [importData, setImportData] = useState<AppData | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setSettings(data.settings), [data.settings]);
  const total =
    data.tasks.length +
    data.expenses.length +
    data.studies.length +
    data.weights.length +
    data.meals.length;
  const bytes = new Blob([JSON.stringify(data)]).size;
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `daykeep-backup-${today()}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("备份已导出，请妥善保存文件");
  }
  async function readFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("备份文件过大，请选择小于 20 MB 的 JSON 文件。");
      const next = validateData(JSON.parse(await file.text()));
      setImportData(next);
      setConfirm("import");
    } catch (err) {
      setError(
        err instanceof Error
          ? `导入失败：${err.message}`
          : "备份文件无法读取，请选择有效的 Daykeep JSON 备份。",
      );
    }
    if (inputRef.current) inputRef.current.value = "";
  }
  function apply() {
    if (confirm === "clear") {
      update(() => emptyData());
      notify("全部记录已清空");
    }
    if (confirm === "demo") {
      update(() => demoData());
      notify("已载入示例数据，可以体验各项功能");
    }
    if (confirm === "import" && importData) {
      update(() => importData);
      notify("备份已导入，欢迎回来");
    }
    setConfirm(null);
    setImportData(null);
  }
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="MAKE IT YOUR OWN"
        title="设置"
        description="照顾好你的记录，也让这个空间更像你。"
      />
      <div className="settings-layout">
        <div className="page-stack">
          <Card
            title="个人偏好"
            description="一点小设置，让每天的记录更顺手"
            action={<SlidersHorizontal size={18} className="muted" />}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = settings.name.trim();
                if (!name) return;
                update((current) => ({
                  ...current,
                  settings: { ...settings, name },
                }));
                notify("个人偏好已保存");
              }}
            >
              <Field label="怎么称呼你">
                <input
                  className="input"
                  value={settings.name}
                  maxLength={24}
                  required
                  placeholder="你的名字或昵称"
                  onChange={(e) =>
                    setSettings({ ...settings, name: e.target.value })
                  }
                />
              </Field>
              <div className="form-grid">
                <Field
                  label="每日学习目标（分钟）"
                  hint="给自己定一个容易开始的小目标"
                >
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    required
                    value={settings.dailyStudyGoal}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dailyStudyGoal: Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field
                  label="每日热量记录参考（kcal）"
                  hint="仅用于对比记录，可按个人需要调整"
                >
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="20000"
                    step="1"
                    required
                    value={settings.dailyCalorieGoal}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dailyCalorieGoal: Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </div>
              <div className="form-actions">
                <button className="btn primary" type="submit">
                  <Save size={16} />
                  保存偏好
                </button>
              </div>
            </form>
          </Card>
          <Card
            title="数据与备份"
            description="建议定期导出，给珍贵的日常多一份保障"
          >
            <div className="settings-row">
              <span className="setting-icon">
                <Download size={21} />
              </span>
              <div>
                <h3>导出全部数据</h3>
                <p>下载 JSON 备份，包含所有记录和个人设置。</p>
              </div>
              <button className="btn secondary" onClick={exportData}>
                <Download size={15} />
                导出备份
              </button>
            </div>
            <div className="settings-row">
              <span className="setting-icon blue">
                <Upload size={21} />
              </span>
              <div>
                <h3>从备份恢复</h3>
                <p>导入 Daykeep JSON 文件，会替换当前所有记录。</p>
              </div>
              <button
                className="btn secondary"
                onClick={() => inputRef.current?.click()}
              >
                <Upload size={15} />
                导入备份
              </button>
              <input
                type="file"
                accept=".json,application/json"
                className="sr-only"
                ref={inputRef}
                aria-label="选择备份文件"
                onChange={(e) => void readFile(e.target.files?.[0])}
              />
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="settings-row">
              <span className="setting-icon orange">
                <Sparkles size={21} />
              </span>
              <div>
                <h3>体验示例数据</h3>
                <p>用一组 7 天的示例，看看记录积累起来的样子。</p>
              </div>
              <button
                className="btn secondary"
                onClick={() => setConfirm("demo")}
              >
                载入示例
              </button>
            </div>
            <div className="settings-row danger-zone">
              <span className="setting-icon red">
                <Trash2 size={21} />
              </span>
              <div>
                <h3>清空全部数据</h3>
                <p>删除所有记录并重置设置，此操作无法撤销。</p>
              </div>
              <button
                className="btn danger-outline"
                onClick={() => setConfirm("clear")}
              >
                清空数据
              </button>
            </div>
          </Card>
        </div>
        <div className="page-stack">
          <Card className="privacy-card">
            <span className="privacy-shield">
              <ShieldCheck size={29} />
            </span>
            <h2>
              你的日常，
              <br />
              只属于你。
            </h2>
            <p>
              无需注册，记录保存在当前设备的浏览器中。这个版本不向服务器上传你的生活数据。
            </p>
            <ul className="privacy-list">
              <li>
                <Check size={15} />
                无需账号与登录
              </li>
              <li>
                <Check size={15} />
                关闭网页后记录仍保留
              </li>
              <li>
                <Check size={15} />
                随时导出与恢复
              </li>
            </ul>
            <div className="privacy-note">
              清理浏览器数据、使用隐私模式或更换设备可能导致记录丢失。请定期导出备份；本版本暂不支持云端同步。
            </div>
          </Card>
          <Card title="当前存储">
            <div className="storage-stat">
              <Database size={19} />
              <span>记录数量</span>
              <b>
                {total} <small>条</small>
              </b>
            </div>
            <div className="storage-stat">
              <HardDrive size={19} />
              <span>数据大小</span>
              <b>
                {(bytes / 1024).toFixed(1)} <small>KB</small>
              </b>
            </div>
            <p className="inline-note">应用版本 1.0 · 本地存储版本 v1</p>
          </Card>
        </div>
      </div>
      {confirm && (
        <ConfirmDialog
          title={
            confirm === "clear"
              ? "确认清空全部数据？"
              : confirm === "demo"
                ? "载入示例数据？"
                : "恢复这份备份？"
          }
          description={
            confirm === "clear"
              ? "所有任务、消费、学习、体重、饮食记录和设置都将删除。请先导出备份，此操作无法撤销。"
              : confirm === "demo"
                ? `示例数据将替换当前的 ${total} 条记录和设置。它们只用于体验，不代表你的真实记录。建议先导出备份。`
                : "备份中的全部记录和设置将替换当前数据。建议先导出现有数据。"
          }
          onConfirm={apply}
          onClose={() => {
            setConfirm(null);
            setImportData(null);
          }}
        />
      )}
    </div>
  );
}
