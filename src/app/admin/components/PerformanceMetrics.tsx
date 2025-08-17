'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, Clock, AlertTriangle } from 'lucide-react';
import { SystemMetrics } from '@/lib/types';

interface PerformanceMetricsProps {
  metrics: SystemMetrics['performanceMetrics'];
}

export function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  const responseTimeData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    // Generate last 12 hours of response time data
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now);
      time.setHours(time.getHours() - i);
      
      // Simulate response times with some variation
      const baseResponseTime = metrics.averageResponseTime;
      const variation = (Math.random() - 0.5) * 100; // ±50ms variation
      const responseTime = Math.max(50, baseResponseTime + variation);
      
      // Simulate request volume
      const requestVolume = 100 + Math.random() * 200; // 100-300 requests
      
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        responseTime: Math.round(responseTime),
        requests: Math.round(requestVolume),
        errors: Math.round(requestVolume * (metrics.errorRate / 100)),
      });
    }
    
    return data;
  }, [metrics]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.dataKey === 'responseTime' ? 'ms' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99.9) return 'text-green-600';
    if (uptime >= 99.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Performance Metrics</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Response times and system performance over the last 12 hours
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-accent rounded-lg">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Avg Response</span>
          </div>
          <p className={`text-xl font-bold ${getPerformanceColor(metrics.averageResponseTime, { good: 200, warning: 500 })}`}>
            {metrics.averageResponseTime}ms
          </p>
        </div>

        <div className="text-center p-4 bg-accent rounded-lg">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Error Rate</span>
          </div>
          <p className={`text-xl font-bold ${getPerformanceColor(metrics.errorRate, { good: 1, warning: 5 })}`}>
            {metrics.errorRate}%
          </p>
        </div>

        <div className="text-center p-4 bg-accent rounded-lg">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Uptime</span>
          </div>
          <p className={`text-xl font-bold ${getUptimeColor(metrics.uptime)}`}>
            {metrics.uptime}%
          </p>
        </div>
      </div>

      {/* Response Time Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={responseTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="responseTime" 
              fill="hsl(var(--primary))" 
              name="Response Time"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Status */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Current Status</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Response:</span>
                <span className={getPerformanceColor(metrics.averageResponseTime, { good: 200, warning: 500 })}>
                  {metrics.averageResponseTime <= 200 ? 'Excellent' : 
                   metrics.averageResponseTime <= 500 ? 'Good' : 'Poor'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Error Rate:</span>
                <span className={getPerformanceColor(metrics.errorRate, { good: 1, warning: 5 })}>
                  {metrics.errorRate <= 1 ? 'Low' : 
                   metrics.errorRate <= 5 ? 'Moderate' : 'High'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">System Load:</span>
                <span className="text-green-600">Normal</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Benchmarks</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Response:</span>
                <span className="text-foreground">{'<'}200ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Error Rate:</span>
                <span className="text-foreground">{'<'}1%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uptime SLA:</span>
                <span className="text-foreground">{'>'}99.9%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





