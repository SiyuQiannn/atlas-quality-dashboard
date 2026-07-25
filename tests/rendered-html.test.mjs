import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the three-page dashboard with base data as default", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Atlas · 广告审核质量看板<\/title>/);
  assert.match(html, /基础数据/);
  assert.match(html, /质量数据/);
  assert.match(html, /策略数据/);
  assert.match(html, /数据概览/);
  assert.match(html, /标签分布分析/);
  assert.match(html, /单元素分析/);
  assert.match(html, /片段聚类数据/);
  assert.match(html, /og-v3\.png/);
  assert.doesNotMatch(html, /脱敏|演示|面试|不连接公司系统|DEMO ONLY/);
});

test("keeps all dashboard modules visible, chart-led, and anchored in the source artifact", async () => {
  const [page, layout, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    access(new URL("../public/og-v2.png", import.meta.url)),
  ]);

  for (const label of [
    "数据概览",
    "标签分布分析",
    "单元素分析",
    "片段聚类数据",
    "质量指标",
    "异常时长片段",
    "异常发现",
    "问题定义",
    "问题解决",
    "数据监测",
    "质量监测",
    "归因监测",
    "效率监测",
    "全局问题池",
  ]) {
    assert.match(page, new RegExp(label));
  }

  assert.match(layout, /广告审核质量看板/);
  assert.match(layout, /og-v3\.png/);
  assert.match(page, /strategyStep === "discover"/);
  assert.match(page, /strategyStep === "define"/);
  assert.match(page, /strategyStep === "solve"/);
  assert.match(page, /strategyStep === "monitor"/);
  assert.match(page, /dashboard-view/);
  assert.match(page, /scrollIntoView/);
  assert.match(styles, /\.dashboard-view,\s*\.dashboard-view\.active-view\s*\{\s*display: block/);
  assert.match(styles, /chart-sweep|ring-enter|bar-grow|heat-pop/);
  assert.doesNotMatch(page, /<Filters|function Filters|filter-bar|strategy-toolbar/);
  assert.doesNotMatch(page, /intro-stat|loop-badge|activeSection|scrollToSection|DESENSITIZED/);
  assert.doesNotMatch(page, /脱敏|演示|面试|不连接公司系统|DEMO ONLY/);
  assert.doesNotMatch(layout, /脱敏|演示|面试|作品集/);
});
