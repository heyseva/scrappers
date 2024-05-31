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
    let urls = [req.query.url as string];

    Async.waterfall(
      [
        function (mainCallback: (arg0: null) => void) {
          page
            ?.goto("https://instagram.com", {
              waitUntil: "networkidle2",
            })
            .then(() => {
              setTimeout(() => {
                mainCallback(null);
              }, 20000);
            });
        },
        ...urls.map(
          (profile: any, i: number) =>
            function (mainCallback: any) {
              const ig_link = profile;
              const link = profile;
              console.log("fetching:", i, ":", { link, ig_link });

              Async.waterfall(
                [
                  function (callback: (arg0: null) => void) {
                    try {
                      scrapIGfollowings({
                        page,
                        item: { link },
                        callback,
                        client,
                      })
                        .then()
                        .catch((error) => {
                          console.log("error----", error);
                          setTimeout(() => {
                            callback(null);
                          }, 20000);
                        });
                    } catch (error) {
                      console.log("error----", error);
                      setTimeout(() => {
                        callback(null);
                      }, 20000);
                    }
                  },
                ],
                function (err, result) {
                  if (err) {
                    console.log("error----", err);
                  } else {
                    console.log("done", result);
                    // res.send(result);
                    mainCallback(null);
                  }
                }
              );
            }
        ),
      ],
      function (err, result) {
        if (err) {
          console.log("error", err);
        } else {
          console.log("All data fetched and saved in db");
        }
      }
    );
  } catch (error) {
    console.log("error-----", error);
  }
};
