import Async from "async";
import cheerio from "cheerio";
import { Request, Response } from "express";
import { Page } from "puppeteer";
import { scrapIGProfile } from "./lib";
import dbConnection from "../../utils/mongo";
import { MongoClient } from "mongodb";

export const instagamProfile = async (
  req: Request,
  res: Response,
  page: Page
) => {
  try {
    const client = (await dbConnection("dev")) as MongoClient;
    const newDate = new Date().toISOString();
    let url = req.query.url as string;
    Async.waterfall(
      [
        function (callback: (arg0: null) => void) {
          page
            ?.goto(url, {
              waitUntil: "networkidle2",
            })
            .then(async () => {
              await scrapIGProfile({
                page,
                item: { link: url },
                callback,
                client,
              });
            })
            .catch((error) => {
              console.log("error----", error);
              callback(null);
            });
        },
      ],
      function (err, result) {
        if (err) {
          console.log("error----", err);
        } else {
          console.log("done");
          res.send(result);
        }
      }
    );
  } catch (error) {
    console.log("error-----", error);
  }
};
