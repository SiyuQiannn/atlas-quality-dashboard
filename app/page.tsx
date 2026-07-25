"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MainTab = "base" | "quality" | "strategy";
type BaseView = "overview" | "labels" | "element" | "cluster";
type QualityView = "metrics" | "duration";
type StrategyStep = "discover" | "define" | "solve" | "monitor";
type MonitorView = "quality" | "attribution" | "efficiency";
type StrategyId = "A" | "B";
type DrillDimension = "label" | "team" | "channel";
type DominanceMode = "asr" | "manual";
type ElementStat = "mean" | "max" | "min";
type Sample = (typeof strategySamples)[number];
type Definition = { viewed: boolean; category: string; record: string };
type ChartSeries = { name: string; color: string; values: number[] };

const mainTabs: Array<{ id: MainTab; index: string; label: string; desc: string }> = [
  { id: "base", index: "01", label: "基础数据", desc: "规模与分布" },
  { id: "quality", index: "02", label: "质量数据", desc: "准确与差异" },
  { id: "strategy", index: "03", label: "策略数据", desc: "发现到解决" },
];

const baseViews: Array<{ id: BaseView; label: string; hint: string }> = [
  { id: "overview", label: "数据概览", hint: "规模、信号与维度" },
  { id: "labels", label: "标签分布分析", hint: "主导类型与迁移" },
  { id: "element", label: "单元素分析", hint: "多片段异常" },
  { id: "cluster", label: "片段聚类数据", hint: "时长与区间" },
];

const qualityViews: Array<{ id: QualityView; label: string; hint: string }> = [
  { id: "metrics", label: "质量指标", hint: "趋势、热力与差错" },
  { id: "duration", label: "异常时长片段", hint: "过长、过短与合理性" },
];

const strategySteps: Array<{ id: StrategyStep; index: string; label: string; hint: string }> = [
  { id: "discover", index: "01", label: "异常发现", hint: "建批次 · 跑策略 · 捞样本" },
  { id: "define", index: "02", label: "问题定义", hint: "看录屏 · 归因 · 提交快照" },
  { id: "solve", index: "03", label: "问题解决", hint: "聚合问题 · 推进 · 沉淀" },
  { id: "monitor", index: "04", label: "数据监测", hint: "质量 · 归因 · 效率" },
];

const labels7d = ["07/18", "07/19", "07/20", "07/21", "07/22", "07/23", "07/24"];

const baseRows = [
  { label: "标签组 A-01", channel: "队列 02", segments: 12840, manual: 4780, asr: 8060, frame: 182, ocr: 314, elements: 6210 },
  { label: "标签组 B-04", channel: "队列 01", segments: 10926, manual: 3933, asr: 6993, frame: 96, ocr: 205, elements: 5748 },
  { label: "标签组 C-02", channel: "队列 04", segments: 8942, manual: 5044, asr: 3898, frame: 135, ocr: 278, elements: 4316 },
  { label: "标签组 A-07", channel: "队列 03", segments: 7816, manual: 2110, asr: 5706, frame: 72, ocr: 116, elements: 3982 },
  { label: "标签组 D-03", channel: "队列 02", segments: 6690, manual: 3712, asr: 2978, frame: 54, ocr: 147, elements: 3481 },
];

const overviewDrillRows: Record<DrillDimension, Array<{ name: string; secondary: string; segments: number; manual: number; asr: number; frame: number; ocr: number; elements: number; feature: string }>> = {
  label: baseRows.map((row) => ({
    name: row.label,
    secondary: row.channel,
    segments: row.segments,
    manual: row.manual,
    asr: row.asr,
    frame: row.frame,
    ocr: row.ocr,
    elements: row.elements,
    feature: row.asr / row.segments >= 0.7 ? "ASR 主导" : row.manual / row.segments >= 0.7 ? "纯人工主导" : "无明显分布",
  })),
  team: [
    { name: "团队 A", secondary: "4 个通道", segments: 192840, manual: 76840, asr: 116000, frame: 12940, ocr: 9680, elements: 84210, feature: "ASR 主导" },
    { name: "团队 B", secondary: "3 个通道", segments: 168420, manual: 82160, asr: 86260, frame: 10820, ocr: 7340, elements: 71680, feature: "均衡分布" },
    { name: "团队 C", secondary: "4 个通道", segments: 174960, manual: 73640, asr: 101320, frame: 11760, ocr: 8120, elements: 76540, feature: "ASR 主导" },
    { name: "团队 D", secondary: "2 个通道", segments: 151780, manual: 74260, asr: 77520, frame: 9420, ocr: 6950, elements: 63570, feature: "均衡分布" },
  ],
  channel: [
    { name: "通道 01", secondary: "4 个团队", segments: 186420, manual: 69420, asr: 117000, frame: 13840, ocr: 8750, elements: 80620, feature: "ASR 主导" },
    { name: "通道 02", secondary: "4 个团队", segments: 178960, manual: 88560, asr: 90400, frame: 10420, ocr: 7920, elements: 74680, feature: "均衡分布" },
    { name: "通道 03", secondary: "3 个团队", segments: 164780, manual: 68420, asr: 96360, frame: 11360, ocr: 7140, elements: 69840, feature: "ASR 主导" },
    { name: "通道 04", secondary: "3 个团队", segments: 157840, manual: 80480, asr: 77360, frame: 9320, ocr: 8280, elements: 70860, feature: "均衡分布" },
  ],
};

const labelGroups = [
  { label: "标签组 A-01", previousKind: "无明显分布", currentKind: "ASR 主导", current: 81, previous: 64, volume: 12840, previousSegments: 10820, currentSegments: 12840 },
  { label: "标签组 B-04", previousKind: "ASR 主导", currentKind: "ASR 主导", current: 76, previous: 79, volume: 10926, previousSegments: 9980, currentSegments: 10926 },
  { label: "标签组 C-02", previousKind: "无明显分布", currentKind: "纯人工主导", current: 72, previous: 61, volume: 8942, previousSegments: 7620, currentSegments: 8942 },
  { label: "标签组 D-03", previousKind: "纯人工主导", currentKind: "纯人工主导", current: 70, previous: 73, volume: 6690, previousSegments: 6380, currentSegments: 6690 },
  { label: "标签组 A-07", previousKind: "ASR 主导", currentKind: "无明显分布", current: 58, previous: 72, volume: 7816, previousSegments: 7040, currentSegments: 7816 },
  { label: "标签组 E-05", previousKind: "纯人工主导", currentKind: "无明显分布", current: 54, previous: 71, volume: 5240, previousSegments: 4810, currentSegments: 5240 },
];

const concentricRows = [
  { mode: "asr", layer: "内层", label: "标签组 A-01", global: "ASR 主导", dominantChannels: "4 / 4", elements: 6210, segments: 12840 },
  { mode: "asr", layer: "内层", label: "标签组 B-04", global: "ASR 主导", dominantChannels: "4 / 4", elements: 5748, segments: 10926 },
  { mode: "asr", layer: "中层", label: "标签组 A-07", global: "ASR 主导", dominantChannels: "3 / 4", elements: 3982, segments: 7816 },
  { mode: "asr", layer: "外层", label: "标签组 F-02", global: "无明显分布", dominantChannels: "1 / 4", elements: 3320, segments: 6410 },
  { mode: "manual", layer: "内层", label: "标签组 C-02", global: "纯人工主导", dominantChannels: "4 / 4", elements: 4316, segments: 8942 },
  { mode: "manual", layer: "中层", label: "标签组 D-03", global: "纯人工主导", dominantChannels: "3 / 4", elements: 3481, segments: 6690 },
  { mode: "manual", layer: "外层", label: "标签组 E-05", global: "无明显分布", dominantChannels: "2 / 4", elements: 2840, segments: 5240 },
];

const elementRows = [
  { id: "EL-2407-017", label: "标签组 A-01", segments: 9, average: 1.8, deviation: "+4.2σ", type: "ASR", status: "高风险" },
  { id: "EL-2407-084", label: "标签组 C-02", segments: 7, average: 1.6, deviation: "+3.7σ", type: "手打", status: "高风险" },
  { id: "EL-2407-126", label: "标签组 B-04", segments: 6, average: 1.5, deviation: "+3.1σ", type: "ASR", status: "关注" },
  { id: "EL-2407-203", label: "标签组 D-03", segments: 5, average: 1.7, deviation: "+2.4σ", type: "手打", status: "关注" },
  { id: "EL-2407-271", label: "标签组 A-07", segments: 4, average: 1.4, deviation: "+2.1σ", type: "ASR", status: "观察" },
];

const qualityMetrics = {
  iou: { label: "IoU", value: "86.4%", delta: "+2.1%", color: "#2448a8", values: [80.2, 82.8, 81.9, 84.6, 85.1, 87.2, 86.4] },
  correct: { label: "正确打标率", value: "92.7%", delta: "+1.3%", color: "#008f83", values: [89.1, 89.8, 90.6, 91.2, 91.0, 92.1, 92.7] },
  repeat: { label: "简单重复差异", value: "1.8%", delta: "-0.6%", color: "#c47a15", values: [3.8, 3.4, 3.1, 2.9, 2.6, 2.2, 1.8] },
  time: { label: "平均审核耗时", value: "41.6s", delta: "-3.2s", color: "#7358a6", values: [48.6, 47.2, 46.8, 45.1, 44.7, 42.9, 41.6] },
};

const heatmap = [
  [94, 91, 89, 93],
  [92, 86, 90, 88],
  [89, 84, 87, 91],
  [93, 88, 92, 85],
];

const durationRows = [
  { id: "DUR-0241", label: "标签组 C-02", channel: "队列 04", type: "超长", duration: "148s / 152s", ratio: "97.4%", reason: "不合理", count: 8 },
  { id: "DUR-0318", label: "标签组 A-01", channel: "队列 02", type: "超短", duration: "1.1s / 96s", ratio: "1.1%", reason: "不合理", count: 6 },
  { id: "DUR-0412", label: "标签组 E-05", channel: "队列 01", type: "超长", duration: "84s / 88s", ratio: "95.5%", reason: "合理", count: 5 },
  { id: "DUR-0527", label: "标签组 B-04", channel: "队列 03", type: "超短", duration: "1.8s / 43s", ratio: "4.2%", reason: "合理", count: 4 },
  { id: "DUR-0684", label: "标签组 D-03", channel: "队列 02", type: "超长", duration: "202s / 211s", ratio: "95.7%", reason: "不合理", count: 3 },
];

const strategySamples = [
  { id: "S-2407-01", label: "标签组 A-03", auditor: "审核员 02", channel: "队列 02", signal: "ASR 少数位置", marker: "ASR + 片段", duration: "02:14", segments: 5, risk: "高" },
  { id: "S-2407-02", label: "标签组 A-03", auditor: "审核员 07", channel: "队列 04", signal: "手打少数位置", marker: "片段 + OCR", duration: "01:48", segments: 4, risk: "中" },
  { id: "S-2407-03", label: "标签组 C-08", auditor: "审核员 04", channel: "队列 02", signal: "ASR 少数位置", marker: "ASR + 视频帧", duration: "03:06", segments: 6, risk: "高" },
  { id: "S-2407-04", label: "标签组 D-02", auditor: "审核员 11", channel: "队列 01", signal: "手打少数位置", marker: "片段", duration: "00:54", segments: 3, risk: "中" },
  { id: "S-2407-05", label: "标签组 B-06", auditor: "审核员 09", channel: "队列 03", signal: "ASR 少数位置", marker: "ASR + OCR", duration: "02:31", segments: 4, risk: "低" },
  { id: "S-2407-06", label: "标签组 E-01", auditor: "审核员 13", channel: "队列 04", signal: "手打少数位置", marker: "片段 + 视频帧", duration: "01:21", segments: 5, risk: "高" },
];

const initialDefinitions: Record<string, Definition> = {
  "S-2407-01": { viewed: true, category: "产品问题", record: "识别信号未在复核视图中完整展开" },
  "S-2407-02": { viewed: true, category: "人审执行问题", record: "未按操作顺序展开信号后再选择片段" },
  "S-2407-03": { viewed: false, category: "产品问题", record: "识别信号未在复核视图中完整展开" },
  "S-2407-04": { viewed: true, category: "规则问题", record: "当前规则对组合信号的优先级描述不明确" },
};

const problemCategories = ["产品问题", "人审执行问题", "人审理解问题", "规则问题", "SOP 不清晰", "SOP / 规则变更", "无问题"];

const quickTemplates = [
  { category: "产品问题", record: "识别信号未在复核视图中完整展开" },
  { category: "人审执行问题", record: "未按操作顺序展开信号后再选择片段" },
  { category: "人审理解问题", record: "对多信号并存时的标记优先级理解有偏差" },
  { category: "规则问题", record: "当前规则对组合信号的优先级描述不明确" },
];

const strategyCopy = {
  A: {
    title: "策略 A · 少数位置分布",
    summary: "识别与标签主导标记方式相反的少数样本，定位不稳定的审核行为。",
    rule: "标签样本量 ≥ 20，主导方式占比 ≥ 70%，抽取相反方式样本",
    hits: "12 个异常标签 · 86 条候选样本",
  },
  B: {
    title: "策略 B · 多片段异常",
    summary: "识别同元素、同标签下片段数量显著偏高的案例，区分产品与人审问题。",
    rule: "同元素 + 同标签，片段数 > 3，并排除已确认的合理重复",
    hits: "18 个异常元素 · 64 条候选样本",
  },
};

function number(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function LineChart({
  series,
  labels = labels7d,
  suffix = "%",
  minValue,
}: {
  series: ChartSeries[];
  labels?: string[];
  suffix?: string;
  minValue?: number;
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
    const pad = { left: 44, right: 18, top: 25, bottom: 36 };
    const values = series.flatMap((item) => item.values);
    const min = minValue ?? Math.floor(Math.min(...values) - 3);
    const max = Math.ceil(Math.max(...values) + 3);
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const x = (index: number) => pad.left + (index * innerW) / Math.max(labels.length - 1, 1);
    const y = (value: number) => pad.top + innerH - ((value - min) / Math.max(max - min, 1)) * innerH;

    ctx.clearRect(0, 0, width, height);
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "right";
    for (let index = 0; index < 4; index += 1) {
      const gy = pad.top + (innerH * index) / 3;
      ctx.strokeStyle = "rgba(44, 50, 72, .09)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(width - pad.right, gy);
      ctx.stroke();
      ctx.fillStyle = "#98a0b5";
      const value = max - ((max - min) * index) / 3;
      ctx.fillText(`${value.toFixed(suffix === "%" ? 0 : 1)}${suffix}`, pad.left - 8, gy + 4);
    }

    series.forEach((item) => {
      const gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
      gradient.addColorStop(0, `${item.color}2f`);
      gradient.addColorStop(1, `${item.color}00`);
      ctx.beginPath();
      item.values.forEach((value, index) => {
        if (index === 0) ctx.moveTo(x(index), y(value));
        else ctx.lineTo(x(index), y(value));
      });
      ctx.lineTo(x(item.values.length - 1), height - pad.bottom);
      ctx.lineTo(x(0), height - pad.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      item.values.forEach((value, index) => {
        if (index === 0) ctx.moveTo(x(index), y(value));
        else ctx.lineTo(x(index), y(value));
      });
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      item.values.forEach((value, index) => {
        ctx.beginPath();
        ctx.arc(x(index), y(value), index === item.values.length - 1 ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });

    ctx.fillStyle = "#98a0b5";
    ctx.textAlign = "center";
    labels.forEach((label, index) => ctx.fillText(label, x(index), height - 10));
  }, [labels, minValue, series, suffix]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  return (
    <div className="line-chart-frame">
      <div className="chart-legend">
        {series.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}
      </div>
      <canvas ref={ref} className="line-chart" role="img" aria-label={`${series.map((item) => item.name).join("、")}趋势图`} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  delta,
  detail,
  tone = "violet",
}: {
  label: string;
  value: string;
  delta?: string;
  detail: string;
  tone?: string;
}) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-top"><span>{label}</span><i /></div>
      <strong>{value}</strong>
      <p>{delta && <b className={delta.startsWith("-") ? "down" : "up"}>{delta}</b>} {detail}</p>
    </article>
  );
}

function PanelTitle({
  kicker,
  title,
  text,
  action,
}: {
  kicker: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="panel-title">
      <div>
        <span>{kicker}</span>
        <h3>{title}</h3>
        {text && <p>{text}</p>}
      </div>
      {action}
    </header>
  );
}

function EmptyDemo({ text }: { text: string }) {
  return <div className="empty-demo"><span>✓</span><b>{text}</b><p>调整筛选条件可查看其他记录。</p></div>;
}

function ModuleHeader({
  index,
  title,
  text,
  tag,
}: {
  index: string;
  title: string;
  text: string;
  tag: string;
}) {
  return (
    <header className="module-header">
      <div className="module-number">{index}</div>
      <div>
        <span>{tag}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </header>
  );
}

export default function Home() {
  const [mainTab, setMainTab] = useState<MainTab>("base");
  const [baseView, setBaseView] = useState<BaseView>("overview");
  const [qualityView, setQualityView] = useState<QualityView>("metrics");
  const [strategyStep, setStrategyStep] = useState<StrategyStep>("discover");
  const [baseDrillDimension, setBaseDrillDimension] = useState<DrillDimension>("label");
  const [dominanceMode, setDominanceMode] = useState<DominanceMode>("asr");
  const [elementStat, setElementStat] = useState<ElementStat>("mean");
  const [monitorView, setMonitorView] = useState<MonitorView>("quality");
  const [strategyId, setStrategyId] = useState<StrategyId>("A");
  const [metricKey, setMetricKey] = useState<keyof typeof qualityMetrics>("iou");
  const [durationReason, setDurationReason] = useState("全部");
  const [checkedSamples, setCheckedSamples] = useState<string[]>(["S-2407-01", "S-2407-02", "S-2407-03", "S-2407-04"]);
  const [trackedSamples, setTrackedSamples] = useState<string[]>(["S-2407-01", "S-2407-02", "S-2407-03", "S-2407-04"]);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [definitions, setDefinitions] = useState<Record<string, Definition>>(initialDefinitions);
  const [submissions, setSubmissions] = useState([
    { id: 1, time: "07/22 16:40", count: 3, note: "第 1 版 · 已同步跟台结果" },
  ]);
  const [resolutionIndex, setResolutionIndex] = useState<Record<string, number>>({});
  const [solutionTab, setSolutionTab] = useState<"batch" | "global">("batch");
  const [globalStatus, setGlobalStatus] = useState<Record<string, string>>({
    "G-001": "已解决",
    "G-002": "未解决",
    "G-003": "处理中",
  });
  const [toast, setToast] = useState("");

  const activeMetric = qualityMetrics[metricKey];
  const tracked = strategySamples.filter((sample) => trackedSamples.includes(sample.id));
  const filteredDurationRows = durationRows.filter((row) => durationReason === "全部" || row.reason === durationReason);

  const problems = useMemo(() => {
    const grouped = new Map<string, { key: string; category: string; record: string; sampleIds: string[] }>();
    trackedSamples.forEach((sampleId) => {
      const definition = definitions[sampleId];
      if (!definition?.category || !definition.record || definition.category === "无问题") return;
      const key = `${definition.category}__${definition.record}`;
      const current = grouped.get(key) ?? { key, category: definition.category, record: definition.record, sampleIds: [] };
      current.sampleIds.push(sampleId);
      grouped.set(key, current);
    });
    return Array.from(grouped.values());
  }, [definitions, trackedSamples]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const switchMain = (tab: MainTab) => {
    setMainTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectModule = (tab: MainTab, id: string) => {
    setMainTab(tab);
    if (tab === "base") setBaseView(id.replace("base-", "") as BaseView);
    if (tab === "quality") setQualityView(id.replace("quality-", "") as QualityView);
    if (tab === "strategy") setStrategyStep(id.replace("strategy-", "") as StrategyStep);
    window.setTimeout(() => {
      const target = document.getElementById(id);
      if (!target) return;
      const fixedNavigationHeight = window.innerWidth <= 980 ? 96 : 172;
      const top = target.getBoundingClientRect().top + window.scrollY - fixedNavigationHeight;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, 60);
  };

  const updateDefinition = (sampleId: string, patch: Partial<Definition>) => {
    setDefinitions((current) => ({
      ...current,
      [sampleId]: { viewed: false, category: "", record: "", ...current[sampleId], ...patch },
    }));
  };

  const addTrackedSamples = () => {
    setTrackedSamples((current) => Array.from(new Set([...current, ...checkedSamples])));
    showToast(`已将 ${checkedSamples.length} 条样本加入跟台池`);
  };

  const submitDefinitions = () => {
    const completed = tracked.filter((sample) => definitions[sample.id]?.category && definitions[sample.id]?.record).length;
    setSubmissions((current) => [
      ...current,
      { id: current.length + 1, time: "刚刚", count: completed, note: `第 ${current.length + 1} 版 · 完整快照` },
    ]);
    showToast(`已提交 ${completed} 条问题定义，历史版本已保留`);
  };

  const getFlow = (category: string) =>
    category.includes("人审")
      ? ["待宣讲", "已宣讲", "已扣分 / 完成"]
      : ["待移交", "已移交", "全局池处理中", "已解决"];

  const refreshDashboard = () => {
    setMainTab("base");
    setBaseView("overview");
    setQualityView("metrics");
    setStrategyStep("discover");
    setBaseDrillDimension("label");
    setDominanceMode("asr");
    setElementStat("mean");
    setStrategyId("A");
    setCheckedSamples(["S-2407-01", "S-2407-02", "S-2407-03", "S-2407-04"]);
    setTrackedSamples(["S-2407-01", "S-2407-02", "S-2407-03", "S-2407-04"]);
    setDefinitions(initialDefinitions);
    setResolutionIndex({});
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("看板数据已刷新");
  };

  const renderBase = () => (
    <>
      <section className="page-intro">
        <div>
          <span className="eyebrow">BASE DATA</span>
          <h2>基础数据</h2>
          <p>片段、元素、标签及标记方式的全量统计与分布分析。</p>
        </div>
      </section>

      <nav className="module-directory" aria-label="基础数据板块">
        <header><span>PAGE INDEX</span><b>基础数据板块</b></header>
        {baseViews.map((view) => (
          <button key={view.id} className={baseView === view.id ? "active" : ""} onClick={() => selectModule("base", `base-${view.id}`)}>
            <i>{String(baseViews.findIndex((item) => item.id === view.id) + 1).padStart(2, "0")}</i><b>{view.label}</b><span>{view.hint}</span><em>→</em>
          </button>
        ))}
      </nav>

      <section className={`module-section dashboard-view ${baseView === "overview" ? "active-view" : ""}`} id="base-overview">
        <ModuleHeader index="01" tag="DATA OVERVIEW" title="数据概览" text="汇总片段规模、元素规模、标记方式构成与标签/队列维度表现。" />
          <section className="metric-grid six">
            <MetricCard label="标记片段数" value="68.8万" delta="+8.4%" detail="去重后的物理片段总量" tone="ink" />
            <MetricCard label="元素数" value="29.6万" delta="+5.1%" detail="去重后的广告物料数" />
            <MetricCard label="纯人工片段" value="30.7万" delta="-1.7%" detail="打标 ASR 数为 0" tone="amber" />
            <MetricCard label="ASR 片段" value="38.1万" delta="+1.7%" detail="打标 ASR 数大于 0" tone="cyan" />
            <MetricCard label="视频帧数" value="4.9万" delta="+3.6%" detail="元素级辅助信号" tone="rose" />
            <MetricCard label="OCR 数" value="3.6万" delta="+2.8%" detail="元素级文字信号" tone="ink" />
          </section>
          <section className="grid equal">
            <article className="panel">
              <PanelTitle kicker="SEGMENT TREND" title="片段规模走势" text="总片段由 ASR 片段与纯人工片段构成。" />
              <LineChart
                suffix="万"
                minValue={0}
                series={[
                  { name: "总片段", color: "#2448a8", values: [9.89, 10.48, 10.02, 10.21, 10.51, 9.43, 8.21] },
                  { name: "ASR 片段", color: "#008f83", values: [5.43, 5.92, 5.67, 5.81, 5.98, 5.29, 4.62] },
                  { name: "纯人工片段", color: "#c47a15", values: [4.46, 4.56, 4.35, 4.40, 4.53, 4.14, 3.59] },
                ]}
              />
            </article>
            <article className="panel">
              <PanelTitle kicker="ELEMENT TREND" title="元素与辅助信号走势" text="帧与 OCR 为元素级信息，可与元素数对照观察。" />
              <LineChart
                suffix="万"
                minValue={0}
                series={[
                  { name: "元素数", color: "#2448a8", values: [4.12, 4.36, 4.19, 4.26, 4.42, 3.98, 3.72] },
                  { name: "视频帧", color: "#d25165", values: [0.62, 0.68, 0.65, 0.71, 0.76, 0.73, 0.75] },
                  { name: "OCR", color: "#7358a6", values: [0.44, 0.49, 0.47, 0.51, 0.55, 0.53, 0.56] },
                ]}
              />
            </article>
            <article className="panel signal-panel">
              <PanelTitle kicker="SIGNAL MIX" title="标记方式构成" text="片段类型只由 ASR 计数判断；帧与 OCR 作为元素辅助信号。" />
              <div className="donut-wrap">
                <div className="donut four-signal" style={{ background: "conic-gradient(#2448a8 0 49.3%, #008f83 49.3% 89%, #d25165 89% 95.3%, #7358a6 95.3% 100%)" }}><span><b>77.3万</b><small>标记信号总量</small></span></div>
                <div className="donut-legend">
                  <p><i style={{ background: "#2448a8" }} /><span>ASR 片段</span><b>49.3% · 38.1万</b></p>
                  <p><i style={{ background: "#008f83" }} /><span>纯人工片段</span><b>39.7% · 30.7万</b></p>
                  <p><i style={{ background: "#d25165" }} /><span>视频帧</span><b>6.3% · 4.9万</b></p>
                  <p><i style={{ background: "#7358a6" }} /><span>OCR</span><b>4.7% · 3.6万</b></p>
                </div>
              </div>
            </article>
          </section>
          <article className="panel table-panel">
            <PanelTitle kicker="DIMENSION DRILLDOWN" title="打标位置三维下钻" text="按标签、团队、通道分别查看片段与信号构成。" action={<button className="quiet-button" onClick={() => showToast(`${baseDrillDimension === "label" ? "标签" : baseDrillDimension === "team" ? "团队" : "通道"}下钻表已导出`)}>导出当前表</button>} />
            <nav className="data-table-tabs" aria-label="数据概览下钻维度">
              <button className={baseDrillDimension === "label" ? "active" : ""} onClick={() => setBaseDrillDimension("label")}><b>BY 标签</b><span>203 个标签</span></button>
              <button className={baseDrillDimension === "team" ? "active" : ""} onClick={() => setBaseDrillDimension("team")}><b>BY 团队</b><span>4 个团队</span></button>
              <button className={baseDrillDimension === "channel" ? "active" : ""} onClick={() => setBaseDrillDimension("channel")}><b>BY 通道</b><span>4 个通道</span></button>
            </nav>
            <div className="table-wrap">
              <table>
                <thead><tr><th>{baseDrillDimension === "label" ? "标签" : baseDrillDimension === "team" ? "团队" : "通道"}</th><th>覆盖范围</th><th>片段数</th><th>纯人工片段</th><th>ASR 片段</th><th>视频帧</th><th>OCR</th><th>分布构成</th><th>元素数</th><th>分布特征</th></tr></thead>
                <tbody>
                  {overviewDrillRows[baseDrillDimension].map((row) => (
                    <tr key={row.name}>
                      <td><b>{row.name}</b></td><td>{row.secondary}</td><td>{number(row.segments)}</td><td>{number(row.manual)}</td><td>{number(row.asr)}</td><td>{number(row.frame)}</td><td>{number(row.ocr)}</td>
                      <td><div className="four-split-bar" title="ASR / 纯人工 / 帧 / OCR"><i style={{ width: `${(row.asr / (row.asr + row.manual + row.frame + row.ocr)) * 100}%` }} /><b style={{ width: `${(row.manual / (row.asr + row.manual + row.frame + row.ocr)) * 100}%` }} /><em style={{ width: `${(row.frame / (row.asr + row.manual + row.frame + row.ocr)) * 100}%` }} /><span style={{ width: `${(row.ocr / (row.asr + row.manual + row.frame + row.ocr)) * 100}%` }} /></div></td><td>{number(row.elements)}</td><td><button className="link-button" onClick={() => { if (baseDrillDimension === "label") { setStrategyId("A"); selectModule("strategy", "strategy-discover"); } else showToast(`已定位 ${row.name}`); }}>{row.feature} →</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
      </section>

      <section className={`module-section dashboard-view ${baseView === "labels" ? "active-view" : ""}`} id="base-labels">
        <ModuleHeader index="02" tag="LABEL DISTRIBUTION" title="标签分布分析" text="识别 ASR 主导、手打主导与无明显分布标签，追踪周期迁移与队列差异。" />
          <section className="metric-grid three">
            <MetricCard label="ASR 主导标签" value="62" delta="+4" detail="主导占比 ≥ 70%" />
            <MetricCard label="手打主导标签" value="47" delta="-2" detail="主导占比 ≥ 70%" tone="amber" />
            <MetricCard label="无明显分布" value="94" delta="+6" detail="需要继续观察" tone="cyan" />
          </section>
          <section className="grid equal">
            <article className="panel">
              <PanelTitle kicker="CLASSIFICATION SHIFT" title="标签分类迁移" text="对比前后周期，识别主导标记方式发生变化的标签。" />
              <div className="classification-list">
                {labelGroups.map((item) => (
                  <div key={item.label} className="migration-row">
                    <span><b>{item.label}</b><small>{number(item.volume)} 条片段</small></span>
                    <div className="migration-types">
                      <em className={`kind ${item.previousKind.includes("ASR") ? "purple" : item.previousKind.includes("纯人工") ? "orange" : "gray"}`}>{item.previousKind}</em>
                      <i>→</i>
                      <em className={`kind ${item.currentKind.includes("ASR") ? "purple" : item.currentKind.includes("纯人工") ? "orange" : "gray"}`}>{item.currentKind}</em>
                    </div>
                    <div className="compare-bars"><i style={{ width: `${item.previous}%` }} /><b style={{ width: `${item.current}%` }} /></div>
                    <strong>{item.previous}% → {item.current}%</strong>
                  </div>
                ))}
              </div>
            </article>
            <article className="panel">
              <PanelTitle kicker="THREE-LAYER VIEW" title="标签主导属性同心圆" text="由外到内：至少一通道主导、全局主导、全通道主导。" />
              <div className="dominance-tabs">
                <button className={dominanceMode === "asr" ? "active" : ""} onClick={() => setDominanceMode("asr")}>ASR 主导</button>
                <button className={dominanceMode === "manual" ? "active" : ""} onClick={() => setDominanceMode("manual")}>纯人工主导</button>
              </div>
              <div className="rings-area">
                <div className={`rings ${dominanceMode === "manual" ? "manual-rings" : ""}`}>
                  <i /><b /><span><strong>{dominanceMode === "asr" ? "ASR" : "纯人工"}</strong><small>主导关系</small></span>
                </div>
                <div className="ring-notes">
                  <p><i className="outer" /><span>至少一通道主导</span><b>{dominanceMode === "asr" ? 86 : 68}</b></p>
                  <p><i className="middle" /><span>全局主导</span><b>{dominanceMode === "asr" ? 62 : 47}</b></p>
                  <p><i className="inner" /><span>全通道一致主导</span><b>{dominanceMode === "asr" ? 31 : 24}</b></p>
                </div>
              </div>
            </article>
          </section>
          <article className="panel table-panel">
            <PanelTitle kicker="MIGRATION DRILLDOWN" title="标签分类变化下钻表" text="完整对照加入选中日期数据前后的主导类型与信号分布。" action={<button className="quiet-button" onClick={() => showToast("标签迁移表已导出")}>导出变化表</button>} />
            <div className="table-wrap">
              <table>
                <thead><tr><th>标签</th><th>加入前分类</th><th>加入后分类</th><th>加入前片段</th><th>加入后片段</th><th>加入前主导占比</th><th>加入后主导占比</th><th>变化</th></tr></thead>
                <tbody>{labelGroups.map((item) => <tr key={item.label}><td><b>{item.label}</b></td><td><span className="type-chip">{item.previousKind}</span></td><td><span className="type-chip current">{item.currentKind}</span></td><td>{number(item.previousSegments)}</td><td>{number(item.currentSegments)}</td><td>{item.previous}%</td><td>{item.current}%</td><td className={item.previousKind === item.currentKind ? "muted" : "danger-text"}>{item.previousKind === item.currentKind ? "保持" : "发生迁移"}</td></tr>)}</tbody>
              </table>
            </div>
          </article>
          <article className="panel">
            <PanelTitle kicker="DOMINANT TYPE TREND" title="标签主导类型趋势" text="按天观察三类标签数量变化，并支持导出分类结果。" action={<button className="quiet-button" onClick={() => showToast("标签分类结果已导出")}>导出分类结果</button>} />
            <LineChart suffix="个" minValue={0} series={[
              { name: "ASR 主导", color: "#5f6ff5", values: [54, 56, 57, 58, 61, 60, 62] },
              { name: "手打主导", color: "#e9a23b", values: [51, 50, 49, 50, 48, 48, 47] },
              { name: "无明显分布", color: "#139d92", values: [86, 88, 87, 90, 91, 92, 94] },
            ]} />
          </article>
          <section className="grid equal">
            <article className="panel table-panel">
              <PanelTitle kicker="CONCENTRIC DRILLDOWN" title={`${dominanceMode === "asr" ? "ASR" : "纯人工"}主导 · 同心圆明细表`} text="按层级与元素数量排序。" action={<button className="quiet-button" onClick={() => showToast("同心圆明细已导出")}>导出明细</button>} />
              <div className="table-wrap"><table><thead><tr><th>层级</th><th>标签</th><th>全局判定</th><th>主导通道 / 全部通道</th><th>元素数</th><th>片段数</th></tr></thead><tbody>
                {concentricRows.filter((row) => row.mode === dominanceMode).map((row) => <tr key={`${row.mode}-${row.label}`}><td><span className={`layer-badge layer-${row.layer}`}>{row.layer}</span></td><td><b>{row.label}</b></td><td>{row.global}</td><td>{row.dominantChannels}</td><td>{number(row.elements)}</td><td>{number(row.segments)}</td></tr>)}
              </tbody></table></div>
            </article>
            <article className="panel table-panel">
              <PanelTitle kicker="CATEGORY ROSTER" title="各分类标签列表" text="分类结果包含元素、片段及四类信号数量。" />
              <div className="table-wrap"><table><thead><tr><th>标签</th><th>当前分类</th><th>元素数</th><th>片段数</th><th>ASR</th><th>纯人工</th><th>帧</th><th>OCR</th></tr></thead><tbody>
                {baseRows.map((row, index) => <tr key={row.label}><td><b>{row.label}</b></td><td>{labelGroups[index]?.currentKind ?? "无明显分布"}</td><td>{number(row.elements)}</td><td>{number(row.segments)}</td><td>{number(row.asr)}</td><td>{number(row.manual)}</td><td>{number(row.frame)}</td><td>{number(row.ocr)}</td></tr>)}
              </tbody></table></div>
            </article>
          </section>
      </section>

      <section className={`module-section dashboard-view ${baseView === "element" ? "active-view" : ""}`} id="base-element">
        <ModuleHeader index="03" tag="SINGLE ELEMENT" title="单元素分析" text="基于均值、最大值与均值 + 2σ 阈值识别多片段异常元素并下钻明细。" />
          <nav className="element-stat-tabs" aria-label="单元素统计口径">
            <span>查看维度</span>
            <button className={elementStat === "mean" ? "active" : ""} onClick={() => setElementStat("mean")}>平均值</button>
            <button className={elementStat === "max" ? "active" : ""} onClick={() => setElementStat("max")}>最大值</button>
            <button className={elementStat === "min" ? "active" : ""} onClick={() => setElementStat("min")}>最小值</button>
          </nav>
          <section className="metric-grid four">
            <MetricCard label={`${elementStat === "mean" ? "平均" : elementStat === "max" ? "最大" : "最小"}片段数`} value={elementStat === "mean" ? "1.72" : elementStat === "max" ? "12" : "1"} delta={elementStat === "mean" ? "+0.08" : undefined} detail="每个元素的片段数量" />
            <MetricCard label={`${elementStat === "mean" ? "平均" : elementStat === "max" ? "最大" : "最小"}标签数`} value={elementStat === "mean" ? "2.36" : elementStat === "max" ? "9" : "1"} detail="每个元素的标签数量" tone="ink" />
            <MetricCard label={`${elementStat === "mean" ? "平均" : elementStat === "max" ? "最大" : "最小"}视频时长`} value={elementStat === "mean" ? "46.8s" : elementStat === "max" ? "298s" : "3.2s"} detail="元素视频时长" tone="amber" />
            <MetricCard label="异常阈值" value="4.8" detail="均值 + 2σ" tone="amber" />
          </section>
          <section className="grid three">
            <article className="panel">
              <PanelTitle kicker="SEGMENTS / ELEMENT" title="单元素片段数分布" text="长尾元素是多片段策略的主要候选池。" />
              <div className="histogram">
                {[92, 66, 42, 27, 18, 12, 8, 5, 3].map((value, index) => <div key={index}><i style={{ height: `${value}%` }} /><span>{index + 1}{index === 8 ? "+" : ""}</span></div>)}
              </div>
              <div className="threshold-note"><i />异常阈值 4.8：超过阈值的元素进入策略候选池</div>
            </article>
            <article className="panel">
              <PanelTitle kicker="LABELS / ELEMENT" title="单元素标签数分布" />
              <div className="histogram teal-histogram">
                {[86, 61, 37, 22, 13, 8, 5, 3].map((value, index) => <div key={index}><i style={{ height: `${value}%` }} /><span>{index + 1}{index === 7 ? "+" : ""}</span></div>)}
              </div>
            </article>
            <article className="panel">
              <PanelTitle kicker="DURATION / ELEMENT" title="元素视频时长分布" />
              <div className="histogram slate-histogram">
                {[34, 72, 89, 68, 46, 28, 14].map((value, index) => <div key={index}><i style={{ height: `${value}%` }} /><span>{["0–10s", "10–30s", "30–60s", "1–2m", "2–3m", "3–5m", "5m+"][index]}</span></div>)}
              </div>
            </article>
          </section>
          <article className="panel table-panel">
            <PanelTitle kicker="BY LABEL" title="BY 标签片段数量统计" text="按元素指纹 × 标签分组，再按标签聚合均值、最大值与异常元素。" action={<button className="quiet-button" onClick={() => showToast("标签片段统计已导出")}>导出统计</button>} />
            <div className="table-wrap"><table><thead><tr><th>标签</th><th>平均片段数量</th><th>最大片段数量</th><th>最小片段数量</th><th>异常阈值</th><th>异常元素数</th><th>元素数</th><th>详情</th></tr></thead><tbody>
              {baseRows.map((row, index) => <tr key={row.label}><td><b>{row.label}</b></td><td>{[1.82, 1.67, 1.94, 1.58, 1.73][index]}</td><td>{[12, 9, 11, 8, 7][index]}</td><td>1</td><td>{[4.8, 4.5, 5.1, 4.3, 4.6][index]}</td><td>{[68, 54, 61, 43, 36][index]}</td><td>{number(row.elements)}</td><td><button className="link-button" onClick={() => showToast(`已展开 ${row.label} 的异常元素`)}>查看异常元素 →</button></td></tr>)}
            </tbody></table></div>
          </article>
          <article className="panel table-panel">
            <PanelTitle kicker="OUTLIER LIST" title="异常元素明细" text="点击策略入口可带入当前元素和标签条件。" />
            <div className="table-wrap"><table><thead><tr><th>元素 ID</th><th>标签</th><th>片段数</th><th>标签均值</th><th>偏离</th><th>类型</th><th>状态</th><th /></tr></thead><tbody>
              {elementRows.map((row) => <tr key={row.id}><td className="mono">{row.id}</td><td>{row.label}</td><td><b>{row.segments}</b></td><td>{row.average}</td><td className="danger-text">{row.deviation}</td><td>{row.type}</td><td><span className={`risk risk-${row.status}`}>{row.status}</span></td><td><button className="link-button" onClick={() => { setStrategyId("B"); selectModule("strategy", "strategy-discover"); }}>进入策略 →</button></td></tr>)}
            </tbody></table></div>
          </article>
      </section>

      <section className={`module-section dashboard-view ${baseView === "cluster" ? "active-view" : ""}`} id="base-cluster">
        <ModuleHeader index="04" tag="SEGMENT CLUSTER" title="片段聚类数据" text="ASR 片段按文本字数分桶，纯人工片段按片段时长分桶。" />
        <section className="grid equal">
          <article className="panel">
            <PanelTitle kicker="ASR TEXT LENGTH" title="ASR 片段字数分布" text="统计片段区间内 ASR 文本拼接后的总字符数。" action={<span className="soft-pill">38.1 万片段</span>} />
            <div className="bucket-bars">
              {[22, 54, 86, 72, 48, 27].map((value, index) => <div key={index}><span>{["0–5字", "6–10字", "11–20字", "21–50字", "51–100字", "100字+"][index]}</span><i><b style={{ width: `${value}%` }} /></i><em>{[8.2, 18.6, 29.4, 23.1, 13.5, 7.2][index]}%</em></div>)}
            </div>
          </article>
          <article className="panel manual-duration-panel">
            <PanelTitle kicker="MANUAL DURATION" title="手打片段时长分布" text="对比 ASR 与人工框选的时长结构。" action={<span className="soft-pill">30.7 万片段</span>} />
            <div className="bucket-bars manual-bars">
              {[28, 53, 66, 74, 58, 39].map((value, index) => <div key={index}><span>{["0–5s", "6–10s", "11–30s", "31–60s", "61–120s", "120s+"][index]}</span><i><b style={{ width: `${value}%` }} /></i><em>{[12.8, 18.3, 24.7, 22.4, 14.1, 7.7][index]}%</em></div>)}
            </div>
          </article>
          <article className="panel custom-bucket">
            <PanelTitle kicker="CUSTOM BUCKET" title="自定义分桶" text="ASR 字数与手打时长分别配置。" />
            <div><label>ASR 字数分桶<input defaultValue="5,10,20,50,100" /></label><label>手打时长分桶<input defaultValue="5,10,30,60,120" /></label><button className="primary-button" onClick={() => showToast("自定义分桶已重新统计")}>重新统计</button></div>
          </article>
          <article className="panel">
            <PanelTitle kicker="CLUSTER INSIGHT" title="本期观察" />
            <div className="insight-note"><span>01</span><p><b>手打长片段占比上升</b>40 秒以上区间较上期增加 3.4 个百分点。</p></div>
            <div className="insight-note"><span>02</span><p><b>ASR 集中于 11–50 字</b>该字数区间承载约 52.5% 的识别片段。</p></div>
          </article>
        </section>
        <section className="grid equal">
          <article className="panel table-panel">
            <PanelTitle kicker="ASR BUCKET TABLE" title="ASR 字数分桶明细" action={<button className="quiet-button" onClick={() => showToast("ASR 分桶明细已导出")}>导出 CSV</button>} />
            <div className="table-wrap"><table><thead><tr><th>字数区间</th><th>片段数</th><th>占比</th><th>累计占比</th></tr></thead><tbody>
              {[["0–5字", "3.1万", "8.2%", "8.2%"], ["6–10字", "7.1万", "18.6%", "26.8%"], ["11–20字", "11.2万", "29.4%", "56.2%"], ["21–50字", "8.8万", "23.1%", "79.3%"], ["51–100字", "5.1万", "13.5%", "92.8%"], ["100字+", "2.8万", "7.2%", "100%"]].map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell}>{index === 0 ? <b>{cell}</b> : cell}</td>)}</tr>)}
            </tbody></table></div>
          </article>
          <article className="panel table-panel manual-duration-panel">
            <PanelTitle kicker="MANUAL BUCKET TABLE" title="手打时长分桶明细" action={<button className="quiet-button" onClick={() => showToast("手打分桶明细已导出")}>导出 CSV</button>} />
            <div className="table-wrap"><table><thead><tr><th>时长区间</th><th>片段数</th><th>占比</th><th>累计占比</th></tr></thead><tbody>
              {[["0–5s", "3.9万", "12.8%", "12.8%"], ["6–10s", "5.6万", "18.3%", "31.1%"], ["11–30s", "7.6万", "24.7%", "55.8%"], ["31–60s", "6.9万", "22.4%", "78.2%"], ["61–120s", "4.3万", "14.1%", "92.3%"], ["120s+", "2.4万", "7.7%", "100%"]].map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell}>{index === 0 ? <b>{cell}</b> : cell}</td>)}</tr>)}
            </tbody></table></div>
          </article>
        </section>
      </section>
    </>
  );

  const renderQuality = () => (
    <>
      <section className="page-intro quality-intro">
        <div><span className="eyebrow">QUALITY DATA</span><h2>质量数据</h2><p>一审与质检结果对比、核心质量指标及异常时长片段统计。</p></div>
      </section>
      <nav className="module-directory compact" aria-label="质量数据板块">
        <header><span>PAGE INDEX</span><b>质量数据板块</b></header>
        {qualityViews.map((view) => <button key={view.id} className={qualityView === view.id ? "active" : ""} onClick={() => selectModule("quality", `quality-${view.id}`)}><i>{String(qualityViews.findIndex((item) => item.id === view.id) + 1).padStart(2, "0")}</i><b>{view.label}</b><span>{view.hint}</span><em>→</em></button>)}
      </nav>
      <section className={`module-section dashboard-view ${qualityView === "metrics" ? "active-view" : ""}`} id="quality-metrics">
        <ModuleHeader index="01" tag="QUALITY METRICS" title="质量指标" text="观察 IoU、正确打标率、简单重复差异与平均审核耗时。" />
          <div className="metric-selector">
            {Object.entries(qualityMetrics).map(([key, metric]) => <button key={key} className={metricKey === key ? "active" : ""} onClick={() => setMetricKey(key as keyof typeof qualityMetrics)}><span>{metric.label}</span><b>{metric.value}</b><em>{metric.delta}</em></button>)}
          </div>
          <section className="metric-grid four">
            <MetricCard label="IoU" value="86.4%" delta="+2.1%" detail="段落重合度" />
            <MetricCard label="正确打标率" value="92.7%" delta="+1.3%" detail="标签与片段均正确" tone="cyan" />
            <MetricCard label="简单重复差异" value="1.8%" delta="-0.6%" detail="一审与质检差异" tone="amber" />
            <MetricCard label="平均审核耗时" value="41.6s" delta="-3.2s" detail="前端操作耗时" tone="ink" />
          </section>
          <section className="grid two-one">
            <article className="panel">
              <PanelTitle kicker="OVERALL TREND" title={`${activeMetric.label} · 全量趋势`} text="指标选择会同步更新趋势与维度定位。" action={<span className="big-delta"><b>{activeMetric.value}</b><em>{activeMetric.delta}</em></span>} />
              <LineChart series={[{ name: activeMetric.label, color: activeMetric.color, values: activeMetric.values }]} minValue={metricKey === "repeat" ? 0 : undefined} />
            </article>
            <article className="panel">
              <PanelTitle kicker="ERROR STRUCTURE" title="差错结构 M6" text="按差错类型拆解当前质量损失。" />
              <div className="error-structure">
                {[["漏标", 38, "violet"], ["错标", 27, "cyan"], ["边界偏移", 22, "amber"], ["重复差异", 13, "rose"]].map(([name, value, tone]) => <div key={name}><span><i className={tone} />{name}</span><b>{value}%</b><em><i className={tone} style={{ width: `${value}%` }} /></em></div>)}
              </div>
            </article>
          </section>
          <section className="grid equal">
            <article className="panel heatmap-panel">
              <PanelTitle kicker="CROSS HEATMAP" title="团队 × 队列质量热力" text="颜色越深代表指标越低，点击单元格可模拟下钻。" />
              <div className="heatmap">
                <span />
                {["队列 01", "队列 02", "队列 03", "队列 04"].map((item) => <b key={item}>{item}</b>)}
                {heatmap.map((row, rowIndex) => (
                  <div className="heatmap-row" key={rowIndex}>
                    <b>团队 {String.fromCharCode(65 + rowIndex)}</b>
                    {row.map((value, columnIndex) => <button key={columnIndex} style={{ "--heat": `${Math.max(0.18, (95 - value) / 12)}` } as React.CSSProperties} onClick={() => showToast(`已定位：团队 ${String.fromCharCode(65 + rowIndex)} × 队列 0${columnIndex + 1}`)}>{value}%</button>)}
                  </div>
                ))}
              </div>
            </article>
            <article className="panel">
              <PanelTitle kicker="BOTTOM COMBINATIONS" title="表现较弱组合 Top 10" text="当前展示前 5 条组合，可点击应用筛选。" />
              <div className="ranking-list">
                {[["团队 C × 队列 02", 84, -3.2], ["团队 D × 队列 04", 85, -2.7], ["团队 B × 队列 02", 86, -2.1], ["团队 C × 队列 03", 87, -1.8], ["团队 B × 队列 04", 88, -1.3]].map((item, index) => <button key={String(item[0])} onClick={() => showToast(`已应用组合筛选：${item[0]}`)}><span>{String(index + 1).padStart(2, "0")}</span><b>{item[0]}</b><i><em style={{ width: `${Number(item[1])}%` }} /></i><strong>{item[1]}%</strong><small>{item[2]}pp</small></button>)}
              </div>
            </article>
          </section>
          <section className="grid three quality-dimensions">
            <article className="panel">
              <PanelTitle kicker="BY TEAM" title="BY 团队质量趋势" text="对比主要审核团队的当前质量表现。" />
              <LineChart series={[{ name: "团队 A", color: "#2448a8", values: [88, 88.6, 89.1, 89.8, 90.2, 91, 91.4] }, { name: "团队 C", color: "#008f83", values: [84.2, 85, 84.6, 85.8, 86.1, 87.2, 87.8] }]} />
            </article>
            <article className="panel">
              <PanelTitle kicker="BY CHANNEL" title="BY 通道质量趋势" text="定位不同审核通道之间的质量差异。" />
              <LineChart series={[{ name: "通道 01", color: "#2448a8", values: [90, 89.6, 90.4, 91.2, 91.6, 92, 92.4] }, { name: "通道 04", color: "#c47a15", values: [84.8, 85.3, 85.1, 86, 86.6, 86.2, 87.1] }]} />
            </article>
            <article className="panel">
              <PanelTitle kicker="BY LABEL" title="BY 标签质量趋势" text="观察主要标签组的质量变化与差距。" />
              <LineChart series={[{ name: "标签组 A", color: "#2448a8", values: [86.1, 87, 87.4, 88.2, 89, 89.6, 90.1] }, { name: "标签组 C", color: "#d25165", values: [83.8, 84.2, 84, 85.1, 85.7, 86.4, 86.9] }]} />
            </article>
          </section>
      </section>

      <section className={`module-section dashboard-view ${qualityView === "duration" ? "active-view" : ""}`} id="quality-duration">
        <ModuleHeader index="02" tag="ABNORMAL DURATION" title="异常时长片段统计" text="统计超长、超短片段，并结合标签属性区分合理与不合理案例。" />
          <section className="metric-grid four">
            <MetricCard label="异常时长片段" value="3,284" delta="-6.8%" detail="过长 + 过短" tone="ink" />
            <MetricCard label="超长片段" value="1,486" detail="片段 / 视频 ≥ 90%" tone="rose" />
            <MetricCard label="超短片段" value="1,798" detail="片段时长 ≤ 2 秒" tone="amber" />
            <MetricCard label="不合理占比" value="38.6%" delta="-4.2%" detail="按标签字典判定" tone="cyan" />
          </section>
          <section className="grid two-one">
            <article className="panel">
              <PanelTitle kicker="DURATION TREND" title="异常时长趋势" text="同时观察过长与过短片段。" action={<span className="legend-pair"><i className="rose" />超长 <i className="orange" />超短</span>} />
              <LineChart suffix="条" minValue={0} series={[{ name: "超长", color: "#df6178", values: [248, 232, 226, 218, 207, 191, 164] }, { name: "超短", color: "#eda43f", values: [286, 278, 269, 254, 246, 234, 231] }]} />
            </article>
            <article className="panel">
              <PanelTitle kicker="REASONABILITY" title="合理性拆分" text="基于标签业务属性字典映射。" />
              <div className="reason-cards">
                <button className={durationReason === "全部" ? "active" : ""} onClick={() => setDurationReason("全部")}><span>全部</span><b>3,284</b></button>
                <button className={durationReason === "合理" ? "active green" : ""} onClick={() => setDurationReason("合理")}><span>合理</span><b>2,016</b></button>
                <button className={durationReason === "不合理" ? "active red" : ""} onClick={() => setDurationReason("不合理")}><span>不合理</span><b>1,268</b></button>
              </div>
              <p className="logic-note"><b>判定口径</b>：超长 ≥ 视频时长 90%；超短 ≤ 2 秒。合理性根据标签的业务属性字典判断。</p>
            </article>
          </section>
          <section className="grid equal duration-drill-grid">
            <article className="panel">
              <PanelTitle kicker="OVERLONG DRILLDOWN" title="超长片段下钻" text="同时呈现标签与通道两个维度的集中度。" />
              <div className="dual-ranking">
                <section><h4>BY 标签</h4>{[["标签组 C-02", 86, "426"], ["标签组 A-01", 68, "338"], ["标签组 D-03", 51, "254"], ["标签组 B-04", 39, "194"]].map(([name, value, count]) => <div key={name}><span>{name}</span><i><b style={{ width: `${value}%` }} /></i><strong>{count}</strong></div>)}</section>
                <section><h4>BY 通道</h4>{[["通道 04", 78, "388"], ["通道 02", 65, "324"], ["通道 01", 57, "284"], ["通道 03", 49, "244"]].map(([name, value, count]) => <div key={name}><span>{name}</span><i><b style={{ width: `${value}%` }} /></i><strong>{count}</strong></div>)}</section>
              </div>
            </article>
            <article className="panel">
              <PanelTitle kicker="OVERSHORT DRILLDOWN" title="超短片段下钻" text="对照标签与通道定位极短片段的主要来源。" />
              <div className="dual-ranking short">
                <section><h4>BY 标签</h4>{[["标签组 A-01", 88, "516"], ["标签组 E-05", 71, "418"], ["标签组 B-04", 54, "318"], ["标签组 C-02", 43, "252"]].map(([name, value, count]) => <div key={name}><span>{name}</span><i><b style={{ width: `${value}%` }} /></i><strong>{count}</strong></div>)}</section>
                <section><h4>BY 通道</h4>{[["通道 02", 82, "481"], ["通道 03", 66, "388"], ["通道 04", 55, "323"], ["通道 01", 47, "276"]].map(([name, value, count]) => <div key={name}><span>{name}</span><i><b style={{ width: `${value}%` }} /></i><strong>{count}</strong></div>)}</section>
              </div>
            </article>
          </section>
          <article className="panel table-panel">
            <PanelTitle kicker="DURATION DRILLDOWN" title="异常片段明细预览" text="支持按标签、队列与合理性下钻。" action={<button className="quiet-button" onClick={() => showToast("Excel 已生成")}>下载 Excel</button>} />
            <div className="table-wrap"><table><thead><tr><th>记录 ID</th><th>标签</th><th>队列</th><th>类型</th><th>片段 / 视频</th><th>占比</th><th>合理性</th><th>同类条数</th></tr></thead><tbody>
              {filteredDurationRows.map((row) => <tr key={row.id}><td className="mono">{row.id}</td><td>{row.label}</td><td>{row.channel}</td><td><span className={`soft-pill ${row.type === "超长" ? "red" : "orange"}`}>{row.type}</span></td><td>{row.duration}</td><td>{row.ratio}</td><td><span className={`reason ${row.reason === "合理" ? "good" : "bad"}`}>{row.reason}</span></td><td>{row.count}</td></tr>)}
            </tbody></table>{filteredDurationRows.length === 0 && <EmptyDemo text="当前筛选下没有记录" />}</div>
          </article>
      </section>
    </>
  );

  const renderStrategy = () => (
    <>
      <section className="page-intro strategy-intro">
        <div><span className="eyebrow">STRATEGY DATA</span><h2>策略数据</h2><p>异常发现、问题定义、问题解决与数据监测的全流程管理。</p></div>
      </section>

      <nav className="strategy-stepper" aria-label="策略闭环步骤">
        {strategySteps.map((step, index) => (
          <button key={step.id} className={strategyStep === step.id ? "active" : ""} onClick={() => selectModule("strategy", `strategy-${step.id}`)}>
            <span>{step.index}</span><div><b>{step.label}</b><small>{step.hint}</small></div>{index < strategySteps.length - 1 && <i>→</i>}
          </button>
        ))}
      </nav>

      <section className="strategy-context">
        <div className="strategy-choice"><span>策略视角</span><button className={strategyId === "A" ? "active" : ""} onClick={() => setStrategyId("A")}>少数位置分布</button><button className={strategyId === "B" ? "active" : ""} onClick={() => setStrategyId("B")}>多片段异常</button></div>
        <div><span>当前策略</span><b>{strategyCopy[strategyId].title}</b></div>
        <div><span>本批命中</span><b>{strategyCopy[strategyId].hits}</b></div>
      </section>

      <section className={`module-section dashboard-view strategy-module ${strategyStep === "discover" ? "active-view" : ""}`} id="strategy-discover">
          <ModuleHeader index="01" tag="ANOMALY DISCOVERY" title="异常发现" text="创建分析批次、运行策略、定位异常标签或元素，并抽取跟台样本。" />
          <section className="stage-heading compact-heading"><div><h3>批次与样本</h3><p>先固化分析批次，再运行策略并抽取可跟台样本。</p></div><button className="quiet-button" onClick={() => showToast("已创建批次 B-2407-W5")}>＋ 新建批次</button></section>
          <article className="panel batch-panel">
            <PanelTitle kicker="BATCH MANAGEMENT" title="分析批次" text="批次保存周次、团队、队列与创建人，提交后形成可追溯快照。" />
            <div className="batch-table">
              <div className="batch-row active"><span><i />当前</span><b>B-2407-W4</b><p>07/18–07/24</p><p>全部团队</p><p>全部队列</p><em>已跑策略</em><strong>86 样本</strong><button onClick={() => showToast("当前批次已选中")}>打开</button></div>
              <div className="batch-row"><span>历史</span><b>B-2407-W3</b><p>07/11–07/17</p><p>团队 A / C</p><p>队列 02</p><em>已提交</em><strong>63 样本</strong><button onClick={() => showToast("已切换历史批次")}>查看</button></div>
            </div>
          </article>
          <article className="panel sample-panel">
            <PanelTitle
              kicker="ANOMALY DISCOVERY"
              title="候选异常与样本抽取"
              text={strategyId === "A" ? "定位与标签主导方式相反的少数位置样本。" : "定位同元素、同标签下片段数量超过阈值的异常样本。"}
              action={<div className="sample-actions"><span>已选 {checkedSamples.length} 条</span><button className="primary-button" onClick={addTrackedSamples}>加入跟台</button></div>}
            />
            <div className="discovery-summary">
              <div><span>候选标签 / 元素</span><b>{strategyId === "A" ? "12" : "18"}</b><small>命中策略规则</small></div>
              <div><span>候选样本</span><b>{strategyId === "A" ? "86" : "64"}</b><small>去重后记录</small></div>
              <div><span>建议抽样</span><b>20</b><small>支持 10–60 条</small></div>
              <button onClick={() => showToast("策略已重新运行，候选池无变化")}>↻ 重新运行策略</button>
            </div>
            <div className="table-wrap"><table><thead><tr><th><input type="checkbox" checked={checkedSamples.length === strategySamples.length} onChange={(event) => setCheckedSamples(event.target.checked ? strategySamples.map((sample) => sample.id) : [])} /></th><th>样本 ID</th><th>标签</th><th>队列 / 审核员</th><th>异常信号</th><th>标记组合</th><th>片段数</th><th>风险</th><th /></tr></thead><tbody>
              {strategySamples.map((sample) => <tr key={sample.id}><td><input type="checkbox" checked={checkedSamples.includes(sample.id)} onChange={(event) => setCheckedSamples((current) => event.target.checked ? [...current, sample.id] : current.filter((id) => id !== sample.id))} /></td><td className="mono">{sample.id}</td><td>{sample.label}</td><td><b>{sample.channel}</b><small className="cell-note">{sample.auditor}</small></td><td>{strategyId === "A" ? sample.signal : `${sample.segments} 个片段 / 元素`}</td><td><span className="soft-pill">{sample.marker}</span></td><td>{sample.segments}</td><td><span className={`risk risk-${sample.risk}`}>{sample.risk}</span></td><td><button className="link-button" onClick={() => setSelectedSample(sample)}>查看样本</button></td></tr>)}
            </tbody></table></div>
            <div className="stage-next"><span>已加入跟台池 {trackedSamples.length} 条</span><button onClick={() => selectModule("strategy", "strategy-define")}>进入问题定义 →</button></div>
          </article>
      </section>

      <section className={`module-section dashboard-view strategy-module ${strategyStep === "define" ? "active-view" : ""}`} id="strategy-define">
          <ModuleHeader index="02" tag="PROBLEM DEFINITION" title="问题定义" text="核对录屏、完成问题分类与跟台记录，相同记录自动聚合为同一个问题。" />
          <section className="stage-heading compact-heading"><div><h3>跟台与归因</h3><p>支持在线填写，也支持下载模板后由团队回传。</p></div><div className="heading-actions"><button className="quiet-button" onClick={() => showToast("问题定义模板已下载")}>↓ 下载模板</button><button className="quiet-button" onClick={() => showToast("文件校验通过，内容已回传")}>↑ 回传 Excel</button></div></section>
          <section className="grid two-one define-summary">
            <article className="panel">
              <PanelTitle kicker="TRACKING PROGRESS" title="跟台完成进度" />
              <div className="progress-overview"><div><b>{tracked.filter((sample) => definitions[sample.id]?.viewed).length}</b><span>/ {tracked.length} 已看录屏</span></div><i><em style={{ width: `${(tracked.filter((sample) => definitions[sample.id]?.viewed).length / Math.max(tracked.length, 1)) * 100}%` }} /></i><p>{tracked.filter((sample) => definitions[sample.id]?.category && definitions[sample.id]?.record).length} 条已完成归因 · {problems.length} 个聚合问题</p></div>
            </article>
            <article className="panel template-panel">
              <PanelTitle kicker="QUICK TEMPLATE" title="快捷跟台模板" />
              <select onChange={(event) => { const template = quickTemplates[Number(event.target.value)]; if (template && tracked[0]) updateDefinition(tracked[0].id, template); }} defaultValue=""><option value="" disabled>选择模板应用到首条样本</option>{quickTemplates.map((template, index) => <option value={index} key={template.record}>{template.category} · {template.record}</option>)}</select>
            </article>
          </section>
          <article className="panel table-panel definition-table">
            <PanelTitle kicker="PROBLEM DEFINITION" title="跟台记录工作台" text="系统字段只读；问题分类与跟台记录支持在线填写或 Excel 回传。" action={<button className="primary-button" onClick={submitDefinitions}>提交本版定义</button>} />
            <div className="table-wrap"><table><thead><tr><th>样本</th><th>标签 / 审核员</th><th>已看录屏</th><th>问题分类</th><th>跟台记录</th><th>聚合提示</th><th /></tr></thead><tbody>
              {tracked.map((sample) => {
                const definition = definitions[sample.id] ?? { viewed: false, category: "", record: "" };
                const sameCount = tracked.filter((other) => definitions[other.id]?.record && definitions[other.id]?.record === definition.record && definitions[other.id]?.category === definition.category).length;
                return <tr key={sample.id}><td><span className="mono">{sample.id}</span><small className="cell-note">{sample.marker}</small></td><td><b>{sample.label}</b><small className="cell-note">{sample.auditor}</small></td><td><label className="check-control"><input type="checkbox" checked={definition.viewed} onChange={(event) => updateDefinition(sample.id, { viewed: event.target.checked })} /><span>{definition.viewed ? "已核对" : "待核对"}</span></label></td><td><select value={definition.category} onChange={(event) => updateDefinition(sample.id, { category: event.target.value })}><option value="">请选择</option>{problemCategories.map((category) => <option key={category}>{category}</option>)}</select></td><td><textarea value={definition.record} placeholder="填写可行动的问题描述…" onChange={(event) => updateDefinition(sample.id, { record: event.target.value })} /></td><td>{sameCount > 1 ? <span className="merge-hint">⇄ 将聚合 {sameCount} 条样本</span> : <span className="muted">独立问题</span>}</td><td><button className="link-button" onClick={() => setSelectedSample(sample)}>样本</button></td></tr>;
              })}
            </tbody></table></div>
          </article>
          <article className="panel submission-history">
            <PanelTitle kicker="VERSION TIMELINE" title="提交版本与快照" text="每次提交都会保存全部样本的定义，可撤回后继续修改。" />
            <div className="version-line">{submissions.map((submission, index) => <div key={submission.id}><i className={index === submissions.length - 1 ? "current" : ""} /><span>{submission.time}</span><b>{submission.note}</b><p>{submission.count} 条完成归因</p><button onClick={() => showToast(index === submissions.length - 1 ? "当前版本无需切换" : `已预览第 ${submission.id} 版快照`)}>{index === submissions.length - 1 ? "当前版本" : "查看快照"}</button></div>)}</div>
            <div className="stage-next"><span>问题定义完成后，按“问题”而不是按“样本”推进解决。</span><button onClick={() => selectModule("strategy", "strategy-solve")}>进入问题解决 →</button></div>
          </article>
      </section>

      <section className={`module-section dashboard-view strategy-module ${strategyStep === "solve" ? "active-view" : ""}`} id="strategy-solve">
          <ModuleHeader index="03" tag="PROBLEM RESOLUTION" title="问题解决" text="按聚合问题推进解决状态，管理 DDL、撤回、放弃与跨批次全局问题。" />
          <section className="stage-heading compact-heading"><div><h3>问题推进</h3><p>产品、规则、SOP 类问题进入协同链路；人审问题进入宣讲或扣分链路。</p></div></section>
          <div className="solution-tabs"><button className={solutionTab === "batch" ? "active" : ""} onClick={() => setSolutionTab("batch")}>本批次问题 <span>{problems.length}</span></button><button className={solutionTab === "global" ? "active" : ""} onClick={() => setSolutionTab("global")}>全局问题池 <span>3</span></button></div>
          {solutionTab === "batch" ? (
            <div className="problem-list">
              {problems.map((problem, problemIndex) => {
                const flow = getFlow(problem.category);
                const index = resolutionIndex[problem.key] ?? (problemIndex === 0 ? 1 : 0);
                const status = flow[Math.min(index, flow.length - 1)];
                return <article className="problem-card" key={problem.key}>
                  <header><div><span className="mono">P-{String(problemIndex + 1).padStart(3, "0")}</span><em className={problem.category.includes("人审") ? "human" : "global"}>{problem.category}</em><b>{problem.record}</b></div><span className={`deadline ${problemIndex === 2 ? "overdue" : ""}`}>{problemIndex === 2 ? "已逾期 1 天" : "DDL 07/26"}</span></header>
                  <div className="problem-meta"><span>关联样本 <b>{problem.sampleIds.length}</b></span><span>{problem.sampleIds.join(" · ")}</span>{!problem.category.includes("人审") && <span>可进入全局问题池</span>}</div>
                  <div className="status-flow">
                    {flow.map((item, flowIndex) => <div key={item} className={flowIndex < index ? "done" : flowIndex === index ? "current" : ""}><i>{flowIndex < index ? "✓" : flowIndex + 1}</i><span>{item}</span>{flowIndex < flow.length - 1 && <b />}</div>)}
                  </div>
                  <footer><span>当前状态：<b>{status}</b></span><div><button disabled={index <= 0} onClick={() => setResolutionIndex((current) => ({ ...current, [problem.key]: Math.max(0, index - 1) }))}>撤回一步</button><button onClick={() => showToast("问题已标记为放弃，可在操作日志中恢复")}>放弃</button><button className="primary-button" disabled={index >= flow.length - 1} onClick={() => { setResolutionIndex((current) => ({ ...current, [problem.key]: Math.min(flow.length - 1, index + 1) })); showToast(`问题已推进至：${flow[Math.min(flow.length - 1, index + 1)]}`); }}>推进状态 →</button></div></footer>
                </article>;
              })}
              {problems.length === 0 && <article className="panel"><EmptyDemo text="请先在问题定义中完成归因" /></article>}
            </div>
          ) : (
            <article className="panel global-pool">
              <PanelTitle kicker="GLOBAL ISSUE POOL" title="跨批次全局问题池" text="统一沉淀产品、规则和 SOP 类共性问题，支持关联、合并与跨批次追踪。" action={<button className="primary-button" onClick={() => showToast("已创建全局问题")}>＋ 新建问题</button>} />
              {[
                { id: "G-001", category: "产品问题", title: "复核视图中的识别信号展示不完整", batches: 4, samples: 18, owner: "产品协同角色" },
                { id: "G-002", category: "规则问题", title: "组合信号的审核优先级需要统一", batches: 3, samples: 11, owner: "规则协同角色" },
                { id: "G-003", category: "SOP 不清晰", title: "长内容全程命中时的操作路径不明确", batches: 2, samples: 7, owner: "运营协同角色" },
              ].map((problem) => <div className="global-row" key={problem.id}><span className="mono">{problem.id}</span><div><em>{problem.category}</em><b>{problem.title}</b><small>关联 {problem.batches} 个批次 · {problem.samples} 条样本 · {problem.owner}</small></div><select value={globalStatus[problem.id]} onChange={(event) => setGlobalStatus((current) => ({ ...current, [problem.id]: event.target.value }))}><option>未解决</option><option>处理中</option><option>已解决</option><option>已终止</option></select><button onClick={() => showToast(`已打开 ${problem.id} 的描述、截图与关联记录`)}>查看详情</button></div>)}
              <div className="pool-actions"><button onClick={() => showToast("已关联当前批次问题")}>关联批次问题</button><button onClick={() => showToast("请选择至少两条全局问题后合并")}>合并问题</button><button onClick={() => showToast("已打开描述与截图编辑器")}>编辑描述 / 截图</button></div>
            </article>
          )}
          <div className="stage-next standalone"><span>解决状态和操作日志会进入效率监测。</span><button onClick={() => selectModule("strategy", "strategy-monitor")}>进入数据监测 →</button></div>
      </section>

      <section className={`module-section dashboard-view strategy-module ${strategyStep === "monitor" ? "active-view" : ""}`} id="strategy-monitor">
          <ModuleHeader index="04" tag="DATA MONITORING" title="数据监测" text="从质量、归因和效率三个维度验证策略效果，并形成下一轮策略输入。" />
          <nav className="monitor-tabs">{(["quality", "attribution", "efficiency"] as MonitorView[]).map((view) => <button key={view} className={monitorView === view ? "active" : ""} onClick={() => setMonitorView(view)}>{view === "quality" ? "质量监测" : view === "attribution" ? "归因监测" : "效率监测"}<span>{view === "quality" ? "策略 + 质量指标" : view === "attribution" ? "问题结构与解决率" : "进度、逾期与状态"}</span></button>)}</nav>
          {monitorView === "quality" && (
            <>
              <section className="metric-grid four"><MetricCard label="策略异常率" value="6.8%" delta="-2.1%" detail="少数位置 / 多片段" tone="rose" /><MetricCard label="IoU" value="88.6%" delta="+3.4%" detail="干预后质量" /><MetricCard label="综合准确率" value="92.1%" delta="+2.6%" detail="标签与段落" tone="cyan" /><MetricCard label="短耗时占比" value="2.2%" delta="-0.9%" detail="极端操作" tone="amber" /></section>
              <section className="grid two-one"><article className="panel"><PanelTitle kicker="INTERVENTION EFFECT" title="策略异常率与准确率趋势" text="用干预点验证策略是否真正改善质量。" /><LineChart series={[{ name: "综合准确率", color: "#7357ff", values: [86, 87, 87.8, 88.2, 89.6, 90.8, 92.1] }, { name: "异常率反向值", color: "#15a98c", values: [84, 85.1, 86.3, 87.2, 89, 91.2, 93.2] }]} /></article><article className="panel"><PanelTitle kicker="IMPACT" title="干预效果摘要" /><div className="impact-card"><span>07/21</span><b>完成本轮宣讲与规则移交</b><p>之后 3 天策略异常率下降 2.1pp，综合准确率提升 2.6pp。</p></div><div className="impact-card muted-card"><span>下一动作</span><b>继续观察队列 04</b><p>该队列的多片段异常仍高于整体 1.8pp。</p></div></article></section>
            </>
          )}
          {monitorView === "attribution" && (
            <>
              <section className="metric-grid four"><MetricCard label="问题总数" value="24" delta="+5" detail="本周期新增" tone="ink" /><MetricCard label="人审相关" value="33.3%" detail="执行 + 理解" tone="amber" /><MetricCard label="产品 / 规则" value="58.3%" detail="进入协同链路" /><MetricCard label="已解决率" value="70.8%" delta="+12.5%" detail="含全局问题" tone="cyan" /></section>
              <section className="grid equal"><article className="panel"><PanelTitle kicker="CATEGORY TREND" title="问题分类趋势" text="观察问题结构是否从人审转向产品或规则。" /><LineChart suffix="个" minValue={0} series={[{ name: "产品 / 规则", color: "#7357ff", values: [3, 5, 4, 6, 8, 7, 9] }, { name: "人审", color: "#eda43f", values: [8, 7, 7, 6, 5, 4, 3] }]} /></article><article className="panel"><PanelTitle kicker="CATEGORY SHARE" title="本周期归因构成" /><div className="category-share">{[["产品问题", 29], ["规则问题", 21], ["人审执行", 17], ["人审理解", 16], ["SOP 类", 13], ["无问题", 4]].map(([name, value]) => <div key={String(name)}><span>{name}</span><i><b style={{ width: `${Number(value) * 2.8}%` }} /></i><strong>{value}%</strong></div>)}</div></article></section>
            </>
          )}
          {monitorView === "efficiency" && (
            <>
              <section className="metric-grid four"><MetricCard label="问题解决率" value="70.8%" delta="+12.5%" detail="已完成 / 总问题" tone="cyan" /><MetricCard label="逾期率" value="8.3%" delta="-4.2%" detail="超过 DDL" tone="rose" /><MetricCard label="平均推进率" value="68.2%" delta="+9.6%" detail="流程完成度" /><MetricCard label="平均解决时长" value="2.4天" delta="-0.7天" detail="从定义到完成" tone="amber" /></section>
              <section className="grid two-one"><article className="panel"><PanelTitle kicker="SOLUTION EFFICIENCY" title="解决率、逾期率与推进率" /><LineChart series={[{ name: "解决率", color: "#15a98c", values: [42, 48, 53, 57, 61, 66, 70.8] }, { name: "推进率", color: "#7357ff", values: [38, 44, 49, 55, 59, 64, 68.2] }, { name: "逾期率反向值", color: "#e16a73", values: [82, 84, 85, 87, 88, 90, 91.7] }]} /></article><article className="panel"><PanelTitle kicker="STATUS SNAPSHOT" title="三类问题状态" /><div className="status-matrix">{[["产品", 2, 3, 6], ["人审", 1, 2, 5], ["规则 / SOP", 2, 2, 3]].map(([name, pending, active, done]) => <div key={String(name)}><b>{name}</b><span><i className="wait" />待处理 {pending}</span><span><i className="doing" />处理中 {active}</span><span><i className="done" />已完成 {done}</span></div>)}</div></article></section>
              <section className="grid equal owner-efficiency">
                <article className="panel table-panel">
                  <PanelTitle kicker="OWNER EFFICIENCY" title="负责人推进效率" text="按负责人查看承接量、解决率、推进速度和逾期情况。" />
                  <div className="table-wrap"><table><thead><tr><th>负责人</th><th>承接问题</th><th>已解决率</th><th>平均推进率</th><th>平均解决时长</th><th>逾期</th><th>本周完成</th></tr></thead><tbody>
                    {[["协同角色 01", 8, "87.5%", "82%", "1.8 天", 0, 5], ["协同角色 02", 7, "71.4%", "74%", "2.2 天", 1, 3], ["协同角色 03", 5, "60.0%", "61%", "2.9 天", 1, 2], ["协同角色 04", 4, "50.0%", "56%", "3.4 天", 0, 2]].map((row) => <tr key={String(row[0])}><td><b>{row[0]}</b></td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td>{row[4]}</td><td className={Number(row[5]) > 0 ? "danger-text" : ""}>{row[5]}</td><td>{row[6]}</td></tr>)}
                  </tbody></table></div>
                </article>
                <article className="panel">
                  <PanelTitle kicker="OWNER LOAD" title="负责人 × 问题类型" text="问题承接结构与当前推进负载。" />
                  <div className="owner-load">
                    <div className="owner-load-head"><span /><b>产品</b><b>人审</b><b>规则</b><b>SOP</b></div>
                    {[["角色 01", 82, 34, 58, 22], ["角色 02", 61, 72, 43, 31], ["角色 03", 38, 56, 77, 49], ["角色 04", 29, 41, 52, 68]].map(([owner, ...values]) => <div key={String(owner)}><span>{owner}</span>{values.map((value, index) => <i key={index} style={{ "--load": Number(value) / 100 } as React.CSSProperties}>{value}</i>)}</div>)}
                  </div>
                </article>
              </section>
            </>
          )}
          <article className="loop-complete"><div><span>闭环回流</span><h3>监测结果将成为下一轮异常发现的策略输入</h3><p>当异常率、归因结构或解决效率偏离目标时，系统建议调整策略阈值、抽样范围或协同动作。</p></div><button onClick={() => selectModule("strategy", "strategy-discover")}>开始下一轮 ↗</button></article>
      </section>
    </>
  );

  const currentModules = mainTab === "base"
    ? baseViews.map((view, index) => ({ id: `base-${view.id}`, label: view.label, index: index + 1 }))
    : mainTab === "quality"
      ? qualityViews.map((view, index) => ({ id: `quality-${view.id}`, label: view.label, index: index + 1 }))
      : strategySteps.map((step, index) => ({ id: `strategy-${step.id}`, label: step.label, index: index + 1 }));
  const activeModuleId = mainTab === "base"
    ? `base-${baseView}`
    : mainTab === "quality"
      ? `quality-${qualityView}`
      : `strategy-${strategyStep}`;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => switchMain("base")}><span className="brand-mark">A</span><span><b>Atlas</b><small>广告审核质量看板</small></span></button>
        <div className="sidebar-label">DASHBOARD</div>
        <nav className="main-nav" aria-label="主导航">
          {mainTabs.map((tab) => <button key={tab.id} className={mainTab === tab.id ? "active" : ""} onClick={() => switchMain(tab.id)}><span>{tab.index}</span><div><b>{tab.label}</b><small>{tab.desc}</small></div>{tab.id === "strategy" && <em>CORE</em>}</button>)}
        </nav>
        <div className="sidebar-flow">
          <span>{mainTabs.find((tab) => tab.id === mainTab)?.label}板块</span>
          {currentModules.map((module) => <button key={module.id} className={activeModuleId === module.id ? "active" : ""} onClick={() => selectModule(mainTab, module.id)}><i>{module.index}</i>{module.label}</button>)}
        </div>
        <div className="environment"><i /><div><b>数据状态正常</b><p>最近更新：今天 10:42</p></div></div>
        <div className="sidebar-summary"><span>本周任务</span><b>24</b><p>17 个问题已完成 · 2 个问题逾期</p></div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div><span>广告审核质量 / <b>{mainTabs.find((tab) => tab.id === mainTab)?.label}</b></span><h1>广告审核质量看板</h1></div>
          <div className="top-actions"><button onClick={() => showToast("当前视图已导出")}>导出当前页</button><button onClick={refreshDashboard}>刷新数据</button><span className="last-update">更新于 2 分钟前</span><span className="avatar">QS</span></div>
        </header>
        <div className="content">
          {mainTab === "base" && renderBase()}
          {mainTab === "quality" && renderQuality()}
          {mainTab === "strategy" && renderStrategy()}
          <footer><div><span className="brand-mark small">A</span><b>Atlas Quality Operations</b></div><p>广告审核质量看板</p><span>Quality · Strategy · Efficiency</span></footer>
        </div>
      </section>

      {selectedSample && (
        <div className="modal-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedSample(null); }}>
          <section className="sample-drawer" role="dialog" aria-modal="true" aria-labelledby="sample-title">
            <header><div><span>SAMPLE EVIDENCE</span><h2 id="sample-title">异常样本详情</h2></div><button onClick={() => setSelectedSample(null)}>×</button></header>
            <div className="sample-id"><span className="mono">{selectedSample.id}</span><em className={`risk risk-${selectedSample.risk}`}>{selectedSample.risk}风险</em></div>
            <div className="fake-video"><div className="video-grid" /><span>▶</span><b>内容预览</b><small>00:36 / {selectedSample.duration}</small></div>
            <div className="segment-track"><span>0s</span><i><em style={{ left: "8%", width: "24%" }} /><em style={{ left: "39%", width: "17%" }} /><em style={{ left: "64%", width: "28%" }} /></i><span>{selectedSample.duration}</span></div>
            <div className="sample-facts"><div><span>标签</span><b>{selectedSample.label}</b></div><div><span>标记组合</span><b>{selectedSample.marker}</b></div><div><span>异常信号</span><b>{strategyId === "A" ? selectedSample.signal : `${selectedSample.segments} 个片段`}</b></div><div><span>队列 / 角色</span><b>{selectedSample.channel} · {selectedSample.auditor}</b></div></div>
            <div className="evidence-box"><span>判定证据</span><p>{strategyId === "A" ? "该标签在当前队列以 ASR 标记为主，本样本采用少数位置方式，且同时出现辅助信号，建议通过录屏确认操作路径。" : "同一元素、同一标签下出现多段相邻片段，数量超过策略阈值，需要区分产品重叠、合理重复或人工操作问题。"}</p></div>
            <div className="drawer-actions"><button onClick={() => setSelectedSample(null)}>关闭</button><button className="primary-button" onClick={() => { setTrackedSamples((current) => Array.from(new Set([...current, selectedSample.id]))); setSelectedSample(null); showToast("样本已加入跟台池"); }}>加入跟台池</button></div>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
