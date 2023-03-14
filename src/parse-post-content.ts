import { PostContent } from "./routes.js";

export type CustomElement = {
  tagName?: string;
  type?: string;
  text?: string;
  attribs: { [key: string]: string };
  children?: CustomElement[];
  other?: { [key: string]: any };
};

export default function parsePostContent(
  el: CustomElement,
  postContent: PostContent
): CustomElement | null {
  const { tagName, type, attribs, children } = el;
  if (
    attribs?.class &&
    ["wordads-ad-wrapper", "inline-ad-slot"].includes(attribs.class)
  )
    return null;
  if (tagName === "script") return null;
  if (tagName === "style") return null;
  if (tagName)
    postContent.aggregate.tagsCount[tagName] =
      (postContent.aggregate.tagsCount[tagName] || 0) + 1;
  if (tagName === "a" && attribs?.href)
    postContent.aggregate.links.push(attribs.href);
  if (tagName === "iframe" && attribs?.src)
    postContent.aggregate.iframes.push(attribs.src);
  if (tagName === "img" && attribs?.src)
    postContent.aggregate.iframes.push(attribs.src);
  if (type === "text" && (el as unknown as Text).data != null) {
    if (postContent.text === null) postContent.text = "";
    postContent.text += (el as unknown as Text).data.trim();
  }
  return {
    tagName,
    type,
    attribs,
    text: (el as unknown as Text).data,
    children: (children as CustomElement[])
      ?.map((c) => parsePostContent(c, postContent))
      .filter((c) => c !== null) as CustomElement[],
  };
}
