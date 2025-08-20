#!/bin/bash

# 🔍 터미널 디렉토리 검증 스크립트
# Purpose: 명령어 지시 전 터미널별 올바른 디렉토리 확인

echo "🔍 터미널 디렉토리 검증 시작..."

# 디렉토리 존재 확인
check_directory() {
    local terminal=$1
    local directory=$2
    local description=$3
    
    if [ -d "$directory" ]; then
        echo "✅ $terminal: $directory ($description)"
        return 0
    else
        echo "❌ $terminal: $directory 디렉토리 없음"
        return 1
    fi
}

# 핵심 파일 존재 확인
check_key_file() {
    local terminal=$1
    local filepath=$2
    local description=$3
    
    if [ -f "$filepath" ]; then
        echo "✅ $terminal: $description 파일 존재"
        return 0
    else
        echo "❌ $terminal: $filepath 파일 없음"
        return 1
    fi
}

# 터미널별 디렉토리 검증
echo ""
echo "📂 터미널 디렉토리 검증:"

# T1 Main
check_directory "T1 (Main/8080)" "/Users/ted/snap3" "메인 서버, API 엔드포인트"
check_key_file "T1" "/Users/ted/snap3/simple-web-server.js" "메인 서버"
check_key_file "T1" "/Users/ted/snap3/package.json" "패키지 설정"

echo ""

# T2 Jobs  
check_directory "T2 (Jobs/8081)" "/Users/ted/snap3-jobs" "Worker 성능 테스트"
check_key_file "T2" "/Users/ted/snap3-jobs/worker-ingest-v2.sh" "Worker 스크립트"

echo ""

# T3 VDP
check_directory "T3 (VDP/8082)" "/Users/ted/snap3/services/t2-extract" "VDP 추출 서비스"
check_key_file "T3" "/Users/ted/snap3/services/t2-extract/package.json" "VDP 서비스"

echo ""

# T4 Storage
check_directory "T4 (Storage/8083)" "/Users/ted/snap3-storage" "스토리지 시스템"

echo ""

# Cursor UI
check_directory "Cursor (UI/3000)" "/Users/ted/snap3" "Next.js 프론트엔드"
check_key_file "Cursor" "/Users/ted/snap3/src/app/layout.tsx" "Next.js 레이아웃"
check_key_file "Cursor" "/Users/ted/snap3/tailwind.config.ts" "Tailwind 설정"

echo ""
echo "🎯 터미널 디렉토리 검증 완료!"
echo ""
echo "📋 명령어 작성 시 사용할 디렉토리:"
echo "T1: cd /Users/ted/snap3"
echo "T2: cd /Users/ted/snap3-jobs"  
echo "T3: cd /Users/ted/snap3/services/t2-extract"
echo "T4: cd /Users/ted/snap3-storage"
echo "Cursor: cd /Users/ted/snap3"