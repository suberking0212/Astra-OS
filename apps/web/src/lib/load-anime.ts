type AnimeFunction = {
  (params: Record<string, unknown>): unknown;
  remove: (targets: unknown) => void;
  set: (targets: unknown, properties: Record<string, unknown>) => void;
  random: (min: number, max: number) => number;
  stagger: (value: number) => unknown;
};

let animePromise: Promise<AnimeFunction> | null = null;

export async function loadAnime() {
  if (typeof window === "undefined") {
    throw new Error("loadAnime() can only run in the browser.");
  }

  if (!animePromise) {
    animePromise = import("animejs").then((module) => module.default as AnimeFunction);
  }

  return animePromise;
}
