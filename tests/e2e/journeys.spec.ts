import { expect, test, type Page, type APIRequestContext } from "@playwright/test";
import { E2E_ADMIN } from "../../playwright.config";

// Parcours utilisateur réels contre le build de production (base e2e jetable).
// Les tests s'exécutent en série et partagent les données qu'ils créent.
test.describe.configure({ mode: "serial" });

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cf00000301010018dd8db40000000049454e44ae426082",
  "hex",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const PLAYER = { email: "joueur-e2e@mks.test", password: "joueur-password-123", name: "Joueur E2E" };
const PLAYER2 = { email: "joueur2-e2e@mks.test", password: "joueur2-password-123", name: "Second Joueur" };

const state: { resourceId?: string; adminOnlyResourceId?: string; statId?: string; tournamentId?: string } = {};

async function login(page: Page, email: string, password: string, next?: string) {
  await page.goto(next ? `/connexion?suite=${encodeURIComponent(next)}` : "/connexion");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/connexion"));
  await page.waitForLoadState("networkidle"); // page hydratée avant toute interaction
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Déconnexion" }).first().click();
  await page.waitForURL("**/?ok=logout");
}

async function status(request: APIRequestContext, url: string) {
  return (await request.get(url, { maxRedirects: 0 })).status();
}

test.describe("visiteur non connecté", () => {
  test("chaque lien visible de l'accueil mène à une page valide", async ({ page, request }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("MK");
    const hrefs = await page.locator("a[href]").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
    expect(hrefs.length).toBeGreaterThan(5);
    for (const href of hrefs) {
      expect(href, "aucun lien vers #").not.toBe("#");
      if (href.startsWith("http")) {
        expect(href).toMatch(/^https:\/\//);
        continue;
      }
      const res = await request.get(href);
      expect(res.status(), `lien ${href}`).toBeLessThan(400);
    }
    expect(errors).toEqual([]);
  });

  test("« Voir mes statistiques » redirige vers la connexion puis revient sur la page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Voir mes statistiques" }).first().click();
    await expect(page).toHaveURL(/\/connexion\?suite=%2Fstats/);
    await expect(page.getByText("réservée aux membres")).toBeVisible();
  });

  test("les zones privées et les fichiers sont refusés côté serveur", async ({ request }) => {
    expect(await status(request, "/admin")).toBe(307);
    expect(await status(request, "/ressources")).toBe(307);
    expect(await status(request, "/stats")).toBe(307);
    expect(await status(request, "/api/ressources/inexistant/fichier")).toBe(401);
    expect(await status(request, "/api/stats/inexistant/capture")).toBe(401);
  });

  test("les pages publiques gèrent l'état vide", async ({ page }) => {
    await page.goto("/meta");
    await expect(page.getByText("Aucune fiche méta publiée")).toBeVisible();
    await page.goto("/tournois");
    await expect(page.getByText("Aucun tournoi à venir")).toBeVisible();
    await page.goto("/page-qui-n-existe-pas");
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  });

  test("identifiants invalides : message générique", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("E-mail").fill(E2E_ADMIN.email);
    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.locator("form [role=alert]")).toContainText("E-mail ou mot de passe incorrect");
  });
});

test.describe("administration", () => {
  test("un joueur ne peut pas accéder à l'administration", async ({ page }) => {
    // créé par l'admin dans le test suivant : on vérifie ici l'accès anonyme seulement
    await page.goto("/admin/membres");
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("l'admin crée deux membres", async ({ page }) => {
    await login(page, E2E_ADMIN.email, E2E_ADMIN.password, "/admin/membres");
    await expect(page).toHaveURL(/\/admin\/membres/);
    for (const p of [PLAYER, PLAYER2]) {
      await page.getByLabel("Nom affiché").fill(p.name);
      await page.getByLabel("E-mail").fill(p.email);
      await page.getByLabel("Mot de passe initial").fill(p.password);
      await page.getByRole("button", { name: "Créer le compte" }).click();
      await expect(page.getByText("Membre créé.")).toBeVisible();
      await expect(page.getByRole("cell", { name: new RegExp(p.email) })).toBeVisible();
    }
    // mot de passe trop court : erreur affichée et saisie conservée
    await page.getByLabel("Nom affiché").fill("Trop court");
    await page.getByLabel("E-mail").fill("court@mks.test");
    await page.getByLabel("Mot de passe initial").fill("court");
    await page.getByRole("button", { name: "Créer le compte" }).click();
    await expect(page.getByText("au moins 10 caractères")).toBeVisible();
    await expect(page.getByLabel("Nom affiché")).toHaveValue("Trop court");
  });

  test("l'admin publie des ressources ; un fichier invalide est refusé et journalisé", async ({ page }) => {
    await login(page, E2E_ADMIN.email, E2E_ADMIN.password, "/admin/ressources/nouveau");
    await page.getByLabel("Nom").fill("Logo officiel E2E");
    await page.getByLabel("Catégorie").selectOption("LOGOS");
    await page.locator("input[name=file]").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
    await page.getByLabel("Publier pour les membres").check();
    await page.getByRole("button", { name: "Ajouter la ressource" }).click();
    await expect(page.getByText("Ressource enregistrée.")).toBeVisible();

    await page.goto("/admin/ressources/nouveau");
    await page.getByLabel("Nom").fill("Charte interne admins");
    await page.getByLabel("Accès").selectOption("ADMINS");
    await page.locator("input[name=file]").setInputFiles({ name: "charte.pdf", mimeType: "application/pdf", buffer: PDF });
    await page.getByLabel("Publier pour les membres").check();
    await page.getByRole("button", { name: "Ajouter la ressource" }).click();
    await expect(page.getByText("Ressource enregistrée.")).toBeVisible();

    await page.goto("/admin/ressources/nouveau");
    await page.getByLabel("Nom").fill("Faux PNG");
    await page.locator("input[name=file]").setInputFiles({ name: "faux.png", mimeType: "image/png", buffer: PDF });
    await page.getByRole("button", { name: "Ajouter la ressource" }).click();
    await expect(page.locator("form [role=alert]").first()).toBeVisible();
    await expect(page.getByText(/ne correspond pas au contenu réel/).first()).toBeVisible();
    await page.goto("/admin/ressources");
    await expect(page.getByText(/faux\.png/)).toBeVisible(); // échec visible dans la liste des échecs

    const ids = await page.locator('a[href^="/api/ressources/"][href$="/fichier"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")!.split("/")[3]));
    const rows = await page.locator("tbody tr").allTextContents();
    state.resourceId = ids[rows.findIndex((r) => r.includes("Logo officiel E2E"))];
    state.adminOnlyResourceId = ids[rows.findIndex((r) => r.includes("Charte interne admins"))];
    expect(state.resourceId).toBeTruthy();
  });

  test("l'admin crée une fiche méta avec une configuration", async ({ page }) => {
    await login(page, E2E_ADMIN.email, E2E_ADMIN.password, "/admin/meta/nouveau");
    await page.getByLabel("Nom de l'arme").fill("Arme E2E");
    await page.getByLabel("Catégorie").selectOption("SMG");
    await page.getByLabel("Mode").fill("Résurgence");
    await page.getByLabel("Classement").selectOption("S");
    await page.getByLabel("Statut méta").selectOption("RISING");
    await page.getByLabel("URL de la source").fill("https://wzstats.gg/");
    await page.getByLabel("Publier la fiche").check();
    await page.getByRole("button", { name: "Créer la fiche" }).click();
    await expect(page.getByText("Fiche méta créée.")).toBeVisible();
    await page.waitForLoadState("networkidle"); // hydratation terminée avant de saisir dans les champs contrôlés

    await page.getByLabel("Nom de la configuration").last().fill("Polyvalente");
    await page.getByLabel("Accessoires 1 — emplacement").last().fill("Bouche");
    await page.getByLabel("Accessoires 1 — nom").last().fill("Silencieux E2E");
    await page.getByLabel("Accessoires 2 — emplacement").last().fill("Canon");
    await page.getByLabel("Accessoires 2 — nom").last().fill("Canon renforcé E2E");
    await page.getByRole("button", { name: "Ajouter la configuration" }).click();
    await expect(page.getByText("Configuration ajoutée.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Configurations (1)" })).toBeVisible();
  });

  test("l'admin ajoute un tournoi ; un lien non autorisé est refusé", async ({ page }) => {
    await login(page, E2E_ADMIN.email, E2E_ADMIN.password, "/admin/tournois/nouveau");
    const start = new Date(Date.now() + 3 * 86400000);
    const local = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    await page.getByLabel("Nom du tournoi").fill("Cup E2E");
    await page.getByLabel("Lien officiel (page d'inscription ou de détails)").fill("https://evil.example/cup");
    await page.getByLabel("Début").fill(local);
    await page.getByLabel("Participation").selectOption("TEAM");
    await page.getByLabel("Taille d'équipe").fill("4");
    await page.getByLabel("Montant").fill("250");
    await page.getByLabel("Devise").selectOption("EUR");
    await page.getByLabel("Statut").selectOption("REGISTRATION_OPEN");
    await page.getByLabel("Publier dans l'annuaire").check();
    await page.getByRole("button", { name: "Créer le tournoi" }).click();
    await expect(page.getByText(/Lien refusé/)).toBeVisible();
    await expect(page.getByLabel("Nom du tournoi")).toHaveValue("Cup E2E"); // saisie conservée
    await page.getByLabel("Lien officiel (page d'inscription ou de détails)").fill("https://www.faceit.com/fr/championship/e2e-test");
    await page.getByRole("button", { name: "Créer le tournoi" }).click();
    await expect(page.getByText("Tournoi enregistré.")).toBeVisible();
  });
});

test.describe("parcours joueur", () => {
  test("méta : recherche, filtres, détail avec source et date", async ({ page }) => {
    await page.goto("/meta");
    await expect(page.getByRole("heading", { name: "Arme E2E" })).toBeVisible();
    await page.getByLabel("Rechercher une arme").fill("introuvable-xyz");
    await page.getByRole("button", { name: "Filtrer" }).click();
    await expect(page.getByText("Aucune arme ne correspond")).toBeVisible();
    await page.goto("/meta?category=SMG");
    await page.getByRole("link", { name: /Arme E2E/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Arme E2E" })).toBeVisible();
    await expect(page.getByText(/EN HAUSSE/)).toBeVisible(); // regex sensible à la casse : le badge, pas la note explicative
    await expect(page.getByRole("link", { name: /WZStats/ })).toHaveAttribute("href", "https://wzstats.gg/");
    await expect(page.getByText("Dernière vérification")).toBeVisible();
    await expect(page.getByText("Silencieux E2E")).toBeVisible();
  });

  test("tournois : filtres et bouton « Participer » vers la plateforme officielle", async ({ page, request }) => {
    await page.goto("/tournois");
    await expect(page.getByRole("link", { name: "Cup E2E", exact: true })).toBeVisible();
    await page.getByLabel("Plateforme", { exact: true }).selectOption("CMG");
    await page.getByRole("button", { name: "Appliquer" }).click();
    await expect(page.getByText("Aucun tournoi ne correspond")).toBeVisible();
    await page.goto("/tournois?participantType=TEAM&currency=EUR&prizeMin=100");
    await expect(page.getByRole("link", { name: "Cup E2E", exact: true })).toBeVisible();
    await page.goto("/tournois?prizeMin=100");
    await expect(page.getByText(/filtre de cashprize a été ignoré/)).toBeVisible();

    await page.goto("/tournois");
    const href = await page.getByRole("link", { name: /Participer à Cup E2E/ }).getAttribute("href");
    state.tournamentId = href!.split("/")[2];
    const res = await request.get(href!, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("https://www.faceit.com/fr/championship/e2e-test");
    await page.getByRole("link", { name: "Cup E2E", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/tournois/${state.tournamentId}$`));
    await expect(page.getByText("250 €")).toBeVisible();
    await expect(page.getByText("Équipe (4 joueurs)")).toBeVisible();
    await expect(page.getByText("Clôture des inscriptions")).toBeVisible();
  });

  test("ressources : accès membre, aperçu, téléchargement réel, refus du niveau admin", async ({ page }) => {
    await login(page, PLAYER.email, PLAYER.password, "/ressources");
    await expect(page.getByRole("heading", { name: "Logo officiel E2E" })).toBeVisible();
    await expect(page.getByText("Charte interne admins")).toHaveCount(0);
    const preview = page.getByRole("img", { name: "Aperçu de Logo officiel E2E" });
    await expect(preview).toBeVisible();
    expect(await preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);

    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Télécharger" }).first().click()]);
    expect(download.suggestedFilename()).toBe("logo.png");
    const path = await download.path();
    const { readFileSync } = await import("node:fs");
    expect(readFileSync(path).equals(PNG)).toBe(true);

    const own = await page.request.get(`/api/ressources/${state.resourceId}/fichier`);
    expect(own.status()).toBe(200);
    const denied = await page.request.get(`/api/ressources/${state.adminOnlyResourceId}/fichier`);
    expect(denied.status()).toBe(404);
    await page.goto(`/ressources/${state.adminOnlyResourceId}`);
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/acces-refuse/);
  });

  test("un lien de fichier copié ne fonctionne pas sans session", async ({ browser }) => {
    const anon = await browser.newContext();
    const res = await anon.request.get(`/api/ressources/${state.resourceId}/fichier`);
    expect(res.status()).toBe(401);
    await anon.close();
  });

  test("statistiques : déclaration, historique, semaines manquantes, comparaison, navigation", async ({ page }) => {
    await login(page, PLAYER.email, PLAYER.password, "/stats");
    await expect(page.getByText("Aucune semaine déclarée")).toBeVisible();

    const today = new Date();
    const twoWeeksAgo = new Date(today.getTime() - 14 * 86400000).toISOString().slice(0, 10);
    const fill = async (date: string, kills: string, deaths: string) => {
      await page.goto("/stats/declarer");
      await page.getByLabel("Semaine").fill(date);
      await page.getByLabel("Jeu").selectOption("Warzone");
      await page.getByLabel("Mode").selectOption("Résurgence");
      await page.locator("input[name=screenshot]").setInputFiles({ name: "stats.png", mimeType: "image/png", buffer: PNG });
      await page.getByLabel("Éliminations").fill(kills);
      await page.getByLabel("Morts").fill(deaths);
      await page.getByRole("button", { name: "Enregistrer la semaine" }).click();
      await expect(page.getByText("Déclaration enregistrée.")).toBeVisible();
    };
    await fill(twoWeeksAgo, "100", "50");
    await fill(today.toISOString().slice(0, 10), "180", "60");

    // doublon refusé avec lien vers la déclaration existante
    await page.goto("/stats/declarer");
    await page.locator("input[name=screenshot]").setInputFiles({ name: "stats.png", mimeType: "image/png", buffer: PNG });
    await page.getByLabel("Mode").selectOption("Résurgence");
    await page.getByRole("button", { name: "Enregistrer la semaine" }).click();
    await expect(page.getByRole("link", { name: "Modifier la déclaration existante" })).toBeVisible();

    await page.goto("/stats");
    await expect(page.getByText(/1 manquante/)).toBeVisible();
    const table = page.getByRole("table").first();
    await expect(table.getByRole("row", { name: /Éliminations/ })).toContainText("+80");
    await expect(table.getByRole("row", { name: /Ratio K\/D/ })).toContainText("(calculé)");
    const shot = page.getByRole("img", { name: /Capture des statistiques/ }).first();
    await expect(shot).toBeVisible();
    state.statId = (await shot.getAttribute("src"))!.split("/")[3];

    const goPrevious = async () => {
      const href = await page.getByRole("link", { name: "Semaine précédente" }).getAttribute("href");
      await page.getByRole("link", { name: "Semaine précédente" }).click();
      const week = new URL(href!, "http://x").searchParams.get("semaine");
      await expect.poll(() => new URL(page.url()).searchParams.get("semaine")).toBe(week);
      await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    };
    await goPrevious();
    await expect(page.getByRole("link", { name: "Déclarer cette semaine" })).toBeVisible(); // semaine manquante
    await goPrevious();
    await expect(page.getByText("Première semaine déclarée")).toBeVisible();

    // plein écran
    await page.getByRole("button", { name: /Agrandir/ }).click();
    await expect(page.getByRole("button", { name: "Fermer ✕" })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("un autre joueur ne voit ni la capture ni la déclaration", async ({ page }) => {
    await login(page, PLAYER2.email, PLAYER2.password);
    expect((await page.request.get(`/api/stats/${state.statId}/capture`)).status()).toBe(404);
    await page.goto(`/stats/${state.statId}/modifier`);
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
    await page.goto("/stats");
    await expect(page.getByText("Aucune semaine déclarée")).toBeVisible();
  });

  test("l'admin vérifie la déclaration ; le joueur voit le statut", async ({ page }) => {
    await login(page, E2E_ADMIN.email, E2E_ADMIN.password, "/admin/stats?status=PENDING");
    await page.getByRole("link", { name: "Ouvrir" }).first().click();
    await expect(page).toHaveURL(/\/admin\/stats\/joueur\//);
    await expect(page.getByLabel("Note pour le joueur")).toBeVisible();
    await page.getByLabel("Statut").selectOption("VERIFIED");
    await page.getByLabel("Note pour le joueur").fill("Capture conforme");
    await page.getByRole("button", { name: "Enregistrer la vérification" }).click();
    await expect(page.getByText("Vérification enregistrée.")).toBeVisible();
    await logout(page);
    await login(page, PLAYER.email, PLAYER.password, "/stats");
    await expect(page.getByText("Vérifiée", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Capture conforme/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Modifier", exact: true })).toHaveCount(0);
  });

  test("le journal trace les actions d'administration", async ({ page }) => {
    await login(page, E2E_ADMIN.email, E2E_ADMIN.password, "/admin/journal");
    for (const a of ["user.create", "resource.create", "resource.upload_failed", "meta.create", "tournament.create", "stat.review"]) {
      await expect(page.getByText(a, { exact: true }).first()).toBeVisible();
    }
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("menu mobile fonctionnel et aucune barre de défilement horizontale", async ({ page }) => {
    for (const path of ["/", "/meta", "/tournois", "/connexion", `/tournois/${state.tournamentId}`]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `débordement horizontal sur ${path}`).toBeLessThanOrEqual(0);
    }
    await page.goto("/");
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.locator("#mobile-menu").getByRole("link", { name: "Tournois" }).click();
    await expect(page).toHaveURL(/\/tournois$/);
    await expect(page.locator("#mobile-menu")).toHaveCount(0);
  });
});
