<#
  dsh-breach 卸载器。

  只做三件：从每个 profile 的 dependencies / bundles 去掉本插件、删 node_modules 里那条登记。
  保留数据目录（.dsh\dsh-breach：备份、状态、补丁记录）和其它插件，供事后核对或重装。

  用法：
    powershell -ExecutionPolicy Bypass -File uninstall.ps1
    powershell -ExecutionPolicy Bypass -File uninstall.ps1 -DryRun

  卸载不动宿主源码。宿主上的补丁要先在面板里「还原」，否则会留在原地。
#>
[CmdletBinding()]
param(
    [string]$DshRoot = (Join-Path $env:USERPROFILE '.dsh'),
    [switch]$DryRun,
    [switch]$RemoveData
)

$ErrorActionPreference = 'Stop'
$pluginName = 'dsh-breach'
$utf8 = [Text.UTF8Encoding]::new($false)
$token = [Guid]::NewGuid().ToString('N')

function Fail($message) { throw "[uninstall] $message" }

function Get-RealPath([string]$path) {
    $full = [IO.Path]::GetFullPath($path)
    if (Test-Path -LiteralPath $full) { return (Get-Item -LiteralPath $full).FullName }
    $full
}

function Assert-NotReparse([string]$path, [string]$label) {
    if (-not (Test-Path -LiteralPath $path)) { return }
    if ([IO.File]::GetAttributes($path) -band [IO.FileAttributes]::ReparsePoint) { Fail "$label 不能是链接：$path" }
}

function Write-Atomic([string]$path, [string]$text) {
    $temp = "$path.tmp-$token"
    [IO.File]::WriteAllText($temp, $text, $utf8)
    Move-Item -LiteralPath $temp -Destination $path -Force
}

$dsh = Get-RealPath $DshRoot
$profilesRoot = Join-Path $dsh 'profiles'
$dataDir = Join-Path $dsh $pluginName

if (-not (Test-Path -LiteralPath $profilesRoot -PathType Container)) { Fail "没找到 DSH profiles：$profilesRoot" }

# 全部 profile 先解析完再动手，坏 JSON 不变 null
$plans = @()
foreach ($profile in (Get-ChildItem -LiteralPath $profilesRoot -Directory -Force)) {
    $dir = $profile.FullName
    $pkgPath = Join-Path $dir 'package.json'
    if (-not (Test-Path -LiteralPath $pkgPath)) { continue }

    Assert-NotReparse $dir 'profile 目录'
    Assert-NotReparse $pkgPath 'profile package.json'

    $text = Get-Content -LiteralPath $pkgPath -Raw -Encoding UTF8
    try { $pkg = $text | ConvertFrom-Json -ErrorAction Stop }
    catch { Fail "profile JSON 无效，未做任何修改：$pkgPath" }
    if (-not $pkg -or $pkg -is [array] -or $pkg -is [string] -or $pkg -is [ValueType]) {
        Fail "profile 必须是 JSON 对象，未做任何修改：$pkgPath"
    }

    $hasDep = $pkg.dependencies -and ($pkg.dependencies.PSObject.Properties.Name -contains $pluginName)
    $hasBundle = $pkg.dsh -and $pkg.dsh.profile -and (@($pkg.dsh.profile.bundles) -contains $pluginName)
    if (-not $hasDep -and -not $hasBundle) { continue }

    if ($hasDep) { $pkg.dependencies.PSObject.Properties.Remove($pluginName) }
    if ($hasBundle) { $pkg.dsh.profile.bundles = @($pkg.dsh.profile.bundles | Where-Object { $_ -and $_ -ne $pluginName }) }

    $entry = Join-Path (Join-Path $dir 'node_modules') $pluginName
    $plans += [pscustomobject]@{
        Dir = $dir; Path = $pkgPath; BeforeText = $text
        AfterText = ($pkg | ConvertTo-Json -Depth 100 -WarningAction Stop) + [Environment]::NewLine
        Entry = $entry
    }
}

if (-not $plans.Count) { Write-Host "[uninstall] 没有 profile 登记 $pluginName，什么都没改。"; return }

Write-Host "[uninstall] $($plans.Count) 个 profile 将去除登记"
foreach ($plan in $plans) { Write-Host "  - $($plan.Path)" }

if ($DryRun) { Write-Host "[uninstall] -DryRun：没写任何文件。"; return }

$written = @()
try {
    foreach ($plan in $plans) {
        Copy-Item -LiteralPath $plan.Path -Destination "$($plan.Path).bak-uninstall-$token" -Force
        Write-Atomic $plan.Path $plan.AfterText

        $check = Get-Content -LiteralPath $plan.Path -Raw -Encoding UTF8 | ConvertFrom-Json -ErrorAction Stop
        if ($check.dsh.profile.bundles -contains $pluginName) { Fail "回读校验失败（bundles 仍在）：$($plan.Path)" }
        $written += $plan

        # link 安装删的是链接本身；实体目录一并删（数据目录不动）
        if (Test-Path -LiteralPath $plan.Entry) {
            Remove-Item -LiteralPath $plan.Entry -Recurse -Force
            Write-Host "  删 $($plan.Entry)"
        }
    }
}
catch {
    Write-Warning "[uninstall] 出错，回滚已写入的 profile"
    foreach ($plan in $written) { Write-Atomic $plan.Path $plan.BeforeText }
    throw
}

if ($RemoveData -and (Test-Path -LiteralPath $dataDir)) {
    $backups = Join-Path $dataDir 'host-backups'
    if ((Test-Path -LiteralPath $backups) -and (Get-ChildItem -LiteralPath $backups -Force | Select-Object -First 1)) {
        Write-Warning "宿主补丁的备份还在 $backups，删掉就回不去了。宿主上没还原过就先别删，或确认已手动留存。"
    }
    Remove-Item -LiteralPath $dataDir -Recurse -Force
    Write-Host "[uninstall] 已删数据目录 $dataDir"
} elseif (Test-Path -LiteralPath $dataDir) {
    Write-Host "[uninstall] 数据目录保留：$dataDir"
}

$next = @(
    ''
    '下一步：'
    '  1. 在 profile 目录跑一次 pnpm install，清掉 lockfile 里的引用'
    '  2. 重启 dsh'
    ''
    '宿主上已应用的补丁不会自动还原——要还原先在面板点「还原」，再卸载。'
)
Write-Host ($next -join [Environment]::NewLine)
