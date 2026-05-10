<#
.SYNOPSIS
    Deploy a single CMS (or all of them) to Coolify on the cms-demo VM.

.DESCRIPTION
    Streams tools/coolify/* to the VM at /tmp/cms-deploy via tar-over-ssh, then runs
    deploy.sh which calls the PHP deployer inside the coolify container.

    The deployer is idempotent: rerunning on an already-deployed CMS preserves all
    {{secret_pin}} values (no admin logout, no DB encryption-key churn) and triggers
    a fresh deploy with force_rebuild=false unless -ForceRebuild is passed.

.PARAMETER Cms
    The CMS key from cms.manifest.yml (e.g. directus, ghost, payloadcms, appwrite).
    Mutually exclusive with -All.

.PARAMETER All
    Deploy every CMS declared in cms.manifest.yml, sequentially.

.PARAMETER ForceRebuild
    Pass force_rebuild=true to Coolify so the build cache is dropped (useful after
    Dockerfile / source changes).

.PARAMETER NoPoll
    Skip polling for deployment status — fire-and-forget.

.EXAMPLE
    .\tools\coolify\deploy.ps1 directus
    .\tools\coolify\deploy.ps1 payloadcms -ForceRebuild
    .\tools\coolify\deploy.ps1 -All
#>
[CmdletBinding(DefaultParameterSetName='Single')]
param(
    [Parameter(ParameterSetName='Single', Position=0, Mandatory=$true)]
    [string]$Cms,
    [Parameter(ParameterSetName='All', Mandatory=$true)]
    [switch]$All,
    [switch]$ForceRebuild,
    [switch]$NoPoll
)

$ErrorActionPreference = 'Stop'

$ToolsDir   = Split-Path -Parent $PSCommandPath
$VmTarget   = 'debian@10.10.101.20'
$JumpHost   = 'proxmox'
$RemoteDir  = '/tmp/cms-deploy'

function Sync-Tools {
    Write-Host "[deploy.ps1] streaming tools/ to $VmTarget`:$RemoteDir ..."
    ssh -J $JumpHost $VmTarget "rm -rf $RemoteDir && mkdir -p $RemoteDir" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "remote prep failed (exit $LASTEXITCODE)" }
    # tar-over-ssh — Windows 10+ ships bsdtar.
    & tar c -C $ToolsDir . | ssh -J $JumpHost $VmTarget "tar x -C $RemoteDir"
    if ($LASTEXITCODE -ne 0) { throw "tar pipe failed (exit $LASTEXITCODE)" }
}

function Invoke-Deploy([string]$cmsKey) {
    $flags = @()
    if ($ForceRebuild) { $flags += '--force' }
    if ($NoPoll)       { $flags += '--no-poll' }
    $flagStr = $flags -join ' '
    Write-Host "[deploy.ps1] deploying $cmsKey ..." -ForegroundColor Cyan
    ssh -J $JumpHost $VmTarget "sudo bash $RemoteDir/deploy.sh $cmsKey $flagStr"
    if ($LASTEXITCODE -ne 0) { throw "$cmsKey deploy failed (exit $LASTEXITCODE)" }
}

# Always sync first.
Sync-Tools

if ($PSCmdlet.ParameterSetName -eq 'All') {
    # Read the manifest to find every key. Use a tiny ssh exec rather than parse YAML
    # in PowerShell.
    $list = ssh -J $JumpHost $VmTarget "sudo docker exec coolify php -r 'echo implode(chr(10), array_keys(Symfony\Component\Yaml\Yaml::parseFile(\"$RemoteDir/cms.manifest.yml\")[\"cmss\"]));'"
    if ($LASTEXITCODE -ne 0) { throw "manifest read failed" }
    $cmsKeys = $list -split "`n" | Where-Object { $_ -ne '' }
    foreach ($k in $cmsKeys) { Invoke-Deploy $k }
} else {
    Invoke-Deploy $Cms
}
