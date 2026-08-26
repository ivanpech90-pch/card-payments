import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  isPinEnabled,
  savePin,
  disablePin,
  getPin,
} from "@/lib/security";

export const Route = createFileRoute(
  "/_authenticated/settings/security"
)({
  component: SecurityPage,
});

function SecurityPage() {
  const [pin, setPin] = useState("");

  const enabled = isPinEnabled();

  function handleSave() {
    if (!/^\d{4}$/.test(pin)) {
      toast.error("El PIN debe contener 4 dígitos");
      return;
    }

    savePin(pin);
    toast.success("PIN guardado");

    setPin("");
  }

  function handleDisable() {
    disablePin();
    toast.success("PIN desactivado");
  }

  return (
    <AppShell title="Seguridad">
      <div className="surface rounded-xl p-4 space-y-4">

        <div>
          <h2 className="font-medium">
            Bloqueo por PIN
          </h2>

          <p className="text-sm text-muted-foreground">
            Protege el acceso a la aplicación con un PIN de 4 dígitos.
          </p>
        </div>

        <div className="space-y-2">
          <Input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) =>
              setPin(
                e.target.value.replace(/\D/g, "")
              )
            }
            placeholder="1234"
          />
        </div>

        {!enabled ? (
          <Button onClick={handleSave}>
            Activar PIN
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              Cambiar PIN
            </Button>

            <Button
              variant="destructive"
              onClick={handleDisable}
            >
              Desactivar PIN
            </Button>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Estado actual: {enabled ? "Activo" : "Inactivo"}
        </div>

        {enabled && (
          <div className="text-xs text-muted-foreground">
            PIN configurado: ••••
          </div>
        )}
      </div>
    </AppShell>
  );
}