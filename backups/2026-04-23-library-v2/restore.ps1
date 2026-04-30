# ============================================
# 一键恢复脚本 - 模板库 v2（编号+固定索引版）
# 用法: .\restore.ps1
# 然后运行: cd gemini-nanobanana-pro; vercel --prod --yes
# ============================================
$ErrorActionPreference = "Stop"
$base = Split-Path -Parent $MyInvocation.MyCommand.Path

$files = @{
  "page.tsx"              = "app\nano\page.tsx"
  "library-page.tsx"      = "app\nano\library\page.tsx"
  "library-search-route.ts" = "app\api\library-search\route.ts"
}

$proj = "c:\Users\Cusow\Documents\GitHub\gemini-nanobanana-pro"

foreach ($entry in $files.GetEnumerator()) {
  $src = Join-Path $base $entry.Key
  $dst = Join-Path $proj $entry.Value
  Copy-Item -Path $src -Destination $dst -Force
  Write-Host "[OK] Restored: $($entry.Key) -> $($entry.Value)" -ForegroundColor Green
}

Write-Host "`n=== 恢复完成！3个文件已还原 ===" -ForegroundColor Cyan
Write-Host "下一步: cd c:\Users\Cusow\Documents\GitHub\gemini-nanobanana-pro && vercel --prod --yes`n" -ForegroundColor Yellow
