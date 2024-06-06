import cheerio from "cheerio";
import { Page } from "puppeteer";
import { Request, Response } from "express";
import { Server, WebSocket } from "ws";
import dbConnection from "../../utils/mongo";
import { MongoClient } from "mongodb";
import axios from "axios";
import { SEVA_API_URL, SEVA_UPDATE_TT_SESSION } from "../../utils/env";

export const createLoginSession = async (
  page: Page,
  res: Response,
  wss: Server
) => {
  page.on("response", async (response) => {
    if (response.url().includes("passport/web/get_qrcode")) {
      try {
        const responseBody = await response.text();
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(responseBody);
          }
        });
      } catch (error) {
        console.error("Error reading response:", error);
      }
    }
  });
  await page.goto("https://www.tiktok.com/login/qrcode");
};

export const handleStartSession = async (
  ws: any,
  wss: Server,
  page: Page,
  client: MongoClient,
  orgId: string
) => {
  try {
    console.log("Starting session...", page);
    page.on("response", async (response) => {
      const request = response.request();
      console.log("reload url-------", await page.url());
      if (response.url().includes("passport/web/get_qrcode")) {
        try {
          const responseBody = await response.json();
          console.log("responseBody------", response);
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({ data: responseBody, action: "QRCODE" })
              );
            }
          });
          // Modify response if needed
        } catch (error) {
          console.error("Error reading response:", error);
        }
      } else if (request.isNavigationRequest() && response.status() === 200) {
        console.log("response.url()------", response.url());
      }
      // else if (response.url().includes("passport/web/check_qrconnect")) {
      //   try {
      //     const responseBody = await response.json();
      //     if (responseBody.data.status === "expired") {
      //       await page.reload();
      //     }
      //   } catch (error) {
      //     console.error("Error reading response:", error);
      //   }
      // }
    });
    await page.goto("https://www.tiktok.com/login/qrcode");

    setTimeout(async () => {
      console.log("reloading-----");
      await page.reload();
    }, 2 * 60000);

    let cookies: any = undefined;
    let localStorageData: any = undefined;
    let eventFired: boolean = false;

    page.on("framenavigated", async (frame) => {
      // if (frame === page.mainFrame()) {
      const url = frame.url();
      console.log("framenavigated: reload url-------", url);
      if (url.includes("https://www.tiktok.com/foryou")) {
        cookies = await page.cookies();

        localStorageData = await page.evaluate(() => {
          let data: any = {};
          try {
            for (let key in localStorage) {
              data[key] = localStorage.getItem(key);
            }
          } catch (e) {
            console.error("Failed to access localStorage:", e);
          }
          return data;
        });
        await page.waitForTimeout(1000);
        await page.goto("https://www.tiktok.com/profile");
      } else {
        await page.waitForTimeout(3000);
        const url = await page.url();

        if (
          cookies &&
          localStorageData &&
          url.includes("https://www.tiktok.com/@")
        ) {
          const user = url.split("/@")[1].replace("?lang=en", "");
          axios
            .post(SEVA_API_URL + SEVA_UPDATE_TT_SESSION, {
              orgId: orgId,
              isConnected: true,
              handle: user,
              socialId: user,
              pageId: user,
              pageName: user,
              connectedId: user,
              scopes: "",
              access_token: "",
              page_access_token: "",
              status: "active",
              isAdmin: false,
              cookies,
              localStorage: localStorageData,
              pages: [
                {
                  access_token: user,
                  category: user,
                  name: user,
                  username: user,
                  pageId: user,
                  connectedId: user,
                },
              ],
            })
            .then(() => {
              if (!eventFired) {
                ws.send(JSON.stringify({ action: "LOGIN_COMPLETE" }));
                eventFired = true;
              }
            })
            .catch(() => {
              if (!eventFired) {
                ws.send(JSON.stringify({ action: "LOGIN_FAILED" }));
                eventFired = true;
              }
            })
            .finally(async () => {
              // await page.close();
              await client.close();

              // clear page login session and cookies
              try {
                await page.evaluate(() => {
                  localStorage && localStorage?.clear();
                  sessionStorage && sessionStorage?.clear();
                });
                await page?.deleteCookie();
              } catch (error) {
                console.log("Error clearing cookies:", error);
              }
            });
        }
      }
      // }
    });
  } catch (error) {
    console.log("handleStartSession:error----", error);
  }
};
