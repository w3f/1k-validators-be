// Utilities for Scoring Validators

// Sorts an array by ascending values
export const asc = (arr) => arr.sort((a, b) => a - b);

// Gets the absolute min of an array of values
export const absMin = (arr) => {
  const sorted = asc(arr);
  return sorted[0];
};

// Gets the absolute max of an array of values
export const absMax = (arr) => {
  const sorted = asc(arr);
  return sorted[sorted.length - 1];
};

// Gets the total sum of an array of values
export const sum = (arr) => arr.reduce((a, b) => a + b, 0);

// Gets the mean of an array of values
export const mean = (arr) => sum(arr) / arr.length;

// sample standard deviation
export const std = (arr) => {
  const mu = mean(arr);
  const diffArr = arr.map((a) => (a - mu) ** 2);
  return Math.sqrt(sum(diffArr) / (arr.length - 1));
};

// Gets the xth quantile of an array
export const quantile = (arr, q) => {
  const sorted = asc(arr);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
};

export const q10 = (arr) => quantile(arr, 0.1);
export const q25 = (arr) => quantile(arr, 0.25);
export const q50 = (arr) => quantile(arr, 0.5);
export const q75 = (arr) => quantile(arr, 0.75);
export const q90 = (arr) => quantile(arr, 0.9);

export const median = (arr) => q50(arr);

// Scale the value in between the 10th and 90th quartiles
export const scaled = (value, arr) => {
  const aq10 = q10(arr);
  const aq90 = q90(arr);
  if (value <= aq10) return 0;
  if (value >= aq90) return 1;
  return (value - aq10) / (aq90 - aq10);
};

// Scale the value in between defined quartile ranges
export const scaledDefined = (value, arr, lowQuartile, highQuartile) => {
  const lowQ = quantile(arr, lowQuartile);
  const highQ = quantile(arr, highQuartile);
  if (value <= lowQ) return 0;
  if (value >= highQ) return 1;
  return (value - lowQ) / (highQ - lowQ);
};

export const getStats = (arr) => {
  const arrSorted = arr.length != 0 ? asc(arr) : [];
  const arrAbsMin = arr.length != 0 ? absMin(arr) : 0;
  const arrAbsMax = arr.length != 0 ? absMax(arr) : 0;
  const arrQ10 = arr.length != 0 ? q10(arr) : 0;
  const arrQ25 = arr.length != 0 ? q25(arr) : 0;
  const arrQ50 = arr.length != 0 ? q50(arr) : 0;
  const arrQ75 = arr.length != 0 ? q75(arr) : 0;
  const arrQ90 = arr.length != 0 ? q90(arr) : 0;
  const arrMean = arr.length != 0 ? mean(arr) : 0;
  const arrStd = arr.length != 0 ? std(arr) : 0;
  return {
    values: arrSorted,
    absoluteMin: arrAbsMin,
    absoluteMax: arrAbsMax,
    q10: arrQ10,
    q25: arrQ25,
    q50: arrQ50,
    q75: arrQ75,
    q90: arrQ90,
    mean: arrMean ? arrMean : 0,
    standardDeviation: arrStd ? arrStd : 0,
  };
};

// Returns an array of sub-arrays of consecutive numbers.
// ie [1, 2, 3, 5, 6, 8, 9]
// return [[1, 2, 3], [5, 6], [8, 9]]
export const consistency = (array) => {
  const sorted = asc(array);
  return sorted.reduce((r, n) => {
    const lastSubArray = r[r.length - 1];

    if (!lastSubArray || lastSubArray[lastSubArray.length - 1] !== n - 1) {
      r.push([]);
    }

    r[r.length - 1].push(n);

    return r;
  }, []);
};

// Given an array, return a new array with the last _threshold_ amount of items from a lastValue
//     For example given:
//         - the array [1, 3, 4, 6, 7, 8, 9, 11, 12],
//         - a last value of 15
//         - a threshold of 5
//     This will return a new array [11, 12]
export const lastValues = (array, lastValue, threshold) => {
  const sorted = asc(array);
  return sorted.filter((x) => {
    return lastValue - threshold < x;
  });
};

// The window of the last votes we want to check consistency for.
//      For example, if the last referendum was 143 and there's a window of 5,
//      we want to check votes [139, 140, 141, 142, 143]
const RECENT_WINDOW = 5;

const LAST_REFERENDUM_WEIGHT = 15;
const RECENT_REFERENDUM_WEIGHT = 5;
const BASE_REFERENDUM_WEIGHT = 2;

// Inputs:
//    votes: an array of all the votes of a validator
//    lastReferendum: the last (or current) on chain referendum
// Returns:
//    baseDemocracyScore: the base score, sans multipliers
//    totalConsistencyMultiplier: the multiplier for the consistency of all votes
//    lastConsistencyMultiplier: the mulitiplier for the consistency of the recent window (ie the last 5 votes)
//    totalDemocracyScore: the base score * multipliers
// Scoring:
//     consistency is quantified as the batches of consecutive votes.
//
//     if someone has the votes [0, 1, 2, 4, 5, 6, 8, 10, 13],
//         there are 5 separate streaks of consistency: [0, 1, 2], [4, 5, 6], [8], [10], [13]
//
//     ideally we want to reward people that have the fewest separate streaks of consistency
//       (ie we want them to have fewer, longer consecutive streams of votes)
//
//     these consistency streaks are used to determine two different multipliers:
//        total consistency: how consistent are they with all votes
//        last consistency: how consistent are they within the recent window of votes (ie the last 5)
//
//     the multiplier is calculated as: 1 + 1 / consistency_streaks
//          resulting the more separate steams of consistency, the lower the multiplier
//
//      the total score is calculated as (base_score * lastMultiplier * totalMultipler)
//
//      The total score is capped at 250, the last consistency multiplier at 2x and the total consistency multiplier at 1.5x
//
//  Desired Outcome:
//     We want to balance the fact that new people may not have the number of votes as people that have
//       been voting for a while, so ideally if people start voting on the recent referenda (and are consistent)
//       they can achieve a good score from the multipliers.
//     We want to still benefit people that have been voting on lots of things though, so the points
//       they get from those gradually decrease over time (but still add up)
export const scoreDemocracyVotes = (
  votes: number[],
  lastReferendum: number
) => {
  if (votes.length == 0) {
    return {
      baseDemocracyScore: 0,
      totalConsistencyMultiplier: 0,
      lastConsistencyMultiplier: 0,
      totalDemocracyScore: 0,
    };
  }
  // Make sure votes are in ascending order
  const sorted = asc(votes);

  // Calculate the base democracy score:
  //     - if the referendum is the last/current, add 15 points
  //     - if the referendum is one of the last 3 most recent referenda, add 5 points per vote
  //     - everything else add 2 points per vote
  let demScore = 0;
  for (const referendum of votes) {
    if (referendum == lastReferendum) {
      demScore += LAST_REFERENDUM_WEIGHT;
    } else if (lastReferendum - referendum <= 3) {
      demScore += RECENT_REFERENDUM_WEIGHT;
    } else {
      demScore += BASE_REFERENDUM_WEIGHT;
    }
  }

  // Get the consistency sub-arrays for all votes
  const totalConsistency = consistency(sorted);

  //
  const lastConsistency = consistency(
    lastValues(sorted, lastReferendum, RECENT_WINDOW)
  );

  // The consistency of all historical votes, capped at 1.5x
  const totalConsistencyMultiplier =
    totalConsistency?.length > 0
      ? Math.min(1 + 1 / totalConsistency.length, 1.5)
      : 1;

  // The consistency of only the last _threshold_ votes
  const lastConsistencyMultiplier =
    lastConsistency?.length > 0 ? 1 + 1 / lastConsistency.length : 1;

  // Calculate the total score, capping it at 250 points
  const totalDemScore = Math.min(
    demScore * totalConsistencyMultiplier * lastConsistencyMultiplier,
    250
  );

  return {
    baseDemocracyScore: demScore || 0,
    totalConsistencyMultiplier: totalConsistencyMultiplier || 0,
    lastConsistencyMultiplier: lastConsistencyMultiplier || 0,
    totalDemocracyScore: totalDemScore || 0,
  };
};
