# NanoBanana Pro 一键恢复脚本
# 用法：右键 → 使用 PowerShell 运行
# 效果：恢复到 stable 版本 → 推送到 GitHub → Vercel 自动部署

Write-Host "========================================" -ForegroundColor Green
Write-Host " NanoBanana Pro 一键恢复" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$repoPath = "C:\Users\Cusow\Documents\GitHub\gemini-nanobanana-pro"

# 尝试多个可能的 git 路径
$gitPaths = @(
    "C:\Users\Cusow\AppData\Local\GitHubDesktop\app-3.5.7\resources\app\git\cmd\git.exe",
    "C:\Program Files\Git\bin\git.exe",
    "git"
)

$gitExe = $null
foreach ($path in $gitPaths) {
    if (Test-Path $path) {
        $gitExe = $path
        break
    }
}

if (-not $gitExe) {
    Write-Host "ERROR: 找不到 git.exe" -ForegroundColor Red
    Read-Host "按 Enter 退出"
    exit 1
}

Write-Host "Git: $gitExe" -ForegroundColor Gray

# Step 1: 重置到 stable tag
Write-Host "[1/3] 重置到 stable 版本..." -ForegroundColor Yellow
Push-Location $repoPath
try {
    & $gitExe checkout stable 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: git checkout 失败" -ForegroundColor Red
        Pop-Location
        Read-Host "按 Enter 退出"
        exit 1
    }
    Write-Host "  已重置到 stable (commit 611aa29)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Pop-Location
    Read-Host "按 Enter 退出"
    exit 1
}

# Step 2: 强制推送
Write-Host "[2/3] 推送到 GitHub..." -ForegroundColor Yellow
try {
    & $gitExe push origin main --force 2>&1 | Out-Null
    Write-Host "  推送成功" -ForegroundColor Green
} catch {
    Write-Host "WARNING: 推送可能失败，请检查 GitHub Desktop" -ForegroundColor Yellow
}

# Step 3: 完成
Pop-Location
Write-Host "[3/3] 完成！" -ForegroundColor Green
Write-Host ""
Write-Host "Vercel 将自动检测并部署。1-2 分钟后刷新：" -ForegroundColor Cyan
Write-Host "https://gemini-nanobanana-pro.vercel.app/nano" -ForegroundColor White
Write-Host ""
Write-Host "⚠️ 请确认 Vercel 环境变量已设置：" -ForegroundColor Yellow
Write-Host "   GEMINI_API_KEY" -ForegroundColor Gray
Write-Host "   OPENROUTER_API_KEY" -ForegroundColor Gray
Write-Host ""

Read-Host "按 Enter 退出"
