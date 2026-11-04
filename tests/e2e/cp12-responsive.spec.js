import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(currentDir, "screenshots");
fs.mkdirSync(screenshotsDir, { recursive: true });

const VIEWPORTS = [
  {
    name: "desktop-1366x768",
    width: 1366,
    height: 768,
    minCardWidth: 180,
  },
  {
    name: "tablet-768x1024",
    width: 768,
    height: 1024,
    minCardWidth: 90,
  },
  {
    name: "mobile-390x844",
    width: 390,
    height: 844,
    minCardWidth: 100,
  },
];

const ROUTES = [
  { path: "/clientes", heading: /Gestión de Clientes/, screenshot: "clientes" },
  { path: "/contratos", heading: /Gestión de Contratos/, screenshot: "contratos" },
  { path: "/auditoria", heading: /Auditoría/, screenshot: "auditoria" },
  { path: "/usuarios", heading: /Gestión de Usuarios/, screenshot: "usuarios" },
];

function shot(name) {
  return path.join(screenshotsDir, `${name}.png`);
}

async function layoutMetrics(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        right: box.right,
        bottom: box.bottom,
      };
    };

    const drawer = document.querySelector(".MuiDrawer-paper");
    const main = document.querySelector("main");
    const cards = [...document.querySelectorAll(".MuiCard-root")]
      .slice(0, 4)
      .map(rect);
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (element) => ({
        text: (element.textContent || "").trim(),
        ...rect(element),
      })
    );

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      drawer: drawer ? rect(drawer) : null,
      main: main ? rect(main) : null,
      cards,
      headings,
    };
  });
}

for (const viewport of VIEWPORTS) {
  test.describe(`CP-12 - Responsive y usabilidad (${viewport.name})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test(`flujo principal usable en ${viewport.name}`, async ({ page }) => {
      const failures = [];
      page.on("pageerror", (error) => {
        failures.push(`Error JavaScript no controlado: ${error.message}`);
      });

      await page.goto("/login", { waitUntil: "networkidle" });
      await expect(page.getByTestId("input-nombre-usuario")).toBeVisible();
      await expect(page.getByTestId("input-password")).toBeVisible();
      await expect(page.getByTestId("button-login")).toBeVisible();
      await page.screenshot({
        path: shot(`${viewport.name}-01-login`),
        fullPage: true,
      });

      const loginMetrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      if (loginMetrics.scrollWidth > loginMetrics.innerWidth + 1) {
        failures.push(
          `Login: desbordamiento horizontal (${loginMetrics.scrollWidth}px > ${loginMetrics.innerWidth}px)`
        );
      }

      const metricsResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/metricas") && response.status() === 200,
        { timeout: 20_000 }
      );

      await page.getByTestId("input-nombre-usuario").fill("admin");
      await page.getByTestId("input-password").fill("admin");
      await page.getByTestId("button-login").click();
      await page.waitForURL("**/home", { timeout: 20_000 });
      await metricsResponse;
      await expect(page.getByText(/Bienvenido,/).first()).toBeVisible();
      await page.screenshot({
        path: shot(`${viewport.name}-02-home`),
        fullPage: true,
      });

      const home = await layoutMetrics(page);

      if (home.docScrollWidth > home.viewport.width + 1) {
        failures.push(
          `Inicio: desbordamiento horizontal (${home.docScrollWidth}px > ${home.viewport.width}px)`
        );
      }

      if (home.drawer) {
        const drawerRatio = home.drawer.width / home.viewport.width;
        if (viewport.width < 600 && drawerRatio > 0.5) {
          failures.push(
            `Inicio: el menú lateral ocupa ${(drawerRatio * 100).toFixed(
              1
            )}% del ancho en móvil (${home.drawer.width}px de ${
              home.viewport.width
            }px)`
          );
        }
      }

      if (home.main) {
        const mainRatio = home.main.width / home.viewport.width;
        if (viewport.width < 600 && mainRatio < 0.5) {
          failures.push(
            `Inicio: el área de contenido solo ocupa ${(mainRatio * 100).toFixed(
              1
            )}% del ancho en móvil (${home.main.width}px de ${
              home.viewport.width
            }px)`
          );
        }
      }

      if (home.cards.length === 0) {
        failures.push("Inicio: no se encontraron las tarjetas de métricas");
      }
      const narrowCards = home.cards.filter(
        (card) => card.width < viewport.minCardWidth
      );
      if (narrowCards.length > 0) {
        failures.push(
          `Inicio: ${narrowCards.length} tarjeta(s) de métricas con ancho insuficiente (${narrowCards
            .map((card) => `${card.width.toFixed(1)}px`)
            .join(", ")}; mínimo esperado ${viewport.minCardWidth}px)`
        );
      }

      for (const route of ROUTES) {
        await page.goto(route.path, { waitUntil: "networkidle" });
        const heading = page.getByText(route.heading).first();
        await expect(heading).toBeVisible({ timeout: 20_000 });
        await page.screenshot({
          path: shot(`${viewport.name}-03-${route.screenshot}`),
          fullPage: true,
        });

        const metrics = await layoutMetrics(page);
        if (metrics.docScrollWidth > metrics.viewport.width + 1) {
          failures.push(
            `${route.path}: desbordamiento horizontal (${metrics.docScrollWidth}px > ${metrics.viewport.width}px)`
          );
        }

        const headingBox = metrics.headings.find((item) =>
          route.heading.test(item.text)
        );
        if (!headingBox) {
          failures.push(`${route.path}: no se pudo medir el título principal`);
        } else {
          if (headingBox.width < 50) {
            failures.push(
              `${route.path}: título principal demasiado angosto (${headingBox.width.toFixed(
                1
              )}px)`
            );
          }
          if (headingBox.right > metrics.viewport.width + 1) {
            failures.push(
              `${route.path}: título principal fuera del viewport (right=${headingBox.right.toFixed(
                1
              )}px, viewport=${metrics.viewport.width}px)`
            );
          }
        }
      }

      expect(
        failures,
        `Problemas de responsive/usabilidad en ${viewport.name}:\n- ${failures.join(
          "\n- "
        )}`
      ).toEqual([]);
    });
  });
}
