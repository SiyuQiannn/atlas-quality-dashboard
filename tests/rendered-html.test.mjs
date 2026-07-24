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

test("server-renders the privacy-safe three-tab dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Atlas · 广告审核质量看板演示<\/title>/);
  assert.match(html, /基础数据/);
  assert.match(html, /质量数据/);
  assert.match(html, /策略数据/);
  assert.match(html, /异常发现/);
  assert.match(html, /问题定义/);
  assert.match(html, /问题解决/);
  assert.match(html, /数据监测/);
  assert.match(html, /DEMO ONLY/);
  assert.match(html, /og-v2\.png/);
  assert.doesNotMatch(html, /公司内部|真实业务数据/);
});

test("keeps all dashboard modules and social preview in the source artifact", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
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

  assert.match(page, /所有数据均|虚构数据|名称、数值、样本、策略阈值均为虚构/);
  assert.match(layout, /广告审核质量看板/);
  assert.match(layout, /og-v2\.png/);
});
