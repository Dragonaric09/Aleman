import { z } from "zod";

const email = z
  .string({ message: "el email es obligatorio" })
  .trim()
  .toLowerCase()
  .pipe(z.email("email inválido").max(200));

export const passwordSchema = z
  .string({ message: "la contraseña es obligatoria" })
  .min(10, "la contraseña debe tener al menos 10 caracteres")
  .max(200, "la contraseña es demasiado larga");

export const registerSchema = z.object({
  email,
  password: passwordSchema,
  displayName: z.string().trim().min(1, "escribe tu nombre").max(60, "máximo 60 caracteres"),
  timezone: z.string().trim().max(100).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "escribe tu contraseña").max(200),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "escribe tu contraseña actual"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "las contraseñas no coinciden",
  });

export type RegisterInput = z.output<typeof registerSchema>;
export type LoginInput = z.output<typeof loginSchema>;
