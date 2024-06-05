import dotenv from "dotenv";
dotenv.config();
import { Request, Response, Application } from "express";
import { createServer } from "http";
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
import { INSTAGRAM_PASSWORD, INSTAGRAM_USERNAME } from "./utils/env";
import { tiktokAllPosts } from "./services/tiktok/allposts";
import {
  createLoginSession,
  handleStartSession,
} from "./services/tiktok/newUserSession";

import WebSocket, { WebSocketServer } from "ws";
import dbConnection from "./utils/mongo";
import { MongoClient } from "mongodb";

const port = 4001;

const app: Application = express();

// Create an HTTP server
const server = createServer(app);

// Create a WebSocket server
const wss = new WebSocketServer({ server });

// iffe
let page: Page;
let linkTreePage: Page;
let tiktokPage: Page;
let tiktokLoginPage: Page;
let instagramPage: Page;
(async () => {
  console.log("Starting puppeteer...");
  await puppeteer.crawl();
  page = (await puppeteer.getPage()) as Page;
  linkTreePage = (await puppeteer.getPage()) as Page;
  tiktokPage = (await puppeteer.getPage()) as Page;
  tiktokLoginPage = (await puppeteer.getPage()) as Page;
  instagramPage = (await puppeteer.getPage()) as Page;

  const client = (await dbConnection("dev")) as MongoClient;

  // Handle WebSocket connections
  wss
    .on("connection", (ws: WebSocket) => {
      console.log("Client connected");

      // Handle messages from clients
      ws.on("message", async (message: string) => {
        console.log(
          `Received message: ${message}`,
          typeof message,
          message.toString(),
          message === "start-session"
        );

        // // Broadcast message to all clients
        // wss.clients.forEach((client) => {
        //   if (client.readyState === WebSocket.OPEN) {
        //     client.send(message);
        //   }
        // });
        if (message.toString().includes("start-session")) {
          const input = message.toString().split(":");

          // Clear cookies
          const puppeteerClient = await tiktokLoginPage
            .target()
            .createCDPSession();
          await puppeteerClient.send("Network.clearBrowserCookies");

          // Clear local storage
          await tiktokLoginPage.evaluate(() => {
            localStorage.clear();
          });

          // Clear session storage
          await tiktokLoginPage.evaluate(() => {
            sessionStorage.clear();
          });

          // Optionally, you can clear cache as well
          await puppeteerClient.send("Network.clearBrowserCache");

          await handleStartSession(ws, wss, tiktokLoginPage, client, input[1]);
        }
      });

      // Handle client disconnection
      ws.on("close", () => {
        console.log("Client disconnected");
      });

      // Send a welcome message to the client
      ws.send(JSON.stringify({ action: "CONNECTED" }));
    })
    .on("error", (error) => {
      console.log("error-------", error);
    });
})();

app.use(morgan("dev"));

app.get("/ig-login", async (req: Request, res: Response) => {
  await instagramPage.waitForTimeout(2000);
  await puppeteer.login(INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD, instagramPage);
  await instagramPage.waitForTimeout(2000);
  res.send("Logged in to Instagram...");
});

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

app.get("/tt-session", async (req: Request, res: Response) => {
  console.log("Creating new tiktok session...");
  const newTiktokPage = (await puppeteer.getPage()) as Page;
  await createLoginSession(newTiktokPage, res, wss);
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

app.get("/scrape-ig-eng", async (req: Request, res: Response) => {
  calculateIGEngagementRateRange(req, res);
  res.send("calculating engagement rate for instagram profiles...");
});

app.get("/", async (req: Request, res: Response) => {
  res.send("working...");
});

server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
