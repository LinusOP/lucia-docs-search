import type { CollectionEntry } from "astro:content";
import { MeiliSearch } from "meilisearch";
import { fromMarkdown } from "mdast-util-from-markdown";
import { visit } from "unist-util-visit";
import { is } from "unist-util-is";
import between from "unist-util-find-all-between";
import { sha256 } from "@oslojs/crypto/sha2";
import { base32hex } from "@oslojs/encoding";

export const meiliClient = new MeiliSearch({
  host: import.meta.env.PUBLIC_MEILI_URL,
  apiKey: import.meta.env.MEILI_ADMIN_API_KEY,
});

export const genPageSearchData = async (pages: CollectionEntry<"pages">[]) => {
  const segmentsForAllPages = [];
  for (const page of pages) {
    const { headings: allHeadings } = await page.render();
    const headings = allHeadings.filter((heading) => heading.depth <= 2);

    let topLevelHeadingIndex = -1;
    const astHeadingIndexes: number[] = [];
    const ast = fromMarkdown(page.body);
    visit(ast, (node, index) => {
      if (is(node, { type: "heading", depth: 1 }))
        topLevelHeadingIndex = index!;
      if (is(node, { type: "heading", depth: 2 }))
        astHeadingIndexes.push(index!);
    });

    const searchSegments = [];
    let currentHeadingCount = -1;
    while (currentHeadingCount < astHeadingIndexes.length) {
      // If we've just begun grab the h1 index, otherwise grab the current h2 index
      const segmentStartIndex =
        currentHeadingCount === -1
          ? topLevelHeadingIndex
          : astHeadingIndexes[currentHeadingCount];

      // If next ending index is outside or equal to the length of our
      const segmentEndIndex =
        currentHeadingCount + 1 === astHeadingIndexes.length
          ? ast.children.length - 1
          : astHeadingIndexes[currentHeadingCount + 1];

      const segment = between(ast, segmentStartIndex, segmentEndIndex);

      searchSegments.push({
        id: base32hex
          .encode(
            sha256(
              new TextEncoder().encode(
                page.id +
                  // A heading might consist of multiple children, e.g if there's inline code in it
                  // @ts-ignore Children exist, even if TS doesn't believe me
                  ast.children[segmentStartIndex].children.reduce(
                    (complete: string, child: { value: string }) =>
                      complete + child.value,
                    "",
                  ),
              ),
            ),
          )
          .replaceAll("=", "_"),
        // We don't want an anchor if it's an h1, as then we just want to display the page without scrolling anywhere
        url: `/${page.slug}#${currentHeadingCount === -1 ? "" : headings[currentHeadingCount + 1].slug}`,
        lvl0: page.slug.startsWith("reference/")
          ? "Reference"
          : "Documentation",
        lvl1: headings[0].text,
        lvl2:
          // If we're adding the h1 segment then we already have it in lvl1, don't want it duplicated
          currentHeadingCount === -1
            ? null
            : headings[currentHeadingCount + 1].text,
        lvl3: null,
        lvl4: null,
        lvl5: null,
        lvl6: null,
        // We only parse the contents of a paragraph
        // Paragraphs can consist of multiple children/parts so we use reduce to get them all into one string
        // nodeContent prepares for potentially parsing other things than just paragraphs
        content: segment.reduce((content, nextNode) => {
          let nodeContent = "";
          if (nextNode.type === "paragraph") {
            nodeContent += (nextNode as any).children.reduce(
              (complete: string, child: { value: string }) =>
                complete + child.value,
              "",
            );
          }

          return content + nodeContent;
        }, ""),
      });

      currentHeadingCount++;
    }

    segmentsForAllPages.push(...searchSegments);
  }

  return segmentsForAllPages;
};
