import { expect, test } from "@playwright/test";
import { checkA11y, injectAxe } from "axe-playwright";

test("renders the bootstrap surface without detectable accessibility violations", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Cada contacto merece una conversación bien preparada.",
  );

  await injectAxe(page);
  await checkA11y(page);
});
