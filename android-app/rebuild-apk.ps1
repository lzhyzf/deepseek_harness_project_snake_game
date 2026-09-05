# ============================================================
#  Rebuild Snake APK (one command)
#  Requires: dev-tools\ (JDK 17 + Android build-tools 34 + platform 34)
#  Usage:    powershell -ExecutionPolicy Bypass -File rebuild-apk.ps1
#  Output:   android-app\Snake-v1.0.apk  (signed with snake.keystore)
# ============================================================
$ErrorActionPreference = 'Stop'
$Root   = Split-Path $PSScriptRoot -Parent
$Tools  = Join-Path $Root 'dev-tools'
$App    = Join-Path $Root 'android-app'
$Stage  = 'C:\snakebuild'

$JDK    = (Get-ChildItem $Tools -Directory -Filter 'jdk-*' | Select-Object -First 1).FullName
$BT     = Join-Path $Tools 'build-tools\android-14'
$Plat   = (Get-ChildItem (Join-Path $Tools 'platform') -Directory | Where-Object { $_.Name -match 'android-3' } | Select-Object -First 1).FullName
if (-not $JDK -or -not (Test-Path $BT) -or -not $Plat) { throw 'dev-tools incomplete. Run setup scripts first.' }

if (Test-Path $Stage) { Remove-Item $Stage -Recurse -Force }
foreach ($d in @('src','classes','dexout','out')) { New-Item -ItemType Directory -Force -Path (Join-Path $Stage $d) | Out-Null }

Copy-Item -Recurse (Join-Path $App 'res')      (Join-Path $Stage 'src\res')
Copy-Item -Recurse (Join-Path $App 'assets')   (Join-Path $Stage 'src\assets')
Copy-Item (Join-Path $App 'AndroidManifest.xml') (Join-Path $Stage 'src\')
Copy-Item (Join-Path $Plat 'android.jar')       (Join-Path $Stage 'lib-android.jar')

Write-Host '[1/7] javac ...'
& (Join-Path $JDK 'bin\javac.exe') --release 8 -encoding UTF-8 -classpath (Join-Path $Stage 'lib-android.jar') -d (Join-Path $Stage 'classes') (Join-Path $App 'java\com\snake\game\MainActivity.java')
if ($LASTEXITCODE -ne 0) { throw 'javac failed' }

Write-Host '[2/7] d8 -> classes.dex ...'
& (Join-Path $JDK 'bin\java.exe') -cp (Join-Path $BT 'lib\d8.jar') com.android.tools.r8.D8 --lib (Join-Path $Stage 'lib-android.jar') --release --min-api 21 --output (Join-Path $Stage 'dexout') (Join-Path $Stage 'classes\com\snake\game\MainActivity.class')
if ($LASTEXITCODE -ne 0) { throw 'd8 failed' }

Write-Host '[3/7] aapt2 compile ...'
& (Join-Path $BT 'aapt2.exe') compile --dir (Join-Path $Stage 'src\res') -o (Join-Path $Stage 'out\res.zip')
if ($LASTEXITCODE -ne 0) { throw 'aapt2 compile failed' }

Write-Host '[4/7] aapt2 link ...'
& (Join-Path $BT 'aapt2.exe') link -o (Join-Path $Stage 'out\base.apk') -I (Join-Path $Stage 'lib-android.jar') --manifest (Join-Path $Stage 'src\AndroidManifest.xml') -A (Join-Path $Stage 'src\assets') (Join-Path $Stage 'out\res.zip')
if ($LASTEXITCODE -ne 0) { throw 'aapt2 link failed' }

Write-Host '[5/7] merge dex + zipalign ...'
& (Join-Path $JDK 'bin\jar.exe') uf (Join-Path $Stage 'out\base.apk') -C (Join-Path $Stage 'dexout') classes.dex
if ($LASTEXITCODE -ne 0) { throw 'jar failed' }
& (Join-Path $BT 'zipalign.exe') -f 4 (Join-Path $Stage 'out\base.apk') (Join-Path $Stage 'out\aligned.apk')
if ($LASTEXITCODE -ne 0) { throw 'zipalign failed' }

Write-Host '[6/7] signing key ...'
$KS = Join-Path $App 'snake.keystore'
if (-not (Test-Path $KS)) {
  & (Join-Path $JDK 'bin\keytool.exe') -genkeypair -keystore $KS -alias snake -keyalg RSA -keysize 2048 -validity 10000 -storepass snake123456 -keypass snake123456 -dname 'CN=Snake Game,OU=Snake,O=Snake,L=Beijing,ST=Beijing,C=CN' 2>&1 | Out-Null
}

Write-Host '[7/7] apksigner ...'
& (Join-Path $JDK 'bin\java.exe') -jar (Join-Path $BT 'lib\apksigner.jar') sign --ks $KS --ks-pass pass:snake123456 --key-pass pass:snake123456 --out (Join-Path $Stage 'out\snake.apk') (Join-Path $Stage 'out\aligned.apk')
if ($LASTEXITCODE -ne 0) { throw 'apksigner failed' }

$Final = Join-Path $App 'Snake-v1.0.apk'
Copy-Item (Join-Path $Stage 'out\snake.apk') $Final -Force
Remove-Item $Stage -Recurse -Force
Write-Host ('DONE -> ' + $Final + '  (' + (Get-Item $Final).Length + ' bytes)')
Write-Host 'Keystore password: snake123456  (KEEP the keystore for future updates!)'
