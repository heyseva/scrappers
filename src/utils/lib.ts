import BigNumber from "bignumber.js";
import { sqrt } from "mathjs";

export const getNumberValue = (value: string): number => {
  return Number(convertStringToNumber(value));
};

export function convertStringToNumber(str: string) {
  const numericPart = new BigNumber(str.replace(/[^0-9.]/g, ""));
  const multiplier = str.slice(-1).toUpperCase();

  switch (multiplier) {
    case "K":
      return numericPart.times(1e3);
    case "M":
      return numericPart.times(1e6);
    case "B":
      return numericPart.times(1e9);
    default:
      return numericPart.toNumber();
  }
}

export const extractEmails = (text: string): string[] => {
  return (
    text.match(/([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi) || []
  );
};

export const urlify = (text: string): string => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  if (text.includes("http") || text.includes("https")) {
    return text.replace(urlRegex, (url) => url);
  } else {
    return "";
  }
};

export const getUniqueObjects = (objects: any) => {
  // Convert objects to strings for comparison
  const objectStrings = objects.map((obj: any) => JSON.stringify(obj));

  // Remove duplicates by converting the array to a Set
  const uniqueObjectStrings = new Set(objectStrings);

  // Convert the Set back to an array and parse the strings back to objects
  const uniqueObjects = Array.from(uniqueObjectStrings).map((str) =>
    // @ts-ignore
    JSON.parse(str)
  );

  return uniqueObjects;
};

export const extractUsernameFromUrl = (url: string): string => {
  // Regular expression to match Instagram URLs and extract the username
  try {
    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com)\/([a-zA-Z0-9_.-]+)/;
    const match = url.match(regex);

    // If there's a match, return the username; otherwise, return null
    if (match && match[1]) {
      return match[1];
    } else {
      if (url.charAt(url.length - 1) === "/") {
        url.split("/").pop();
      }
      return url.split("/").pop() as string;
    }
  } catch (error: any) {
    console.log("extractUsernameFromUrl : error--", error?.message);
    if (url.charAt(url.length - 1) === "/") {
      url.split("/").pop();
    }
    return url.split("/").pop() as string;
  }
};

function calculateEngagementRate(
  likes: number,
  comments: number,
  followers: number
): number {
  return ((likes + comments) / followers) * 100;
}

function calculateMeanEngagementRate(engagementRates: number[]): number {
  const sumOfRates = engagementRates.reduce((sum, rate) => sum + rate, 0);
  return sumOfRates / engagementRates.length;
}

function calculateStandardDeviation(
  engagementRates: number[],
  meanEr: number
): number {
  const variance =
    engagementRates.reduce((sum, er) => sum + (er - meanEr) ** 2, 0) /
    engagementRates.length;
  return sqrt(variance) as number;
}

function calculateConfidenceInterval(
  meanEr: number,
  stdDev: number,
  N: number
): [number, number] {
  const marginOfError = 1.96 * (stdDev / (sqrt(N) as number));
  return [meanEr - marginOfError, meanEr + marginOfError];
}

export const calculateEngagementRateRange = ({
  likes,
  comments,
  followers,
}: {
  likes: number[];
  comments: number[];
  followers: number;
}): string => {
  console.log("calculateEngagementRateRange----", {
    likes,
    comments,
    followers,
  });

  const engagementRates: number[] = likes.map((like, index) => {
    return calculateEngagementRate(like, comments[index], followers);
  });

  const meanEr: number = calculateMeanEngagementRate(engagementRates);
  const stdDev: number = calculateStandardDeviation(engagementRates, meanEr);

  const confidenceInterval: [number, number] = calculateConfidenceInterval(
    meanEr,
    stdDev,
    engagementRates.length
  );

  const engRangeRate = `${confidenceInterval[0].toFixed(
    2
  )}% - ${confidenceInterval[1].toFixed(2)}%`;

  console.log("Engagement Rate Range: ", engRangeRate);
  return engRangeRate;
};
