import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPin, unlockApp } from "@/lib/security";
import { toast } from "sonner";

interface PinLockScreenProps {
  onSuccess: () => void;
}

export function PinLockScreen({
  onSuccess,
}: PinLockScreenProps) {
  const [pin, setPin] = useState("");

  function handleUnlock() {
    const savedPin = getPin();

    if (pin !== savedPin) {
      toast.error("PIN incorrecto");
      return;
    }

    unlockApp();
    onSuccess();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="surface w-full max-w-sm p-6 space-y-4">
        <h1 className="text-xl font-semibold">
          Desbloquear aplicación
        </h1>

        <Input
  type="password"
  maxLength={4}
  placeholder="Ingresa tu PIN"
  value={pin}
  onChange={(e) => setPin(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      handleUnlock();
    }
  }}
/>

        <Button
          className="w-full"
          onClick={handleUnlock}
        >
          Desbloquear
        </Button>
      </div>
    </div>
  );
}