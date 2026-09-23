/**
 * Fix for prismarine-recipe capturing `registry.recipes` at plugin-injection
 * time (before the registry is fully built).
 *
 * Strategy: monkey-patch `bot.recipesFor` and `bot.recipesAll` to directly
 * read from `bot.registry.recipes` at call time, bypassing the stale
 * module-level reference in prismarine-recipe entirely.
 */

import type { Bot } from "mineflayer";

let _patched = false;

/**
 * Call after bot spawn to patch recipe lookups.
 * Safe to call multiple times (idempotent).
 */
export function refreshRecipeData(bot: Bot): void {
  if (_patched) return;

  const doPatch = (): void => {
    const recs: Record<number, any[]> | undefined = (bot.registry as any)?.recipes;
    if (!recs || Object.keys(recs).length === 0) {
      // Not ready yet — retry once after a short delay
      setTimeout(doPatch, 2000);
      return;
    }

    const recCount = Object.keys(recs).length;
    console.log(`[recipe-fix] Patching bot.recipesFor/recipesAll with live registry data (${recCount} results).`);

    // Patch recipesAll: return all recipes for an item (no inventory check)
    (bot as any).recipesAll = (itemType: number): any[] => {
      const list = recs[itemType] ?? [];
      return list.map((r) => makeRecipe(r));
    };

    // Patch recipesFor: same but checks inventory
    (bot as any).recipesFor = (itemType: number, _metadata?: number | null, minResultCount?: number, craftingTable?: any): any[] => {
      minResultCount = minResultCount ?? 1;
      const list = recs[itemType] ?? [];
      return list
        .map((r) => makeRecipe(r))
        .filter((recipe: any) => {
          if (recipe.requiresTable && !craftingTable) return false;
          // Check inventory has enough for minResultCount
          const craftCount = Math.ceil(minResultCount / (recipe.result?.count ?? 1));
          for (const d of recipe.delta ?? []) {
            const have = bot.inventory?.count?.(d.id, d.metadata ?? null) ?? 0;
            if (have + d.count * craftCount < 0) return false;
          }
          return true;
        });
    };

    _patched = true;
  };

  doPatch();
}

/** Build a recipe object with inShape/outShape/delta/ingredients from raw data. */
function makeRecipe(raw: any): any {
  const result = {
    id: raw.result?.id ?? null,
    count: raw.result?.count ?? 1,
    metadata: raw.result?.metadata ?? null,
  };

  const inShape = raw.inShape
    ? raw.inShape.map((row: any[]) => row.map((cell: any) => ({
        id: cell.id ?? -1,
        count: cell.count ?? 1,
        metadata: cell.metadata ?? null,
      })))
    : null;

  const outShape = raw.outShape
    ? raw.outShape.map((row: any[]) => row.map((cell: any) => ({
        id: cell.id ?? -1,
        count: cell.count ?? 1,
        metadata: cell.metadata ?? null,
      })))
    : null;

  const ingredients = raw.ingredients
    ? raw.ingredients.map((ing: any) => ({
        id: ing.id ?? -1,
        count: ing.count ?? 1,
        metadata: ing.metadata ?? null,
      }))
    : null;

  // Compute delta (net change in inventory)
  const delta: Array<{ id: number; count: number; metadata: number | null }> = [];
  const addToDelta = (id: number, count: number, metadata: number | null) => {
    for (const d of delta) {
      if (d.id === id && d.metadata === metadata) {
        d.count += count;
        return;
      }
    }
    delta.push({ id, count, metadata });
  };

  if (inShape) {
    for (const row of inShape) {
      for (const cell of row) {
        if (cell.id !== -1) addToDelta(cell.id, -1 * cell.count, cell.metadata);
      }
    }
  }
  if (outShape) {
    for (const row of outShape) {
      for (const cell of row) {
        if (cell.id !== -1) addToDelta(cell.id, cell.count, cell.metadata);
      }
    }
  }
  if (ingredients) {
    for (const ing of ingredients) {
      addToDelta(ing.id, -1 * ing.count, ing.metadata);
    }
  }
  addToDelta(result.id, result.count, result.metadata);

  // Determine if crafting table is required
  let requiresTable = false;
  if (inShape) {
    if (inShape.length > 2) requiresTable = true;
    else {
      for (const row of inShape) {
        if (row.length > 2) { requiresTable = true; break; }
      }
    }
  }
  if (!requiresTable && ingredients) {
    requiresTable = ingredients.length > 4;
  }

  return { result, inShape, outShape, ingredients, delta, requiresTable };
}
