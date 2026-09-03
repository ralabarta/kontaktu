import { expect, test } from "@playwright/test";
import { checkA11y, injectAxe } from "axe-playwright";

test("navigates from the API-backed list to a contact detail", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Contactos/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Luz Conversación WhatsApp/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Bruno Simulado Inquilino/ }).click();

  await expect(page).toHaveURL(/\/contacts\/demo-contact-03$/);
  await expect(
    page.getByRole("heading", { name: /Bruno Simulado Inquilino/ }),
  ).toBeVisible();
  await expect(page.getByText("Presupuesto mensual")).toBeVisible();

  await injectAxe(page);
  await checkA11y(page);
});

test("supports a direct deep link with manual fact precedence", async ({
  page,
}) => {
  await page.goto("/contacts/demo-contact-10");

  await expect(
    page.getByRole("heading", { name: /Gael Precedencia Manual/ }),
  ).toBeVisible();
  await expect(page.getByText(/Edición manual/).first()).toBeVisible();
  await page.getByText("Ver historial del dato").click();
  await expect(page.getByText("300000")).toBeVisible();
});

test("keeps duplicate navigation reciprocal without offering a merge", async ({
  page,
}) => {
  await page.goto("/contacts/demo-contact-01");

  await expect(page.getByText("Posible duplicado")).toBeVisible();
  await page
    .getByRole("link", { name: /Ver Aina Ficticia Duplicada/, exact: true })
    .click();
  await expect(page).toHaveURL(/\/contacts\/demo-contact-02$/);
  await expect(
    page.getByRole("link", {
      name: /Ver Aina Ficticia Compradora/,
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /fusionar/i })).toHaveCount(0);
});

test("shows cased compliance and handoff while email stays technically available", async ({
  page,
}) => {
  await page.goto("/contacts/demo-contact-07");

  await expect(
    page.getByRole("heading", { name: /Llamada bloqueada/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Llamada bloqueada/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", { name: /Enviar email/ }),
  ).toHaveAttribute("href", "mailto:dora.cumplimiento@example.invalid");
  await expect(
    page.getByRole("heading", { name: /Traspaso humano/ }),
  ).toBeVisible();
  await expect(page.getByText(/no acredita consentimiento/i)).toBeVisible();
});

test("renders an indistinguishable not-found contact state", async ({
  page,
}) => {
  await page.goto("/contacts/demo-contact-99");

  await expect(
    page.getByRole("heading", { name: /Contacto no encontrado/ }),
  ).toBeVisible();
  await expect(page.getByText(/no pertenezca a este espacio/i)).toBeVisible();
});

test("uses a clear mobile master-detail flow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Contactos/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Luz Conversación WhatsApp/ }),
  ).toBeHidden();
  await page.getByRole("link", { name: /Bruno Simulado Inquilino/ }).click();
  await expect(
    page.getByRole("heading", { name: /Bruno Simulado Inquilino/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Volver a contactos/ }),
  ).toBeVisible();
});

test("keeps primary navigation and disclosures keyboard operable", async ({
  page,
}) => {
  await page.goto("/contacts/demo-contact-01");

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: /Ir al contenido/ }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#contenido")).toBeFocused();

  const transcript = page.getByText("Ver transcripción");
  await transcript.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(/transcripción es completamente sintética/i),
  ).toBeVisible();
});
