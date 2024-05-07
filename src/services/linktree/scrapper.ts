import * as cheerio from "cheerio";
import { Request, Response } from "express";
import Scraper, { convertRawToFormattedResults } from "./index";
import Async from "async";
import { LT_DATA } from "../../constants/linktree";
import { AxiosError } from "axios";
import dbConnection from "../../utils/mongo";
import type { DataNode } from "domhandler";
import { Page } from "puppeteer";

export const scrapLT = async (req: Request) => {
  const profile = req.query.profile;
  if (profile) {
    try {
      const result = await Scraper(("https://linktr.ee/" + profile) as string);
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

  const profiles: Array<{ Link: string }> = await client
    .db("insta-scrapper")
    .collection("input-lt-user")
    .find({
      isActive: true,
    })
    .toArray();
  Async.waterfall(
    [
      function (callback: (arg0: null) => void) {
        console.log("start");
        callback(null);
      },
      ...profiles.map(
        (x: any, i: number) =>
          function (callback: any) {
            console.log("fetching:", i, ":", x.Link);
            Promise.resolve(
              scrapLinktreeProfile({ link: x.Link, page, version, callback })
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
                          ...result,
                          active: true,
                          version: version,
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
                          active: false,
                          version: version,
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
  version,
  callback,
}: {
  link: any;
  page: any;
  version: any;
  callback: any;
}) => {
  try {
    await page?.goto(link, {
      waitUntil: "networkidle2",
    });
    await page?.waitForTimeout(3000);
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
