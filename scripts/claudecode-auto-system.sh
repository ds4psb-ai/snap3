#!/bin/bash

# ClaudeCode Auto-System Launcher
# Automatically starts all ClaudeCode automation systems

set -e

PROJECT_DIR="/Users/ted/snap3"
PID_DIR="$PROJECT_DIR/.pids"

# Ensure PID directory exists
mkdir -p "$PID_DIR"

# Function to log
log_msg() {
    echo "[$(date '+%H:%M:%S')] $1"
}

# Function to start a background service
start_service() {
    local service_name="$1"
    local command="$2"
    local pid_file="$PID_DIR/${service_name}.pid"
    
    # Check if already running
    if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        log_msg "⚠️  $service_name already running (PID: $(cat "$pid_file"))"
        return
    fi
    
    # Start service
    log_msg "🚀 Starting $service_name..."
    nohup bash -c "$command" > "$PROJECT_DIR/logs/${service_name}.log" 2>&1 &
    echo $! > "$pid_file"
    
    log_msg "✅ $service_name started (PID: $(cat "$pid_file"))"
}

# Function to stop a service
stop_service() {
    local service_name="$1"
    local pid_file="$PID_DIR/${service_name}.pid"
    
    if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        log_msg "🛑 Stopping $service_name..."
        kill "$(cat "$pid_file")"
        rm -f "$pid_file"
        log_msg "✅ $service_name stopped"
    else
        log_msg "⚠️  $service_name not running"
    fi
}

# Function to show status
show_status() {
    log_msg "📊 ClaudeCode Auto-System Status"
    echo ""
    
    for service in message-monitor auto-responder message-handler; do
        local pid_file="$PID_DIR/${service}.pid"
        if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
            echo "✅ $service: Running (PID: $(cat "$pid_file"))"
        else
            echo "❌ $service: Not running"
        fi
    done
    
    echo ""
    echo "📁 Project: $PROJECT_DIR"
    echo "📝 Logs: $PROJECT_DIR/logs/"
    echo "🆔 PIDs: $PID_DIR"
}

# Main execution
case "${1:-start}" in
    "start")
        log_msg "🚀 Starting ClaudeCode Auto-System"
        
        # Ensure log directory exists
        mkdir -p "$PROJECT_DIR/logs"
        
        # Start all services
        start_service "message-monitor" "$PROJECT_DIR/scripts/claudecode-auto-message-monitor.sh monitor"
        start_service "auto-responder" "$PROJECT_DIR/scripts/claudecode-auto-responder.sh start"
        start_service "message-handler" "cd $PROJECT_DIR && node scripts/claudecode-message-handler.js start"
        
        echo ""
        log_msg "🎉 All ClaudeCode automation systems started!"
        log_msg "📨 Messages will be automatically detected and processed"
        log_msg "🔍 Use '$0 status' to check system status"
        ;;
        
    "stop")
        log_msg "🛑 Stopping ClaudeCode Auto-System"
        
        stop_service "message-monitor"
        stop_service "auto-responder" 
        stop_service "message-handler"
        
        echo ""
        log_msg "🎉 All services stopped"
        ;;
        
    "restart")
        log_msg "🔄 Restarting ClaudeCode Auto-System"
        "$0" stop
        sleep 2
        "$0" start
        ;;
        
    "status")
        show_status
        ;;
        
    *)
        echo "ClaudeCode Auto-System Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status}"
        echo ""
        echo "Commands:"
        echo "  start   - Start all automation systems"
        echo "  stop    - Stop all automation systems"  
        echo "  restart - Restart all automation systems"
        echo "  status  - Show system status"
        echo ""
        echo "Features:"
        echo "  🔍 Auto-detect new collaboration messages"
        echo "  🤖 Auto-generate responses based on content"
        echo "  🚨 Priority escalation for urgent messages"
        echo "  📊 Real-time status monitoring"
        exit 1
        ;;
esac