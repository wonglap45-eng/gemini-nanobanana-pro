# 模板库 v2 备份 - 2026-04-23 22:06

## 版本特征
- **固定编号系统**：每个模板的编号 = 在原始 JSON 数组中的位置（1-based）
- **每页 30 条**（从 60 改为 30，加载更快，总页数 420）
- **编号查找**：支持输入纯数字编号直接定位模板
- **搜索结果带缩略图 + 固定编号**

## 备份文件清单
| 文件 | 源路径 |
|------|--------|
| page.tsx | app/nano/page.tsx（主页面：搜索面板+编号查找）|
| library-page.tsx | app/nano/library/page.tsx（模板库主页网格）|
| library-search-route.ts | app/api/library-search/route.ts（搜索API）|

## 核心改动点 vs v1
1. `library-page.tsx`:
   - `PAGE_SIZE`: 60 → 30
   - 新增 `TEMPLATE_INDEX_MAP`（ID→固定索引映射）
   - 卡片标题行新增绿色 `#编号` 徽章（用 `fixedIndex` 而非动态序号）

2. `page.tsx`:
   - 类型定义加 `index: number`
   - 搜索结果编号用 `t.index`（API 返回的固定值）
   - 编号查找匹配逻辑：`r.index === parseInt(id) || r.id === id`
   - 查找结果显示 `#{templateByIdResult.index}` 而非 `ID: xxx`

3. `library-search/route.ts`:
   - 新增纯数字快速路径 `/^\d+/` → 直接按数组索引定位
   - 返回结果新增 `index` 字段

## 一键恢复
```powershell
cd c:\Users\Cusow\Documents\GitHub\gemini-nanobanana-pro
.\backups\2026-04-23-library-v2\restore.ps1
vercel --prod --yes
```
