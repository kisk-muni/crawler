import {
  Dataset,
  createPlaywrightRouter,
  parseOpenGraph,
  Request,
} from "crawlee";
import parsePostContent from "./parse-post-content.js";
import {
  PostContent,
  SimplifiedElement,
  Data,
  wpPageTypes,
  WPPageType,
} from "./types.js";
import { CheerioAPI } from "cheerio";

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
    // page,
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
    // filter body classes to get page only the allowed page type classes
    const pageTypes = ($("body")
      .attr("class")
      ?.split(" ")
      .filter((c) => (wpPageTypes as unknown as string[]).includes(c)) ||
      []) as unknown as WPPageType[];
    const isSingle = pageTypes.includes("single");
    const isPage = pageTypes.includes("page");

    // initialize post content obj to be filled later and stored as scraped data
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

    // wordpress post content may have one of two classes
    let content = $(".entry-content");
    if (!content.length) content = $(".post-content");

    // parse post html into simplified tree
    if ((isSingle || isPage) && content)
      postContent.tree = content.length
        ? parsePostContent(
            content[0] as unknown as SimplifiedElement,
            postContent
          )
        : null;

    // get rest of aggregated data
    if (postContent.text !== null) {
      postContent.aggregate.charactersCount = postContent.text.length;
      const words = postContent.text?.match(/\p{L}+/gu);
      postContent.aggregate.wordsCount = words?.length || null;
    }

    const meta = await getMeta($, request);
    const entry = await getEntry(request);

    const published = $("meta[property='article:published_time']")
      .attr("content")
      ?.trim();
    const updated = $("meta[property='article:modified_time']")
      .attr("content")
      ?.trim();

    // merge all scraped data into one object
    const data: Data = {
      ...meta,
      "published-at": published
        ? new Date(published).toISOString()
        : null || null,
      "updated-at": updated ? new Date(updated).toISOString() : null || null,
      "wordpress-pagetypes": pageTypes,
      "post-content": postContent,
    };

    // save scraped data
    await Dataset.pushData({
      data,
      ...entry,
    });

    // hide ads and popups
    /* try {
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
    const key = request.url.replace(/[:/]/g, "_"); */

    // save screenshot and html
    // await saveSnapshot({ key, saveHtml: true });

    await enqueueLinks({
      selector: "a",
      // pass the same label and user data to the next crawl
      label: request.label,
      userData: request.userData,
      // filter out links that redirect to other domains, admin-only pages, etc.
      exclude: [
        /\/wp-admin\//,
        /\/wp-login\.php/,
        /\/wp-content\//,
        /\/wp-includes\//,
        /\?share=/,
        /\?like_comment=/,
        /\?replytocom=/,
        /\?like_comment=/,
      ],
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
