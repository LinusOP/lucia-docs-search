import { defineCollection, z } from "astro:content";

const docCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
  }),
});

export const collections = {
  pages: docCollection,
};
