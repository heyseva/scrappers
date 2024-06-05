// import puppeteer, { Browser, Page } from "puppeteer";

import { Page } from "puppeteer";
import { Request, Response } from "express";
import { Server, WebSocket } from "ws";
import dbConnection from "../../utils/mongo";
import { MongoClient } from "mongodb";
import axios from "axios";
import { SEVA_API_URL, SEVA_UPDATE_TT_SESSION } from "../../utils/env";

// (async () => {
//   const browser = await puppeteer.launch({ headless: false });
//   const page = await browser.newPage();

//   // Enable request interception
//   await page.setRequestInterception(true);

//   // Listen for requests
//   page.on("request", (request) => {
//     // if (request.url().includes("passport/web/get_qrcode")) {
//     //   //   // Get current timestamp and add 10 minutes
//     //   //   const expiryTimestamp = Math.floor(Date.now() / 1000) + 10 * 60;

//     //   //   // Update headers or URL parameters with the new expiry timestamp
//     //   //   const headers = request.headers();
//     //   //   headers["expiry-time"] = expiryTimestamp.toString();

//     //   //   console.log("request", request.url());

//     //   //   request.continue({
//     //   //     headers: headers,
//     //   //   });

//     //   const headers = request.headers();
//     //   // Set the expiry time in headers or URL if needed
//     //   const url = new URL(request.url());
//     //   url.searchParams.set("expiry", "600"); // 10 minutes in seconds

//     //   console.log("Intercepted request:", {
//     //     url: url.toString(),
//     //     headers: headers,
//     //   });

//     //   request.continue({
//     //     url: url.toString(),
//     //     headers: headers,
//     //   });
//     // } else {
//     request.continue();
//     // }
//   });

//   // Listen for responses
//   page.on("response", async (response) => {
//     if (response.url().includes("passport/web/get_qrcode")) {
//       try {
//         const responseBody = await response.text();
//         console.log("Intercepted response:", responseBody);
//         // Modify response if needed
//       } catch (error) {
//         console.error("Error reading response:", error);
//       }
//     }
//   });

//   await page.waitForTimeout(1000);
//   await page.goto("https://www.tiktok.com/login/qrcode");

//   // Additional code to interact with the page can go here

//   // Close the browser after some delay
//   //   setTimeout(() => browser.close(), 30000); // Adjust the delay as needed
// })();

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
      } else if (response.url().includes("passport/web/check_qrconnect")) {
        try {
          const responseBody = await response.json();
          if (responseBody.data.status === "expired") {
            await page.reload();
          }
        } catch (error) {
          console.error("Error reading response:", error);
        }
      }
    });
    await page.goto("https://www.tiktok.com/login/qrcode");

    setInterval(async () => {
      console.log("reloading-----");
      await page.reload();
    }, 60000);

    let cookies: any = undefined;
    let localStorageData: any = undefined;

    page.on("framenavigated", async (frame) => {
      const url = frame.url();
      console.log("reload url-------", url);
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
        await page.waitForNavigation();

        const tiktokUserData = await page.evaluate(() => {
          // Get the script tag by its ID
          const scriptTag = document.getElementById(
            "__UNIVERSAL_DATA_FOR_REHYDRATION__"
          );

          // Check if the script tag exists and return its inner text content
          return scriptTag ? JSON.parse(scriptTag.innerText) : null;
        });

        if (
          tiktokUserData &&
          tiktokUserData["__DEFAULT_SCOPE__"] &&
          cookies &&
          localStorageData
        ) {
          const user =
            tiktokUserData["__DEFAULT_SCOPE__"]["webapp.user-detail"][
              "userInfo"
            ] || {};
          axios
            .post(SEVA_API_URL + SEVA_UPDATE_TT_SESSION, {
              orgId: orgId,
              isConnected: true,
              handle: user?.uniqueId,
              socialId: user?.id,
              pageId: user?.id,
              pageName: user?.nickname,
              connectedId: user?.id,
              scopes: "",
              access_token: "",
              page_access_token: "",
              status: "active",
              isAdmin: false,
              cookies,
              localStorage: localStorageData,
              pages: [
                {
                  access_token: user?.uniqueId,
                  category: user?.signature,
                  name: user?.nickname,
                  username: user?.uniqueId,
                  pageId: user?.id,
                  connectedId: user?.id,
                },
              ],
            })
            .then(() => {
              ws.send(JSON.stringify({ action: "LOGIN_COMPLETE" }));
            })
            .catch(() => {
              ws.send(JSON.stringify({ action: "LOGIN_FAILED" }));
            })
            .finally(async () => {
              await page.close();
              await client.close();
            });
        }
      }
    });
  } catch (error) {
    console.log("handleStartSession:error----", error);
  }
};
