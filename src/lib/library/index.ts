import type { CuratedCake, CuratedFrosting } from "./types";
import { chocolateCakes } from "./cakes/chocolate";
import { classicCakes } from "./cakes/classic";
import { fruitAsianCakes } from "./cakes/fruitAsian";
import { FROSTINGS } from "./frostings";

export const CAKES: CuratedCake[] = [...chocolateCakes, ...classicCakes, ...fruitAsianCakes];
export { FROSTINGS };

export const cakeById = (id: string) => CAKES.find((c) => c.id === id);
export const frostingById = (id: string): CuratedFrosting | undefined => FROSTINGS.find((f) => f.id === id);
