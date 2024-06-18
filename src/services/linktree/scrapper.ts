import * as cheerio from "cheerio";
import { Request, Response } from "express";
import Scraper, { convertRawToFormattedResults } from "./index";
import Async from "async";
import { LT_DATA } from "../../constants/linktree";
import { AxiosError } from "axios";
import dbConnection from "../../utils/mongo";
import type { DataNode } from "domhandler";
import { Page } from "puppeteer";

export const scrapLT = async (req: Request, page: Page) => {
  const profile = req.query.profile;
  if (profile) {
    try {
      const result = await scrapLinktreeProfile({
        link: profile,
        page,
      });
      return result;
    } catch (error: AxiosError | any) {
      console.log("error", error.message);
      return "Failed to scrape linktree profile";
    }
  } else {
    return "Failed to scrape linktree profile";
  }
};

export const bulkScraper = async (page: Page) => {
  const client: any = await dbConnection("dev");
  const version = `repo-${new Date().getTime()}`;
  console.log("version---", version);

  let profiles: any = await client
    .db("insta-scrapper")
    .collection("scrap-ig-user")
    .find({
      "allLinks.0": { $exists: true },
    })
    .toArray();

  profiles = profiles
    .filter((x: any) => x.allLinks.some((y: any) => y.includes("linktr")))
    .map((x: any) => {
      return {
        ...x,
        Link: x.allLinks.find((y: any) => y.includes("linktr")),
      };
    });

  console.log("profiles", profiles.length);

  Async.waterfall(
    [
      function (callback: (arg0: null) => void) {
        console.log("start");
        setTimeout(() => {
          callback(null);
        }, 20000);
      },
      ...profiles.map(
        (x: any, i: number) =>
          function (callback: any) {
            console.log("fetching:", i, ":", x.Link);
            client
              .db("insta-scrapper")
              .collection("scrap-lt-user")
              .findOne({
                link: { $regex: x.Link },
              })
              .then((result: any) => {
                if (!result) {
                  Promise.resolve(
                    scrapLinktreeProfile({ link: x.Link, page })
                  ).then(async (result) => {
                    try {
                      if (result) {
                        (await client)
                          .db("insta-scrapper")
                          .collection("scrap-lt-user")
                          .updateOne(
                            {
                              link: x.Link,
                            },
                            {
                              $set: {
                                userId: x._id,
                                ...result,
                                active: true,
                                created_at: new Date(),
                              },
                            },
                            {
                              upsert: true,
                              new: true,
                            }
                          );
                        setTimeout(() => {
                          console.log("done", i);
                          callback(null);
                        }, 10000);
                      } else {
                        (await client)
                          .db("insta-scrapper")
                          .collection("scrap-lt-user")
                          .updateOne(
                            {
                              link: x.Link,
                            },
                            {
                              $set: {
                                userId: x._id,
                                active: false,
                                created_at: new Date(),
                              },
                            },
                            {
                              upsert: true,
                              new: true,
                            }
                          );
                        setTimeout(() => {
                          console.log("done", i);
                          callback(null);
                        }, 10000);
                      }
                    } catch (error: AxiosError | any) {
                      console.log("error--done", i, error.message);
                      setTimeout(() => {
                        callback(null);
                      }, 1000);
                    }
                  });
                } else {
                  console.log("already Done", i);
                  callback(null);
                }
              });
          }
      ),
    ],
    function (err, result) {
      if (err) {
        console.log("error", err);
      } else {
        console.log("done");
      }
    }
  );
};

const scrapLinktreeProfile = async ({
  link,
  page,
}: {
  link: any;
  page: any;
}) => {
  try {
    link = link.includes("http") ? link : `https://${link}`;

    console.log("scrapLinktreeProfile----", { link });
    await page?.goto(link, {
      waitUntil: "networkidle2",
    });
    await page?.waitForTimeout(10000);
    const content = await page?.content();

    const $ = cheerio.load(content);
    const data = (
      ($("#__NEXT_DATA__")[0] as cheerio.ParentNode)
        .children[0] as unknown as DataNode
    ).data;
    return convertRawToFormattedResults(JSON.parse(data));
  } catch (error) {
    console.log("error in scrapTiktokProfile:", error);
    return null;
  }
};
