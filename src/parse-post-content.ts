import { PostContent, SimplifiedElement } from "./types.js";

export default function parsePostContent(
  el: SimplifiedElement,
  postContent: PostContent
): SimplifiedElement | null {
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
    children: (children as SimplifiedElement[])
      ?.map((c) => parsePostContent(c, postContent))
      .filter((c) => c !== null) as SimplifiedElement[],
  };
}
