import dotenv from "dotenv";
dotenv.config();
import { Request, Response } from "express";
import express from "express";
import morgan from "morgan";
import { tiktokProfiles } from "./services/tiktok/tiktokProfiles";
import { tiktokBrand } from "./services/tiktok/tiktokBrand";
import puppeteer from "./utils/puppeteer";
import { Page } from "puppeteer";
import { bulkScraper, scrapLT } from "./services/linktree/scrapper";
import { tiktokVideo } from "./services/tiktok/video";
import { instagamProfile } from "./services/instagram/profile";
import { instagamFollowings } from "./services/instagram/followers";
import { instagamPosts } from "./services/instagram/posts";
import { instagamAllProfiles } from "./services/instagram/allProfiles";
import { calculateIGEngagementRateRange } from "./services/instagram/calculateEngagementRate";
import { INSTAGRAM_PASSWORD, INSTAGRAM_USERNAME, PORT } from "./utils/env";
import { tiktokAllPosts } from "./services/tiktok/allposts";

const app = express();

app.use(morgan("dev"));

// iffe
let page: Page;
let linkTreePage: Page;
let tiktokPage: Page;
let instagramPage: Page;
(async () => {
  console.log("Starting puppeteer...");
  await puppeteer.crawl();
  page = (await puppeteer.getPage()) as Page;
  linkTreePage = (await puppeteer.getPage()) as Page;
  tiktokPage = (await puppeteer.getPage()) as Page;
  instagramPage = (await puppeteer.getPage()) as Page;
  await instagramPage.waitForTimeout(2000);
  await puppeteer.login(INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD, instagramPage);
})();

app.get("/scrape-tt-profiles", (req: Request, res: Response) => {
  //   scrapeLogic(res);
  tiktokProfiles();
  res.send("Scraping TikTok profiles...");
});

app.get("/scrape-tt-brand", async (req: Request, res: Response) => {
  await tiktokBrand(req, res, page);
});

app.get("/scrape-tt-video", async (req: Request, res: Response) => {
  await tiktokVideo(req, res, page);
});

app.get("/scrape-tt-posts", async (req: Request, res: Response) => {
  tiktokAllPosts(tiktokPage);
  res.send("Scraping Linktree profiles...");
});

app.get("/scrape-lt", async (req: Request, res: Response) => {
  const data = await scrapLT(req, linkTreePage);
  res.send(data);
});

app.get("/bulk-scrape-lt", async (req: Request, res: Response) => {
  bulkScraper(linkTreePage);
  res.send("Scraping Linktree profiles...");
});

app.get("/scrap-ig-profile", async (req: Request, res: Response) => {
  await instagamProfile(req, res, instagramPage);
});

app.get("/scrap-ig-followings", async (req: Request, res: Response) => {
  instagamFollowings(req, res, instagramPage);
  res.send("Scraping instagram profiles...");
});

app.get("/scrap-ig-posts", async (req: Request, res: Response) => {
  await instagamPosts(req, res, instagramPage);
});

app.get("/scrape-ig", async (req: Request, res: Response) => {
  instagamAllProfiles(req, res, instagramPage);
  res.send("Scraping instagram profiles...");
});

app.get("/scrape-ig-eng", async (req: Request, res: Response) => {
  calculateIGEngagementRateRange(req, res);
  res.send("calculating engagement rate for instagram profiles...");
});

app.get("/", (req: Request, res: Response) => {
  res.send("Render Puppeteer server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
