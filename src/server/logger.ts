import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { app: "wortschatz-srs" },
  // Los logs nunca incluyen contraseñas, tokens ni respuestas completas de usuario.
  redact: {
    paths: ["password", "*.password", "passwordHash", "*.passwordHash", "token", "*.token", "typedAnswer", "*.typedAnswer", "cookie", "*.cookie"],
    censor: "[oculto]",
  },
});
