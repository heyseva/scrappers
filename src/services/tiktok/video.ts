import Async from "async";
import cheerio from "cheerio";
import { Request, Response } from "express";
import { Page } from "puppeteer";
import { getTiktokProfile } from "./common";

export const tiktokVideo = async (req: Request, res: Response, page: Page) => {
  try {
    const newDate = new Date().toISOString();
    let url = req.query.url as string;
    // https://www.tiktok.com/@seraahr/video/7338119156342066464?is_from_webapp=1
    if (!url?.includes("?is_from_webapp=1")) {
      url = `${url}?is_from_webapp=1`.toString();
    }
    console.log("url----", url);
    Async.waterfall(
      [
        function (callback: (arg0: null) => void) {
          page
            ?.goto(url, {
              waitUntil: "networkidle2",
            })
            .then(async () => {
              const data = await scrapTiktokVideo({
                page,
                url,
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

export const scrapTiktokVideo = async ({
  page,
  url,
  callback,
  newDate,
}: {
  page: any;
  url: string;
  callback: any;
  newDate: string;
}) => {
  try {
    const content = await page?.content();
    let $ = cheerio.load(content || "");
    let scriptData: any = $('[id="__UNIVERSAL_DATA_FOR_REHYDRATION__"]').text();
    if (scriptData) {
      try {
        const obj = JSON.parse(scriptData);
        scriptData = obj.__DEFAULT_SCOPE__["webapp.video-detail"];
      } catch (error: any) {
        console.log(
          "error in parsing scriptData for:",
          url,
          "    message :",
          error.message
        );
      }
    }

    const profile = await getTiktokProfile({
      page,
      link: url.split("/video/")[0],
    });

    if (scriptData?.statusMsg === "ok" && scriptData?.itemInfo?.itemStruct) {
      return {
        isActive: true,
        url: url,
        scriptData,
        followers: profile?.followers,
        createdAt: newDate,
      };
    } else {
      return {
        isActive: false,
        url: url,
        scriptData,
        followers: "0",
        createdAt: newDate,
      };
    }
  } catch (error) {
    console.log("error in scrapTiktokProfile:", error);
    if (callback) {
      setTimeout(() => {
        callback(null);
      }, 2000);
    } else {
      return {
        isActive: false,
        url: url,
        scriptData: undefined,
        followers: "0",
        createdAt: newDate,
      };
    }
  }
};
