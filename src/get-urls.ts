import { Request, RequestOptions } from "crawlee";
import fetch from "node-fetch";

export async function getUrls(
  platforms: string[]
): Promise<(string | Request | RequestOptions)[]> {
  const req = await fetch(
    "https://kiggmvgmzoffneyfrvuz.supabase.co/rest/v1/portfolios?select=id,platform,url&apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZ2dtdmdtem9mZm5leWZydnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2Njc5MjE1NzYsImV4cCI6MTk4MzQ5NzU3Nn0.74Wy0yL0oWfA5M1koxzpswBUwAwFS8RMPpeugRaWVw4"
  );

  if (!req.ok) {
    throw new Error(`HTTP error! status: ${req.status}`);
  }

  type Portfolio = { id: string; url: string | null; platform: string | null };

  const data = (await req.json()) as Portfolio[];
  const urls = data
    .filter(
      (item) => item.url !== null && platforms.includes(item.platform as string)
    )
    .map((item) => {
      return {
        url: item.url,
        label: item.platform,
        userData: { platform: item.platform, portfolioId: item.id },
      };
    }) as {
    url: string;
    label: string;
    userData: { platform: string; portfolioId: string };
  }[];

  /*   return [
    {
      url: "https://solcovad.wordpress.com/2023/03/02/vedecka-kariera-odstartovana-vysel-mi-odborny-clanek-v-zahranicnim-casopise/",
      label: "wordpress",
      userData: {
        platform: "wordpress",
        portfolioId: "3e93e960-d30a-4045-8eef-eacc103974b5",
      },
    },
  ]; */

  return urls;
}
