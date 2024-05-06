// Utilities for Scoring Validators

// Sorts an array by ascending values
export const asc = (arr: number[]) => arr.sort((a, b) => a - b);

export const absMin = (arr: number[]) => {
  const sorted = asc(arr);
  return Number(sorted[0]);
};

export const absMax = (arr: number[]) => {
  const sorted = asc(arr);
  return Number(sorted[sorted.length - 1]);
};

export const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

export const mean = (arr: number[]) => sum(arr) / arr.length;

export const std = (arr: number[]) => {
  const mu = mean(arr);
  const diffArr = arr.map((a) => (a - mu) ** 2);
  return Math.sqrt(sum(diffArr) / (arr.length - 1));
};

export const quantile = (arr: number[], q: number) => {
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

export const q10 = (arr: number[]) => quantile(arr, 0.1);
export const q25 = (arr: number[]) => quantile(arr, 0.25);
export const q50 = (arr: number[]) => quantile(arr, 0.5);
export const q75 = (arr: number[]) => quantile(arr, 0.75);
export const q90 = (arr: number[]) => quantile(arr, 0.9);

export const median = (arr: number[]) => q50(arr);

export const scaled = (value: number, arr: number[]): number => {
  const aq10 = q10(arr);
  const aq90 = q90(arr);
  if (value <= aq10) return 0;
  if (value >= aq90) return 1;
  return (value - aq10) / (aq90 - aq10);
};

export const scaledDefined = (
  value: number,
  arr: number[],
  lowQuartile: number,
  highQuartile: number,
): number => {
  if (arr.length == 0) return 0;
  const lowQ = quantile(arr, lowQuartile);
  const highQ = quantile(arr, highQuartile);
  if (value <= lowQ) return 0;
  if (value >= highQ) return 1;
  return (value - lowQ) / (highQ - lowQ);
};

export interface LocationStats {
  values: { name?: string; numberOfNodes: number }[];
  absoluteMin: number;
  absoluteMax: number;
  q10: number;
  q25: number;
  q50: number;
  q75: number;
  q90: number;
  mean: number;
  standardDeviation: number;
}
export interface Stats {
  values: number[];
  absoluteMin: number;
  absoluteMax: number;
  q10: number;
  q25: number;
  q50: number;
  q75: number;
  q90: number;
  mean: number;
  standardDeviation: number;
}

export const getStats = (arr: number[]): Stats => {
  const arrAbsMin = arr.length !== 0 ? absMin(arr) : 0;
  const arrAbsMax = arr.length !== 0 ? absMax(arr) : 0;
  const arrQ10 = arr.length !== 0 ? q10(arr) : 0;
  const arrQ25 = arr.length !== 0 ? q25(arr) : 0;
  const arrQ50 = arr.length !== 0 ? q50(arr) : 0;
  const arrQ75 = arr.length !== 0 ? q75(arr) : 0;
  const arrQ90 = arr.length !== 0 ? q90(arr) : 0;
  const arrMean = arr.length !== 0 ? mean(arr) : 0;
  const arrStd = arr.length > 1 ? std(arr) : 0;

  return {
    values: arr,
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

export const lastValues = (
  array: number[],
  lastValue: number,
  threshold: number,
): number[] => {
  const sorted = asc(array);
  return sorted.filter((x) => {
    return lastValue - threshold < x;
  });
};

export const variance = (arr: number[] = []): number => {
  if (!arr.length) {
    return 0;
  }
  const sum = arr.reduce((acc, val) => acc + val);
  const { length: num } = arr;
  const median = sum / num;
  let variance = 0;
  arr.forEach((num) => {
    variance += (num - median) * (num - median);
  });
  variance /= num;
  return variance;
};
