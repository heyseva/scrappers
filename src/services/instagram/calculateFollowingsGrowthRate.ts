import dbConnection from "../../utils/mongo";
import { MongoClient } from "mongodb";
import { calculateFollowingsAnalysis } from "../../utils/followingGrowth";

export const calculateFollowingsGrowthRate = async (req: any, res: any) => {
  try {
    const client = (await dbConnection("dev")) as MongoClient;
    const live_client = (await dbConnection("live")) as MongoClient;
    const profiles = await client
      ?.db("insta-scrapper")
      .collection("scrap-ig-user")
      .find({
        version: "dev",
      })
      .toArray();
    console.log("profiles:--- ", profiles.length);
    profiles.forEach(async (profile: any) => {
      const influencer = await live_client
        .db("ringo-dev")
        .collection("influencers")
        .findOne({ ig_link: { $regex: profile.link.trim() } });

      if (profile?.data?.business_discovery && influencer) {
        const influencerPool = await live_client
          .db("ringo-dev")
          .collection("assignedinfluencers")
          .findOne({ influencerId: influencer._id });
        console.log(
          "influencer:--- ",
          influencer._id,
          influencerPool ? true : false
        );
        const followers_count = profile.data.business_discovery.followers_count;
        // const igEngRate = calculateEngagementRateRange({
        //   likes: likes,
        //   comments: comments,
        //   followers: followers_count,
        // });

        const followingGrowthRate = calculateFollowingsAnalysis(
          {
            count: influencer.ig_followers,
            date: influencerPool?.createdAt,
          },
          {
            count: followers_count,
            date: new Date().toISOString(),
          }
        );

        console.log("igEngRate:--- ", profile.link, followingGrowthRate);

        await client
          ?.db("insta-scrapper")
          .collection("scrap-ig-user")
          .updateOne(
            { _id: profile._id },
            {
              $set: {
                ig_following_growth_rate:
                  followingGrowthRate.followingsGrowthRate,
                ig_followers_count: followers_count,
                old_followers_count: influencer.ig_followers,
              },
            }
          );
      }
    });
  } catch (error) {
    console.log("error-----", error);
  }
};

// calculateFollowingsGrowthRate("", "");
