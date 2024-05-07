import {
  MongoClient,
  MongoClientOptions,
  MongoServerSelectionError,
} from "mongodb";

const DEV_DB: string = process.env.DEV_DB || "mongodb://localhost:27017";
const LIVE_DB: string = process.env.LIVE_DB || "";

interface IYoursDB {
  [key: string]: string;
}

const YOURS_DB: IYoursDB = {
  dev: DEV_DB,
  live: LIVE_DB,
};
console.log("DEV_DB------", DEV_DB);
const dbConnection = async (env = "dev"): Promise<MongoClient | undefined> => {
  const options = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    connectTimeoutMS: 300000,
    keepAlive: true,
  } as MongoClientOptions;

  const client = new MongoClient(YOURS_DB[env], options);

  try {
    await client.connect();
    console.log("Connected to MongoDB");
    return client;
  } catch (err) {
    if (err instanceof MongoServerSelectionError) {
      console.error("Failed to connect to MongoDB server:", err.message);
      console.error(
        "Ensure that the MongoDB server is running and accessible."
      );
    } else {
      // Handle other types of errors
      console.error("An error occurred while connecting to MongoDB:", err);
    }
    // Close the MongoDB client when done
    await client.close();
    console.log("MongoDB client closed");
  }
};

export default dbConnection;
