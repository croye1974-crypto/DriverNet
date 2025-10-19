import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Truck } from "lucide-react";
import logoUrl from "@assets/image_1760603053099.png";

interface RoleSelectProps {
  userId: string;
  onRoleSelected: (role: "driver" | "loader") => void;
}

export default function RoleSelect({ userId, onRoleSelected }: RoleSelectProps) {
  console.log("🟣 RoleSelect component mounted. UserId:", userId);

  const selectRole = async (type: "driver" | "loader") => {
    try {
      console.log("🔵 DRIVER BUTTON CLICKED", type);
      
      // Make the API call to save the driver type
      const res = await fetch(`/api/users/${userId}/driver-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverType: type }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to save role');
      }
      
      console.log("✅ POST /api/users/user-1/driver-type 200");
      alert(`Saved role: ${type}`);
      
      // Reload the page to show the Map screen
      window.location.reload();
    } catch (e: any) {
      console.error("❌ Failed to save role", e);
      alert('Failed to save role: ' + (e?.message || 'Unknown error'));
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
