CREATE POLICY "Users delete anexos of own demandas"
ON public.demanda_anexos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.demandas d
    WHERE d.id = demanda_anexos.demanda_id
      AND d.solicitante_id = auth.uid()
  )
);