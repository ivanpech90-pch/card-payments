-- Storage configuration required by the payment receipt uploader.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS on payments protects the payment row, but the foreign key alone does
-- not ensure that card_id belongs to the same user. Enforce that relationship
-- for inserts and updates as well.
CREATE OR REPLACE FUNCTION public.ensure_payment_card_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.cards
    WHERE id = NEW.card_id
      AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'La tarjeta no pertenece al usuario del pago';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

DROP TRIGGER IF EXISTS payments_card_owner ON public.payments;
CREATE TRIGGER payments_card_owner
BEFORE INSERT OR UPDATE OF card_id, user_id ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.ensure_payment_card_owner();
