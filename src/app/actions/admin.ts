"use server";

import { getCurrentUser } from "@/lib/session";
import { toActionState, type ActionState } from "@/lib/errors";
import { formToObject } from "@/lib/forms";
import { audit } from "@/lib/audit";
import { finish } from "@/lib/action-redirect";
import { createUser, resetPassword, updateUser } from "@/server/users";
import {
  createMetaWeapon, deleteLoadout, deleteMetaWeapon, markMetaVerified, saveLoadout, setMetaPublished, updateMetaWeapon,
} from "@/server/meta";
import { createTournament, deleteTournament, setTournamentFlags, updateTournament } from "@/server/tournaments";
import { syncFaceit } from "@/server/faceit";
import { createResource, deleteResource, setResourcePublished, updateResource } from "@/server/resources";

// Chaque action appelle un service qui revérifie le rôle ADMIN côté serveur.
// En cas d'erreur, l'état est renvoyé au formulaire (saisie conservée) ; en cas de succès, `finish` redirige.

// ——— Membres ———
export async function createUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await createUser(await getCurrentUser(), formToObject(fd));
  } catch (err) {
    return toActionState(err);
  }
  return finish("/admin/membres", "user-created");
}

export async function updateUserAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await updateUser(await getCurrentUser(), id, formToObject(fd));
  } catch (err) {
    return toActionState(err);
  }
  return finish("/admin/membres", "user-updated");
}

export async function resetPasswordAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await resetPassword(await getCurrentUser(), id, fd.get("password"));
  } catch (err) {
    return toActionState(err);
  }
  return finish(`/admin/membres/${id}`, "password-reset");
}

// ——— Méta ———
export async function createMetaAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    id = (await createMetaWeapon(await getCurrentUser(), fd)).id;
  } catch (err) {
    return toActionState(err);
  }
  return finish(`/admin/meta/${id}`, "meta-created");
}

export async function updateMetaAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await updateMetaWeapon(await getCurrentUser(), id, fd);
  } catch (err) {
    return toActionState(err);
  }
  return finish(`/admin/meta/${id}`, "meta-updated");
}

export async function toggleMetaPublishedAction(id: string, published: boolean, returnTo: string, _: ActionState): Promise<ActionState> {
  try {
    await setMetaPublished(await getCurrentUser(), id, published);
  } catch (err) {
    return toActionState(err);
  }
  return finish(returnTo, published ? "meta-published" : "meta-unpublished");
}

export async function verifyMetaAction(id: string, returnTo: string, _: ActionState): Promise<ActionState> {
  try {
    await markMetaVerified(await getCurrentUser(), id);
  } catch (err) {
    return toActionState(err);
  }
  return finish(returnTo, "meta-verified");
}

export async function deleteMetaAction(id: string, _: ActionState): Promise<ActionState> {
  try {
    await deleteMetaWeapon(await getCurrentUser(), id);
  } catch (err) {
    return toActionState(err);
  }
  return finish("/admin/meta", "meta-deleted");
}

export async function saveLoadoutAction(weaponId: string, loadoutId: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await saveLoadout(await getCurrentUser(), weaponId, loadoutId, formToObject(fd));
  } catch (err) {
    return toActionState(err);
  }
  return finish(`/admin/meta/${weaponId}`, loadoutId ? "loadout-updated" : "loadout-created");
}

export async function deleteLoadoutAction(weaponId: string, loadoutId: string, _: ActionState): Promise<ActionState> {
  try {
    await deleteLoadout(await getCurrentUser(), weaponId, loadoutId);
  } catch (err) {
    return toActionState(err);
  }
  return finish(`/admin/meta/${weaponId}`, "loadout-deleted");
}

// ——— Tournois ———
export async function createTournamentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await createTournament(await getCurrentUser(), fd);
  } catch (err) {
    return toActionState(err);
  }
  return finish("/admin/tournois", "tournament-created");
}

export async function updateTournamentAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await updateTournament(await getCurrentUser(), id, fd);
  } catch (err) {
    return toActionState(err);
  }
  return finish("/admin/tournois", "tournament-updated");
}

export async function tournamentFlagsAction(id: string, flags: { published?: boolean; archived?: boolean }, returnTo: string, _: ActionState): Promise<ActionState> {
  try {
    await setTournamentFlags(await getCurrentUser(), id, flags);
  } catch (err) {
    return toActionState(err);
  }
  return finish(returnTo, "tournament-updated");
}

export async function deleteTournamentAction(id: string, _: ActionState): Promise<ActionState> {
  try {
    await deleteTournament(await getCurrentUser(), id);
  } catch (err) {
    return toActionState(err);
  }
  return finish("/admin/tournois", "tournament-deleted");
}

export async function faceitSyncAction(_: ActionState): Promise<ActionState> {
  const actor = await getCurrentUser();
  let r: { created: number; updated: number; rejected: number };
  try {
    r = await syncFaceit(actor);
  } catch (err) {
    if (actor?.role === "ADMIN") {
      await audit(actor.id, "tournament.faceit_sync_failed", "Tournament", null, { reason: err instanceof Error ? err.message : "inconnue" });
    }
    return toActionState(err);
  }
  return finish("/admin/tournois", "faceit-sync", { c: r.created, u: r.updated, r: r.rejected });
}

// ——— Ressources ———
export async function createResourceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await createResource(await getCurrentUser(), fd);
  } catch (err) {
    return toActionState(err);
  }
  return finish("/admin/ressources", "resource-created");
}

export async function updateResourceAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await updateResource(await getCurrentUser(), id, fd);
  } catch (err) {
    return toActionState(err);
  }
  return finish("/admin/ressources", "resource-updated");
}

export async function toggleResourcePublishedAction(id: string, published: boolean, _: ActionState): Promise<ActionState> {
  try {
    await setResourcePublished(await getCurrentUser(), id, published);
  } catch (err) {
    return toActionState(err);
  }
  return finish("/admin/ressources", published ? "resource-published" : "resource-unpublished");
}

export async function deleteResourceAction(id: string, _: ActionState): Promise<ActionState> {
  try {
    await deleteResource(await getCurrentUser(), id);
  } catch (err) {
    return toActionState(err);
  }
  return finish("/admin/ressources", "resource-deleted");
}
