import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { signJwt } from "../api/helpers.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(currentDir, "screenshots");
fs.mkdirSync(screenshotsDir, { recursive: true });

test.describe("CP-11 - Errores y sesión expirada (frontend)", () => {
  test("Sin token redirige a /login", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("Con token expirado redirige a /login", async ({ page }) => {
    const expiredToken = signJwt({
      usuarioId: 1,
      nombreUsuario: "admin",
      empresaId: 1,
      rolId: 1,
      rolNombre: "administrador",
    });

    await page.addInitScript(
      ({ token, user }) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      },
      {
        token: expiredToken,
        user: {
          nombre_usuario: "admin",
          usuarioId: 1,
          empresaId: 1,
          rolId: 1,
          rolNombre: "administrador",
        },
      }
    );

    await page.goto("/home");
    // Se espera que el primer 401 de la API cierre la sesión y redirija.
    await page.waitForTimeout(3_000);
    await page.screenshot({
      path: path.join(screenshotsDir, "CP-11-token-expirado.png"),
      fullPage: true,
    });

    expect(
      page.url(),
      "El frontend debe redirigir a /login cuando el token está expirado"
    ).toMatch(/\/login/);
  });
});
