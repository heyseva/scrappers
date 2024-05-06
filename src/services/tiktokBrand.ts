import puppeteer from "../utils/puppeteer";
import Async from "async";
import cheerio from "cheerio";
import { Request, Response } from "express";
import { Page } from "puppeteer";

export const tiktokBrand = async (req: Request, res: Response, page: Page) => {
  try {
    const newDate = new Date().toISOString();
    const handle = req.query.handle;
    Async.waterfall(
      [
        function (callback: (arg0: null) => void) {
          page
            ?.goto("https://tiktok.com", {
              waitUntil: "networkidle2",
            })
            .then(async () => {
              const data = await scrapTiktokProfile({
                page,
                item: {
                  link: `https://tiktok.com/@${handle}`,
                },
                callback,
                newDate,
              });
              callback(null);
              res.send(data);
            });
        },
      ],
      function (err, result) {
        if (err) {
          console.log("error", err);
        } else {
          console.log("done");
        }
      }
    );
  } catch (error) {
    console.log("error-----", error);
  }
};

const scrapTiktokProfile = async ({
  page,
  item,
  callback,
  newDate,
}: {
  page: any;
  item: any;
  callback: any;
  newDate: string;
}) => {
  try {
    let url = item.link.includes("https") ? item.link : `https://${item.link}`;
    await page?.goto(url, {
      waitUntil: "networkidle2",
    });
    await page?.waitForTimeout(3000);
    const content = await page?.content();
    let $ = cheerio.load(content || "");
    const title = $(`[data-e2e="user-title"]`).text();
    let scriptData: any = $('[id="__UNIVERSAL_DATA_FOR_REHYDRATION__"]').text();
    if (scriptData) {
      try {
        const obj = JSON.parse(scriptData);
        scriptData = obj.__DEFAULT_SCOPE__["webapp.user-detail"];
      } catch (error: any) {
        console.log();
        console.log(
          "error in parsing scriptData for:",
          url,
          "    message :",
          error.message
        );
      }
    }

    if (title.length) {
      return {
        isActive: true,
        url: url,
        scriptData,
        createdAt: newDate,
      };
    } else {
      return {
        isActive: false,
        url: url,
        scriptData,
        createdAt: newDate,
      };
    }
    setTimeout(() => {
      callback(null);
    }, 2000);
  } catch (error) {
    console.log("error in scrapTiktokProfile:", error);
    setTimeout(() => {
      callback(null);
    }, 2000);
  }
};
