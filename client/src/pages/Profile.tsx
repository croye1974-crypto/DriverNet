import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Trophy, TrendingUp, Award, Zap, Target, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserStats, UserBadge, Badge as BadgeType, SelectUser } from "@shared/schema";

const currentUserId = "user-1"; // Mock - will be replaced with real auth

const getTierConfig = (tier: string) => {
  switch (tier) {
    case 'platinum':
      return { icon: '💎', color: 'text-cyan-500', label: 'Platinum' };
    case 'gold':
      return { icon: '🥇', color: 'text-yellow-500', label: 'Gold' };
    case 'silver':
      return { icon: '🥈', color: 'text-gray-400', label: 'Silver' };
    default:
      return { icon: '🥉', color: 'text-amber-600', label: 'Bronze' };
  }
};

export default function Profile() {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  
  const { data: user, isLoading: userLoading } = useQuery<SelectUser>({
    queryKey: ["/api/users", currentUserId],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/users", currentUserId, "stats"],
  });

  const { data: userBadges = [] } = useQuery<(UserBadge & { badge: BadgeType })[]>({
    queryKey: ["/api/users", currentUserId, "badges"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; email?: string; phone?: string }) => {
      const response = await apiRequest("PATCH", `/api/users/${currentUserId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const manageSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/create-portal-session");
      const data = await response.json() as { url?: string; error?: string; fallback?: boolean };
      return data;
    },
    onSuccess: (data) => {
      if (data.error || data.fallback) {
        toast({
          title: "Customer Portal Unavailable",
          description: data.error || "The customer portal is not configured. Please contact support to manage your subscription.",
          variant: "destructive",
        });
      } else if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open subscription management portal",
        variant: "destructive",
      });
    },
  });

  const handleEditProfile = () => {
    setEditName(user?.name || "");
    setEditEmail(user?.email || "");
    setEditPhone(user?.phone || "");
    setEditDialogOpen(true);
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    const updates: { name?: string; email?: string; phone?: string } = {};
    
    // Only include changed fields
    if (editName.trim() !== user?.name) {
      updates.name = editName.trim();
    }
    if (editEmail.trim() !== (user?.email || "")) {
      updates.email = editEmail.trim() || "";
    }
    if (editPhone.trim() !== (user?.phone || "")) {
      updates.phone = editPhone.trim() || "";
    }

    // Only mutate if there are actual changes
    if (Object.keys(updates).length > 0) {
      updateProfileMutation.mutate(updates);
    } else {
      setEditDialogOpen(false);
    }
  };

  const tierConfig = getTierConfig(stats?.tier || 'bronze');
  const reputationScore = stats?.reputationScore || 0;

  // Calculate tier bounds and progress
  const getTierBounds = (currentTier: string) => {
    switch (currentTier) {
      case 'bronze': return { lower: 0, upper: 69, next: 'Silver' };
      case 'silver': return { lower: 70, upper: 84, next: 'Gold' };
      case 'gold': return { lower: 85, upper: 94, next: 'Platinum' };
      case 'platinum': return { lower: 95, upper: 100, next: 'Max' };
      default: return { lower: 0, upper: 69, next: 'Silver' };
    }
  };

  const tierBounds = getTierBounds(stats?.tier || 'bronze');
  const progressToNextTier = stats?.tier === 'platinum' 
    ? 100 
    : Math.max(0, Math.min(100, ((reputationScore - tierBounds.lower) / (tierBounds.upper - tierBounds.lower + 1)) * 100));

  if (userLoading || statsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background pb-20">
      {/* Header with Reputation Score */}
      <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="" alt="John Smith" />
              <AvatarFallback className="text-2xl">JS</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold" data-testid="text-profile-name">{user?.name || 'John Smith'}</h1>
                <Badge variant="outline" className="text-xs">✓ Verified</Badge>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="font-mono" data-testid="text-call-sign">
                  {user?.callSign || 'JS1234'}
                </Badge>
                {user?.subscriptionStatus === 'active' ? (
                  <Badge variant="default" className="text-xs">Pro</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">Free</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span data-testid="text-rating">{stats?.averageRating?.toFixed(1) || '0.0'} rating</span>
                <span className="mx-2">•</span>
                <span data-testid="text-trips">{stats?.totalLiftsShared || 0} lifts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reputation Score Display */}
        <Card className="p-4 bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className={`h-5 w-5 ${tierConfig.color}`} />
              <span className="font-semibold">{tierConfig.label} Tier</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-reputation-score">
              {reputationScore}<span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>
          {stats?.tier !== 'platinum' && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress to {tierBounds.next}</span>
                <span>{Math.round(progressToNextTier)}%</span>
              </div>
              <Progress value={progressToNextTier} className="h-2" />
            </div>
          )}
        </Card>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-xl font-bold" data-testid="text-stat-streak">{stats?.currentStreak || 0}</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </Card>
          <Card className="p-4 text-center">
            <Zap className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-xl font-bold" data-testid="text-stat-points">{stats?.totalPoints || 0}</div>
            <div className="text-xs text-muted-foreground">Points</div>
          </Card>
          <Card className="p-4 text-center">
            <Target className={`h-6 w-6 mx-auto mb-2 ${(stats?.punctualityScore || 0) >= 80 ? 'text-primary' : 'text-accent'}`} />
            <div className="text-xl font-bold" data-testid="text-stat-punctuality">{Math.round(stats?.punctualityScore || 0)}%</div>
            <div className="text-xs text-muted-foreground">On-Time</div>
          </Card>
        </div>

        {/* Contact Information */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Contact Details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm" data-testid="text-email">
                  {user?.email || <span className="text-muted-foreground italic">Not provided</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm" data-testid="text-phone">
                  {user?.phone || <span className="text-muted-foreground italic">Not provided</span>}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Performance Metrics */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Performance</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Punctuality</span>
                <span className="font-medium">{Math.round(stats?.punctualityScore || 0)}%</span>
              </div>
              <Progress value={stats?.punctualityScore || 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className="font-medium">{Math.round(stats?.completionRatio || 0)}%</span>
              </div>
              <Progress value={stats?.completionRatio || 0} className="h-2" />
            </div>
          </div>
        </Card>

        {/* Achievement Badges */}
        <div>
          <h2 className="font-semibold mb-3">Achievements ({userBadges.length})</h2>
          {userBadges.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {userBadges.map((ub) => (
                <Card key={ub.id} className="p-4" data-testid={`badge-${ub.badge.id}`}>
                  <div className="text-center">
                    <div className="text-3xl mb-2">{ub.badge.icon}</div>
                    <div className="font-semibold text-sm">{ub.badge.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{ub.badge.description}</div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <Award className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No badges earned yet</p>
              <p className="text-xs text-muted-foreground mt-1">Complete lifts and maintain high ratings to earn achievements</p>
            </Card>
          )}
        </div>

        {/* Lifetime Stats */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Lifetime Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Lifts Shared</span>
              <span className="font-medium" data-testid="text-total-lifts">{stats?.totalLiftsShared || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lifts Offered</span>
              <span className="font-medium" data-testid="text-lifts-offered">{stats?.totalLiftsOffered || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lifts Requested</span>
              <span className="font-medium" data-testid="text-lifts-requested">{stats?.totalLiftsRequested || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Longest Streak</span>
              <span className="font-medium" data-testid="text-longest-streak">{stats?.longestStreak || 0} days</span>
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full" 
            data-testid="button-manage-subscription"
            onClick={() => manageSubscriptionMutation.mutate()}
            disabled={manageSubscriptionMutation.isPending}
          >
            {manageSubscriptionMutation.isPending ? "Opening..." : "Manage Subscription"}
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            data-testid="button-edit-profile"
            onClick={handleEditProfile}
          >
            Edit Profile
          </Button>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-profile">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your driver details. Your call sign cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your full name"
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="your.email@example.com"
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="07123456789"
                data-testid="input-edit-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="callsign">Call Sign</Label>
              <Input
                id="callsign"
                value={user?.callSign || ""}
                disabled
                className="bg-muted"
                data-testid="input-callsign-readonly"
              />
              <p className="text-xs text-muted-foreground">Call signs are auto-generated and cannot be changed</p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending || !editName.trim()}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
