"use server";

import { getCurrentUser } from "@/lib/session";
import { toActionState, type ActionState } from "@/lib/errors";
import { formToObject } from "@/lib/forms";
import { finish } from "@/lib/action-redirect";
import { adminSubmitStat, deleteStat, reviewStat, submitOwnStat, updateStat } from "@/server/stats";


const timelineUrl = (base: string, s: { weekStart: string; game: string; mode: string }) =>
  `${base}?${new URLSearchParams({ jeu: s.game, mode: s.mode, semaine: s.weekStart })}`;

export async function submitStatAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let target: string;
  let okKey: string;
  try {
    const s = await submitOwnStat(await getCurrentUser(), fd);
    target = timelineUrl("/stats", s);
    okKey = "stat-created";
  } catch (err) {
    return toActionState(err);
  }
  return finish(target, okKey);
}

export async function adminSubmitStatAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let target: string;
  let okKey: string;
  try {
    const s = await adminSubmitStat(await getCurrentUser(), fd);
    target = timelineUrl(`/admin/stats/joueur/${s.playerId}`, s);
    okKey = "stat-created";
  } catch (err) {
    return toActionState(err);
  }
  return finish(target, okKey);
}

export async function updateStatAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let target: string;
  let okKey: string;
  try {
    const actor = await getCurrentUser();
    const s = await updateStat(actor, id, fd);
    const base = actor && s.playerId !== actor.id ? `/admin/stats/joueur/${s.playerId}` : "/stats";
    target = timelineUrl(base, s);
    okKey = "stat-updated";
  } catch (err) {
    return toActionState(err);
  }
  return finish(target, okKey);
}

export async function deleteStatAction(id: string, returnTo: string, _: ActionState): Promise<ActionState> {
  try {
    await deleteStat(await getCurrentUser(), id);
  } catch (err) {
    return toActionState(err);
  }
  return finish(returnTo, "stat-deleted");
}

export async function reviewStatAction(id: string, returnTo: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await reviewStat(await getCurrentUser(), id, formToObject(fd));
  } catch (err) {
    return toActionState(err);
  }
  return finish(returnTo, "stat-reviewed");
}
