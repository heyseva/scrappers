import Async from "async";
import { Request, Response } from "express";
import { Page, Puppeteer } from "puppeteer";
import { scrapIGPosts, scrapIGProfile } from "./lib";
import dbConnection from "../../utils/mongo";
import { MongoClient, ObjectId } from "mongodb";
import axios, { AxiosError } from "axios";
import { extractUsernameFromUrl } from "../../utils/lib";

export const instagamAllProfiles = async (
  req: Request,
  res: Response,
  page: Page
) => {
  try {
    const version = `repo-${new Date().getTime()}`;
    const client = (await dbConnection("dev")) as MongoClient;
    const live_client = (await dbConnection("live")) as MongoClient;
    const list: any = await live_client
      ?.db("heyseva")
      .collection("assignedinfluencers")
      .aggregate([
        {
          $match: {
            orgId: new ObjectId("656da7efad5891af360b293a"),
          },
        },
        {
          $lookup: {
            from: "influencers",
            localField: "influencerId",
            foreignField: "_id",
            as: "influencer",
          },
        },
        {
          $unwind: {
            path: "$influencer",
            preserveNullAndEmptyArrays: true,
          },
        },
      ])
      .toArray();

    // const existing = await client
    //   .db("insta-scrapper")
    //   .collection("scrap-ig-user")
    //   .find({})
    //   .toArray();

    // const profiles = list.filter(
    //   (x: any) =>
    //     x.influencer.ig_link &&
    //     !existing.find((y: any) => y.link === x.influencer.ig_link)
    // );

    const profiles = list;

    console.log("profiles", profiles.length);

    Async.waterfall(
      [
        function (callback: (arg0: null) => void) {
          console.log("start");
          callback(null);
        },
        ...profiles.map(
          (x: any, i: number) =>
            function (callback: any) {
              const link = x.influencer.ig_link;
              console.log("fetching:", i, ":", link);
              const username = extractUsernameFromUrl(link);
              console.log("fetching:", i, ":", { link, username });

              Promise.resolve(
                getDiscovery({
                  username: username as string,
                })
              )
                // .then(async (result: any) => {
                //   console.log("result", JSON.stringify(result, null, 2));
                //   const reels = await scrapIGPosts({
                //     page,
                //     item: { url: link },
                //     subPage:
                //       link.charAt(link.length - 1) === "/" ? "reels" : "/reels",
                //   });
                //   return { reels, data: result };
                // })
                .then(async (result: any) => {
                  try {
                    if (
                      result
                      // &&
                      // result?.reels?.length > 0 &&
                      // result.data
                    ) {
                      client
                        .db("insta-scrapper")
                        .collection("scrap-ig-user")
                        .updateOne(
                          {
                            link: link,
                          },
                          {
                            $set: {
                              data: result,
                              active: true,
                              version: version,
                            },
                          },
                          {
                            upsert: true,
                          }
                        )
                        .then(() => {
                          setTimeout(() => {
                            console.log("done", i);
                            callback(null);
                          }, 5000);
                        });
                    } else {
                      client
                        .db("insta-scrapper")
                        .collection("scrap-ig-user")
                        .updateOne(
                          {
                            link: link,
                          },
                          {
                            $set: {
                              active: false,
                              version: version,
                            },
                          },
                          {
                            upsert: true,
                          }
                        )
                        .then(() => {
                          setTimeout(() => {
                            console.log("done", i);
                            callback(null);
                          }, 5000);
                        });
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
          console.log("All data fetched and saved in db");
        }
      }
    );
  } catch (error) {
    console.log("error-----", error);
  }
};

export const getDiscovery = async ({ username }: { username: string }) => {
  const data = await axios.get(`${username}`);
  return data.data;
};
