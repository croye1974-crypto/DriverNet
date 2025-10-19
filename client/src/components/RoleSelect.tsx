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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("🟠 DRIVER BUTTON CLICKED (onClick)!");
              alert("Driver button clicked!");
              selectRole("driver");
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              console.log("🟠 DRIVER BUTTON TOUCHED (onTouchEnd)!");
              alert("Driver button touched!");
              selectRole("driver");
            }}
            style={{
              WebkitTapHighlightColor: 'transparent',
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
            className="w-full h-24 text-lg bg-blue-600 active:bg-blue-800 text-white font-semibold rounded-lg flex flex-col items-center justify-center gap-2"
            data-testid="button-select-driver"
          >
            <Users className="w-8 h-8" style={{ pointerEvents: 'none' }} />
            <span style={{ pointerEvents: 'none' }}>Individual Driver</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("🟠 LOADER BUTTON CLICKED (onClick)!");
              alert("Loader button clicked!");
              selectRole("loader");
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              console.log("🟠 LOADER BUTTON TOUCHED (onTouchEnd)!");
              alert("Loader button touched!");
              selectRole("loader");
            }}
            style={{
              WebkitTapHighlightColor: 'transparent',
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
            className="w-full h-24 text-lg bg-red-600 active:bg-red-800 text-white font-semibold rounded-lg flex flex-col items-center justify-center gap-2"
            data-testid="button-select-loader"
          >
            <Truck className="w-8 h-8" style={{ pointerEvents: 'none' }} />
            <span style={{ pointerEvents: 'none' }}>Low-Loader Operator</span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
