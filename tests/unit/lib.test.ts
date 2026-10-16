import { describe, expect, it } from "vitest";
import { addDays, currentWeekStart, isoWeek, isValidDateString, todayInTeamZone, weekEndOf, weeksBetween, weekStartOf } from "@/lib/weeks";
import { isAllowedTournamentUrl, platformForUrl, safeExternalUrl, safeInternalPath } from "@/lib/urls";
import { contentDisposition, sanitizeFilename, sniffFileKind, validateUpload, SCREENSHOT_RULES, RESOURCE_FILE_RULES } from "@/lib/files";
import { formatPrize, parseLocalDateTime, toLocalDateTimeInput } from "@/lib/format";
import { hashPassword, verifyPassword } from "@/lib/password";
import { file, PDF_BYTES, PNG_BYTES } from "./helpers";

describe("semaines", () => {
  it("calcule le lundi ISO, y compris pour un dimanche", () => {
    expect(weekStartOf("2026-10-14")).toBe("2026-10-12"); // mercredi
    expect(weekStartOf("2026-10-18")).toBe("2026-10-12"); // dimanche
    expect(weekStartOf("2026-10-12")).toBe("2026-10-12"); // lundi
    expect(weekEndOf("2026-10-12")).toBe("2026-10-18");
  });
  it("traverse les changements d'année et d'heure", () => {
    expect(weekStartOf("2027-01-01")).toBe("2026-12-28");
    expect(isoWeek("2026-12-28")).toEqual({ year: 2026, week: 53 });
    expect(isoWeek("2027-01-04")).toEqual({ year: 2027, week: 1 });
    expect(addDays("2026-10-24", 7)).toBe("2026-10-31"); // passage à l'heure d'hiver le 25/10
  });
  it("utilise le fuseau de l'équipe pour la date du jour", () => {
    // Dimanche 23:30 UTC = lundi 01:30 à Paris (heure d'été)
    const now = new Date("2026-10-18T23:30:00Z");
    expect(todayInTeamZone(now, "Europe/Paris")).toBe("2026-10-19");
    expect(currentWeekStart(now)).toBe("2026-10-19");
  });
  it("liste les semaines et rejette les dates invalides", () => {
    expect(weeksBetween("2026-09-30", "2026-10-14")).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2026-1-01")).toBe(false);
    expect(() => weekStartOf("n'importe quoi")).toThrow();
  });
});

describe("URL", () => {
  it("n'accepte que les liens HTTPS vers les plateformes autorisées", () => {
    expect(isAllowedTournamentUrl("https://www.faceit.com/fr/championship/abc")).toBe(true);
    expect(isAllowedTournamentUrl("https://www.checkmategaming.com/tournament/xyz")).toBe(true);
    expect(isAllowedTournamentUrl("http://www.faceit.com/x")).toBe(false);
    expect(isAllowedTournamentUrl("https://faceit.com.evil.com/x")).toBe(false);
    expect(isAllowedTournamentUrl("https://user:pw@www.faceit.com/x")).toBe(false);
    expect(isAllowedTournamentUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedTournamentUrl("https://www.faceit.com:8443/x")).toBe(false);
  });
  it("détecte la plateforme d'un lien", () => {
    expect(platformForUrl("https://www.faceit.com/fr/x")).toBe("FACEIT");
    expect(platformForUrl("https://checkmategaming.com/x")).toBe("CMG");
    expect(platformForUrl("https://example.com")).toBe(null);
    expect(safeExternalUrl("https://wzstats.gg/")?.hostname).toBe("wzstats.gg");
  });
  it("bloque les redirections ouvertes après connexion", () => {
    expect(safeInternalPath("/stats")).toBe("/stats");
    expect(safeInternalPath("//evil.com")).toBe("/");
    expect(safeInternalPath("/\\evil.com")).toBe("/");
    expect(safeInternalPath("https://evil.com")).toBe("/");
    expect(safeInternalPath(undefined, "/x")).toBe("/x");
  });
});

describe("fichiers", () => {
  it("détecte le type réel par signature", () => {
    expect(sniffFileKind(PNG_BYTES)?.mime).toBe("image/png");
    expect(sniffFileKind(PDF_BYTES)?.mime).toBe("application/pdf");
    expect(sniffFileKind(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"))).toBe(null);
  });
  it("refuse une extension qui ne correspond pas au contenu", async () => {
    await expect(validateUpload(file(PDF_BYTES, "capture.png", "image/png"), SCREENSHOT_RULES)).rejects.toThrow(/PNG, JPEG/);
    await expect(validateUpload(file(PNG_BYTES, "logo.jpg"), RESOURCE_FILE_RULES)).rejects.toThrow(/extension/);
    await expect(validateUpload(file(PNG_BYTES, "logo.png"), { ...RESOURCE_FILE_RULES, maxBytes: 10 })).rejects.toThrow(/taille maximale/);
    const ok = await validateUpload(file(PNG_BYTES, "../../etc/logo.png"), SCREENSHOT_RULES);
    expect(ok.kind.mime).toBe("image/png");
    expect(ok.originalName).toBe("logo.png");
  });
  it("produit des noms et en-têtes sûrs", () => {
    expect(sanitizeFilename('a"b<c>.png')).toBe("a_b_c_.png");
    expect(contentDisposition("attachment", 'é"x.png')).toBe(`attachment; filename="__x.png"; filename*=UTF-8''%C3%A9%22x.png`);
  });
});

describe("formatage", () => {
  it("affiche « Non communiqué » pour un cashprize inconnu", () => {
    expect(formatPrize(null, null)).toBe("Non communiqué");
    expect(formatPrize(50000, "EUR").replace(/\s/g, " ")).toBe("500 €");
    expect(formatPrize(12345, "USD").replace(/\s/g, " ")).toBe("123,45 $US");
  });
  it("convertit les dates locales de l'équipe aller-retour", () => {
    const d = parseLocalDateTime("2026-10-20T19:00")!;
    expect(d.toISOString()).toBe("2026-10-20T17:00:00.000Z"); // UTC+2 en octobre
    expect(toLocalDateTimeInput(d)).toBe("2026-10-20T19:00");
    expect(parseLocalDateTime("2026-12-20T19:00")!.toISOString()).toBe("2026-12-20T18:00:00.000Z"); // UTC+1
    expect(parseLocalDateTime("pas une date")).toBe(null);
  });
});

describe("mots de passe", () => {
  it("hache et vérifie", async () => {
    const h = await hashPassword("un-mot-de-passe-long");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("un-mot-de-passe-long", h)).toBe(true);
    expect(await verifyPassword("mauvais", h)).toBe(false);
    expect(await verifyPassword("x", "format-invalide")).toBe(false);
  });
});
