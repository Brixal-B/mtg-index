'use client';

import { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

export function SystemHealthChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const healthData = useMemo(() => {
    if (!isClient) return [];
    const data = [];
    const now = new Date();
    
    // Generate last 24 hours of health data
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now);
      time.setHours(time.getHours() - i);
      
      // Simulate health metrics (0-100 scale)
      const cpuUsage = 20 + Math.random() * 40; // 20-60% CPU usage
      const memoryUsage = 30 + Math.random() * 30; // 30-60% memory usage
      const networkLatency = 50 + Math.random() * 100; // 50-150ms latency
      const diskIO = 10 + Math.random() * 20; // 10-30% disk I/O
      
      // Overall health score (inverse of average usage)
      const healthScore = 100 - ((cpuUsage + memoryUsage + diskIO) / 3);
      
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        fullTime: time.toISOString(),
        cpu: Math.round(cpuUsage),
        memory: Math.round(memoryUsage),
        network: Math.round(networkLatency),
        disk: Math.round(diskIO),
        health: Math.round(healthScore),
      });
    }
    
    return data;
  }, [isClient]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.dataKey === 'network' ? 'ms' : 
               entry.dataKey === 'health' ? '/100' : '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate current averages
  const currentData = healthData[healthData.length - 1];
  const avgHealth = healthData.reduce((sum, d) => sum + d.health, 0) / healthData.length;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground mb-2">System Health (24h)</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time system performance metrics and health indicators
        </p>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={healthData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="health" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={false}
              name="Health Score"
            />
            <Line 
              type="monotone" 
              dataKey="cpu" 
              stroke="hsl(220, 70%, 60%)" 
              strokeWidth={2}
              dot={false}
              name="CPU Usage"
            />
            <Line 
              type="monotone" 
              dataKey="memory" 
              stroke="hsl(280, 70%, 60%)" 
              strokeWidth={2}
              dot={false}
              name="Memory Usage"
            />
            <Line 
              type="monotone" 
              dataKey="disk" 
              stroke="hsl(40, 70%, 60%)" 
              strokeWidth={2}
              dot={false}
              name="Disk I/O"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Current Stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Health Score</p>
          <p className={`text-lg font-semibold ${
            avgHealth > 80 ? 'text-green-600' : 
            avgHealth > 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {Math.round(avgHealth)}/100
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">CPU Usage</p>
          <p className={`text-lg font-semibold ${
            currentData?.cpu > 80 ? 'text-red-600' : 
            currentData?.cpu > 60 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {currentData?.cpu}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Memory</p>
          <p className={`text-lg font-semibold ${
            currentData?.memory > 80 ? 'text-red-600' : 
            currentData?.memory > 60 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {currentData?.memory}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Disk I/O</p>
          <p className={`text-lg font-semibold ${
            currentData?.disk > 80 ? 'text-red-600' : 
            currentData?.disk > 60 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {currentData?.disk}%
          </p>
        </div>
      </div>
    </div>
  );
}







