import { Request, Response } from "express";
import dbConnection from "../../utils/mongo";
import { MongoClient } from "mongodb";
import { calculateEngagementRateRange } from "../../utils/lib";

export const calculateIGEngagementRateRange = async (
  req: Request,
  res: Response
) => {
  try {
    const client = (await dbConnection("dev")) as MongoClient;
    const profiles = await client
      ?.db("insta-scrapper")
      .collection("scrap-ig-user")
      .find({
        data: { $exists: true },
      })
      .toArray();

    profiles.forEach(async (profile: any) => {
      if (profile?.data?.business_discovery) {
        const posts = profile.data.business_discovery.media.data.filter(
          (x: any) => x?.like_count > 0 && x?.comments_count > 0
        );
        const likes = posts.map((x: any) => x.like_count);
        const comments = posts.map((x: any) => x.comments_count);
        const followers_count = profile.data.business_discovery.followers_count;
        const igEngRate = calculateEngagementRateRange({
          likes: likes,
          comments: comments,
          followers: followers_count,
        });

        await client
          ?.db("insta-scrapper")
          .collection("scrap-ig-user")
          .updateOne(
            { _id: profile._id },
            {
              $set: {
                ig_eng_rate: igEngRate,
              },
            }
          );
      }
    });
  } catch (error) {
    console.log("error-----", error);
  }
};
