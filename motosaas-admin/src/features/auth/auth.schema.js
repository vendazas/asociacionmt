import { z } from "zod";

export const loginSchema = z.object({
  associationSlug: z.string().min(1, "La asociacion es requerida."),
  email: z.string().email("Email invalido."),
  password: z.string().min(1, "El password es requerido.")
});
