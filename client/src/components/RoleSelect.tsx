import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Truck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/image_1760603053099.png";

interface RoleSelectProps {
  userId: string;
  onRoleSelected: (role: "driver" | "loader") => void;
}

export default function RoleSelect({ userId, onRoleSelected }: RoleSelectProps) {
  const { toast } = useToast();

  const selectRole = async (role: "driver" | "loader") => {
    try {
      console.log("Attempting to set driver type:", role, "for user:", userId);
      const response = await apiRequest("POST", `/api/users/${userId}/driver-type`, {
        driverType: role,
      });
      console.log("Driver type set successfully:", response);
      
      // Invalidate user query to refetch updated driver type from backend
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] });
      
      localStorage.setItem("driverType", role);
      onRoleSelected(role);
    } catch (error) {
      console.error("Failed to set driver type:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set driver type. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(214,32%,91%)]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src={logoUrl} alt="DriveNet" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl text-center">Choose Your Role</CardTitle>
          <CardDescription className="text-center">
            How will you be using DriveNet today?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => selectRole("driver")}
            className="w-full h-24 text-lg"
            variant="default"
            data-testid="button-select-driver"
          >
            <div className="flex flex-col items-center gap-2">
              <Users className="w-8 h-8" />
              <span>Individual Driver</span>
            </div>
          </Button>

          <Button
            onClick={() => selectRole("loader")}
            className="w-full h-24 text-lg"
            variant="destructive"
            data-testid="button-select-loader"
          >
            <div className="flex flex-col items-center gap-2">
              <Truck className="w-8 h-8" />
              <span>Low-Loader Operator</span>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
