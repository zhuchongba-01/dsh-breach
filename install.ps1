<#
  dsh-breach 安装器。

  把本目录登记进每个含 package.json 的 DSH profile：dependencies 一条 + bundles 一条，
  失败不留半成品。全部 preflight 只读，任何一步不通过就整体不落盘。

  用法：
    powershell -ExecutionPolicy Bypass -File install.ps1              # 装成 link（跟随本目录改动）
    powershell -ExecutionPolicy Bypass -File install.ps1 -Mode tarball # 装成 GitHub 归档（发布用）
    powershell -ExecutionPolicy Bypass -File install.ps1 -DryRun      # 只打印计划
    powershell -ExecutionPolicy Bypass -File install.ps1 -Force       # 覆盖已存在的同名条目

  装完还得手动跑一次 pnpm install 并重启宿主，脚本不代劳（见结尾提示）。
#>
[CmdletBinding()]
param(
    [string]$DshRoot = (Join-Path $env:USERPROFILE '.dsh'),
    [string]$PluginRoot,
    [ValidateSet('link', 'tarball')][string]$Mode = 'link',
    [switch]$DryRun,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$pluginName = 'dsh-breach'
$utf8 = [Text.UTF8Encoding]::new($false)
$token = [Guid]::NewGuid().ToString('N')
$tarball = 'https://codeload.github.com/zhuchongba-01/dsh-breach/tar.gz/refs/heads/master'

function Fail($message) { throw "[install] $message" }

function Get-RealPath([string]$path) {
    $full = [IO.Path]::GetFullPath($path)
    if (Test-Path -LiteralPath $full) { return (Get-Item -LiteralPath $full).FullName }
    $full
}

function Assert-NotReparse([string]$path, [string]$label) {
    if (-not (Test-Path -LiteralPath $path)) { return }
    $attrs = [IO.File]::GetAttributes($path)
    if ($attrs -band [IO.FileAttributes]::ReparsePoint) { Fail "$label 不能是链接：$path" }
}

function Get-Hash([string]$path) {
    (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
}

function Write-Atomic([string]$path, [string]$text) {
    $temp = "$path.tmp-$token"
    [IO.File]::WriteAllText($temp, $text, $utf8)
    Move-Item -LiteralPath $temp -Destination $path -Force
}

# ── 1. 只读 preflight ───────────────────────────────────────────────

# $PSScriptRoot 在 param 默认值里求值时还不一定有值，这里补
if (-not $PluginRoot) { $PluginRoot = $PSScriptRoot }
if (-not $PluginRoot) { Fail '无法确定脚本所在目录，请加 -PluginRoot 指定插件目录' }

$dsh = Get-RealPath $DshRoot
$source = Get-RealPath $PluginRoot
$profilesRoot = Join-Path $dsh 'profiles'

if (-not (Test-Path -LiteralPath (Join-Path $source 'package.json'))) { Fail "插件根目录没有 package.json：$source" }
if (-not (Test-Path -LiteralPath (Join-Path $source 'cordis.patch.yml'))) { Fail "插件根目录没有 cordis.patch.yml：$source" }

$manifest = Get-Content -LiteralPath (Join-Path $source 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest.name -ne $pluginName) { Fail "package.json 的 name 是 $($manifest.name)，不是 $pluginName" }
$version = [string]$manifest.version

$dependencyValue = if ($Mode -eq 'link') { 'link:' + ($source -replace '\\', '/') } else { $tarball }
if ($Mode -eq 'link') { Assert-NotReparse $source '插件目录' }

if (-not (Test-Path -LiteralPath $profilesRoot -PathType Container)) { Fail "没找到 DSH profiles：$profilesRoot（先正常启动一次 dsh）" }

$hostVersion = $null
$candidates = @()
if ($env:DSH_APP_DIR) { $candidates += (Join-Path $env:DSH_APP_DIR 'package.json') }
$proc = Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($proc -and $proc.Path) { $candidates += (Join-Path (Split-Path $proc.Path -Parent) 'resources\app\dsh\package.json') }
foreach ($root in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA)) {
    if ($root) { $candidates += (Join-Path $root 'Deepseek Harness\resources\app\dsh\package.json') }
}
foreach ($candidate in $candidates) {
    if (-not (Test-Path -LiteralPath $candidate)) { continue }
    try { $hostVersion = (Get-Content -LiteralPath $candidate -Raw -Encoding UTF8 | ConvertFrom-Json).version } catch {}
    if ($hostVersion) { break }
}

$profileDirs = @(Get-ChildItem -LiteralPath $profilesRoot -Directory -Force |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'package.json') })
if (-not $profileDirs.Count) { Fail "没有含 package.json 的 profile：$profilesRoot" }

# 每个 profile 先整份解析并算好目标 JSON，坏 JSON 绝不变 null
$plans = @()
foreach ($profile in $profileDirs) {
    $dir = $profile.FullName
    Assert-NotReparse $dir 'profile 目录'
    if (Test-Path -LiteralPath (Join-Path $dir 'node_modules')) { Assert-NotReparse (Join-Path $dir 'node_modules') 'node_modules' }

    $pkgPath = Join-Path $dir 'package.json'
    Assert-NotReparse $pkgPath 'profile package.json'
    $before = Get-Hash $pkgPath
    $text = Get-Content -LiteralPath $pkgPath -Raw -Encoding UTF8

    try { $pkg = $text | ConvertFrom-Json -ErrorAction Stop }
    catch { Fail "profile JSON 无效，未做任何修改：$pkgPath" }
    if (-not $pkg -or $pkg -is [array] -or $pkg -is [string] -or $pkg -is [ValueType]) {
        Fail "profile 必须是 JSON 对象，未做任何修改：$pkgPath"
    }

    $existing = $null
    if ($pkg.dependencies) { $existing = $pkg.dependencies.$pluginName }
    if ($existing -and -not $Force) {
        Fail "$($dir) 里已登记过 $pluginName（$existing）。要覆盖加 -Force。"
    }

    if (-not $pkg.dependencies) { $pkg | Add-Member -NotePropertyName dependencies -NotePropertyValue ([pscustomobject]@{}) -Force }
    $deps = $pkg.dependencies
    if ($deps.PSObject.Properties.Name -contains $pluginName) { $deps.$pluginName = $dependencyValue }
    else { $deps | Add-Member -NotePropertyName $pluginName -NotePropertyValue $dependencyValue -Force }

    if (-not $pkg.dsh) { $pkg | Add-Member -NotePropertyName dsh -NotePropertyValue ([pscustomobject]@{}) -Force }
    if (-not $pkg.dsh.profile) { $pkg.dsh | Add-Member -NotePropertyName profile -NotePropertyValue ([pscustomobject]@{}) -Force }
    $bundles = @($pkg.dsh.profile.bundles | Where-Object { $_ })
    if ($bundles -notcontains $pluginName) { $bundles += $pluginName }
    # 没有 bundles 属性时直接赋值会抛「属性找不到」，必须 Add-Member
    if ($pkg.dsh.profile.PSObject.Properties.Name -contains 'bundles') { $pkg.dsh.profile.bundles = $bundles }
    else { $pkg.dsh.profile | Add-Member -NotePropertyName bundles -NotePropertyValue $bundles -Force }

    $after = ($pkg | ConvertTo-Json -Depth 100 -WarningAction Stop) + [Environment]::NewLine
    $plans += [pscustomobject]@{
        Dir = $dir; Path = $pkgPath; Before = $before; BeforeText = $text; AfterText = $after
    }
}

Write-Host "[install] $pluginName $version → $($plans.Count) 个 profile"
Write-Host "[install] 依赖值：$dependencyValue"
if ($hostVersion) {
    Write-Host "[install] 宿主版本：$hostVersion"
    # 版本白名单只在 lib/host-range.json 里维护一份，这里不写死任何版本号。
    $rangeTable = $null
    $rangePath = Join-Path $PSScriptRoot 'lib\host-range.json'
    if (Test-Path -LiteralPath $rangePath) {
        try { $rangeTable = Get-Content -LiteralPath $rangePath -Raw -Encoding UTF8 | ConvertFrom-Json } catch {}
    }
    $isVerified = $false
    if ($rangeTable -and $rangeTable.verified) {
        $isVerified = @($rangeTable.verified) -contains $hostVersion
    }
    if (-not $isVerified) {
        $known = if ($rangeTable -and $rangeTable.verified) { (@($rangeTable.verified) -join ' / ') } else { '(没读到 lib/host-range.json)' }
        Write-Warning "[install] 宿主 $hostVersion 不在已验证列表（$known）里，补丁锚点对不上会进待适配"
    }
}

if ($DryRun) {
    foreach ($plan in $plans) { Write-Host "`n--- $($plan.Path)`n$($plan.AfterText)" }
    Write-Host "`n[install] -DryRun：没写任何文件。"
    return
}

# ── 2. 备份 + 原子写 + 回读校验 ─────────────────────────────────────

$records = @()
try {
    foreach ($plan in $plans) {
        $nm = Join-Path $plan.Dir 'node_modules'
        $entry = Join-Path $nm $pluginName
        $saved = Join-Path $nm ".entry-bak-$token"
        $record = [pscustomobject]@{ Plan = $plan; Entry = $entry; Saved = $saved; Old = $false; New = $false; Wrote = $false }
        $records += $record

        # preflight 到此刻之间 profile 可能被别的进程改过，动手前再比一次哈希
        if ((Get-Hash $plan.Path) -ne $plan.Before) { Fail "profile 在检查之后被改动过，重跑安装：$($plan.Path)" }

        Copy-Item -LiteralPath $plan.Path -Destination "$($plan.Path).bak-install-$token" -Force
        Write-Atomic $plan.Path $plan.AfterText
        $record.Wrote = $true

        $check = Get-Content -LiteralPath $plan.Path -Raw -Encoding UTF8 | ConvertFrom-Json -ErrorAction Stop
        if (@($check.dsh.profile.bundles) -notcontains $pluginName) { Fail "回读校验失败（bundles 未落）：$($plan.Path)" }
        if (-not $check.dependencies.$pluginName) { Fail "回读校验失败（dependencies 未落）：$($plan.Path)" }

        # link 模式自己把 node_modules 那条建好，不等 pnpm —— 否则 profile 指向一个
        # 还不存在的条目，宿主加载直接失败。pnpm install 之后会把它换成等价链接。
        if ($Mode -eq 'link') {
            New-Item -ItemType Directory -Path $nm -Force | Out-Null
            if (Test-Path -LiteralPath $entry) { Move-Item -LiteralPath $entry -Destination $saved; $record.Old = $true }
            New-Item -ItemType Junction -Path $entry -Target $source | Out-Null
            $record.New = $true
            if (-not (Test-Path -LiteralPath (Join-Path $entry 'package.json'))) {
                Fail "node_modules 条目建不起来，读不到 package.json：$entry"
            }
        }
    }
}
catch {
    Write-Warning "[install] 出错，回滚"
    foreach ($record in $records) {
        if ($record.New -and (Test-Path -LiteralPath $record.Entry)) { [IO.Directory]::Delete($record.Entry) }
        if ($record.Old -and (Test-Path -LiteralPath $record.Saved)) { Move-Item -LiteralPath $record.Saved -Destination $record.Entry }
        if ($record.Wrote) { Write-Atomic $record.Plan.Path $record.Plan.BeforeText }
    }
    throw
}

Write-Host "[install] 已登记 $($plans.Count) 个 profile，备份后缀 .bak-install-$token"
$next = @(
    ''
    '下一步：'
    '  1. 重启 dsh —— node_modules 那条已经建好，不跑 pnpm 也加载得起来'
    '  2. 建议补跑一次 pnpm install，让 lockfile 跟上（会把链接换成等价形式）：'
    '       $pnpm = Get-ChildItem "$env:USERPROFILE\.dsh" -Recurse -Filter pnpm.cjs -ErrorAction SilentlyContinue | Where-Object { $_.FullName -like ''*dependencies\pnpm\bin\*'' } | Select-Object -First 1'
    '       node $pnpm.FullName install'
    '  3. 会话标题旁 dsh-breach → 清洗 → 应用'
    ''
    '回滚：删掉 profile 里 dependencies/bundles 那两条，再跑一次 pnpm install。'
)
Write-Host ($next -join [Environment]::NewLine)
