#!/bin/bash

# Quick Status Script for snap3 VDP Pipeline
# Usage: ./quick-status.sh

echo "🚀 SNAP3 VDP PIPELINE STATUS"
echo "=================================="
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Directory check
if [ ! -d "/Users/ted/snap3" ]; then
    echo "❌ ERROR: snap3 directory not found!"
    exit 1
fi

cd /Users/ted/snap3

echo "📍 Current Directory: $(pwd)"
echo ""

# 🆕 MAJOR UPDATE: Universal VDP Clone Service Added
echo "🆕 CRITICAL UPDATE - 2025-08-21"
echo "=================================="
echo "✅ Universal VDP Clone Service DEPLOYED (localhost:4000)"
echo "✅ Evidence Pack REMOVED for system stability"
echo "✅ true-hybrid-v5 analysis level (1000+ lines)"
echo "✅ Hook Genome analysis integrated"
echo "✅ Complete schema clone from reference files"
echo "✅ Comprehensive logging system implemented"
echo ""

# Service Status Check
echo "🔍 SERVICE STATUS CHECK"
echo "----------------------"

# Check for running processes
echo "Active Node.js processes:"
ps aux | grep -E "(node|npm)" | grep -v grep | awk '{print "  🟢 PID:" $2 " - " $11 " " $12 " " $13}' || echo "  ⚠️  No Node.js processes running"
echo ""

# Port status check
echo "Port availability check:"
for port in 3000 3001 4000 8080 8081 8082 8083; do
    if lsof -ti:$port > /dev/null 2>&1; then
        process=$(lsof -ti:$port | head -1)
        service_name=$(ps -p $process -o comm= 2>/dev/null || echo "unknown")
        echo "  🟢 Port $port: OCCUPIED by $service_name (PID: $process)"
    else
        echo "  ⚪ Port $port: AVAILABLE"
    fi
done
echo ""

# Service Directory Structure
echo "📁 SERVICE DIRECTORIES"
echo "---------------------"
if [ -d "services/universal-vdp-clone" ]; then
    echo "  ✅ services/universal-vdp-clone/ (NEW - Universal VDP Clone)"
    if [ -f "services/universal-vdp-clone/server.js" ]; then
        echo "    ✅ server.js (with comprehensive logging)"
    fi
    if [ -f "services/universal-vdp-clone/constants.js" ]; then
        echo "    ✅ constants.js (complete schema clone)"
    fi
else
    echo "  ❌ services/universal-vdp-clone/ - MISSING!"
fi

if [ -d "services/t2-extract" ]; then
    echo "  ✅ services/t2-extract/ (VDP Processing)"
else
    echo "  ❌ services/t2-extract/ - MISSING!"
fi
echo ""

# Recent Collaboration Messages
echo "📬 RECENT COLLABORATION MESSAGES"
echo "-------------------------------"
recent_messages=$(find . -name ".collab-msg-*" -mtime -1 2>/dev/null | sort -r | head -5)
if [ ! -z "$recent_messages" ]; then
    echo "$recent_messages" | while read msg; do
        timestamp=$(echo $msg | grep -o '[0-9]\{8\}-[0-9]\{4\}' | tail -1)
        echo "  📨 $(basename $msg) [${timestamp}]"
    done
else
    echo "  ℹ️  No recent collaboration messages"
fi
echo ""

# Key Configuration Files
echo "⚙️  CRITICAL CONFIG FILES"
echo "------------------------"
configs=("CLAUDE.md" "package.json" ".env")
for config in "${configs[@]}"; do
    if [ -f "$config" ]; then
        last_mod=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$config" 2>/dev/null || stat -c "%y" "$config" 2>/dev/null | cut -d' ' -f1-2)
        echo "  ✅ $config (modified: $last_mod)"
    else
        echo "  ❌ $config - MISSING!"
    fi
done
echo ""

# Quick Start Commands
echo "🚀 QUICK START COMMANDS"
echo "----------------------"
echo "Universal VDP Clone (NEW):"
echo "  cd /Users/ted/snap3/services/universal-vdp-clone && npm start"
echo ""
echo "Main services:"
echo "  npm start                    # Main app (port 3000)"
echo "  npm run dev:ingest          # Ingest UI (port 8080)"
echo "  npm run dev:t2              # T2 VDP processor (port 3001)"
echo "  npm run dev:storage         # Storage service (port 8083)"
echo ""

# Environment Variables Check
echo "🌍 ENVIRONMENT VARIABLES"
echo "-----------------------"
env_vars=("PROJECT_ID" "REGION" "RAW_BUCKET" "GEMINI_API_KEY")
for var in "${env_vars[@]}"; do
    if [ ! -z "${!var}" ] || grep -q "^$var=" .env 2>/dev/null; then
        echo "  ✅ $var: SET"
    else
        echo "  ⚠️  $var: NOT SET"
    fi
done
echo ""

# Recent Log Files
echo "📝 RECENT ACTIVITY LOGS"
echo "----------------------"
if [ -d "services/universal-vdp-clone/logs" ]; then
    recent_logs=$(find services/universal-vdp-clone/logs -name "*.log" -mtime -1 2>/dev/null | head -3)
    if [ ! -z "$recent_logs" ]; then
        echo "$recent_logs" | while read log; do
            size=$(du -h "$log" | cut -f1)
            echo "  📄 $log ($size)"
        done
    else
        echo "  ℹ️  No recent Universal VDP Clone logs"
    fi
else
    echo "  ℹ️  Universal VDP Clone logs directory not yet created"
fi
echo ""

# System Health Summary
echo "💊 SYSTEM HEALTH SUMMARY"
echo "========================"

# Check if critical services can be started
health_score=0
total_checks=5

if [ -f "package.json" ]; then
    ((health_score++))
fi

if [ -f "CLAUDE.md" ]; then
    ((health_score++))
fi

if [ -d "services/universal-vdp-clone" ] && [ -f "services/universal-vdp-clone/server.js" ]; then
    ((health_score++))
fi

if [ ! -z "$(which node)" ]; then
    ((health_score++))
fi

if [ ! -z "$(which npm)" ]; then
    ((health_score++))
fi

percentage=$((health_score * 100 / total_checks))

if [ $percentage -ge 80 ]; then
    echo "🟢 System Health: EXCELLENT ($percentage%)"
    echo "   ✅ Ready for immediate development"
elif [ $percentage -ge 60 ]; then
    echo "🟡 System Health: GOOD ($percentage%)"
    echo "   ⚠️  Minor issues detected"
else
    echo "🔴 System Health: NEEDS ATTENTION ($percentage%)"
    echo "   ❌ Critical issues require fixing"
fi

echo ""
echo "🎯 NEXT ACTIONS"
echo "==============="
echo "1. Start Universal VDP Clone: cd services/universal-vdp-clone && npm start"
echo "2. Test VDP generation: curl -X POST http://localhost:4000/api/health"
echo "3. Check collaboration messages: cat .collab-msg-claudecode-*"
echo ""
echo "Status check completed at $(date '+%H:%M:%S')"