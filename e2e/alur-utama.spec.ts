// Alur utama: login → event & gate → impor → buat QR → cetak PDF → scan → laporan → ekspor.
import path from "node:path";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { expect, test, type Page } from "@playwright/test";
import { decryptToken } from "../src/lib/qr";
import { E2E_ADMIN, TEST_DB } from "./env";

test.describe.configure({ mode: "serial" });

let page: Page;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  page.on("dialog", (d) => d.accept()); // confirm() di UI
});
test.afterAll(() => page.close());

async function tokenOf(code: string): Promise<string> {
  const db = new pg.Client({ connectionString: TEST_DB });
  await db.connect();
  const { rows } = await db.query(
    "select q.token_encrypted from guests g join qr_credentials q on q.guest_id = g.id and q.is_active where g.external_code = $1",
    [code],
  );
  await db.end();
  return decryptToken(rows[0].token_encrypted);
}

test("login sebagai admin", async () => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("buat event aktif dan gate", async () => {
  await page.getByRole("link", { name: "Event", exact: true }).click();
  await page.getByRole("button", { name: "Tambah event" }).click();
  await page.getByLabel("Nama event").fill("Event E2E");
  await page.getByLabel("Venue").fill("Aula Uji");
  await page.getByLabel("Tanggal").fill("2026-11-20");
  await page.getByLabel("Status").selectOption("ACTIVE");
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByRole("cell", { name: "Event E2E" })).toBeVisible();

  await page.getByRole("link", { name: "Gate & Petugas" }).click();
  await expect(page.getByText("Event: Event E2E")).toBeVisible();
  await page.getByPlaceholder("Nama gate, mis. Gate A").fill("Gate E2E");
  await page.getByRole("button", { name: "Tambah gate" }).click();
  await expect(page.getByRole("cell", { name: "Gate E2E" })).toBeVisible();
});

test("impor CSV: pratinjau lalu simpan 5 tamu dengan kode 0001-0005", async () => {
  await page.getByRole("link", { name: "Impor Data" }).click();
  await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "tamu-e2e.csv"));
  await expect(page.getByText("0001 – 0005")).toBeVisible();
  await page.getByRole("button", { name: "Simpan 5 tamu" }).click();
  await expect(page.getByRole("cell", { name: "tamu-e2e.csv" })).toBeVisible();

  await page.getByRole("link", { name: "Data Tamu" }).click();
  await expect(page.getByText("5 tamu")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Andi E2E" })).toBeVisible();
});

test("buat QR dan unduh PDF gelang", async () => {
  await page.getByRole("link", { name: "QR & Cetak" }).click();
  await page.getByRole("button", { name: "Buat QR (5)" }).click();
  await expect(page.getByRole("button", { name: "Buat QR (0)" })).toBeDisabled();

  await page.getByRole("button", { name: "Pratinjau halaman 1" }).click();
  await expect(page.locator('iframe[title="Pratinjau cetak"]')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Unduh PDF" }).click()]);
  const pdf = await readFile((await download.path())!);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length).toBe(5); // 5 gelang, 1 per halaman
  await expect(page.getByText("5 label")).toBeVisible();
});

test("scan USB: berhasil, sudah check-in, tidak dikenal, dan offline", async () => {
  await page.getByRole("link", { name: "Scan Gate" }).click();
  await expect(page.getByText("Gate E2E")).toBeVisible(); // satu gate -> langsung terbuka
  const input = page.getByLabel("Hasil scanner USB");
  await expect(input).toBeFocused();

  await input.fill(await tokenOf("0001"));
  await input.press("Enter");
  await expect(page.getByText("BERHASIL", { exact: true })).toBeVisible();
  await expect(page.getByText("Andi E2E")).toBeVisible();

  await page.getByRole("button", { name: "Mulai Scan Lagi" }).click();
  await page.waitForTimeout(2100); // lewati debounce token sama (2 dtk)
  await input.fill(await tokenOf("0001"));
  await input.press("Enter");
  await expect(page.getByText("SUDAH CHECK-IN")).toBeVisible();

  await input.fill("VP1_bukan_token_yang_terdaftar_sama_sekali_xx");
  await input.press("Enter");
  await expect(page.getByText("QR TIDAK DIKENAL")).toBeVisible();

  // TC-11: koneksi putus -> GAGAL TERHUBUNG, tidak pernah berhasil.
  await page.context().setOffline(true);
  await input.fill(await tokenOf("0002"));
  await input.press("Enter");
  await expect(page.getByText("GAGAL TERHUBUNG")).toBeVisible();
  await expect(page.getByText("BERHASIL", { exact: true })).toHaveCount(0);
  await page.context().setOffline(false);
});

test("laporan kehadiran dan ekspor XLSX", async () => {
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Laporan Kehadiran" })).toBeVisible();
  const hadir = page.locator("dl > div").filter({ has: page.locator("dt", { hasText: /^Hadir$/ }) }).locator("dd");
  await expect(hadir).toHaveText("1");
  await expect(page.getByText("20%")).toBeVisible(); // 1 dari 5

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Ekspor XLSX" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^kehadiran-.*\.xlsx$/);
  const xlsx = await readFile((await download.path())!);
  expect(xlsx.subarray(0, 2).toString()).toBe("PK");
});
