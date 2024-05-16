import Async from "async";
import { Request, Response } from "express";
import { Page, Puppeteer } from "puppeteer";
import { scrapIGfollowings } from "./lib";
import dbConnection from "../../utils/mongo";
import { MongoClient } from "mongodb";

export const instagamFollowings = async (
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
          try {
            scrapIGfollowings({
              page,
              item: { link: url },
              callback,
              client,
            })
              .then()
              .catch((error) => {
                console.log("error----", error);
                callback(null);
              });
          } catch (error) {
            console.log("error----", error);
            callback(null);
          }
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
