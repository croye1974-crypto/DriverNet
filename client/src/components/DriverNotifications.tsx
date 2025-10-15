import { useState, useCallback, useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, MapPin, Navigation } from "lucide-react";
import { formatDistance } from "@/lib/journey";
import { calculateDistance } from "@/lib/journey";

interface Notification {
  id: string;
  type: 'driver-check-in' | 'driver-check-out';
  driverId: string;
  driverName: string;
  jobId: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: string;
  distance?: number;
}

interface DriverNotificationsProps {
  currentUserId: string;
  currentUserLat?: number;
  currentUserLng?: number;
}

export default function DriverNotifications({ 
  currentUserId, 
  currentUserLat, 
  currentUserLng 
}: DriverNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const maxDistance = 16.09; // 10 miles in km

  const handleNotification = useCallback((notification: any) => {
    // Don't show notifications for the current user's own actions
    if (notification.driverId === currentUserId) {
      return;
    }

    // Calculate distance if we have current user's location
    let distance: number | undefined;
    if (currentUserLat !== undefined && currentUserLng !== undefined) {
      distance = calculateDistance(
        currentUserLat,
        currentUserLng,
        notification.lat,
        notification.lng
      );
      
      // Only show if within 10 miles
      if (distance > maxDistance) {
        return;
      }
    }

    const newNotification: Notification = {
      ...notification,
      id: `${notification.jobId}-${notification.timestamp}`,
      distance,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 5)); // Keep max 5 notifications

    // Auto-remove after 10 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 10000);
  }, [currentUserId, currentUserLat, currentUserLng, maxDistance]);

  const { isConnected } = useWebSocket(handleNotification);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm" data-testid="notification-container">
      {notifications.map((notification) => (
        <Card 
          key={notification.id} 
          className="p-4 shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm"
          data-testid={`notification-${notification.id}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm" data-testid={`notification-title-${notification.id}`}>
                  {notification.type === 'driver-check-in' ? 'Driver Nearby!' : 'Driver Available!'}
                </h4>
              </div>
              
              <p className="text-sm mb-2" data-testid={`notification-driver-${notification.id}`}>
                <span className="font-medium">{notification.driverName}</span>
                {' '}
                {notification.type === 'driver-check-in' ? 'checked in at' : 'checked out at'}
                {' '}
                <span className="font-medium">{notification.location}</span>
              </p>

              {notification.distance !== undefined && (
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="secondary" className="text-xs" data-testid={`notification-distance-${notification.id}`}>
                    {formatDistance(notification.distance)} away
                  </Badge>
                </div>
              )}

              <Button 
                size="sm" 
                className="w-full"
                data-testid={`notification-message-${notification.driverId}`}
              >
                Send Message
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => removeNotification(notification.id)}
              data-testid={`notification-close-${notification.id}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}

      {!isConnected && (
        <div className="text-xs text-muted-foreground text-center mt-2">
          Reconnecting...
        </div>
      )}
    </div>
  );
}
