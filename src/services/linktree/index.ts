import * as cheerio from "cheerio";
import type { DataNode } from "domhandler";
import axios from "axios";

export interface ResultLink {
  title: string;
  url: string;
}

export interface ResultSocial {
  type: string;
  url: string;
}

export interface FormattedResults {
  title: string;
  username: string;
  profilePictureUrl: string;
  links: Array<ResultLink>;
  socials: Array<ResultSocial>;
  raw: any;
}

export default function Scraper(url: string): Promise<FormattedResults> {
  return axios
    .get(url)
    .then((response) => response.data)
    .then((responseHtml) => {
      try {
        const $ = cheerio.load(responseHtml);
        const data = (
          ($("#__NEXT_DATA__")[0] as cheerio.ParentNode)
            .children[0] as unknown as DataNode
        ).data;
        return convertRawToFormattedResults(JSON.parse(data));
      } catch (e) {
        throw new Error("Unable to parse linktree config data");
      }
    });
}

export const convertRawToFormattedResults = (raw: any): FormattedResults => {
  return {
    title: raw.props.pageProps.pageTitle,
    username: raw.props.pageProps.account.username,
    profilePictureUrl: raw.props.pageProps.account.profilePictureUrl,
    links: raw.props.pageProps.links.map((link: any) => {
      return {
        title: link.title,
        url: link.url,
      };
    }),
    socials: raw.props.pageProps.socialLinks.map((social: any) => {
      return {
        type: social.type,
        url: social.url,
      };
    }),
    raw: raw,
  };
};
