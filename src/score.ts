// Utilities for Scoring Validators

export const asc = (arr) => arr.sort((a, b) => a - b);

export const absMin = (arr) => {
  const sorted = asc(arr);
  return sorted[0];
};

export const absMax = (arr) => {
  const sorted = asc(arr);
  return sorted[sorted.length - 1];
};

export const sum = (arr) => arr.reduce((a, b) => a + b, 0);

export const mean = (arr) => sum(arr) / arr.length;

// sample standard deviation
export const std = (arr) => {
  const mu = mean(arr);
  const diffArr = arr.map((a) => (a - mu) ** 2);
  return Math.sqrt(sum(diffArr) / (arr.length - 1));
};

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

export const getStats = (arr) => {
  const arrSorted = asc(arr);
  const arrAbsMin = absMin(arr);
  const arrAbsMax = absMax(arr);
  const arrQ10 = q10(arr);
  const arrQ25 = q25(arr);
  const arrQ50 = q50(arr);
  const arrQ75 = q75(arr);
  const arrQ90 = q90(arr);
  const arrMean = mean(arr);
  const arrStd = std(arr);
  return {
    values: arrSorted,
    absoluteMin: arrAbsMin,
    absoluteMax: arrAbsMax,
    q10: arrQ10,
    q25: arrQ25,
    q50: arrQ50,
    q75: arrQ75,
    q90: arrQ90,
    mean: arrMean,
    standardDeviation: arrStd,
  };
};
