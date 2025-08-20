'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, AlertTriangle, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface MessageInfo {
  filename: string;
  content: string;
  timestamp: string;
  priority: 'critical' | 'high' | 'normal';
  processed: boolean;
}

interface MonitorResponse {
  status: 'success' | 'error';
  messages: MessageInfo[];
  lastCheck: string;
  hasNewMessages: boolean;
}

export function MessageMonitor() {
  const [messages, setMessages] = useState<MessageInfo[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

  // 메시지 모니터링
  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/collaboration/message-monitor');
      const data: MonitorResponse = await response.json();
      
      if (data.status === 'success') {
        setMessages(data.messages);
        setLastCheck(data.lastCheck);
        
        // 새로운 메시지가 있으면 알림
        if (data.hasNewMessages && data.messages.length > 0) {
          const newMessages = data.messages.filter(msg => !msg.processed);
          
          if (newMessages.length > 0) {
            const criticalCount = newMessages.filter(msg => msg.priority === 'critical').length;
            const highCount = newMessages.filter(msg => msg.priority === 'high').length;
            
            if (criticalCount > 0) {
              toast({
                title: "🚨 Critical Message from ClaudeCode",
                description: `${criticalCount} critical message(s) received`,
                variant: "destructive",
              });
            } else if (highCount > 0) {
              toast({
                title: "⚠️ High Priority Message from ClaudeCode",
                description: `${highCount} high priority message(s) received`,
              });
            } else {
              toast({
                title: "📝 Message from ClaudeCode",
                description: `${newMessages.length} new message(s) received`,
              });
            }
          }
        }
      } else {
        setError(data.error || 'Failed to fetch messages');
      }
    } catch (err) {
      setError('Network error while fetching messages');
      console.error('Message monitor error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // 메시지 처리 완료 표시
  const markAsProcessed = async (filename: string) => {
    try {
      const response = await fetch('/api/collaboration/message-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-processed', filename }),
      });
      
      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg.filename !== filename));
        toast({
          title: "Message Processed",
          description: "Message marked as processed",
        });
      }
    } catch (err) {
      console.error('Error marking message as processed:', err);
      toast({
        title: "Error",
        description: "Failed to mark message as processed",
        variant: "destructive",
      });
    }
  };

  // 자동 모니터링 시작/중지
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isMonitoring) {
      fetchMessages(); // 초기 로드
      interval = setInterval(fetchMessages, 10000); // 10초마다 체크
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isMonitoring, fetchMessages]);

  // 우선순위별 아이콘
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  // 우선순위별 배지 색상
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge variant="secondary">High</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="w-4 h-4" />
          ClaudeCode Message Monitor
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMessages}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {lastCheck && (
          <p className="text-xs text-gray-500 mb-4">
            Last check: {new Date(lastCheck).toLocaleString()}
          </p>
        )}
        
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No messages from ClaudeCode</p>
            <p className="text-xs">Messages will appear here when received</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.filename}
                  className="p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      {getPriorityIcon(message.priority)}
                      {getPriorityBadge(message.priority)}
                      <span className="text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsProcessed(message.filename)}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-xs font-mono text-gray-600 mb-1">
                      {message.filename}
                    </p>
                    <div className="bg-white p-2 rounded border text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {messages.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{messages.length} message(s) total</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  {messages.filter(m => m.priority === 'critical').length} critical
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                  {messages.filter(m => m.priority === 'high').length} high
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
