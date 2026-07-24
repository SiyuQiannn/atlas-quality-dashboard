"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Period = "7d" | "30d" | "q";
type ViewMode = "trend" | "mix";
type DrawerRow = (typeof anomalyRows)[number];

const periods: Array<{ key: Period; label: string }> = [
  { key: "7d", label: "近 7 天" },
  { key: "30d", label: "近 30 天" },
  { key: "q", label: "本季度" },
];

const scopeOptions = ["全量队列", "队列 A", "队列 B", "队列 C"];

const periodData = {
  "7d": {
    volume: 48260,
    coverage: 93.8,
    quality: 88.6,
    efficiency: 34.2,
    trend: [84.8, 86.2, 85.6, 87.9, 87.3, 89.1, 88.6],
    labels: ["07/18", "07/19", "07/20", "07/21", "07/22", "07/23", "07/24"],
  },
  "30d": {
    volume: 186420,
    coverage: 92.4,
    quality: 87.9,
    efficiency: 35.8,
    trend: [82.1, 82.8, 83.7, 84.1, 83.9, 85.4, 86.2, 86.8, 87.1, 87.9],
    labels: ["06/25", "06/28", "07/01", "07/04", "07/07", "07/10", "07/14", "07/18", "07/21", "07/24"],
  },
  q: {
    volume: 518900,
    coverage: 89.7,
    quality: 85.4,
    efficiency: 39.1,
    trend: [78.2, 79.4, 80.8, 81.2, 82.7, 83.1, 84.0, 84.7, 85.0, 85.4],
    labels: ["05/01", "05/10", "05/20", "06/01", "06/10", "06/20", "07/01", "07/10", "07/18", "07/24"],
  },
};

const scopeTuning: Record<string, { volume: number; score: number; time: number }> = {
  全量队列: { volume: 1, score: 0, time: 0 },
  "队列 A": { volume: 0.38, score: 1.8, time: -2.1 },
  "队列 B": { volume: 0.34, score: -2.6, time: 3.4 },
  "队列 C": { volume: 0.28, score: 0.7, time: -0.6 },
};

const issueMix = [
  { label: "边界偏移", count: 428, pct: 38, tone: "violet" },
  { label: "信号缺失", count: 316, pct: 28, tone: "cyan" },
  { label: "规则冲突", count: 247, pct: 22, tone: "amber" },
  { label: "其他波动", count: 135, pct: 12, tone: "slate" },
];

const anomalyRows = [
  { id: "DEMO-0724-018", queue: "队列 B", type: "边界偏移", score: 61, duration: "01:42", owner: "演示成员 03", severity: "高" },
  { id: "DEMO-0724-014", queue: "队列 A", type: "信号缺失", score: 72, duration: "00:37", owner: "演示成员 01", severity: "中" },
  { id: "DEMO-0723-106", queue: "队列 C", type: "规则冲突", score: 68, duration: "02:18", owner: "演示成员 05", severity: "中" },
  { id: "DEMO-0723-082", queue: "队列 B", type: "边界偏移", score: 57, duration: "00:19", owner: "演示成员 02", severity: "高" },
  { id: "DEMO-0722-224", queue: "队列 A", type: "其他波动", score: 79, duration: "01:06", owner: "演示成员 04", severity: "低" },
];

const guideSteps = [
  {
    eyebrow: "01 · 全局态势",
    title: "先看懂今天发生了什么",
    text: "四个指标把规模、覆盖、质量和效率放在同一视图中，并通过基准线直接标记偏离。",
  },
  {
    eyebrow: "02 · 交叉定位",
    title: "从趋势下钻到问题结构",
    text: "时间和队列筛选会同步更新指标、趋势与异常列表，让定位路径保持一致。",
  },
  {
    eyebrow: "03 · 样本复核",
    title: "在详情中完成判断闭环",
    text: "点击任一异常记录可查看虚构样本、判定依据和处理轨迹，并模拟完成复核。",
  },
  {
    eyebrow: "04 · 作品说明",
    title: "这是一份脱敏交互原型",
    text: "页面不连接任何公司系统；名称、数值和样本均为演示数据，仅复现产品方法与操作逻辑。",
  },
];

function formatCompact(value: number) {
  return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function TrendCanvas({
  values,
  labels,
  accent = "#6d5dfc",
}: {
  values: number[];
  labels: string[];
  accent?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    const width = rect.width;
    const height = rect.height;
    const pad = { left: 42, right: 16, top: 24, bottom: 34 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const min = Math.min(...values) - 2;
    const max = Math.max(...values) + 2;
    const x = (index: number) => pad.left + (innerW * index) / Math.max(values.length - 1, 1);
    const y = (value: number) => pad.top + innerH - ((value - min) / (max - min)) * innerH;

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(29, 35, 55, 0.09)";
    ctx.fillStyle = "#8a91a6";
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "right";
    for (let i = 0; i < 4; i += 1) {
      const gy = pad.top + (innerH * i) / 3;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(width - pad.right, gy);
      ctx.stroke();
      const label = max - ((max - min) * i) / 3;
      ctx.fillText(`${label.toFixed(0)}%`, pad.left - 8, gy + 4);
    }

    const gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
    gradient.addColorStop(0, `${accent}35`);
    gradient.addColorStop(1, `${accent}00`);
    ctx.beginPath();
    values.forEach((value, index) => {
      const px = x(index);
      const py = y(value);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.lineTo(x(values.length - 1), height - pad.bottom);
    ctx.lineTo(x(0), height - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    values.forEach((value, index) => {
      const px = x(index);
      const py = y(value);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    values.forEach((value, index) => {
      ctx.beginPath();
      ctx.arc(x(index), y(value), index === values.length - 1 ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = accent;
      ctx.stroke();
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#8a91a6";
    labels.forEach((label, index) => {
      if (labels.length > 8 && index % 2 === 1 && index !== labels.length - 1) return;
      ctx.fillText(label, x(index), height - 10);
    });
  }, [accent, labels, values]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  return <canvas className="trend-canvas" ref={ref} aria-label="质量趋势折线图" role="img" />;
}

function MiniBars({ values, tone }: { values: number[]; tone: string }) {
  const max = Math.max(...values);
  return (
    <div className={`mini-bars tone-${tone}`} aria-hidden="true">
      {values.map((value, index) => (
        <i key={`${value}-${index}`} style={{ height: `${Math.max((value / max) * 100, 14)}%` }} />
      ))}
    </div>
  );
}

export default function Home() {
  const [period, setPeriod] = useState<Period>("7d");
  const [scope, setScope] = useState("全量队列");
  const [viewMode, setViewMode] = useState<ViewMode>("trend");
  const [selectedRow, setSelectedRow] = useState<DrawerRow | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [toast, setToast] = useState("");
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [issueFilter, setIssueFilter] = useState("全部类型");

  const base = periodData[period];
  const tuning = scopeTuning[scope];
  const metrics = useMemo(
    () => ({
      volume: Math.round(base.volume * tuning.volume),
      coverage: base.coverage + tuning.score * 0.42,
      quality: base.quality + tuning.score,
      efficiency: base.efficiency + tuning.time,
      trend: base.trend.map((value, index) => Number((value + tuning.score + (index % 3 === 0 ? 0.2 : 0)).toFixed(1))),
    }),
    [base, tuning],
  );

  const visibleRows = anomalyRows.filter((row) => {
    const scopeMatch = scope === "全量队列" || row.queue === scope;
    const issueMatch = issueFilter === "全部类型" || row.type === issueFilter;
    return scopeMatch && issueMatch;
  });

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const reviewSelected = () => {
    if (!selectedRow) return;
    setReviewed((current) => (current.includes(selectedRow.id) ? current : [...current, selectedRow.id]));
    setSelectedRow(null);
    showToast("已完成演示复核 · 状态仅保存在当前页面");
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => scrollTo("overview")} aria-label="返回总览">
          <span className="brand-mark">A</span>
          <span>
            <b>Atlas</b>
            <small>质量洞察台</small>
          </span>
        </button>
        <nav aria-label="主导航">
          <button className="nav-item active" onClick={() => scrollTo("overview")}>
            <span>01</span>态势总览
          </button>
          <button className="nav-item" onClick={() => scrollTo("quality")}>
            <span>02</span>质量监控
          </button>
          <button className="nav-item" onClick={() => scrollTo("anomalies")}>
            <span>03</span>异常定位
          </button>
          <button className="nav-item" onClick={() => scrollTo("project")}>
            <span>04</span>项目说明
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="pulse-dot" />
          <div>
            <b>演示环境</b>
            <p>数据更新于 2 分钟前</p>
          </div>
        </div>
        <div className="privacy-card">
          <span>DEMO ONLY</span>
          <p>全部名称、样本与数值均为虚构，不连接真实业务系统。</p>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div>
            <div className="breadcrumb">作品集 / 数据产品 / <b>交互演示</b></div>
            <h1>内容质量运营看板</h1>
          </div>
          <div className="top-actions">
            <button className="ghost-button" onClick={() => showToast("演示快照已生成 · 未包含真实文件")}>
              导出快照
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setGuideStep(0);
                setGuideOpen(true);
              }}
            >
              <span className="play-icon">▶</span> 演示导览
            </button>
            <span className="avatar" aria-label="演示账户">DE</span>
          </div>
        </header>

        <div className="content">
          <section className="hero" id="overview">
            <div className="hero-copy">
              <span className="section-kicker">OPERATION PULSE · 07/24</span>
              <h2>
                从数据波动，
                <br />
                追到<span>每一条异常样本</span>
              </h2>
              <p>
                为日常质量运营设计的一站式工作台。把监控、定位、复核与复盘串成一条可操作的数据链路。
              </p>
              <div className="hero-tags">
                <span>全局监控</span>
                <span>异常下钻</span>
                <span>样本复核</span>
              </div>
            </div>
            <div className="hero-signal" aria-label="今日运行状态">
              <div className="signal-orbit">
                <div className="signal-core">
                  <b>{metrics.quality.toFixed(1)}</b>
                  <span>质量指数</span>
                </div>
                <i className="orbit-dot dot-a" />
                <i className="orbit-dot dot-b" />
                <i className="orbit-dot dot-c" />
              </div>
              <div className="signal-caption">
                <span className="status-pill">运行平稳</span>
                <p>较昨日 <b>+1.3</b> · 高于目标线</p>
              </div>
            </div>
          </section>

          <section className="control-bar" aria-label="全局筛选">
            <div className="segment-control">
              {periods.map((item) => (
                <button
                  key={item.key}
                  className={period === item.key ? "selected" : ""}
                  onClick={() => setPeriod(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="scope-select">
              <span>观察范围</span>
              <select value={scope} onChange={(event) => setScope(event.target.value)}>
                {scopeOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <div className="filter-health">
              <i />
              筛选已同步至全页面
            </div>
          </section>

          <section className="metric-grid" aria-label="核心指标">
            <article className="metric-card metric-dark">
              <div className="metric-heading">
                <span>处理规模</span>
                <em>总量</em>
              </div>
              <strong>{formatCompact(metrics.volume)}</strong>
              <div className="metric-foot positive">↗ 12.4% <span>环比上期</span></div>
              <MiniBars values={[32, 46, 38, 62, 54, 78, 72]} tone="light" />
            </article>
            <article className="metric-card">
              <div className="metric-heading">
                <span>信号覆盖率</span>
                <em>目标 90%</em>
              </div>
              <strong>{metrics.coverage.toFixed(1)}<small>%</small></strong>
              <div className="metric-foot positive">↗ 2.1% <span>高于目标</span></div>
              <MiniBars values={[62, 66, 70, 69, 77, 83, 88]} tone="violet" />
            </article>
            <article className="metric-card">
              <div className="metric-heading">
                <span>质量指数</span>
                <em>目标 85%</em>
              </div>
              <strong>{metrics.quality.toFixed(1)}<small>%</small></strong>
              <div className="metric-foot positive">↗ 1.3% <span>较昨日</span></div>
              <MiniBars values={metrics.trend.slice(-7)} tone="cyan" />
            </article>
            <article className="metric-card">
              <div className="metric-heading">
                <span>平均处理耗时</span>
                <em>越低越好</em>
              </div>
              <strong>{metrics.efficiency.toFixed(1)}<small>s</small></strong>
              <div className="metric-foot positive">↘ 4.8% <span>效率提升</span></div>
              <MiniBars values={[76, 68, 72, 59, 52, 48, 42]} tone="amber" />
            </article>
          </section>

          <section className="panel-grid" id="quality">
            <article className="panel trend-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">QUALITY SIGNAL</span>
                  <h3>质量趋势与异常构成</h3>
                </div>
                <div className="panel-tabs">
                  <button className={viewMode === "trend" ? "active" : ""} onClick={() => setViewMode("trend")}>质量趋势</button>
                  <button className={viewMode === "mix" ? "active" : ""} onClick={() => setViewMode("mix")}>异常构成</button>
                </div>
              </div>
              {viewMode === "trend" ? (
                <>
                  <div className="chart-summary">
                    <div><span>当前</span><b>{metrics.quality.toFixed(1)}%</b></div>
                    <div><span>周期低点</span><b>{Math.min(...metrics.trend).toFixed(1)}%</b></div>
                    <div className="legend"><i />质量指数 <i className="target" />目标线 85%</div>
                  </div>
                  <TrendCanvas values={metrics.trend} labels={base.labels} />
                </>
              ) : (
                <div className="mix-view">
                  {issueMix.map((issue) => (
                    <button
                      key={issue.label}
                      className="mix-row"
                      onClick={() => {
                        setIssueFilter(issue.label);
                        scrollTo("anomalies");
                      }}
                    >
                      <span className={`mix-dot ${issue.tone}`} />
                      <b>{issue.label}</b>
                      <div className="mix-track"><i className={issue.tone} style={{ width: `${issue.pct}%` }} /></div>
                      <strong>{issue.pct}%</strong>
                      <em>{issue.count} 条</em>
                    </button>
                  ))}
                  <p className="mix-hint">点击任一类型，异常列表会自动过滤。</p>
                </div>
              )}
            </article>

            <article className="panel action-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">NEXT BEST ACTION</span>
                  <h3>今日处置优先级</h3>
                </div>
                <span className="live-badge"><i />LIVE</span>
              </div>
              <div className="action-list">
                <button onClick={() => { setScope("队列 B"); scrollTo("anomalies"); }}>
                  <span className="action-rank urgent">01</span>
                  <div><b>队列 B · 质量下探</b><p>连续 3 个观察点低于目标线</p></div>
                  <em>立即查看 →</em>
                </button>
                <button onClick={() => { setIssueFilter("边界偏移"); scrollTo("anomalies"); }}>
                  <span className="action-rank">02</span>
                  <div><b>边界偏移 · 样本聚集</b><p>占今日异常总量的 38%</p></div>
                  <em>定位样本 →</em>
                </button>
                <button onClick={() => showToast("演示提醒已记录 · 不会发送真实通知")}>
                  <span className="action-rank">03</span>
                  <div><b>复核任务 · 即将逾期</b><p>7 条样本距处理时限不足 2 小时</p></div>
                  <em>创建提醒 →</em>
                </button>
              </div>
              <div className="coverage-strip">
                <div><span>自动识别</span><b>78%</b></div>
                <div className="coverage-track"><i /></div>
                <small>其余 22% 进入人工复核队列</small>
              </div>
            </article>
          </section>

          <section className="panel table-panel" id="anomalies">
            <div className="panel-header table-title">
              <div>
                <span className="panel-kicker">ANOMALY WORKBENCH</span>
                <h3>异常样本工作台</h3>
                <p>共 {visibleRows.length} 条演示记录 · 点击行查看判定依据</p>
              </div>
              <div className="table-controls">
                <label>
                  <span>异常类型</span>
                  <select value={issueFilter} onChange={(event) => setIssueFilter(event.target.value)}>
                    <option>全部类型</option>
                    {issueMix.map((issue) => <option key={issue.label}>{issue.label}</option>)}
                  </select>
                </label>
                <button className="reset-button" onClick={() => { setScope("全量队列"); setIssueFilter("全部类型"); }}>重置</button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>样本编号</th>
                    <th>队列</th>
                    <th>异常类型</th>
                    <th>质量分</th>
                    <th>内容时长</th>
                    <th>复核角色</th>
                    <th>优先级</th>
                    <th>状态</th>
                    <th aria-label="操作" />
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} onClick={() => setSelectedRow(row)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") setSelectedRow(row); }}>
                      <td><span className="mono">{row.id}</span></td>
                      <td><span className="queue-pill">{row.queue}</span></td>
                      <td>{row.type}</td>
                      <td><span className={`score score-${row.score < 65 ? "low" : "mid"}`}>{row.score}</span></td>
                      <td className="mono">{row.duration}</td>
                      <td>{row.owner}</td>
                      <td><span className={`severity severity-${row.severity}`}>{row.severity}</span></td>
                      <td>{reviewed.includes(row.id) ? <span className="reviewed">已复核</span> : <span className="pending">待处理</span>}</td>
                      <td><button className="row-arrow" aria-label={`查看 ${row.id} 详情`}>→</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleRows.length === 0 && (
                <div className="empty-state">
                  <span>✓</span>
                  <b>当前筛选下没有异常记录</b>
                  <p>这是一个好信号，也可以重置筛选查看全部演示样本。</p>
                </div>
              )}
            </div>
          </section>

          <section className="project-section" id="project">
            <div className="project-intro">
              <span className="section-kicker">PROJECT NOTE · PRIVACY-SAFE DEMO</span>
              <h2>不展示业务秘密，<br />只展示<span>解决问题的方法</span></h2>
              <p>这份演示站点用于还原数据产品的完整思路：统一口径、识别波动、定位样本、推动处置并沉淀复盘。</p>
            </div>
            <div className="project-steps">
              <article><span>01</span><div><b>问题定义</b><p>把模糊的“质量不好”拆成可量化、可追踪的运营指标。</p></div></article>
              <article><span>02</span><div><b>指标体系</b><p>同时观察规模、覆盖、质量与效率，避免单指标误判。</p></div></article>
              <article><span>03</span><div><b>分析闭环</b><p>从汇总视图下钻至虚构样本，并记录处理状态。</p></div></article>
              <article><span>04</span><div><b>交付方式</b><p>以轻量网页承载高频工作流，让一线角色能直接使用。</p></div></article>
            </div>
          </section>

          <footer>
            <div><span className="brand-mark small">A</span><b>Atlas Demo</b></div>
            <p>Portfolio prototype · Built for interview storytelling</p>
            <span>所有数据均为模拟数据</span>
          </footer>
        </div>
      </section>

      {selectedRow && (
        <div className="drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRow(null); }}>
          <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
            <div className="drawer-top">
              <div>
                <span className="panel-kicker">SAMPLE REVIEW</span>
                <h2 id="drawer-title">样本复核详情</h2>
              </div>
              <button className="close-button" onClick={() => setSelectedRow(null)} aria-label="关闭详情">×</button>
            </div>
            <div className="drawer-id">
              <span className="mono">{selectedRow.id}</span>
              <span className={`severity severity-${selectedRow.severity}`}>{selectedRow.severity}优先级</span>
            </div>
            <div className="drawer-metrics">
              <div><span>质量分</span><b>{selectedRow.score}</b></div>
              <div><span>内容时长</span><b>{selectedRow.duration}</b></div>
              <div><span>异常类型</span><b>{selectedRow.type}</b></div>
            </div>
            <section className="sample-preview">
              <div className="preview-header">
                <span>虚构内容预览</span>
                <span className="privacy-label">已脱敏</span>
              </div>
              <div className="fake-media">
                <span className="play-large">▶</span>
                <div className="media-wave">
                  {[22, 46, 34, 68, 42, 78, 54, 31, 64, 48, 72, 38, 56, 28, 63, 44, 74, 36].map((value, index) => (
                    <i key={`${value}-${index}`} style={{ height: `${value}%` }} />
                  ))}
                </div>
                <span className="mono media-time">00:24 / {selectedRow.duration}</span>
              </div>
              <div className="range-line"><i /><b style={{ left: "22%", width: "31%" }} /></div>
            </section>
            <section className="evidence">
              <h3>判定依据</h3>
              <div className="evidence-card">
                <span className="evidence-tag">规则信号</span>
                <p>示例信号在 00:24–00:56 区间发生明显偏移，与基准边界相差 3.2 秒。</p>
              </div>
              <div className="evidence-card">
                <span className="evidence-tag model">模型建议</span>
                <p>建议缩短区间并进入二次复核。该结论仅用于演示交互，不代表真实判断。</p>
              </div>
            </section>
            <section className="timeline">
              <h3>处理轨迹</h3>
              <div><i className="done" /><b>系统识别异常</b><span>09:42</span></div>
              <div><i className="done" /><b>进入复核队列</b><span>09:43</span></div>
              <div><i /><b>等待人工确认</b><span>当前</span></div>
            </section>
            <div className="drawer-actions">
              <button className="ghost-button" onClick={() => setSelectedRow(null)}>暂不处理</button>
              <button className="primary-button" onClick={reviewSelected}>标记已复核</button>
            </div>
          </aside>
        </div>
      )}

      {guideOpen && (
        <div className="guide-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGuideOpen(false); }}>
          <section className="guide-card" role="dialog" aria-modal="true" aria-labelledby="guide-title">
            <button className="close-button guide-close" onClick={() => setGuideOpen(false)} aria-label="关闭导览">×</button>
            <div className="guide-progress">
              {guideSteps.map((_, index) => <i key={index} className={index <= guideStep ? "active" : ""} />)}
            </div>
            <div className="guide-number">{String(guideStep + 1).padStart(2, "0")}</div>
            <span className="section-kicker">{guideSteps[guideStep].eyebrow}</span>
            <h2 id="guide-title">{guideSteps[guideStep].title}</h2>
            <p>{guideSteps[guideStep].text}</p>
            <div className="guide-actions">
              <button
                className="ghost-button"
                onClick={() => setGuideStep((current) => Math.max(0, current - 1))}
                disabled={guideStep === 0}
              >
                上一步
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  if (guideStep === guideSteps.length - 1) {
                    setGuideOpen(false);
                    scrollTo("quality");
                  } else {
                    setGuideStep((current) => current + 1);
                  }
                }}
              >
                {guideStep === guideSteps.length - 1 ? "开始体验" : "下一步"}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
