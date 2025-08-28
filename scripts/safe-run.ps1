# 원자적 쓰기 + 검증 게이트 PowerShell 러너
param(
    [string]$TargetFile = "patterns\level_1_basic_patterns\lv1_phase_system_NEW.json"
)

# 엄격한 오류 처리
$ErrorActionPreference = "Stop"

# 전역 변수 설정
$LockFile = ".ops.lock"
$Timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$BackupFile = "${TargetFile}.bak.${Timestamp}"
$TempFile = ".tmp.$((Split-Path $TargetFile -Leaf)).${Timestamp}"

# 정리 함수
function Cleanup {
    param($ExitCode = 0)
    
    if ($ExitCode -ne 0) {
        Write-Host "⛔ 오류 감지 (code: $ExitCode). 롤백 중…" -ForegroundColor Red
        
        # 임시 파일 정리
        if (Test-Path $TempFile) {
            Remove-Item $TempFile -Force -ErrorAction SilentlyContinue
        }
        
        # 백업이 있고 원본이 변경되었으면 복원
        if ((Test-Path $BackupFile) -and (Test-Path $TargetFile)) {
            Write-Host "🔄 백업에서 복원: $BackupFile -> $TargetFile" -ForegroundColor Yellow
            Copy-Item $BackupFile $TargetFile -Force -ErrorAction SilentlyContinue
        }
    }
    
    # 락 파일 제거
    if (Test-Path $LockFile) {
        Remove-Item $LockFile -Force -ErrorAction SilentlyContinue
    }
}

# 트랩 핸들러 등록
trap {
    Cleanup -ExitCode 1
    break
}

try {
    Write-Host "🚀 안전한 데이터 마이그레이션 시작" -ForegroundColor Green
    Write-Host "📄 대상 파일: $TargetFile"

    # 락 파일 체크
    if (Test-Path $LockFile) {
        Write-Host "❌ 다른 작업이 진행 중입니다: $LockFile" -ForegroundColor Red
        exit 1
    }

    # 대상 파일 존재 확인
    if (!(Test-Path $TargetFile)) {
        Write-Host "❌ 대상 파일이 없습니다: $TargetFile" -ForegroundColor Red
        exit 1
    }

    # 락 설정
    Write-Host "🔒 작업 락 설정"
    "$(Get-Date): 마이그레이션 작업 시작 - PID: $PID" | Out-File -FilePath $LockFile

    # 백업 생성
    Write-Host "💾 백업 생성: $BackupFile"
    Copy-Item $TargetFile $BackupFile -Force

    # 1) 드라이런: 변환 결과를 임시 파일로 생성
    Write-Host "🔄 1단계: 데이터 변환 (드라이런)"
    $process1 = Start-Process -FilePath "node" -ArgumentList "utils/data-migrator.js", "--file", "`"$TargetFile`"", "--output", "`"$TempFile`"", "--dry-run" -Wait -PassThru -NoNewWindow
    if ($process1.ExitCode -ne 0) {
        throw "데이터 변환 실패"
    }

    # 2) 검증
    Write-Host "🔍 2단계: 스키마 검증"
    $process2 = Start-Process -FilePath "node" -ArgumentList "utils/validate-curriculum.js", "--file", "`"$TempFile`"", "--strict", "--verbose" -Wait -PassThru -NoNewWindow
    if ($process2.ExitCode -ne 0) {
        throw "스키마 검증 실패"
    }

    # 3) 원자적 교체
    Write-Host "✅ 3단계: 원자적 파일 교체"
    Copy-Item $TempFile $TargetFile -Force
    Remove-Item $TempFile -Force

    # 최종 검증
    Write-Host "🎯 최종 검증"
    $process3 = Start-Process -FilePath "node" -ArgumentList "utils/validate-curriculum.js", "--file", "`"$TargetFile`"", "--quiet" -Wait -PassThru -NoNewWindow
    if ($process3.ExitCode -ne 0) {
        throw "최종 검증 실패"
    }

    # 성공 시 정리
    Remove-Item $LockFile -Force
    Write-Host "✅ 마이그레이션 완료!" -ForegroundColor Green
    Write-Host "📊 백업 위치: $BackupFile"
    Write-Host "🔓 락 해제됨"
    
} catch {
    Write-Host "❌ 오류: $_" -ForegroundColor Red
    Cleanup -ExitCode 1
    exit 1
}