import { Request, Response } from "express";

import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import { tiktokProfiles } from "./services/tiktokProfiles";
import { tiktokBrand } from "./services/tiktokBrand";
import puppeteer from "./utils/puppeteer";
import { Page } from "puppeteer";
dotenv.config();

const app = express();

app.use(morgan("dev"));

const PORT = process.env.PORT || 4000;

// iffe
let page: Page;
(async () => {
  await puppeteer.crawl();
  page = (await puppeteer.getPage()) as Page;
})();

app.get("/scrape-tiktok-profiles", (req: Request, res: Response) => {
  //   scrapeLogic(res);
  tiktokProfiles();
  res.send("Scraping TikTok profiles...");
});

app.get("/scrape-brand", async (req: Request, res: Response) => {
  await tiktokBrand(req, res, page);
});

app.get("/", (req: Request, res: Response) => {
  res.send("Render Puppeteer server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
