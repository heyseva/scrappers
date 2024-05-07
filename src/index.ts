import { Request, Response } from "express";

import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import { tiktokProfiles } from "./services/tiktokProfiles";
import { tiktokBrand } from "./services/tiktokBrand";
import puppeteer from "./utils/puppeteer";
import { Page } from "puppeteer";
import { bulkScraper, scrapLT } from "./services/linktree/scrapper";
import { proxyMiddleware } from "./middlewares/proxy";
dotenv.config();

const app = express();

app.use(morgan("dev"));

const PORT = process.env.PORT || 4000;

// iffe
let page: Page;
let linkTreePage: Page;
(async () => {
  await puppeteer.crawl();
  page = (await puppeteer.getPage()) as Page;
  linkTreePage = (await puppeteer.getPage()) as Page;
})();

app.get("/scrape-tt-profiles", (req: Request, res: Response) => {
  //   scrapeLogic(res);
  tiktokProfiles();
  res.send("Scraping TikTok profiles...");
});

app.get("/scrape-tt-brand", async (req: Request, res: Response) => {
  await tiktokBrand(req, res, page);
});

app.get("/scrape-lt", async (req: Request, res: Response) => {
  const data = await scrapLT(req);
  res.send(data);
});

app.get("/bulk-scrape-lt", async (req: Request, res: Response) => {
  bulkScraper(linkTreePage);
  res.send("Scraping Linktree profiles...");
});

app.get("/", (req: Request, res: Response) => {
  res.send("Render Puppeteer server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
