import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  CircleCheck,
  Wallet,
  BookOpen,
  Scale,
  Utensils,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  Menu,
  X,
  ArrowUpRight,
  ShieldCheck,
  Check,
  Leaf,
} from "lucide-react";
import type { PageId, PageProps } from "./lib/types";
import { today, formatDate, useLocalData } from "./lib/data";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Expenses from "./pages/Expenses";
import Study from "./pages/Study";
import Weight from "./pages/Weight";
import Diet from "./pages/Diet";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
const navigation = [
  { id: "dashboard", label: "今日首页", icon: LayoutDashboard },
  { id: "tasks", label: "每日打卡", icon: CircleCheck },
  { id: "expenses", label: "消费管理", icon: Wallet },
  { id: "study", label: "学习记录", icon: BookOpen },
  { id: "weight", label: "体重管理", icon: Scale },
  { id: "diet", label: "饮食记录", icon: Utensils },
  { id: "analytics", label: "数据统计", icon: ChartNoAxesCombined },
  { id: "settings", label: "设置", icon: SettingsIcon },
] as const;
const pages: Record<PageId, (props: PageProps) => React.ReactNode> = {
  dashboard: Dashboard,
  tasks: Tasks,
  expenses: Expenses,
  study: Study,
  weight: Weight,
  diet: Diet,
  analytics: Analytics,
  settings: Settings,
};
function hashPage(): PageId {
  const id = window.location.hash.slice(1);
  return navigation.some((item) => item.id === id)
    ? (id as PageId)
    : "dashboard";
}
export default function App() {
  const { data, update, storageError } = useLocalData();
  const [page, setPage] = useState<PageId>(hashPage);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(
    null,
  );
  const [currentDate, setCurrentDate] = useState(today);
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentDate(today()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const change = () => {
      setPage(hashPage());
      setMobileOpen(false);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    document.title = `${navigation.find((item) => item.id === page)?.label} · 日常 Daykeep`;
    window.scrollTo(0, 0);
  }, [page]);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  const navigate = useCallback((next: PageId) => {
    window.location.hash = next;
    setPage(next);
    setMobileOpen(false);
  }, []);
  const notify = useCallback(
    (message: string) => setToast({ message, id: Date.now() }),
    [],
  );
  const CurrentPage = pages[page];
  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        跳到主要内容
      </a>
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          aria-label="关闭导航"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${mobileOpen ? "open" : ""}`}
        aria-label="主要导航"
      >
        <button
          className="brand"
          onClick={() => navigate("dashboard")}
          aria-label="日常 Daykeep 首页"
        >
          <span className="brand-mark">
            <Check size={25} strokeWidth={3} />
          </span>
          <span>
            日常<span className="brand-english">DAYKEEP</span>
          </span>
        </button>
        <button
          className="mobile-close btn icon ghost"
          onClick={() => setMobileOpen(false)}
          aria-label="关闭导航"
        >
          <X size={20} />
        </button>
        <div className="workspace-label">
          我的生活空间 <span>PERSONAL</span>
        </div>
        <nav>
          {navigation.map((item, index) => (
            <div key={item.id}>
              {index === 6 && <div className="nav-divider" />}
              <a
                href={`#${item.id}`}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                aria-current={page === item.id ? "page" : undefined}
                onClick={() => {
                  setPage(item.id);
                  setMobileOpen(false);
                }}
              >
                <item.icon size={19} strokeWidth={1.7} />
                <span>{item.label}</span>
                {page === item.id && <span className="nav-active-dot" />}
              </a>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="slow-card">
            <Leaf size={21} />
            <p>
              把注意力，
              <br />
              留给自己的生活。
            </p>
            <span>A LITTLE BETTER, EVERY DAY</span>
          </div>
          <button className="user-profile" onClick={() => navigate("settings")}>
            <span className="avatar">
              {(data.settings.name || "我").slice(0, 1)}
            </span>
            <span>
              <b>{data.settings.name || "生活记录者"}</b>
              <small>记录生活，也照顾自己</small>
            </span>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="btn icon ghost mobile-menu"
              aria-label="打开导航"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span>我的空间</span>
            <span className="breadcrumb-slash">/</span>
            <strong>
              {navigation.find((item) => item.id === page)?.label}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="privacy-tag">
              <ShieldCheck size={14} /> 数据仅存于此浏览器
            </span>
            <span className="topbar-date">
              {formatDate(currentDate, {
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </span>
            <span className="topbar-avatar">
              {(data.settings.name || "我").slice(0, 1)}
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} key={`${page}-${currentDate}`}>
          {storageError && (
            <div className="storage-alert" role="alert">
              {storageError} 请到设置导出备份，避免丢失记录。
            </div>
          )}
          <CurrentPage
            data={data}
            update={update}
            notify={notify}
            navigate={navigate}
          />
          <footer className="page-footer">
            <span>日常 DAYKEEP</span>
            <span>不必完美，有在慢慢变好就很好。</span>
            <span>MADE FOR YOUR EVERYDAY</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div key={toast.id} className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
