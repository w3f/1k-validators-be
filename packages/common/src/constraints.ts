import axios from "axios";
import semver from "semver";
import { getStats, scaled, scaledDefined, scoreDemocracyVotes } from "./score";
import { ChainData, Config, Constants, logger, Types, Util } from "./index";
import ApiHandler from "./ApiHandler";
import {
  allCandidates,
  getLastReferenda,
  getLatestRelease,
  setBlockedInvalidity,
  setCommissionInvalidity,
  setConnectionTimeInvalidity,
  setIdentityInvalidity,
  setKusamaRankInvalidity,
  setLatestClientReleaseValidity,
  setOnlineValidity,
  setRewardDestinationInvalidity,
  setSelfStakeInvalidity,
  setUnclaimedInvalidity,
  setValidateIntentionValidity,
} from "./db";
import {
  allNominators,
  getDelegations,
  getLatestNominatorStake,
  setLastValid,
  setOfflineAccumulatedInvalidity,
  setValid,
  setValidatorScore,
  setValidatorScoreMetadata,
} from "./db";

export interface Constraints {
  processCandidates(
    candidates: Set<Types.CandidateData>
  ): Promise<[Set<any>, Set<any>]>;
}

export class OTV implements Constraints {
  private chaindata: ChainData;

  // Constraint configurations
  private skipConnectionTime: boolean;
  private skipIdentity: boolean;
  private skipStakedDesitnation: boolean;
  private skipClientUpgrade: boolean;
  private skipUnclaimed: boolean;

  // configurable constants
  private minSelfStake: number;
  private commission: number;
  private unclaimedEraThreshold: number;

  private config: Config.ConfigSchema;

  // Caches - keyed by stash address
  private validMapCache: Map<string, Types.CandidateData> = new Map();
  private invalidMapCache: Map<string, Types.CandidateData> = new Map();

  // Weighted scores
  // Inclusion - lower is preferable (84-Era Inclusion)
  // Span Inclusion - lower is preferable (28-Era Inclusion)
  // Discovered at - earlier is preferable
  // Nominated At - not nominated in a while is preferable
  // Rank - higher is preferable
  // Unclaimed Eras - lower is preferable
  // Bonded - higher is preferable
  // Faults - lower is preferable
  // Accumulated Offline - lower if preferable
  // Location - lower is preferable
  // Council - higher is preferable
  // Democracy - higher is preferable
  private INCLUSION_WEIGHT = 100;
  private SPAN_INCLUSION_WEIGHT = 100;
  private DISCOVERED_WEIGHT = 5;
  private NOMINATED_WEIGHT = 30;
  private RANK_WEIGHT = 5;
  private UNCLAIMED_WEIGHT = 10;
  private BONDED_WEIGHT = 50;
  private FAULTS_WEIGHT = 5;
  private OFFLINE_WEIGHT = 2;
  private LOCATION_WEIGHT = 30;
  private REGION_WEIGHT = 10;
  private COUNTRY_WEIGHT = 10;
  private PROVIDER_WEIGHT = 50;
  private COUNCIL_WEIGHT = 50;
  private DEMOCRACY_WEIGHT = 100;
  private NOMINATIONS_WEIGHT = 100;
  private DELEGATIONS_WEIGHT = 60;

  constructor(handler: ApiHandler, config: Config.ConfigSchema) {
    this.chaindata = new ChainData(handler);
    this.config = config;

    // Constraints
    this.skipConnectionTime =
      this.config?.constraints?.skipConnectionTime || false;
    logger.info(`skip connection time: ${this.skipConnectionTime}`);
    this.skipIdentity = this.config?.constraints?.skipIdentity || false;
    this.skipStakedDesitnation =
      this.config?.constraints?.skipStakedDestination || false;
    this.skipClientUpgrade =
      this.config?.constraints?.skipClientUpgrade || false;
    this.skipUnclaimed = this.config?.constraints?.skipUnclaimed || false;
    this.minSelfStake =
      this.config?.constraints?.minSelfStake || 10000000000000000000;
    this.commission = this.config?.constraints?.commission || 150000000;
    this.unclaimedEraThreshold =
      this.config?.constraints?.unclaimedEraThreshold || 4;

    // Weights
    this.INCLUSION_WEIGHT = Number(this.config.score.inclusion);
    this.SPAN_INCLUSION_WEIGHT = Number(this.config.score.spanInclusion);
    this.DISCOVERED_WEIGHT = Number(this.config.score.discovered);
    this.NOMINATED_WEIGHT = Number(this.config.score.nominated);
    this.RANK_WEIGHT = Number(this.config.score.rank);
    this.BONDED_WEIGHT = Number(this.config.score.bonded);
    this.FAULTS_WEIGHT = Number(this.config.score.faults);
    this.OFFLINE_WEIGHT = Number(this.config.score.offline);
    this.LOCATION_WEIGHT = Number(this.config.score.location);
    this.REGION_WEIGHT = Number(this.config.score.region);
    this.COUNTRY_WEIGHT = Number(this.config.score.country);
    this.PROVIDER_WEIGHT = Number(this.config.score.provider);
    this.COUNCIL_WEIGHT = Number(this.config.score.council);
    this.DEMOCRACY_WEIGHT = Number(this.config.score.democracy);
    this.NOMINATIONS_WEIGHT = Number(this.config.score.nominations);
    this.DELEGATIONS_WEIGHT = Number(this.config.score.delegations);
  }

  // Add candidate to valid cache and remove them from invalid cache
  addToValidCache(address: string, candidate: Types.CandidateData) {
    if (this.invalidMapCache.has(address)) {
      this.invalidMapCache.delete(address);
    }

    if (this.validMapCache.has(address)) {
      return;
    } else {
      this.validMapCache.set(address, candidate);
    }
  }

  // Add candidate to valid cache and remove them from invalid cache
  addToInvalidCache(address: string, candidate: Types.CandidateData) {
    if (this.validMapCache.has(address)) {
      this.validMapCache.delete(address);
    }

    if (this.invalidMapCache.has(address)) {
      return;
    } else {
      this.invalidMapCache.set(address, candidate);
    }
  }

  async checkAllCandidates() {
    const candidates = await allCandidates();
    for (const candidate of candidates) {
      await this.checkCandidate(candidate);
    }
  }

  // Check the candidate and set any invalidity fields
  async checkCandidate(candidate: Types.CandidateData): Promise<boolean> {
    let valid = false;

    const onlineValid = await checkOnline(candidate);

    const validateValid = await checkValidateIntention(
      this.config,
      this.chaindata,
      candidate
    );

    const versionValid = await checkLatestClientVersion(this.config, candidate);

    const monitoringWeekValid = await checkConnectionTime(
      this.config,
      candidate
    );

    const identityValid = await checkIdentity(this.chaindata, candidate);

    const offlineValid = await checkOffline(candidate);

    let rewardDestinationValid = true;
    if (!this.skipStakedDesitnation) {
      rewardDestinationValid =
        (await checkRewardDestination(this.chaindata, candidate)) || false;
    }

    const commissionValid =
      (await checkCommission(this.chaindata, this.commission, candidate)) ||
      false;

    const selfStakeValid =
      (await checkSelfStake(this.chaindata, this.minSelfStake, candidate)) ||
      false;

    const unclaimedValid =
      this.config.constraints.skipUnclaimed == true
        ? true
        : (await checkUnclaimed(
            this.chaindata,
            this.unclaimedEraThreshold,
            candidate
          )) || false;

    const blockedValid =
      (await checkBlocked(this.chaindata, candidate)) || false;

    let kusamaValid = true;
    try {
      if (!!candidate.kusamaStash) {
        kusamaValid = (await checkKusamaRank(candidate)) || false;
      }
    } catch (e) {
      logger.info(`Error trying to get kusama data...`);
    }

    valid =
      onlineValid &&
      validateValid &&
      versionValid &&
      monitoringWeekValid &&
      identityValid &&
      offlineValid &&
      rewardDestinationValid &&
      commissionValid &&
      selfStakeValid &&
      unclaimedValid &&
      blockedValid &&
      kusamaValid;

    await setValid(candidate.stash, valid);

    if (valid) {
      this.addToValidCache(candidate.stash, candidate);
      setLastValid(candidate.stash);
    } else {
      this.addToInvalidCache(candidate.stash, candidate);
    }

    return valid;
  }

  async scoreAllCandidates() {
    const candidates = await allCandidates();
    await this.scoreCandidates(candidates);
  }

  async scoreCandidates(candidates: Types.CandidateData[]) {
    let rankedCandidates = [];
    const validCandidates = candidates.filter((candidate) => candidate.valid);
    if (validCandidates.length < 2) return;

    const session = await this.chaindata.getSession();

    // Get Ranges of Parameters
    //    A validators individual parameter is then scaled to how it compares to others that are also deemed valid

    // Get Values and Stats
    const { bondedValues, bondedStats } = getBondedValues(validCandidates);
    const { faultsValues, faultsStats } = getFaultsValues(validCandidates);
    const { inclusionValues, inclusionStats } =
      getInclusionValues(validCandidates);
    const { spanInclusionValues, spanInclusionStats } =
      getSpanInclusionValues(validCandidates);
    const { discoveredAtValues, discoveredAtStats } =
      getDiscoveredAtValues(validCandidates);
    const { nominatedAtValues, nominatedAtStats } =
      getNominatedAtValues(validCandidates);
    const { offlineValues, offlineStats } = getOfflineValues(validCandidates);
    const { rankValues, rankStats } = getRankValues(validCandidates);
    const { unclaimedValues, unclaimedStats } =
      getUnclaimedValues(validCandidates);
    const { locationArr, locationValues, locationStats } =
      getLocationValues(validCandidates);
    const { regionArr, regionValues, regionStats } =
      getRegionValues(validCandidates);
    const { countryArr, countryValues, countryStats } =
      getCountryValues(validCandidates);
    const { providerArr, providerValues, providerStats } =
      getProviderValues(validCandidates);
    const { ownNominatorAddresses, nominatorStakeValues, nominatorStakeStats } =
      await getNominatorStakeValues(validCandidates);
    const { delegationValues, delegationStats } = await getDelegationValues(
      validCandidates
    );
    const { councilStakeValues, councilStakeStats } =
      getCouncilStakeValues(validCandidates);
    const { lastReferendum, democracyValues, democracyStats } =
      await getDemocracyValues(validCandidates);

    const scoreMetadata = {
      session: session,
      bondedStats: bondedStats,
      bondedWeight: this.BONDED_WEIGHT,
      faultsStats: faultsStats,
      faultsWeight: this.FAULTS_WEIGHT,
      inclusionStats: inclusionStats,
      inclusionWeight: this.INCLUSION_WEIGHT,
      spanInclusionStats: spanInclusionStats,
      spanInclusionWeight: this.SPAN_INCLUSION_WEIGHT,
      discoveredAtStats: discoveredAtStats,
      discoveredAtWeight: this.DISCOVERED_WEIGHT,
      nominatedAtStats: nominatedAtStats,
      nominatedAtWeight: this.NOMINATED_WEIGHT,
      offlineStats: offlineStats,
      offlineWeight: this.OFFLINE_WEIGHT,
      rankStats: rankStats,
      rankWeight: this.RANK_WEIGHT,
      locationStats: locationStats,
      locationWeight: this.LOCATION_WEIGHT,
      regionStats: regionStats,
      regionWeight: this.REGION_WEIGHT,
      countryStats: countryStats,
      countryWeight: this.COUNTRY_WEIGHT,
      providerStats: providerStats,
      providerWeight: this.PROVIDER_WEIGHT,
      nominatorStakeStats: nominatedAtStats,
      nominatorStakeWeight: this.NOMINATIONS_WEIGHT,
      delegationStats: delegationStats,
      delegationWeight: this.DELEGATIONS_WEIGHT,
      councilStakeStats: councilStakeStats,
      councilStakeWeight: this.COUNCIL_WEIGHT,
      democracyStats: democracyStats,
      democracyWeight: this.DEMOCRACY_WEIGHT,
    };

    // Create  entry for Validator Score Metadata
    await setValidatorScoreMetadata(scoreMetadata, Date.now());

    for (const candidate of validCandidates) {
      // Scale inclusion between the 20th and 75th percentiles
      const scaledInclusion =
        scaledDefined(candidate.inclusion, inclusionValues, 0.2, 0.75) || 0;
      const inclusionScore = (1 - scaledInclusion) * this.INCLUSION_WEIGHT;

      // Scale inclusion between the 20th and 75h percentiles
      const scaledSpanInclusion =
        scaledDefined(
          candidate.spanInclusion,
          spanInclusionValues,
          0.2,
          0.75
        ) || 0;
      const spanInclusionScore =
        (1 - scaledSpanInclusion) * this.SPAN_INCLUSION_WEIGHT;

      const scaledDiscovered =
        scaled(candidate.discoveredAt, discoveredAtValues) || 0;
      const discoveredScore = (1 - scaledDiscovered) * this.DISCOVERED_WEIGHT;

      const scaledNominated =
        scaled(candidate.nominatedAt, nominatedAtValues) || 0;
      const nominatedScore = (1 - scaledNominated) * this.NOMINATED_WEIGHT;

      const scaledRank = scaled(candidate.rank, rankValues) || 0;
      const rankScore = scaledRank * this.RANK_WEIGHT;

      // Subtract the UNCLAIMED WEIGHT for each unclaimed era
      const unclaimedScore = candidate.unclaimedEras
        ? -1 * candidate.unclaimedEras.length * this.UNCLAIMED_WEIGHT
        : 0;

      // Scale bonding based on the 5th and 85th percentile
      const scaleBonded =
        scaledDefined(
          candidate.bonded ? candidate.bonded : 0,
          bondedValues,
          0.05,
          0.85
        ) || 0;
      const bondedScore = scaleBonded * this.BONDED_WEIGHT;

      const scaledOffline =
        scaled(candidate.offlineAccumulated, offlineValues) || 0;
      const offlineScore = (1 - scaledOffline) * this.OFFLINE_WEIGHT;

      const scaledFaults = scaled(candidate.faults, faultsValues) || 0;
      const faultsScore = (1 - scaledFaults) * this.FAULTS_WEIGHT;

      // Get the total number of nodes for the location a candidate has their node in
      const candidateLocation = locationArr.filter((location) => {
        if (candidate.location == location.name) return location.numberOfNodes;
      })[0]?.numberOfNodes;
      // Scale the location value to between the 10th and 95th percentile
      const scaledLocation =
        scaledDefined(candidateLocation, locationValues, 0.1, 0.95) || 0;
      const locationScore = (1 - scaledLocation) * this.LOCATION_WEIGHT || 0;

      const candidateRegion = regionArr.filter((region) => {
        if (
          candidate.infrastructureLocation &&
          candidate.infrastructureLocation.region == region.name
        )
          return region.numberOfNodes;
      })[0]?.numberOfNodes;
      // Scale the value to between the 10th and 95th percentile
      const scaledRegion =
        scaledDefined(candidateRegion, regionValues, 0.1, 0.95) || 0;
      const regionScore = (1 - scaledRegion) * this.REGION_WEIGHT || 0;

      const candidateCountry = countryArr.filter((country) => {
        if (
          candidate.infrastructureLocation &&
          candidate.infrastructureLocation.country == country.name
        )
          return country.numberOfNodes;
      })[0]?.numberOfNodes;
      // Scale the value to between the 10th and 95th percentile
      const scaledCountry =
        scaledDefined(candidateCountry, countryValues, 0.1, 0.95) || 0;
      const countryScore = (1 - scaledCountry) * this.COUNTRY_WEIGHT || 0;

      const candidateProvider = providerArr.filter((provider) => {
        if (
          candidate.infrastructureLocation &&
          candidate.infrastructureLocation.provider == provider.name
        )
          return provider.numberOfNodes;
      })[0]?.numberOfNodes;
      // Scale the value to between the 10th and 95th percentile
      const scaledProvider =
        scaledDefined(candidateProvider, providerValues, 0.1, 0.95) || 0;
      const providerScore = (1 - scaledProvider) * this.PROVIDER_WEIGHT || 0;

      const nomStake = await getLatestNominatorStake(candidate.stash);
      let totalNominatorStake = 0;
      if (
        nomStake != undefined &&
        nomStake?.activeNominators &&
        nomStake?.inactiveNominators
      ) {
        const { activeNominators, inactiveNominators } = nomStake;

        for (const active of activeNominators) {
          if (!ownNominatorAddresses.includes(active.address)) {
            totalNominatorStake += Math.sqrt(active.bonded);
          }
        }
        for (const inactive of inactiveNominators) {
          if (!ownNominatorAddresses.includes(inactive.address)) {
            totalNominatorStake += Math.sqrt(inactive.bonded);
          }
        }
      }
      const scaledNominatorStake =
        scaledDefined(totalNominatorStake, nominatorStakeValues, 0.1, 0.95) ||
        0;
      const nominatorStakeScore =
        scaledNominatorStake * this.NOMINATIONS_WEIGHT;

      const delegations = await getDelegations(candidate.stash);
      let totalDelegations = 0;
      if (
        delegations != undefined &&
        delegations?.totalBalance &&
        delegations?.delegators
      ) {
        const { totalBalance, delegators } = delegations;

        for (const delegator of delegators) {
          totalDelegations += Math.sqrt(delegator.effectiveBalance);
        }
      }
      const scaledDelegations =
        scaledDefined(totalDelegations, delegationValues, 0.1, 0.95) || 0;
      const delegationScore = scaledDelegations * this.DELEGATIONS_WEIGHT;

      // Score the council backing weight based on what percentage of their staking bond it is
      const denom = await this.chaindata.getDenom();
      const formatteonded = candidate.bonded / denom;
      const councilStakeScore =
        candidate.councilStake == 0
          ? 0
          : candidate.councilStake >= 0.75 * formatteonded
          ? this.COUNCIL_WEIGHT
          : candidate.councilStake >= 0.5 * formatteonded
          ? 0.75 * this.COUNCIL_WEIGHT
          : candidate.councilStake >= 0.25 * formatteonded
          ? 0.5 * this.COUNCIL_WEIGHT
          : candidate.councilStake < 0.25 * formatteonded
          ? 0.25 * this.COUNCIL_WEIGHT
          : 0;

      // Score democracy based on how many proposals have been voted on
      const {
        baseDemocracyScore,
        totalDemocracyScore,
        totalConsistencyMultiplier,
        lastConsistencyMultiplier,
      } = scoreDemocracyVotes(candidate.democracyVotes, lastReferendum);
      const scaledDemocracyScore =
        scaled(totalDemocracyScore, democracyValues) * this.DEMOCRACY_WEIGHT;

      const aggregate =
        inclusionScore +
        spanInclusionScore +
        faultsScore +
        discoveredScore +
        nominatedScore +
        rankScore +
        unclaimedScore +
        bondedScore +
        locationScore +
        regionScore +
        countryScore +
        providerScore +
        councilStakeScore +
        scaledDemocracyScore +
        offlineScore +
        delegationScore +
        nominatorStakeScore;

      const randomness = 1 + Math.random() * 0.15;

      const total = aggregate * randomness || 0;

      const score = {
        total: total,
        aggregate: aggregate,
        inclusion: inclusionScore,
        spanInclusion: spanInclusionScore,
        discovered: discoveredScore,
        nominated: nominatedScore,
        rank: rankScore,
        unclaimed: unclaimedScore,
        bonded: bondedScore,
        faults: faultsScore,
        offline: offlineScore,
        location: locationScore,
        region: regionScore,
        country: countryScore,
        provider: providerScore,
        councilStake: councilStakeScore,
        democracy: scaledDemocracyScore,
        nominatorStake: nominatorStakeScore,
        delegations: delegationScore,
        randomness: randomness,
        updated: Date.now(),
      };

      logger.info(`{Scored} ${Date.now().toString()} ${name} ${aggregate} region: ${region}`)

      await setValidatorScore(candidate.stash, session, score);

      const rankedCandidate = {
        aggregate: score,
        discoveredAt: candidate.discoveredAt,
        rank: candidate.rank,
        unclaimedEras: candidate.unclaimedEras,
        inclusion: candidate.inclusion,
        spanInclusion: candidate.spanInclusion,
        name: candidate.name,
        stash: candidate.stash,
        identity: candidate.identity,
        nominatedAt: candidate.nominatedAt,
        bonded: candidate.bonded,
        location: {
          location: candidate.location,
          otherNodes: candidateLocation,
        },
      };
      rankedCandidates.push(rankedCandidate);
    }

    rankedCandidates = rankedCandidates.sort((a, b) => {
      return b.aggregate.total - a.aggregate.total;
    });

    return rankedCandidates;
  }

  /// At the end of a nomination round this is the logic that separates the
  /// candidates that did good from the ones that did badly.
  /// - We have two sets, a 'good' set, and a 'bad' set
  ///     - We go through all the candidates and if they meet all constraints, they get called to the 'good' set
  ///     - If they do not meet all the constraints, they get added to the bad set
  async processCandidates(
    candidates: Set<Types.CandidateData>
  ): Promise<
    [
      Set<Types.CandidateData>,
      Set<{ candidate: Types.CandidateData; reason: string }>
    ]
  > {
    logger.info(`(OTV::processCandidates) Processing candidates`);

    const good: Set<Types.CandidateData> = new Set();
    const bad: Set<{ candidate: Types.CandidateData; reason: string }> =
      new Set();

    for (const candidate of candidates) {
      if (!candidate) {
        logger.info(
          `{Constraints::processCandidates} candidate is null. Skipping..`
        );
        continue;
      }
      const { name, stash, skipSelfStake, offlineAccumulated } = candidate;
      /// Ensure the commission wasn't raised/
      const [commission, err] = await this.chaindata.getCommission(stash);
      /// If it errors we assume that a validator removed their validator status.
      if (err) {
        const reason = `${name} ${err}`;
        logger.info(reason);
        bad.add({ candidate, reason });
        continue;
      }

      if (commission > this.commission) {
        const reason = `${name} found commission higher than ten percent: ${commission}`;
        logger.info(reason);
        bad.add({ candidate, reason });
        continue;
      }

      if (!skipSelfStake) {
        const [bondedAmt, err2] = await this.chaindata.getBondedAmount(stash);
        if (err2) {
          const reason = `${name} ${err2}`;
          logger.info(reason);
          bad.add({ candidate, reason });
          continue;
        }
        if (bondedAmt < this.minSelfStake) {
          const reason = `${name} has less than the minimum required amount bonded: ${bondedAmt}`;
          logger.info(reason);
          bad.add({ candidate, reason });
          continue;
        }
      }

      if (!this.skipStakedDesitnation) {
        const isStaked = await this.chaindata.destinationIsStaked(stash);
        if (!isStaked) {
          const reason = `${name} does not have reward destination set to Staked`;
          bad.add({ candidate, reason });
          continue;
        }
      }

      // Ensure the candidate doesn't have too much offline time
      const totalOffline = offlineAccumulated / Constants.WEEK;
      if (totalOffline > 0.02) {
        const reason = `${name} has been offline ${
          offlineAccumulated / 1000 / 60
        } minutes this week.`;
        logger.info(reason);
        bad.add({ candidate, reason });
        continue;
      }

      good.add(candidate);
    }
    return [good, bad];
  }
}

export const getBondedValues = (validCandidates: Types.CandidateData[]) => {
  const bondedValues = validCandidates.map((candidate) => {
    return candidate.bonded ? candidate.bonded : 0;
  });
  const bondedStats = bondedValues.length > 0 ? getStats(bondedValues) : [];
  return { bondedValues, bondedStats };
};

export const getFaultsValues = (validCandidates: Types.CandidateData[]) => {
  const faultsValues = validCandidates.map((candidate) => {
    return candidate.faults ? candidate.faults : 0;
  });
  const faultsStats = getStats(faultsValues);
  return { faultsValues, faultsStats };
};

export const getInclusionValues = (validCandidates: Types.CandidateData[]) => {
  const inclusionValues = validCandidates.map((candidate) => {
    return candidate.inclusion ? candidate.inclusion : 0;
  });
  const inclusionStats = getStats(inclusionValues);
  return { inclusionValues, inclusionStats };
};

export const getSpanInclusionValues = (
  validCandidates: Types.CandidateData[]
) => {
  const spanInclusionValues = validCandidates.map((candidate) => {
    return candidate.spanInclusion ? candidate.spanInclusion : 0;
  });
  const spanInclusionStats = getStats(spanInclusionValues);
  return { spanInclusionValues, spanInclusionStats };
};

export const getDiscoveredAtValues = (
  validCandidates: Types.CandidateData[]
) => {
  const discoveredAtValues = validCandidates.map((candidate) => {
    return candidate.discoveredAt ? candidate.discoveredAt : 0;
  });
  const discoveredAtStats = getStats(discoveredAtValues);
  return { discoveredAtValues, discoveredAtStats };
};

export const getNominatedAtValues = (
  validCandidates: Types.CandidateData[]
) => {
  const nominatedAtValues = validCandidates.map((candidate) => {
    return candidate.nominatedAt ? candidate.nominatedAt : 0;
  });
  const nominatedAtStats = getStats(nominatedAtValues);
  return { nominatedAtValues, nominatedAtStats };
};

export const getOfflineValues = (validCandidates: Types.CandidateData[]) => {
  const offlineValues = validCandidates.map((candidate) => {
    return candidate.offlineAccumulated ? candidate.offlineAccumulated : 0;
  });
  const offlineStats = getStats(offlineValues);
  return { offlineValues, offlineStats };
};

export const getRankValues = (validCandidates: Types.CandidateData[]) => {
  const rankValues = validCandidates.map((candidate) => {
    return candidate.rank ? candidate.rank : 0;
  });
  const rankStats = getStats(rankValues);
  return { rankValues, rankStats };
};

export const getUnclaimedValues = (validCandidates: Types.CandidateData[]) => {
  const unclaimedValues = validCandidates.map((candidate) => {
    return candidate.unclaimedEras && candidate.unclaimedEras.length
      ? candidate.unclaimedEras.length
      : 0;
  });
  const unclaimedStats = getStats(unclaimedValues);
  return { unclaimedValues, unclaimedStats };
};

export const getLocationValues = (validCandidates: Types.CandidateData[]) => {
  const locationMap = new Map();
  const locationArr = [];
  for (const candidate of validCandidates) {
    const location = candidate.location || "No Location";

    const locationCount = locationMap.get(location);
    if (!locationCount) {
      locationMap.set(location, 1);
    } else {
      locationMap.set(location, locationCount + 1);
    }
  }

  for (const location of locationMap.entries()) {
    const [name, numberOfNodes] = location;
    locationArr.push({ name, numberOfNodes });
  }

  const locationValues = locationArr.map((location) => {
    return location.numberOfNodes;
  });
  const locationStats = getStats(locationValues);
  return { locationArr, locationValues, locationStats };
};

export const getRegionValues = (validCandidates: Types.CandidateData[]) => {
  const regionMap = new Map();
  const regionArr = [];
  for (const candidate of validCandidates) {
    const region =
      candidate.infrastructureLocation &&
      candidate.infrastructureLocation.region
        ? candidate.infrastructureLocation.region
        : "No Location";

    const regionCount = regionMap.get(region);
    if (!regionCount) {
      regionMap.set(region, 1);
    } else {
      regionMap.set(region, regionCount + 1);
    }
  }

  for (const region of regionMap.entries()) {
    const [name, numberOfNodes] = region;
    regionArr.push({ name, numberOfNodes });
  }
  const regionValues = regionArr.map((region) => {
    return region.numberOfNodes;
  });
  const regionStats = getStats(regionValues);
  return { regionArr, regionValues, regionStats };
};

export const getCountryValues = (validCandidates: Types.CandidateData[]) => {
  const countryMap = new Map();
  const countryArr = [];
  for (const candidate of validCandidates) {
    const country =
      candidate.infrastructureLocation &&
      candidate.infrastructureLocation.country
        ? candidate.infrastructureLocation.country
        : "No Location";

    const countryCount = countryMap.get(country);
    if (!countryCount) {
      countryMap.set(country, 1);
    } else {
      countryMap.set(country, countryCount + 1);
    }
  }

  for (const country of countryMap.entries()) {
    const [name, numberOfNodes] = country;
    countryArr.push({ name, numberOfNodes });
  }
  const countryValues = countryArr.map((country) => {
    return country.numberOfNodes;
  });
  const countryStats = getStats(countryValues);
  return { countryArr, countryValues, countryStats };
};

export const getProviderValues = (validCandidates: Types.CandidateData[]) => {
  const providerMap = new Map();
  const providerArr = [];
  for (const candidate of validCandidates) {
    const provider =
      candidate.infrastructureLocation &&
      candidate.infrastructureLocation.provider
        ? candidate.infrastructureLocation.provider
        : "No Location";

    const providerCount = providerMap.get(provider);
    if (!providerCount) {
      providerMap.set(provider, 1);
    } else {
      providerMap.set(provider, providerCount + 1);
    }
  }

  for (const provider of providerMap.entries()) {
    const [name, numberOfNodes] = provider;
    providerArr.push({ name, numberOfNodes });
  }
  const providerValues = providerArr.map((provider) => {
    return provider.numberOfNodes;
  });
  const providerStats = getStats(providerValues);
  return { providerArr, providerValues, providerStats };
};

export const getNominatorStakeValues = async (
  validCandidates: Types.CandidateData[]
) => {
  const ownNominators = await allNominators();
  const ownNominatorAddresses = ownNominators.map((nom) => {
    return nom.address;
  });
  const nominatorStakeValues = [];
  for (const candidate of validCandidates) {
    const nomStake = await getLatestNominatorStake(candidate.stash);
    if (
      nomStake != undefined &&
      nomStake?.activeNominators &&
      nomStake?.inactiveNominators
    ) {
      try {
        const { activeNominators, inactiveNominators } = nomStake;

        let total = 0;
        for (const active of activeNominators) {
          if (!ownNominatorAddresses.includes(active.address)) {
            total += Math.sqrt(active.bonded);
          }
        }
        for (const inactive of inactiveNominators) {
          if (!ownNominatorAddresses.includes(inactive.address)) {
            total += Math.sqrt(inactive.bonded);
          }
        }
        nominatorStakeValues.push(total);
      } catch (e) {
        logger.info(`{nominatorStake} Can't find nominator stake values`);
        logger.info(JSON.stringify(nomStake));
      }
    }
  }
  if (nominatorStakeValues.length == 0) nominatorStakeValues.push(0);
  const nominatorStakeStats = getStats(nominatorStakeValues);
  return { ownNominatorAddresses, nominatorStakeValues, nominatorStakeStats };
};

export const getDelegationValues = async (
  validCandidates: Types.CandidateData[]
) => {
  const delegationValues = [];
  for (const candidate of validCandidates) {
    const delegations = await getDelegations(candidate.stash);
    if (delegations != undefined && delegations?.delegators) {
      try {
        const { totalBalance, delegators } = delegations;

        let total = 0;
        for (const delegator of delegators) {
          total += Math.sqrt(delegator.effectiveBalance);
        }
        delegationValues.push(total);
      } catch (e) {
        logger.info(`{delegations} Can't find delegation values`);
        logger.info(JSON.stringify(delegations));
      }
    }
  }
  const delegationStats = getStats(delegationValues);
  return { delegationValues, delegationStats };
};

export const getCouncilStakeValues = (
  validCandidates: Types.CandidateData[]
) => {
  const councilStakeValues = validCandidates.map((candidate) => {
    return candidate.councilStake ? Number(candidate.councilStake) : 0;
  });
  const councilStakeStats = getStats(councilStakeValues);
  return { councilStakeValues, councilStakeStats };
};

export const getDemocracyValues = async (
  validCandidates: Types.CandidateData[]
) => {
  const lastReferendum = (await getLastReferenda())[0]?.referendumIndex;

  // Democracy
  const democracyValues = validCandidates.map((candidate) => {
    const {
      baseDemocracyScore,
      totalDemocracyScore,
      totalConsistencyMultiplier,
      lastConsistencyMultiplier,
    } = scoreDemocracyVotes(candidate.democracyVotes, lastReferendum);
    return totalDemocracyScore || 0;
  });
  const democracyStats = getStats(democracyValues);
  return { lastReferendum, democracyValues, democracyStats };
};

// Checks the online validity of a node
export const checkOnline = async (candidate: any) => {
  if (candidate && Number(candidate.onlineSince) === 0) {
    await setOnlineValidity(candidate.stash, false);
    return false;
  } else {
    await setOnlineValidity(candidate.stash, true);
    return true;
  }
};

// Check the validate intention for a single validator
export const checkValidateIntention = async (
  config: Config.ConfigSchema,
  chaindata: ChainData,
  candidate: any
) => {
  const validators = await chaindata.getValidators();
  if (!validators.includes(Util.formatAddress(candidate?.stash, config))) {
    setValidateIntentionValidity(candidate.stash, false);
    return false;
  } else {
    setValidateIntentionValidity(candidate.stash, true);
    return true;
  }
};

// checks the validate intention for all validators
export const checkAllValidateIntentions = async (
  config: Config.ConfigSchema,
  chaindata: ChainData,
  candidates: any
) => {
  const validators = await chaindata.getValidators();
  for (const candidate of candidates) {
    if (!validators.includes(Util.formatAddress(candidate.stash, config))) {
      setValidateIntentionValidity(candidate.stash, false);
    } else {
      setValidateIntentionValidity(candidate.stash, true);
    }
  }
};

// checks that the validator is on the latest client version
export const checkLatestClientVersion = async (
  config: Config.ConfigSchema,
  candidate: any
) => {
  if (!config.constraints.skipClientUpgrade) {
    const forceLatestRelease = config.constraints.forceClientVersion;
    const latestRelease = await getLatestRelease();
    if (
      candidate.version &&
      latestRelease &&
      Date.now() > latestRelease.publishedAt + Constants.SIXTEEN_HOURS
    ) {
      const nodeVersion = semver.coerce(candidate.version);
      const latestVersion = forceLatestRelease
        ? semver.clean(forceLatestRelease)
        : semver.clean(latestRelease.name);

      const isUpgraded = semver.gte(nodeVersion, latestVersion);
      if (!isUpgraded) {
        setLatestClientReleaseValidity(candidate.stash, false);
        return false;
      } else {
        setLatestClientReleaseValidity(candidate.stash, true);
        return true;
      }
    } else {
      logger.warn(
        `{latestRelease} Could not set release validity for ${
          candidate.name
        } - version: ${candidate.version} Latest release: ${
          latestRelease?.name
        } now: ${Date.now()}`
      );
      return true;
    }
  } else {
    setLatestClientReleaseValidity(candidate.stash, true);
    return true;
  }
};

export const checkConnectionTime = async (
  config: Config.ConfigSchema,
  candidate: any
) => {
  if (!config.constraints.skipConnectionTime) {
    const now = new Date().getTime();
    if (now - candidate.discoveredAt < Constants.WEEK) {
      setConnectionTimeInvalidity(candidate.stash, false);
      return false;
    } else {
      setConnectionTimeInvalidity(candidate.stash, true);
      return true;
    }
  } else {
    setConnectionTimeInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkIdentity = async (chaindata: ChainData, candidate: any) => {
  const [hasIdentity, verified] = await chaindata.hasIdentity(candidate.stash);
  if (!hasIdentity) {
    const invalidityString = `${candidate.name} does not have an identity set.`;
    setIdentityInvalidity(candidate.stash, false, invalidityString);
    return false;
  }
  if (!verified) {
    const invalidityString = `${candidate.name} has an identity but is not verified by the registrar.`;
    setIdentityInvalidity(candidate.stash, false, invalidityString);
    return false;
  }
  setIdentityInvalidity(candidate.stash, true);
  return true;
};

export const checkOffline = async (candidate: any) => {
  const totalOffline = candidate.offlineAccumulated / Constants.WEEK;
  if (totalOffline > 0.02) {
    await setOfflineAccumulatedInvalidity(candidate.stash, false);
    return false;
  } else {
    await setOfflineAccumulatedInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkRewardDestination = async (
  chaindata: ChainData,
  candidate: any
) => {
  const isStaked = await chaindata.destinationIsStaked(candidate.stash);
  if (!isStaked) {
    await setRewardDestinationInvalidity(candidate.stash, false);
    return false;
  } else {
    await setRewardDestinationInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkCommission = async (
  chaindata: ChainData,
  targetCommission: number,
  candidate: any
) => {
  const [commission, err] = await chaindata.getCommission(candidate.stash);
  if (err) {
    logger.warn(`{CheckComssion} there was an error: ${err}`);
    return false;
  }
  if (commission > targetCommission) {
    const invalidityString = `${
      candidate.name
    } commission is set higher than the maximum allowed. Set: ${
      commission / Math.pow(10, 7)
    }% Allowed: ${targetCommission / Math.pow(10, 7)}%`;
    await setCommissionInvalidity(candidate.stash, false, invalidityString);
    return false;
  } else {
    await setCommissionInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkSelfStake = async (
  chaindata: ChainData,
  targetSelfStake: number,
  candidate: any
) => {
  if (!candidate.skipSelfStake) {
    const [bondedAmt, err2] = await chaindata.getBondedAmount(candidate.stash);
    let invalidityString;
    if (err2) {
      invalidityString = `${candidate.name} ${err2}`;
      await setSelfStakeInvalidity(candidate.stash, false, invalidityString);
      return false;
    }

    if (bondedAmt < targetSelfStake) {
      invalidityString = `${candidate.name} has less than the minimum amount bonded: ${bondedAmt} is bonded.`;
      await setSelfStakeInvalidity(candidate.stash, false, invalidityString);
      return false;
    }
  }
  await setSelfStakeInvalidity(candidate.stash, true);
  return true;
};

export const checkUnclaimed = async (
  chaindata: ChainData,
  unclaimedEraThreshold: number,
  candidate: any
) => {
  const [currentEra, err3] = await chaindata.getActiveEraIndex();
  const threshold = currentEra - unclaimedEraThreshold - 1; // Validators cannot have unclaimed rewards before this era
  // If unclaimed eras contain an era below the recent threshold
  if (
    candidate.unclaimedEras &&
    !candidate.unclaimedEras.every((era) => era > threshold)
  ) {
    const invalidityString = `${candidate.name} has unclaimed eras: ${
      candidate.unclaimedEras
    } prior to era: ${threshold + 1}`;
    await setUnclaimedInvalidity(candidate.stash, false, invalidityString);
    return false;
  } else {
    await setUnclaimedInvalidity(candidate.stash, true);
    return true;
  }
};

// Checks if the validator blocks external nominations
export const checkBlocked = async (chaindata: ChainData, candidate: any) => {
  const isBlocked = await chaindata.getBlocked(candidate.stash);
  if (isBlocked) {
    const invalidityString = `${candidate.name} blocks external nominations`;
    await setBlockedInvalidity(candidate.stash, false, invalidityString);
    return false;
  } else {
    await setBlockedInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkKusamaRank = async (candidate: any) => {
  try {
    if (!!candidate.kusamaStash) {
      const url = `${Constants.KOTVBackendEndpoint}/candidate/${candidate.kusamaStash}`;

      const res = await axios.get(url);

      if (!!res.data.invalidityReasons) {
        const invalidityReason = `${candidate.name} has a kusama node that is invalid: ${res.data.invalidityReasons}`;
        await setKusamaRankInvalidity(candidate.stash, false, invalidityReason);
        return false;
      }

      if (Number(res.data.rank) < 25) {
        const invalidityReason = `${candidate.name} has a Kusama stash with lower than 25 rank in the Kusama OTV programme: ${res.data.rank}.`;
        await setKusamaRankInvalidity(candidate.stash, false, invalidityReason);
        return false;
      }
    }
    await setKusamaRankInvalidity(candidate.stash, true);
    return true;
  } catch (e) {
    logger.info(`Error trying to get kusama data...`);
  }
};
