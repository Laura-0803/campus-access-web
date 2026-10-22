param([string]$EvidenceDirectory='docs/p2-evidence/batch1-build',[switch]$Dependencies)
$ErrorActionPreference='Stop'
$workspace=Split-Path $PSScriptRoot -Parent
$jdk=Get-Content -Raw (Join-Path $workspace '.p1-local/jdk.json') | ConvertFrom-Json
$env:JAVA_HOME=$jdk.javaHome
$env:PATH=(Join-Path $jdk.javaHome 'bin')+';'+$env:PATH
$evidence=[IO.Path]::GetFullPath((Join-Path $workspace $EvidenceDirectory))
if (!$evidence.StartsWith((Join-Path $workspace 'docs')+[IO.Path]::DirectorySeparatorChar)) {throw 'Evidence must stay in docs'}
if(Test-Path -LiteralPath $evidence){throw 'Refusing to overwrite evidence directory'}
New-Item -ItemType Directory -Path $evidence | Out-Null
$taskArgs=@('clean','verify');if($Dependencies){$taskArgs=@('dependency:tree')}
& mvn.cmd -B -ntp "-Dmaven.repo.local=$workspace/.p1-local/m2" -f "$workspace/backend/pom.xml" @taskArgs 2>&1 | Tee-Object -FilePath (Join-Path $evidence 'maven.log')
exit $LASTEXITCODE
