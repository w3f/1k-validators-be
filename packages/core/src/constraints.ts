import {
  ApiHandler,
  ChainData,
  Constants,
  logger,
  Types,
  Util,
} from "@1kv/common";
import axios from "axios";
import { Config } from "./config";
import Db from "./db";
import Database from "./db";
import semver from "semver";
import {
  absMax,
  absMin,
  asc,
  getStats,
  mean,
  median,
  q10,
  q25,
  q75,
  q90,
  scaled,
  scaledDefined,
  scoreDemocracyVotes,
  std,
} from "./score";

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

  private config: Config;
  private db: Database;

  // caches
  // TODO: Remove
  private validCache: Types.CandidateData[] = [];
  private invalidCache: Types.CandidateData[] = [];

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

  constructor(
    handler: ApiHandler,
    skipConnectionTime = false,
    skipIdentity = false,
    skipStakedDestination = false,
    skipClientUpgrade = false,
    skipUnclaimed = false,
    minSelfStake = 0,
    commission = 0,
    unclaimedEraThreshold = 0,
    config: Config,
    db: Database
  ) {
    this.chaindata = new ChainData(handler);

    this.skipConnectionTime = skipConnectionTime;
    this.skipIdentity = skipIdentity;
    this.skipStakedDesitnation = skipStakedDestination;
    this.skipClientUpgrade = skipClientUpgrade;
    this.skipUnclaimed = skipUnclaimed;

    this.minSelfStake = minSelfStake;
    this.commission = commission;
    this.unclaimedEraThreshold = unclaimedEraThreshold;

    this.config = config;
    this.db = db;

    this.INCLUSION_WEIGHT = Number(this.config.score.inclusion);
    this.SPAN_INCLUSION_WEIGHT = Number(this.config.score.spanInclusion);
    this.DISCOVERED_WEIGHT = Number(this.config.score.discovered);
    this.NOMINATED_WEIGHT = Number(this.config.score.nominated);
    this.RANK_WEIGHT = Number(this.config.score.nominated);
    this.BONDED_WEIGHT = Number(this.config.score.bonded);
    this.FAULTS_WEIGHT = Number(this.config.score.faults);
    this.OFFLINE_WEIGHT = Number(this.config.score.offline);
    this.LOCATION_WEIGHT = Number(this.config.score.location);
    this.REGION_WEIGHT = Number(this.config.score.region);
    this.COUNTRY_WEIGHT = Number(this.config.score.region);
    this.PROVIDER_WEIGHT = Number(this.config.score.provider);
    this.COUNCIL_WEIGHT = Number(this.config.score.council);
    this.DEMOCRACY_WEIGHT = Number(this.config.score.democracy);
    this.NOMINATIONS_WEIGHT = Number(this.config.score.nominations);
    this.DELEGATIONS_WEIGHT = Number(this.config.score.delegations);
  }

  get validCandidateCache(): Types.CandidateData[] {
    return this.validCache;
  }

  get invalidCandidateCache(): Types.CandidateData[] {
    return this.invalidCache;
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

  async checkCandidateStash(address: string): Promise<boolean> {
    const candidate = await this.db.getCandidate(address);
    return await this.checkCandidate(candidate);
  }

  // Check the candidate and set any invalidity fields
  async checkCandidate(candidate: Types.CandidateData): Promise<boolean> {
    let valid = false;

    const onlineValid = await checkOnline(this.db, candidate);

    const validateValid = await checkValidateIntention(
      this.config,
      this.chaindata,
      this.db,
      candidate
    );

    const versionValid = await checkLatestClientVersion(
      this.config,
      this.db,
      candidate
    );

    const monitoringWeekValid = await checkConnectionTime(
      this.config,
      this.db,
      candidate
    );

    const identityValid = await checkIdentity(
      this.chaindata,
      this.db,
      candidate
    );

    const offlineValid = await checkOffline(this.db, candidate);

    let rewardDestinationValid = true;
    if (!this.skipStakedDesitnation) {
      rewardDestinationValid =
        (await checkRewardDestination(this.db, this.chaindata, candidate)) ||
        false;
    }

    const commissionValid =
      (await checkCommission(
        this.db,
        this.chaindata,
        this.commission,
        candidate
      )) || false;

    const selfStakeValid =
      (await checkSelfStake(
        this.db,
        this.chaindata,
        this.minSelfStake,
        candidate
      )) || false;

    const unclaimedValid =
      this.config.constraints.skipUnclaimed == true
        ? true
        : (await checkUnclaimed(
            this.db,
            this.chaindata,
            this.unclaimedEraThreshold,
            candidate
          )) || false;

    const blockedValid =
      (await checkBlocked(this.db, this.chaindata, candidate)) || false;

    let kusamaValid = true;
    try {
      if (!!candidate.kusamaStash) {
        kusamaValid = (await checkKusamaRank(this.db, candidate)) || false;
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

    await this.db.setValid(candidate.stash, valid);

    if (valid) {
      this.addToValidCache(candidate.stash, candidate);
      this.db.setLastValid(candidate.stash);
    } else {
      this.addToInvalidCache(candidate.stash, candidate);
    }

    return valid;
  }

  async scoreAllCandidates() {
    const candidates = await this.db.allCandidates();
    await this.scoreCandidates(candidates, this.db);
  }

  async scoreCandidates(candidates: Types.CandidateData[], db: Db) {
    let rankedCandidates = [];
    const validCandidates = candidates.filter((candidate) => candidate.valid);
    if (validCandidates.length < 2) return;

    // Get Ranges of Parameters
    //    A validators individual parameter is then scaled to how it compares to others that are also deemed valid

    // Bonded
    const bondedValues = validCandidates.map((candidate) => {
      return candidate.bonded ? candidate.bonded : 0;
    });
    const bondedStats = bondedValues.length > 0 ? getStats(bondedValues) : [];

    // Faults
    const faultsValues = validCandidates.map((candidate) => {
      return candidate.faults ? candidate.faults : 0;
    });
    const faultsStats = getStats(faultsValues);

    //  Inclusion
    const inclusionValues = validCandidates.map((candidate) => {
      return candidate.inclusion ? candidate.inclusion : 0;
    });
    const inclusionStats = getStats(inclusionValues);

    // Span Inclusion
    const spanInclusionValues = validCandidates.map((candidate) => {
      return candidate.spanInclusion ? candidate.spanInclusion : 0;
    });
    const spanInclusionStats = getStats(spanInclusionValues);

    // Discovered At
    const discoveredAtValues = validCandidates.map((candidate) => {
      return candidate.discoveredAt ? candidate.discoveredAt : 0;
    });
    const discoveredAtStats = getStats(discoveredAtValues);

    // Nominated At
    const nominatedAtValues = validCandidates.map((candidate) => {
      return candidate.nominatedAt ? candidate.nominatedAt : 0;
    });
    const nominatedAtStats = getStats(nominatedAtValues);

    // Downtime
    const offlineValues = validCandidates.map((candidate) => {
      return candidate.offlineAccumulated ? candidate.offlineAccumulated : 0;
    });
    const offlineStats = getStats(offlineValues);

    // Rank
    const rankValues = validCandidates.map((candidate) => {
      return candidate.rank ? candidate.rank : 0;
    });
    const rankStats = getStats(rankValues);

    // Unclaimed Rewards
    const unclaimedValues = validCandidates.map((candidate) => {
      return candidate.unclaimedEras && candidate.unclaimedEras.length
        ? candidate.unclaimedEras.length
        : 0;
    });
    const unclaimedStats = getStats(unclaimedValues);

    // Location
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

    // ---------------- CITY -----------------------------------
    const cityMap = new Map();
    const cityArr = [];
    for (const candidate of validCandidates) {
      const city =
        candidate.infrastructureLocation &&
        candidate.infrastructureLocation.city
          ? candidate.infrastructureLocation.city
          : "No Location";

      const cityCount = cityMap.get(city);
      if (!cityCount) {
        cityMap.set(city, 1);
      } else {
        cityMap.set(city, cityCount + 1);
      }
    }

    for (const city of cityMap.entries()) {
      const [name, numberOfNodes] = city;
      cityArr.push({ name, numberOfNodes });
    }
    const cityValues = cityArr.map((city) => {
      return city.numberOfNodes;
    });
    const cityStats = getStats(cityValues);

    // ---------------- REGION -----------------------------------
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

    // ---------------- COUNTRY -----------------------------------
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

    // ---------------- ASN -----------------------------------
    const asnMap = new Map();
    const asnArr = [];
    for (const candidate of validCandidates) {
      const asn =
        candidate.infrastructureLocation && candidate.infrastructureLocation.asn
          ? candidate.infrastructureLocation.asn
          : "No Location";

      const asnCount = asnMap.get(asn);
      if (!asnCount) {
        asnMap.set(asn, 1);
      } else {
        asnMap.set(asn, asnCount + 1);
      }
    }

    for (const asn of asnMap.entries()) {
      const [name, numberOfNodes] = asn;
      asnArr.push({ name, numberOfNodes });
    }
    const asnValues = asnArr.map((asn) => {
      return asn.numberOfNodes;
    });
    const asnStats = getStats(asnValues);

    // ---------------- PROVIDER -----------------------------------
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

    // Nominator Stake
    const ownNominators = await db.allNominators();
    const ownNominatorAddresses = ownNominators.map((nom) => {
      return nom.address;
    });
    const nominatorStakeValues = [];
    for (const candidate of validCandidates) {
      const nomStake = await db.getLatestNominatorStake(candidate.stash);
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
    const nominatorStats = getStats(nominatorStakeValues);

    // Delegations
    const delegationValues = [];
    for (const candidate of validCandidates) {
      const delegations = await db.getDelegations(candidate.stash);
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

    // Council Stake
    const councilStakeValues = validCandidates.map((candidate) => {
      return candidate.councilStake ? candidate.councilStake : 0;
    });
    const councilStakeStats = getStats(councilStakeValues);

    // index of the last democracy referendum
    const lastReferendum = (await db.getLastReferenda())[0]?.referendumIndex;

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

    // Create DB entry for Validator Score Metadata
    await db.setValidatorScoreMetadata(
      bondedStats,
      this.BONDED_WEIGHT,
      faultsStats,
      this.FAULTS_WEIGHT,
      inclusionStats,
      this.INCLUSION_WEIGHT,
      spanInclusionStats,
      this.SPAN_INCLUSION_WEIGHT,
      discoveredAtStats,
      this.DISCOVERED_WEIGHT,
      nominatedAtStats,
      this.NOMINATED_WEIGHT,
      offlineStats,
      this.OFFLINE_WEIGHT,
      rankStats,
      this.RANK_WEIGHT,
      unclaimedStats,
      this.UNCLAIMED_WEIGHT,
      locationStats,
      this.LOCATION_WEIGHT,
      councilStakeStats,
      this.COUNCIL_WEIGHT,
      democracyStats,
      this.DEMOCRACY_WEIGHT,
      Date.now()
    );

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
      const scaledBonded =
        scaledDefined(
          candidate.bonded ? candidate.bonded : 0,
          bondedValues,
          0.05,
          0.85
        ) || 0;
      const bondedScore = scaledBonded * this.BONDED_WEIGHT;

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
      const regionScore = (1 - scaledRegion) * this.LOCATION_WEIGHT || 0;

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
      const countryScore = (1 - scaledCountry) * this.LOCATION_WEIGHT || 0;

      const candidateASN = asnArr.filter((asn) => {
        if (
          candidate.infrastructureLocation &&
          candidate.infrastructureLocation.asn == asn.name
        )
          return asn.numberOfNodes;
      })[0]?.numberOfNodes;
      // Scale the value to between the 10th and 95th percentile
      const scaledASN = scaledDefined(candidateASN, asnValues, 0.1, 0.95) || 0;
      const asnScore = (1 - scaledASN) * this.LOCATION_WEIGHT || 0;

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
      const providerScore = (1 - scaledProvider) * this.LOCATION_WEIGHT || 0;

      const nomStake = await db.getLatestNominatorStake(candidate.stash);
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

      const delegations = await db.getDelegations(candidate.stash);
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
      const formattedBonded = candidate.bonded / denom;
      const councilStakeScore =
        candidate.councilStake == 0
          ? 0
          : candidate.councilStake >= 0.75 * formattedBonded
          ? this.COUNCIL_WEIGHT
          : candidate.councilStake >= 0.5 * formattedBonded
          ? 0.75 * this.COUNCIL_WEIGHT
          : candidate.councilStake >= 0.25 * formattedBonded
          ? 0.5 * this.COUNCIL_WEIGHT
          : candidate.councilStake < 0.25 * formattedBonded
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

      logger.info(`${candidate.name} inclusionScore ${inclusionScore}`);
      logger.info(`${candidate.name} spanInclusionScore ${spanInclusionScore}`);
      logger.info(`${candidate.name} faultsScore ${faultsScore}`);
      logger.info(`${candidate.name} discoveredScore ${discoveredScore}`);
      logger.info(`${candidate.name} nominatedScore ${nominatedScore}`);
      logger.info(`${candidate.name} rankScore ${rankScore}`);
      logger.info(`${candidate.name} unclaimedScore ${unclaimedScore}`);
      logger.info(`${candidate.name} bondedScore ${bondedScore}`);
      logger.info(`${candidate.name} locationScore ${locationScore}`);
      logger.info(`${candidate.name} councilStakeScore ${councilStakeScore}`);
      logger.info(
        `${candidate.name} scaledDemocracyScore ${scaledDemocracyScore}`
      );
      logger.info(`${candidate.name} offlineScore ${offlineScore}`);
      logger.info(
        `${candidate.name} nominatorStakeScore ${nominatorStakeScore}`
      );

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
        councilStakeScore +
        scaledDemocracyScore +
        offlineScore +
        nominatorStakeScore;

      const randomness = 1 + Math.random() * 0.15;

      const total = aggregate * randomness || 0;

      logger.info(`aggregate: ${aggregate}`);
      logger.info(`randomness: ${randomness}`);
      logger.info(`total: ${total}`);

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
        asn: asnScore,
        provider: providerScore,
        councilStake: councilStakeScore,
        democracy: scaledDemocracyScore,
        nominatorStake: nominatorStakeScore,
        delegations: delegationScore,
        randomness: randomness,
        updated: Date.now(),
      };

      await db.setValidatorScore(
        candidate.stash,
        score.updated,
        score.total,
        score.aggregate ? score.aggregate : 0,
        score.inclusion,
        score.spanInclusion,
        score.discovered,
        score.nominated,
        score.rank,
        score.unclaimed,
        score.bonded,
        score.faults,
        score.offline,
        score.location,
        score.region,
        score.country,
        score.asn,
        score.provider,
        score.councilStake,
        score.democracy,
        score.nominatorStake,
        score.delegations,
        score.randomness
      );

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

    // Cache the value to return from the server.
    this.validCache = rankedCandidates;

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

    const [activeEraIndex, eraErr] = await this.chaindata.getActiveEraIndex();
    if (eraErr) {
      throw eraErr;
    }

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
      const {
        name,
        offlineSince,
        stash,
        skipSelfStake,
        offlineAccumulated,
        unclaimedEras,
      } = candidate;
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

// Checks the online validity of a node
export const checkOnline = async (db: Db, candidate: any) => {
  if (candidate && Number(candidate.onlineSince) === 0) {
    await db.setOnlineValidity(candidate.stash, false);
    return false;
  } else {
    await db.setOnlineValidity(candidate.stash, true);
    return true;
  }
};

// Check the validate intention for a single validator
export const checkValidateIntention = async (
  config: Config,
  chaindata: ChainData,
  db: Db,
  candidate: any
) => {
  const validators = await chaindata.getValidators();
  if (!validators.includes(Util.formatAddress(candidate?.stash, config))) {
    db.setValidateIntentionValidity(candidate.stash, false);
    return false;
  } else {
    db.setValidateIntentionValidity(candidate.stash, true);
    return true;
  }
};

// checks the validate intention for all validators
export const checkAllValidateIntentions = async (
  config: Config,
  chaindata: ChainData,
  db: Db,
  candidates: any
) => {
  const validators = await chaindata.getValidators();
  for (const candidate of candidates) {
    if (!validators.includes(Util.formatAddress(candidate.stash, config))) {
      db.setValidateIntentionValidity(candidate.stash, false);
    } else {
      db.setValidateIntentionValidity(candidate.stash, true);
    }
  }
};

// checks that the validator is on the latest client version
export const checkLatestClientVersion = async (
  config: Config,
  db: Db,
  candidate: any
) => {
  if (!config.constraints.skipClientUpgrade) {
    const forceLatestRelease = config.constraints.forceClientVersion;
    const latestRelease = await db.getLatestRelease();
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
        db.setLatestClientReleaseValidity(candidate.stash, false);
        return false;
      } else {
        db.setLatestClientReleaseValidity(candidate.stash, true);
        return true;
      }
    } else {
      logger.warn(
        `{latestRelease} Could not set release validity for ${
          candidate.name
        } - version: ${candidate.version} Latest release: ${
          latestRelease.name
        } now: ${Date.now()}`
      );
      return true;
    }
  } else {
    db.setLatestClientReleaseValidity(candidate.stash, true);
    return true;
  }
};

export const checkConnectionTime = async (
  config: Config,
  db: Db,
  candidate: any
) => {
  if (!config.constraints.skipConnectionTime) {
    const now = new Date().getTime();
    if (now - candidate.discoveredAt < Constants.WEEK) {
      db.setConnectionTimeInvalidity(candidate.stash, false);
      return false;
    } else {
      db.setConnectionTimeInvalidity(candidate.stash, true);
      return true;
    }
  } else {
    db.setConnectionTimeInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkIdentity = async (
  chaindata: ChainData,
  db: Db,
  candidate: any
) => {
  const [hasIdentity, verified] = await chaindata.hasIdentity(candidate.stash);
  if (!hasIdentity) {
    const invalidityString = `${candidate.name} does not have an identity set.`;
    db.setIdentityInvalidity(candidate.stash, false, invalidityString);
    return false;
  }
  if (!verified) {
    const invalidityString = `${candidate.name} has an identity but is not verified by the registrar.`;
    db.setIdentityInvalidity(candidate.stash, false, invalidityString);
    return false;
  }
  db.setIdentityInvalidity(candidate.stash, true);
  return true;
};

export const checkOffline = async (db: Db, candidate: any) => {
  const totalOffline = candidate.offlineAccumulated / Constants.WEEK;
  if (totalOffline > 0.02) {
    db.setOfflineAccumulatedInvalidity(candidate.stash, false);
    return false;
  } else {
    db.setOfflineAccumulatedInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkRewardDestination = async (
  db: Db,
  chaindata: ChainData,
  candidate: any
) => {
  const isStaked = await chaindata.destinationIsStaked(candidate.stash);
  if (!isStaked) {
    await db.setRewardDestinationInvalidity(candidate.stash, false);
    return false;
  } else {
    await db.setRewardDestinationInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkCommission = async (
  db: Db,
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
    db.setCommissionInvalidity(candidate.stash, false, invalidityString);
    return false;
  } else {
    db.setCommissionInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkSelfStake = async (
  db: Db,
  chaindata: ChainData,
  targetSelfStake: number,
  candidate: any
) => {
  if (!candidate.skipSelfStake) {
    const [bondedAmt, err2] = await chaindata.getBondedAmount(candidate.stash);
    let invalidityString;
    if (err2) {
      invalidityString = `${candidate.name} ${err2}`;
      await db.setSelfStakeInvalidity(candidate.stash, false, invalidityString);
      return false;
    }

    if (bondedAmt < targetSelfStake) {
      invalidityString = `${candidate.name} has less than the minimum amount bonded: ${bondedAmt} is bonded.`;
      await db.setSelfStakeInvalidity(candidate.stash, false, invalidityString);
      return false;
    }
  }
  await db.setSelfStakeInvalidity(candidate.stash, true);
  return true;
};

export const checkUnclaimed = async (
  db: Db,
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
    await db.setUnclaimedInvalidity(candidate.stash, false, invalidityString);
    return false;
  } else {
    await db.setUnclaimedInvalidity(candidate.stash, true);
    return true;
  }
};

// Checks if the validator blocks external nominations
export const checkBlocked = async (
  db: Db,
  chaindata: ChainData,
  candidate: any
) => {
  const isBlocked = await chaindata.getBlocked(candidate.stash);
  if (isBlocked) {
    const invalidityString = `${candidate.name} blocks external nominations`;
    await db.setBlockedInvalidity(candidate.stash, false, invalidityString);
    return false;
  } else {
    await db.setBlockedInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkKusamaRank = async (db: Db, candidate: any) => {
  try {
    if (!!candidate.kusamaStash) {
      const url = `${Constants.KOTVBackendEndpoint}/candidate/${candidate.kusamaStash}`;

      const res = await axios.get(url);

      if (!!res.data.invalidityReasons) {
        const invalidityReason = `${candidate.name} has a kusama node that is invalid: ${res.data.invalidityReasons}`;
        await db.setKusamaRankInvalidity(
          candidate.stash,
          false,
          invalidityReason
        );
        return false;
      }

      if (Number(res.data.rank) < 25) {
        const invalidityReason = `${candidate.name} has a Kusama stash with lower than 25 rank in the Kusama OTV programme: ${res.data.rank}.`;
        await db.setKusamaRankInvalidity(
          candidate.stash,
          false,
          invalidityReason
        );
        return false;
      }
    }
    await db.setKusamaRankInvalidity(candidate.stash, true);
    return true;
  } catch (e) {
    logger.info(`Error trying to get kusama data...`);
  }
};
