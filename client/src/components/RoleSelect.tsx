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
  
  // Log immediately when component mounts to verify it's rendering
  console.log("🟣 RoleSelect component mounted. UserId:", userId);

  const selectRole = async (role: "driver" | "loader") => {
    try {
      console.log("🔴 BUTTON CLICKED - Starting selectRole function");
      console.log("🔴 Role:", role);
      console.log("🔴 UserId:", userId);
      console.log("🔴 About to call apiRequest...");
      
      const response = await apiRequest("POST", `/api/users/${userId}/driver-type`, {
        driverType: role,
      });
      
      console.log("🟢 API request successful:", response);
      
      // Invalidate user query to refetch updated driver type from backend
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] });
      
      localStorage.setItem("driverType", role);
      onRoleSelected(role);
      
      console.log("🟢 Role selection complete");
    } catch (error) {
      console.error("🔴 ERROR in selectRole:", error);
      console.error("🔴 Error type:", error instanceof Error ? "Error object" : typeof error);
      console.error("🔴 Error message:", error instanceof Error ? error.message : String(error));
      console.error("🔴 Error stack:", error instanceof Error ? error.stack : "No stack");
      
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
          <button
            type="button"
            onClick={() => {
              console.log("🟠 DRIVER BUTTON CLICKED!");
              alert("Driver button clicked!");
              selectRole("driver");
            }}
            className="w-full h-24 text-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex flex-col items-center justify-center gap-2"
            data-testid="button-select-driver"
          >
            <Users className="w-8 h-8" />
            <span>Individual Driver</span>
          </button>

          <button
            type="button"
            onClick={() => {
              console.log("🟠 LOADER BUTTON CLICKED!");
              alert("Loader button clicked!");
              selectRole("loader");
            }}
            className="w-full h-24 text-lg bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg flex flex-col items-center justify-center gap-2"
            data-testid="button-select-loader"
          >
            <Truck className="w-8 h-8" />
            <span>Low-Loader Operator</span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
