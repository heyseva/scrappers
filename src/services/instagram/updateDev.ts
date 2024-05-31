import dbConnection from "../../utils/mongo";
import { MongoClient } from "mongodb";

export const updateDev = async () => {
  try {
    console.log("Updating Dev...");
    const client = (await dbConnection("dev")) as MongoClient;
    const live_client = (await dbConnection("live")) as MongoClient;
    const profiles = await client
      ?.db("insta-scrapper")
      .collection("scrap-ig-user")
      .find({
        version: "seva",
      })
      .toArray();

    console.log("Profiles: ", profiles.length);
    profiles.forEach(async (profile: any, index: number) => {
      const live_profile = await live_client
        ?.db("heyseva")
        .collection("influencers")
        .findOne({
          ig_link: profile.link,
        });

      if (live_profile) {
        console.log(index, "---", profile.link);
        await live_client
          ?.db("heyseva")
          .collection("influencers")
          .updateOne(
            {
              ig_link: profile.link,
            },
            {
              $set: {
                // ig_followers: profile.ig_followers_count,
                ig_engagement_rate: profile.ig_eng_rate,
                // ig_followers_growth_rate: profile.ig_following_growth_rate,
                // ig_growth_status: profile.ig_growth_type,
                // previous_ig_followers: profile.old_followers_count,
                // ig_updatedAt: new Date(),

                // tt_followers: profile.tt_followers_count,
                tt_engagement_rate: profile.ttEngRate,
                // tt_followers_growth_rate: profile.tt_followingGrowthRate,
                // tt_growth_status: profile.tt_growth_type,
                // previous_tt_followers: profile.old_tt_followers_count,
                // tt_updatedAt: new Date(),
              },
            }
          );
      }
    });
  } catch (error) {
    console.log("Error: ", error);
  }
};

// updateDev();
