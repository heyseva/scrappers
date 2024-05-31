import dayjs from "dayjs";

interface FollowingsData {
  count: number;
  date: string; // Assuming dates are in ISO format (e.g., "YYYY-MM-DD")
}

interface FollowingsAnalysis {
  input1: FollowingsData;
  input2: FollowingsData;
  changeInFollowingsCount: number;
  splitInByMonthDifference: number;
  monthDifference: number;
  calculatedPreviousMonthFollowings: number;
  followingsGrowthRate: string;
  upOrDown: string;
}

export function calculateFollowingsAnalysis(
  input1: FollowingsData,
  input2: FollowingsData
): FollowingsAnalysis {
  const count1 = input1.count;
  const count2 = input2.count;
  const date1 = new Date(input1.date);
  const date2 = new Date(input2.date);

  console.log("calculateFollowingsAnalysis:--- ", input1, input2);

  const changeInFollowingsCount = count2 - count1;

  const monthDifference = monthsBetween(date1, date2);
  const splitInByMonthDifference =
    changeInFollowingsCount / (monthDifference <= 0 ? 1 : monthDifference);
  const calculatedPreviousMonthFollowings = count2 - splitInByMonthDifference;

  // if (changeInFollowingsCount > 0) {
  const followingsGrowthRate =
    (count2 / calculatedPreviousMonthFollowings - 1) * 100;

  const upOrDown = count2 > count1 ? "up" : "down";

  return {
    input1,
    input2,
    changeInFollowingsCount,
    splitInByMonthDifference,
    monthDifference,
    calculatedPreviousMonthFollowings,
    followingsGrowthRate: followingsGrowthRate.toFixed(2),
    upOrDown,
  };
  // } else {
  //   // Calculate the ratio
  //   const ratio = count2 / calculatedPreviousMonthFollowings;

  //   // Add 1 to the ratio
  //   const adjustedRatio = ratio + 1;

  //   // Calculate the percentage change
  //   const percentageChange = -adjustedRatio * 100; // Multiply by 100 to convert to percentage

  //   // Format the result as a string with two decimal places
  //   const formattedPercentageChange = percentageChange.toFixed(2) + "%";

  //   console.log(formattedPercentageChange);

  //   return {
  //     input1,
  //     input2,
  //     changeInFollowingsCount,
  //     splitInByMonthDifference,
  //     monthDifference,
  //     calculatedPreviousMonthFollowings,
  //     followingsGrowthRate: formattedPercentageChange,
  //     upOrDown: "down",
  //   };
  // }
}

// Helper function to calculate the number of months between two dates
function monthsBetween(startDate: Date, endDate: Date): number {
  const start = dayjs(startDate).startOf("month");
  const end = dayjs(endDate).endOf("month");

  // Calculate the difference in months
  const monthsDiff = end.diff(start, "month");

  return monthsDiff;
}

// // Example usage
// const input1: FollowingsData = {
//   count: 70000,
//   date: "2/25/2024",
//   //   25 Feb
// };

// const input2: FollowingsData = {
//   //   count: 85000,
//   count: 62350,
//   date: "5/15/2024",
//   //   15 May
// };

// const analysisResult = calculateFollowingsAnalysis(input1, input2);
// console.log(analysisResult);
