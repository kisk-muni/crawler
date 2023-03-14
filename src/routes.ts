import {
  Dataset,
  createPlaywrightRouter,
  parseOpenGraph,
  Request,
} from "crawlee";
import parsePostContent, { CustomElement } from "./parse-post-content.js";
import { CheerioAPI } from "cheerio";

export type PostContentAggregate = {
  charactersCount: number | null;
  wordsCount: number | null;
  links: string[];
  tagsCount: { [key: string]: number };
  images: string[];
  iframes: string[];
};

export type PostContent = {
  text: string | null;
  aggregate: PostContentAggregate;
  tree: CustomElement | null;
};

const router = createPlaywrightRouter();

async function getEntry(request: Request) {
  return {
    url: request.url,
    portfolioId: request.userData.portfolioId,
  };
}

async function getMeta($: CheerioAPI, _request: Request) {
  return {
    title: $("title").text().trim() || null,
    description: $("meta[name=description]").attr("content")?.trim() || null,
    keywords:
      $("meta[name=keywords]")
        .attr("content")
        ?.split(",")
        .map((k) => k.trim()) || [],
    og: parseOpenGraph($),
  };
}

router.addDefaultHandler(
  async ({ request, log, parseWithCheerio, enqueueLinks }) => {
    log.info(`Reached with default handler ${request.url}...`);
    const $ = await parseWithCheerio();

    // save metadata
    await Dataset.pushData(getMeta($, request));

    await enqueueLinks({
      selector: "a",
      label: request.label,
      userData: request.userData,
    });
  }
);

router.addHandler(
  "wordpress",
  async ({
    page,
    request,
    enqueueLinks,
    // saveSnapshot,
    parseWithCheerio,
    log,
  }) => {
    log.info(`Processing ${request.url}...`);
    const $ = await parseWithCheerio();

    // wordpress pages have a body class that indicates the page type
    // we will detect it to save the page type as a metadata
    // docs: https://developer.wordpress.org/reference/functions/get_body_class/
    const possiblePageTypes = [
      "home",
      "blog",
      "privacy-policy",
      "date",
      "paged",
      "attachment",
      "error404",
      "category",
      "tag",
      "single",
      "page",
      "archive",
      "search",
    ];

    const pageTypes =
      $("body")
        .attr("class")
        ?.split(" ")
        .filter((c) => possiblePageTypes.includes(c)) || [];
    const isSingle = pageTypes.includes("single");
    const isPage = pageTypes.includes("page");
    const meta = await getMeta($, request);
    const entry = await getEntry(request);
    let postContent: PostContent | undefined = {
      text: null,
      aggregate: {
        charactersCount: null,
        wordsCount: null,
        links: [],
        iframes: [],
        images: [],
        tagsCount: {},
      },
      tree: null,
    };
    const content = $(".entry-content");
    if ((isSingle || isPage) && content)
      postContent.tree = content.length
        ? parsePostContent(content[0] as unknown as CustomElement, postContent)
        : null;

    const data = {
      ...meta,
      "wordpress-pagetypes": pageTypes,
      "post-content": postContent,
    };
    // save metadata
    await Dataset.pushData({
      data,
      ...entry,
    });

    // hide ads and popups
    try {
      await page.addStyleTag({
        content: `
        html { margin-top: 0!important; scroll-padding-top: 0!important; }
        #marketingbar { display: none!important; }
        #cmp-app-container { display: none!important; }
        .wordads-ad-wrapper { display: none!important; }
        #actionbar { display: none!important; }
      `,
      });
    } catch (error) {
      console.log("Unable to add style tag.");
    }
    const key = request.url.replace(/[:/]/g, "_");

    // save screenshot and html
    // await saveSnapshot({ key, saveHtml: true });

    await enqueueLinks({
      selector: "a",
      label: request.label,
      userData: request.userData,
      exclude: ["wp-admin", "wp-login.php"],
    });
  }
);

router.addHandler(
  "notion",
  async ({
    page,
    request,
    enqueueLinks,
    // saveSnapshot,
    parseWithCheerio,
    log,
  }) => {
    log.info(`Processing ${request.url}...`);

    await page.waitForSelector("a");

    // if notion page
    // .notion-page-content
    // .notion-text-block notion-column_list-block notion-toggle-block notion-image-block

    const $ = await parseWithCheerio();
    // save metadata
    await Dataset.pushData(getMeta($, request));

    // hide ads and popups
    try {
      await page.addStyleTag({
        content: `
        .notion-overlay-container { display: none!important; }
      `,
      });
    } catch (error) {
      console.log("Unable to add style tag.");
    }
    const key = request.url.replace(/[:/]/g, "_");

    // save screenshot and html
    // await saveSnapshot({ key, saveHtml: true });

    await enqueueLinks({
      selector: "a",
      label: request.label,
      userData: request.userData,
    });
  }
);

router.addHandler(
  "wix",
  async ({
    page,
    request,
    enqueueLinks,
    //saveSnapshot,
    parseWithCheerio,
    log,
  }) => {
    log.info(`Processing ${request.url}...`);
    const $ = await parseWithCheerio();

    // save metadata
    await Dataset.pushData(getMeta($, request));

    // hide ads and popups
    try {
      await page.addStyleTag({
        content: `
        #WIX_ADS { display: none!important; }
      `,
      });
    } catch (error) {
      console.log("Unable to add style tag.");
    }
    const key = request.url.replace(/[:/]/g, "_");

    // save screenshot and html
    // await saveSnapshot({ key, saveHtml: true });

    await enqueueLinks({
      selector: "a",
      label: request.label,
      userData: request.userData,
    });
  }
);

export default router;
