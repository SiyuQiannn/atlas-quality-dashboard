# Atlas 广告审核质量看板

面向广告审核质量运营场景的数据产品，覆盖基础数据分析、质量诊断、策略闭环和运营洞察。

[在线查看 Atlas 看板](https://siyuqiannn.github.io/atlas-quality-dashboard/)

## 核心能力

- 基础数据：数据概览、标签分布、单元素分析和片段聚类。
- 质量数据：质量指标、异常时长片段、根因诊断及审核员表现定位。
- 策略数据：异常发现、问题定义、问题解决、效果监测的完整闭环。
- 运营洞察：产能效率、风险画像和跨团队协同健康。
- 交互下钻：支持从标签、团队、通道、审核员和异常元素进入视频片段证据详情。

## 策略闭环

1. 通过标签迁移、多片段、极端时长和质量突降发现异常样本。
2. 结合录屏、打标片段与审核记录完成问题归因。
3. 将问题聚合后分配负责人，跟踪处理、验证与全局问题沉淀。
4. 监测质量、归因和解决效率，并将结果回流至下一轮策略。

## 技术实现

- Next.js / React / TypeScript
- CSS 数据可视化与动态交互
- vinext / Cloudflare Workers
- GitHub Pages 自动部署
- Node.js 原生回归测试

## 本地运行

```bash
pnpm install
pnpm run dev
```

构建与检查：

```bash
pnpm run build
pnpm run lint
node --test tests/rendered-html.test.mjs
```
