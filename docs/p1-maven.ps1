param([ValidateSet('verify','dependencies','status')][string]$Task='verify', [string]$EvidenceDirectory='docs/p1-evidence')
$ErrorActionPreference='Stop'
$workspace=Split-Path $PSScriptRoot -Parent
$jdk=Get-Content -Raw (Join-Path $workspace '.p1-local/jdk.json') | ConvertFrom-Json
$database=Get-Content -Raw (Join-Path $workspace '.p1-local/database.json') | ConvertFrom-Json
# Process-local variables only. No setx or system PATH/JAVA_HOME changes.
$env:JAVA_HOME=$jdk.javaHome
$env:PATH=(Join-Path $jdk.javaHome 'bin')+';'+$env:PATH
$env:LAB_DB_URL="jdbc:mysql://127.0.0.1:$($database.port)/$($database.database)?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=UTF-8"
$env:LAB_DB_USER=$database.username
$env:LAB_DB_PASSWORD=$database.password
$project=Join-Path $workspace 'experiments/p1-legacy-lab/pom.xml'
$repository=Join-Path $workspace '.p1-local/m2'
$evidence=[IO.Path]::GetFullPath((Join-Path $workspace $EvidenceDirectory))
if (!$evidence.StartsWith((Join-Path $workspace 'docs')+[IO.Path]::DirectorySeparatorChar)) { throw 'Evidence must stay in docs' }
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
if ($Task -eq 'status') {
    $downloads=Get-ChildItem -LiteralPath $repository -Recurse -File
    @{files=$downloads.Count; bytes=($downloads | Measure-Object Length -Sum).Sum; recent=@($downloads | Sort-Object LastWriteTime -Descending | Select-Object -First 8 @{n='file';e={$_.FullName.Substring($repository.Length)}},Length,LastWriteTime)} | ConvertTo-Json -Depth 5
    $downloads | Where-Object Name -Like '*.lastUpdated' | Sort-Object LastWriteTime -Descending | Select-Object -First 2 | ForEach-Object { Get-Content -LiteralPath $_.FullName }
    exit 0
}
& java -version
& mvn.cmd -version
if ($Task -eq 'verify') {
    & mvn.cmd -B -ntp "-Dmaven.repo.local=$repository" -f $project verify 2>&1 | Tee-Object -FilePath (Join-Path $evidence 'maven-verify.log')
} else {
    & mvn.cmd -B -ntp "-Dmaven.repo.local=$repository" -f $project dependency:tree 2>&1 | Tee-Object -FilePath (Join-Path $evidence 'dependency-tree.log')
}
exit $LASTEXITCODE
