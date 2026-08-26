import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CreditCard = {
  id: string;
  user_id: string;
  name: string;
  bank: string;
  last4: string;
  color: string;
  credit_limit: number;
  statement_day: number;
  due_day: number;
  created_at: string;
};

export type Payment = {
  id: string;
  user_id: string;
  card_id: string;
  paid_at: string;
  amount: number;
  notes: string | null;
  receipt_path: string | null;
  created_at: string;
};

export type CardInput = Omit<CreditCard, "id" | "user_id" | "created_at">;
export type PaymentInput = Omit<Payment, "id" | "user_id" | "created_at">;

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sesión no disponible");
  return data.user.id;
}

export function useCards() {
  return useQuery({
    queryKey: ["cards"],
    queryFn: async (): Promise<CreditCard[]> => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CreditCard[];
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Payment[];
    },
  });
}

export function useSaveCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: CardInput }) => {
      if (id) {
        const { error } = await supabase.from("cards").update(values).eq("id", id);
        if (error) throw error;
      } else {
        const user_id = await currentUserId();
        const { error } = await supabase.from("cards").insert({ ...values, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards"] }),
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export async function uploadReceipt(file: File) {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
  if (!allowedTypes.has(file.type)) throw new Error("El comprobante debe ser una imagen JPG, PNG, WebP o HEIC");
  if (file.size > 8 * 1024 * 1024) throw new Error("El comprobante no puede superar 8 MB");

  const user_id = await currentUserId();
  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] ?? "jpg";
  const path = `${user_id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file);
  if (error) throw error;
  return path;
}

export async function receiptUrl(path: string) {
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export function useSavePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: PaymentInput }) => {
      if (id) {
        const { error } = await supabase.from("payments").update(values).eq("id", id);
        if (error) throw error;
      } else {
        const user_id = await currentUserId();
        const { error } = await supabase.from("payments").insert({ ...values, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
}
