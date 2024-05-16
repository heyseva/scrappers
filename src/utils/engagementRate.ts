// engagementAnalysis.ts

import { sqrt } from "mathjs";

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

// Example usage
const likes: number[] = [120, 80, 150, 200, 100]; // Example likes for each post
const comments: number[] = [25, 15, 30, 50, 20]; // Example comments for each post
const followers: number = 10000; // Example follower count

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

console.log(
  `Engagement Rate Range: ${confidenceInterval[0].toFixed(
    2
  )}% - ${confidenceInterval[1].toFixed(2)}%`
);
