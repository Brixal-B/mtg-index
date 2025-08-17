'use client';

import { useState, useEffect } from 'react';
import { Wifi, Database, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { SystemMetrics } from '@/lib/types';

interface ApiStatusGridProps {
  apiStatus: SystemMetrics['apiStatus'];
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'syncing';
  icon: React.ComponentType<any>;
  description: string;
  lastCheck: Date;
  responseTime?: number;
}

export function ApiStatusGrid({ apiStatus }: ApiStatusGridProps) {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    const updateServices = () => {
      const now = new Date();
      const baseResponseTime = 150;
      
      setServices([
        {
          name: 'Scryfall API',
          status: apiStatus.cardDatabase,
          icon: Database,
          description: 'Card database and pricing data',
          lastCheck: now,
          responseTime: apiStatus.cardDatabase === 'online' 
            ? baseResponseTime + Math.random() * 50 
            : undefined,
        },
        {
          name: 'Price Sync Service',
          status: apiStatus.priceSync,
          icon: RefreshCw,
          description: 'Real-time price updates',
          lastCheck: now,
          responseTime: apiStatus.priceSync === 'online' 
            ? baseResponseTime + Math.random() * 100 
            : undefined,
        },
        {
          name: 'Image CDN',
          status: 'online', // Always online for demo
          icon: Wifi,
          description: 'Card image delivery network',
          lastCheck: now,
          responseTime: 50 + Math.random() * 30,
        },
        {
          name: 'Search Service',
          status: 'online', // Always online for demo
          icon: CheckCircle,
          description: 'Card search and autocomplete',
          lastCheck: now,
          responseTime: 80 + Math.random() * 40,
        },
      ]);
    };

    updateServices();
    setLastRefresh(new Date());

    // Update every 30 seconds
    const interval = setInterval(updateServices, 30000);
    return () => clearInterval(interval);
  }, [apiStatus]);

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'syncing':
        return <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return 'border-green-200 bg-green-50';
      case 'offline':
        return 'border-red-200 bg-red-50';
      case 'syncing':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusText = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'syncing':
        return 'Syncing';
      default:
        return 'Unknown';
    }
  };

  const onlineServices = services.filter(s => s.status === 'online').length;
  const totalServices = services.length;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">API Services Status</h3>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {onlineServices}/{totalServices} services online
            </p>
            <p className="text-xs text-muted-foreground">
              Last check: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time status of external API services and integrations
        </p>
      </div>

      {/* Service Status Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {services.map((service) => {
          const ServiceIcon = service.icon;
          
          return (
            <div 
              key={service.name}
              className={`border rounded-lg p-4 ${getStatusColor(service.status)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <ServiceIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">{service.name}</h4>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(service.status)}
                      <span className={`text-sm font-medium ${
                        service.status === 'online' ? 'text-green-600' :
                        service.status === 'offline' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {getStatusText(service.status)}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {service.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Last Check:</span>
                      <div className="font-medium text-foreground">
                        {service.lastCheck.toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Response:</span>
                      <div className="font-medium text-foreground">
                        {service.responseTime ? `${Math.round(service.responseTime)}ms` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Status Summary */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-foreground">Overall API Health</h4>
            <p className="text-sm text-muted-foreground">
              System connectivity and service availability
            </p>
          </div>
          
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              onlineServices === totalServices ? 'text-green-600' :
              onlineServices >= totalServices * 0.75 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {Math.round((onlineServices / totalServices) * 100)}%
            </div>
            <p className="text-sm text-muted-foreground">Availability</p>
          </div>
        </div>
        
        {/* Service Health Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                onlineServices === totalServices ? 'bg-green-500' :
                onlineServices >= totalServices * 0.75 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${(onlineServices / totalServices) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}





