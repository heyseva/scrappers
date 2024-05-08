import Async from "async";
import { Request, Response } from "express";
import { Page } from "puppeteer";
import { scrapTiktokProfile } from "./common";

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
