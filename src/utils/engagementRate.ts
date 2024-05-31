interface InputData {
  likes: number[];
  comments: number[];
  followers: number;
}

interface TTInputData {
  likes: number[];
  comments: number[];
  followers: number;
  repost: number[];
  share: number[];
  bookmark: number[];
}

function sqrt(num: number): number {
  let x = num;
  let y = (x + 1) / 2;
  const epsilon = 0.001;

  while (Math.abs(x - y) > epsilon) {
    x = y;
    y = (x + num / x) / 2;
  }

  return y;
}

function calculateTTEngagementRate(
  likes: number,
  comments: number,
  repost: number,
  share: number,
  bookmark: number,
  followers: number
): number {
  return ((likes + comments + repost + share + bookmark) / followers) * 100;
}

function calculateEngagementRate(
  likes: number,
  comments: number,
  followers: number
): number {
  return ((likes + comments) / followers) * 100;
}

function calculateMeanEngagementRate(engagementRates: number[]): number {
  const sumOfRates = engagementRates.reduce((sum, rate) => sum + rate, 0);
  console.log(
    "calculateMeanEngagementRate---",
    sumOfRates,
    engagementRates.length,
    "=",
    sumOfRates / engagementRates.length
  );
  return sumOfRates / engagementRates.length;
}

function calculateStandardDeviation(
  engagementRates: number[],
  meanEr: number
): number {
  const variance =
    engagementRates.reduce((sum, er) => sum + (er - meanEr) ** 2, 0) /
    engagementRates.length;
  console.log(
    "calculateStandardDeviation---",
    engagementRates.reduce((sum, er) => sum + (er - meanEr) ** 2, 0),
    "lenght--",
    engagementRates.length
  );
  // @ts-ignore
  return sqrt(variance); // Convert the result of variance to a number
}

function calculateConfidenceInterval(
  meanEr: number,
  stdDev: number,
  N: number
): [number, number] {
  // @ts-ignore
  const marginOfError = 1.96 * (stdDev / sqrt(N)); // Convert the result of sqrt(N) to a number
  const lowerBound = meanEr - marginOfError;
  const upperBound = meanEr + marginOfError;
  // Ensure that the confidence interval does not go below 0%
  const adjustedLowerBound = Math.max(0, lowerBound);
  return [adjustedLowerBound, upperBound];
}

export function analyzeEngagement(data: InputData): string {
  const { likes, comments, followers } = data;

  console.log("analyzeEngagement---", likes, comments, followers);

  // Calculate engagement rates for each post
  const engagementRates: number[] = likes.map((like, index) => {
    return calculateEngagementRate(like, comments[index], followers);
  });

  // Calculate mean engagement rate
  const meanEr: number = calculateMeanEngagementRate(engagementRates);

  // Calculate standard deviation of engagement rates
  const stdDev: number = calculateStandardDeviation(engagementRates, meanEr);

  // Calculate confidence interval
  const confidenceInterval: [number, number] = calculateConfidenceInterval(
    meanEr,
    stdDev,
    engagementRates.length
  );

  // Output the results
  return `${confidenceInterval[0].toFixed(
    1
  )}% - ${confidenceInterval[1].toFixed(1)}%`;
}

export function analyzeTTEngagement(data: TTInputData): string {
  const { likes, comments, followers, repost, share, bookmark } = data;

  // console.log(
  //   "analyzeEngagement---",
  //   likes,
  //   comments,
  //   followers,
  //   repost,
  //   share,
  //   bookmark
  // );

  // Calculate engagement rates for each post
  const engagementRates: number[] = likes.map((like, index) => {
    return calculateTTEngagementRate(
      like,
      comments[index],
      repost[index],
      share[index],
      bookmark[index],
      followers
    );
  });

  // Calculate mean engagement rate
  const meanEr: number = calculateMeanEngagementRate(engagementRates);

  // Calculate standard deviation of engagement rates
  const stdDev: number = calculateStandardDeviation(engagementRates, meanEr);

  // Calculate confidence interval
  const confidenceInterval: [number, number] = calculateConfidenceInterval(
    meanEr,
    stdDev,
    engagementRates.length
  );

  // Output the results
  return `${confidenceInterval[0].toFixed(
    1
  )}% - ${confidenceInterval[1].toFixed(1)}%`;
}
