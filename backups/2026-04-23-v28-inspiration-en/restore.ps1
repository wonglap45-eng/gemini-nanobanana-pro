# v28 一键恢复脚本
# 用法: .\backups\2026-04-23-v28-inspiration-en\restore.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$bakDir = Join-Path $root "backups\2026-04-23-v28-inspiration-en"

Write-Host ">>> 恢复 v28 备份 (灵感启发中英双语面板)" -ForegroundColor Cyan

Copy-Item "$bakDir\page.tsx.bak" "$root\app\nano\page.tsx" -Force
Write-Host "[OK] page.tsx 已恢复" -ForegroundColor Green

Set-Location $root
Write-Host ">>> 部署到 Vercel..." -ForegroundColor Yellow
vercel --prod --yes
Write-Host ">>> 完成!" -ForegroundColor Green
