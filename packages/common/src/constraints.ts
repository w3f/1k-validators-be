import axios from "axios";
import semver from "semver";
import { getStats, scaled, scaledDefined, scoreDemocracyVotes } from "./score";
import {
  ChainData,
  Config,
  Constants,
  logger,
  Types,
  Util,
  queries,
} from "./index";
import ApiHandler from "./ApiHandler";
import {
  allCandidates,
  getLastOpenGovReferenda,
  getLastReferenda,
  getLatestRelease,
  getLatestValidatorScoreMetadata,
  setBlockedInvalidity,
  setCommissionInvalidity,
  setConnectionTimeInvalidity,
  setIdentityInvalidity,
  setKusamaRankInvalidity,
  setLatestClientReleaseValidity,
  setOnlineValidity,
  setProviderInvalidity,
  setRewardDestinationInvalidity,
  setSelfStakeInvalidity,
  setUnclaimedInvalidity,
  setValidateIntentionValidity,
  validCandidates,
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
import { percentage, timeRemaining } from "./util";

export interface Constraints {
  processCandidates(
    candidates: Set<Types.CandidateData>
  ): Promise<[Set<any>, Set<any>]>;
}

export const constraintsLabel = { label: "Constraints" };

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
  private OPENGOV_WEIGHT = 100;

  constructor(handler: ApiHandler, config: Config.ConfigSchema) {
    this.chaindata = new ChainData(handler);
    this.config = config;

    // Constraints
    this.skipConnectionTime =
      this.config?.constraints?.skipConnectionTime || false;
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
    this.OPENGOV_WEIGHT = Number(this.config.score.openGov);
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

  // Checks the validity of all candidates
  async checkAllCandidates() {
    const candidates = await allCandidates();
    logger.info(`checking ${candidates.length} candidates`, constraintsLabel);
    for (const [index, candidate] of candidates.entries()) {
      const start = Date.now();

      const isValid = await this.checkCandidate(candidate);
      const end = Date.now();
      const time = `(${end - start}ms)`;
      const remaining = timeRemaining(
        index + 1,
        candidates.length,
        end - start
      );
      logger.info(
        `checked ${candidate.name}: ${isValid} [${index + 1}/${
          candidates.length
        }] ${percentage(index + 1, candidates.length)} ${time} ${remaining}`,
        constraintsLabel
      );
    }
  }

  // Check the candidate and set any invalidity fields
  async checkCandidate(candidate: Types.CandidateData): Promise<boolean> {
    let valid = false;

    const onlineValid = await checkOnline(candidate);
    if (!onlineValid) {
      logger.warn(`${candidate.name} online not valid`, constraintsLabel);
    }

    const validateValid = await checkValidateIntention(
      this.config,
      this.chaindata,
      candidate
    );
    if (!validateValid) {
      logger.warn(
        `${candidate.name} validate intention not valid`,
        constraintsLabel
      );
    }

    const versionValid = await checkLatestClientVersion(this.config, candidate);
    if (!versionValid) {
      logger.warn(`${candidate.name} version not valid`, constraintsLabel);
    }

    const monitoringWeekValid = await checkConnectionTime(
      this.config,
      candidate
    );
    if (!monitoringWeekValid) {
      logger.warn(
        `${candidate.name} monitoring week not valid`,
        constraintsLabel
      );
    }

    const identityValid = await checkIdentity(this.chaindata, candidate);
    if (!identityValid) {
      logger.warn(`${candidate.name} identity not valid`, constraintsLabel);
    }

    const offlineValid = await checkOffline(candidate);
    if (!offlineValid) {
      logger.warn(`${candidate.name} offline not valid`, constraintsLabel);
    }

    let rewardDestinationValid = true;
    if (!this.skipStakedDesitnation) {
      rewardDestinationValid =
        (await checkRewardDestination(this.chaindata, candidate)) || false;
      if (!rewardDestinationValid) {
        logger.warn(
          `${candidate.name} reward destination not valid`,
          constraintsLabel
        );
      }
    }

    const commissionValid =
      (await checkCommission(this.chaindata, this.commission, candidate)) ||
      false;
    if (!commissionValid) {
      logger.warn(`${candidate.name} commission not valid`, constraintsLabel);
    }

    const selfStakeValid =
      (await checkSelfStake(this.chaindata, this.minSelfStake, candidate)) ||
      false;
    if (!selfStakeValid) {
      logger.warn(`${candidate.name} self stake not valid`, constraintsLabel);
    }

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
    if (!blockedValid) {
      logger.warn(`${candidate.name} blocked not valid`, constraintsLabel);
    }

    let kusamaValid = true;
    try {
      if (!!candidate.kusamaStash) {
        kusamaValid = (await checkKusamaRank(candidate)) || false;
      }
    } catch (e) {
      logger.info(`Error trying to get kusama data...`);
    }
    if (!kusamaValid) {
      logger.warn(`${candidate.name} kusama not valid`, constraintsLabel);
    }

    const providerValid =
      (await checkProvider(this.config, candidate)) || false;
    if (!providerValid) {
      logger.warn(`${candidate.name} provider not valid`, constraintsLabel);
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
      kusamaValid &&
      providerValid;

    await setValid(candidate.stash, valid);

    if (valid) {
      this.addToValidCache(candidate.stash, candidate);
      await setLastValid(candidate.stash);
    } else {
      this.addToInvalidCache(candidate.stash, candidate);
    }

    return valid;
  }

  async scoreAllCandidates() {
    const candidates = await validCandidates();
    logger.info(
      `scoring ${candidates.length} valid candidates..`,
      constraintsLabel
    );
    await this.scoreCandidates(candidates);
  }

  // Set the score metadata: the ranges of values for valid candidates + statistics on values
  async setScoreMetadata() {
    const session = await this.chaindata.getSession();
    const candidates = await validCandidates();

    // Get Ranges of Parameters
    //    A validators individual parameter is then scaled to how it compares to others that are also deemed valid

    // Get Values and Stats
    const { bondedStats } = getBondedValues(candidates);
    const { faultsStats } = getFaultsValues(candidates);
    const { inclusionStats } = getInclusionValues(candidates);
    const { spanInclusionStats } = getSpanInclusionValues(candidates);
    const { discoveredAtStats } = getDiscoveredAtValues(candidates);
    const { nominatedAtStats } = getNominatedAtValues(candidates);
    const { offlineStats } = getOfflineValues(candidates);
    const { rankStats } = getRankValues(candidates);
    const { locationArr, locationStats } = getLocationValues(candidates);
    const { regionArr, regionStats } = getRegionValues(candidates);
    const { countryArr, countryStats } = getCountryValues(candidates);
    const { providerArr, providerStats } = getProviderValues(candidates);
    const { ownNominatorAddresses, nominatorStakeStats } =
      await getNominatorStakeValues(candidates);
    const { delegationStats } = await getDelegationValues(candidates);
    const { councilStakeStats } = getCouncilStakeValues(candidates);
    const { lastReferendum, democracyStats } = await getDemocracyValues(
      candidates
    );
    const { openGovStats } = await getOpenGovValues(candidates);

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
      nominatorStakeStats: nominatorStakeStats,
      nominatorStakeWeight: this.NOMINATIONS_WEIGHT,
      delegationStats: delegationStats,
      delegationWeight: this.DELEGATIONS_WEIGHT,
      councilStakeStats: councilStakeStats,
      councilStakeWeight: this.COUNCIL_WEIGHT,
      democracyStats: democracyStats,
      democracyWeight: this.DEMOCRACY_WEIGHT,
      openGovStats: openGovStats,
      openGovWeight: this.OPENGOV_WEIGHT,
    };

    // Create  entry for Validator Score Metadata
    await setValidatorScoreMetadata(scoreMetadata, Date.now());

    logger.info(`validator score metadata set.`, {
      label: "Constraints",
    });
  }

  async scoreCandidate(candidate: Types.CandidateData, scoreMetadata: any) {
    const {
      session,
      bondedStats,
      faultsStats,
      inclusionStats,
      spanInclusionStats,
      nominatedAtStats,
      offlineStats,
      discoveredAtStats,
      rankStats,
      locationStats,
      regionStats,
      countryStats,
      providerStats,
      councilStakeStats,
      democracyStats,
      nominatorStakeStats,
      delegationStats,
      openGovStats,
    } = scoreMetadata;

    // Scale inclusion between the 20th and 75th percentiles
    const scaledInclusion =
      scaledDefined(candidate.inclusion, inclusionStats.values, 0.2, 0.75) || 0;
    const inclusionScore = (1 - scaledInclusion) * this.INCLUSION_WEIGHT;

    // Scale inclusion between the 20th and 75h percentiles
    const scaledSpanInclusion =
      scaledDefined(
        candidate.spanInclusion,
        spanInclusionStats.values,
        0.2,
        0.75
      ) || 0;
    const spanInclusionScore =
      (1 - scaledSpanInclusion) * this.SPAN_INCLUSION_WEIGHT;

    const scaledDiscovered =
      scaled(candidate.discoveredAt, discoveredAtStats.values) || 0;
    const discoveredScore = (1 - scaledDiscovered) * this.DISCOVERED_WEIGHT;

    const scaledNominated =
      scaled(candidate.nominatedAt, nominatedAtStats.values) || 0;
    const nominatedScore = (1 - scaledNominated) * this.NOMINATED_WEIGHT;

    const scaledRank = scaled(candidate.rank, rankStats.values) || 0;
    const rankScore = scaledRank * this.RANK_WEIGHT;

    // Subtract the UNCLAIMED WEIGHT for each unclaimed era
    const unclaimedScore = candidate.unclaimedEras
      ? -1 * candidate.unclaimedEras.length * this.UNCLAIMED_WEIGHT
      : 0;

    // Scale bonding based on the 5th and 85th percentile
    const scaleBonded =
      scaledDefined(
        candidate.bonded ? candidate.bonded : 0,
        bondedStats.values,
        0.05,
        0.85
      ) || 0;
    const bondedScore = scaleBonded * this.BONDED_WEIGHT;

    const scaledOffline =
      scaled(candidate.offlineAccumulated, offlineStats.values) || 0;
    const offlineScore = (1 - scaledOffline) * this.OFFLINE_WEIGHT;

    const scaledFaults = scaled(candidate.faults, faultsStats.values) || 0;
    const faultsScore = (1 - scaledFaults) * this.FAULTS_WEIGHT;

    const provider = candidate?.infrastructureLocation?.provider;
    const bannedProviders = this.config.telemetry?.blacklistedProviders;
    let bannedProvider = false;
    if (provider && bannedProviders?.includes(provider)) {
      bannedProvider = true;
    }
    // Get the total number of nodes for the location a candidate has their node in
    const candidateLocation = locationStats.values.filter((location) => {
      if (candidate.location == location.name) return location.numberOfNodes;
    })[0]?.numberOfNodes;
    const locationValues = locationStats.values.map((location) => {
      return location.numberOfNodes;
    });
    // Scale the location value to between the 10th and 95th percentile
    const scaledLocation =
      scaledDefined(candidateLocation, locationValues, 0.1, 0.95) || 0;
    const locationScore = bannedProvider
      ? 0
      : (1 - scaledLocation) * this.LOCATION_WEIGHT || 0;

    const candidateRegion = regionStats.values.filter((region) => {
      if (
        candidate.infrastructureLocation &&
        candidate.infrastructureLocation.region == region.name
      )
        return region.numberOfNodes;
    })[0]?.numberOfNodes;
    const regionValues = regionStats.values.map((location) => {
      return location.numberOfNodes;
    });
    // Scale the value to between the 10th and 95th percentile
    const scaledRegion =
      scaledDefined(candidateRegion, regionValues, 0.1, 0.95) || 0;
    const regionScore = bannedProvider
      ? 0
      : (1 - scaledRegion) * this.REGION_WEIGHT || 0;

    const candidateCountry = countryStats.values.filter((country) => {
      if (
        candidate.infrastructureLocation &&
        candidate.infrastructureLocation.country == country.name
      )
        return country.numberOfNodes;
    })[0]?.numberOfNodes;
    const countryValues = countryStats.values.map((location) => {
      return location.numberOfNodes;
    });
    // Scale the value to between the 10th and 95th percentile
    const scaledCountry =
      scaledDefined(candidateCountry, countryValues, 0.1, 0.95) || 0;
    const countryScore = bannedProvider
      ? 0
      : (1 - scaledCountry) * this.COUNTRY_WEIGHT || 0;

    const candidateProvider = providerStats.values.filter((provider) => {
      if (
        candidate.infrastructureLocation &&
        candidate.infrastructureLocation.provider == provider.name
      )
        return provider.numberOfNodes;
    })[0]?.numberOfNodes;
    const providerValues = providerStats.values.map((location) => {
      return location.numberOfNodes;
    });
    // Scale the value to between the 10th and 95th percentile
    const scaledProvider =
      scaledDefined(candidateProvider, providerValues, 0.1, 0.95) || 0;
    const providerScore = bannedProvider
      ? 0
      : (1 - scaledProvider) * this.PROVIDER_WEIGHT || 0;

    const nomStake = await getLatestNominatorStake(candidate.stash);
    let totalNominatorStake = 0;
    if (
      nomStake != undefined &&
      nomStake?.activeNominators &&
      nomStake?.inactiveNominators
    ) {
      const { activeNominators, inactiveNominators } = nomStake;
      const ownNominatorAddresses = (await allNominators()).map((nom) => {
        return nom?.address;
      });

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
      scaledDefined(
        totalNominatorStake,
        nominatorStakeStats.values,
        0.1,
        0.95
      ) || 0;
    const nominatorStakeScore = scaledNominatorStake * this.NOMINATIONS_WEIGHT;

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
      scaledDefined(totalDelegations, delegationStats.values, 0.1, 0.95) || 0;
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

    const lastReferendum = (await getLastReferenda())[0]?.referendumIndex;
    // Score democracy based on how many proposals have been voted on
    const candidateVotes = candidate?.democracyVotes
      ? candidate.democracyVotes
      : [];
    const {
      baseDemocracyScore,
      totalDemocracyScore,
      totalConsistencyMultiplier,
      lastConsistencyMultiplier,
    } = scoreDemocracyVotes(candidateVotes, lastReferendum);
    const democracyValues = democracyStats.values;
    const scaledDemocracyScore =
      scaled(totalDemocracyScore, democracyStats.values) *
      this.DEMOCRACY_WEIGHT;

    const lastOpenGovReferendum = (await getLastOpenGovReferenda())[0]?.index;
    // Score democracy based on how many proposals have been voted on
    const candidateConvictionVotes = candidate?.convictionVotes
      ? candidate.convictionVotes
      : [];
    const { totalDemocracyScore: totalOpenGovScore } = scoreDemocracyVotes(
      candidateConvictionVotes,
      lastOpenGovReferendum
    );
    const openGovValues = openGovStats.values;
    const scaledOpenGovScore =
      scaled(totalOpenGovScore, openGovValues) * this.OPENGOV_WEIGHT;

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
      nominatorStakeScore +
      scaledOpenGovScore;

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
      openGov: scaledOpenGovScore,
      randomness: randomness,
      updated: Date.now(),
    };

    try {
      await setValidatorScore(candidate.stash, session, score);
    } catch (e) {
      logger.info(`Can't set validator score....`);
      logger.info(JSON.stringify(e));
    }
  }

  async scoreCandidates(candidates: Types.CandidateData[]) {
    await this.setScoreMetadata();
    const scoreMetadata = await getLatestValidatorScoreMetadata();

    for (const [index, candidate] of candidates.entries()) {
      const start = Date.now();

      await this.scoreCandidate(candidate, scoreMetadata);

      const end = Date.now();
      const time = `(${end - start}ms)`;
      const remaining = timeRemaining(
        index + 1,
        candidates.length,
        end - start
      );

      logger.info(
        `scored ${candidate.name}: [${index + 1} / ${
          candidates.length
        }] ${percentage(index + 1, candidates.length)} ${time} ${remaining}`,
        {
          label: "Constraints",
        }
      );
    }
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
    logger.info(`Processing ${candidates.size} candidates`, constraintsLabel);

    const good: Set<Types.CandidateData> = new Set();
    const bad: Set<{ candidate: Types.CandidateData; reason: string }> =
      new Set();

    for (const candidate of candidates) {
      if (!candidate) {
        logger.warn(
          `candidate is null. Skipping processing..`,
          constraintsLabel
        );
        continue;
      }
      const { name, stash, skipSelfStake, offlineAccumulated } = candidate;
      /// Ensure the commission wasn't raised/
      const [commission, err] = await this.chaindata.getCommission(stash);
      /// If it errors we assume that a validator removed their validator status.
      if (err) {
        const reason = `${name} ${err}`;
        logger.warn(reason, constraintsLabel);
        bad.add({ candidate, reason });
        continue;
      }

      if (commission > this.commission) {
        const reason = `${name} found commission higher than ten percent: ${commission}`;
        logger.warn(reason, constraintsLabel);
        bad.add({ candidate, reason });
        continue;
      }

      if (!skipSelfStake) {
        const [bondedAmt, err2] = await this.chaindata.getBondedAmount(stash);
        if (err2) {
          const reason = `${name} ${err2}`;
          logger.warn(reason, constraintsLabel);
          bad.add({ candidate, reason });
          continue;
        }
        if (bondedAmt < this.minSelfStake) {
          const reason = `${name} has less than the minimum required amount bonded: ${bondedAmt}`;
          logger.warn(reason, constraintsLabel);
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
  locationStats.values = locationArr;
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
  regionStats.values = regionArr;
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
  countryStats.values = countryArr;
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
  providerStats.values = providerArr;
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
  for (const [index, candidate] of validCandidates.entries()) {
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
        logger.warn(
          `Can't find nominator stake values for ${candidate.name}`,
          constraintsLabel
        );
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
    const democracyVotes = candidate.democracyVotes
      ? candidate.democracyVotes
      : [];
    const {
      baseDemocracyScore,
      totalDemocracyScore,
      totalConsistencyMultiplier,
      lastConsistencyMultiplier,
    } = scoreDemocracyVotes(democracyVotes, lastReferendum);
    return totalDemocracyScore || 0;
  });
  const democracyStats = getStats(democracyValues);
  return { lastReferendum, democracyValues, democracyStats };
};

export const getOpenGovValues = async (
  validCandidates: Types.CandidateData[]
) => {
  const lastReferendum = (await getLastOpenGovReferenda())[0]?.index;

  const openGovValues = validCandidates.map((candidate) => {
    const openGovVotes = candidate.convictionVotes
      ? candidate.convictionVotes
      : [];
    const {
      baseDemocracyScore,
      totalDemocracyScore,
      totalConsistencyMultiplier,
      lastConsistencyMultiplier,
    } = scoreDemocracyVotes(openGovVotes, lastReferendum);
    return totalDemocracyScore || 0;
  });
  const openGovStats = getStats(openGovValues);
  return { lastReferendum, openGovValues, openGovStats };
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
    await setValidateIntentionValidity(candidate.stash, false);
    return false;
  } else {
    await setValidateIntentionValidity(candidate.stash, true);
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
      await setValidateIntentionValidity(candidate.stash, false);
    } else {
      await setValidateIntentionValidity(candidate.stash, true);
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
        await setLatestClientReleaseValidity(candidate.stash, false);
        return false;
      } else {
        await setLatestClientReleaseValidity(candidate.stash, true);
        return true;
      }
    } else {
      return false;
    }
  } else {
    await setLatestClientReleaseValidity(candidate.stash, true);
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
      await setConnectionTimeInvalidity(candidate.stash, false);
      return false;
    } else {
      await setConnectionTimeInvalidity(candidate.stash, true);
      return true;
    }
  } else {
    await setConnectionTimeInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkIdentity = async (chaindata: ChainData, candidate: any) => {
  const [hasIdentity, verified] = await chaindata.hasIdentity(candidate.stash);
  if (!hasIdentity) {
    const invalidityString = `${candidate.name} does not have an identity set.`;
    await setIdentityInvalidity(candidate.stash, false, invalidityString);
    return false;
  }
  if (!verified) {
    const invalidityString = `${candidate.name} has an identity but is not verified by the registrar.`;
    await setIdentityInvalidity(candidate.stash, false, invalidityString);
    return false;
  }
  await setIdentityInvalidity(candidate.stash, true);
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
    if (parseInt(bondedAmt.toString()) < targetSelfStake) {
      invalidityString = `${
        candidate.name
      } has less than the minimum amount bonded: ${parseInt(
        bondedAmt.toString()
      )} is bonded.`;
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

// Checks if the candidate has a banned infrastructure provider
export const checkProvider = async (
  config: Config.ConfigSchema,
  candidate: any
) => {
  const location = await queries.getCandidateLocation(candidate.name);
  if (location && location.provider) {
    const bannedProviders = config.telemetry?.blacklistedProviders;
    if (bannedProviders?.includes(location.provider)) {
      logger.info(
        `${candidate.name} has banned provider: ${location.provider}`,
        {
          label: "Constraints",
        }
      );
      await setProviderInvalidity(candidate.stash, false);
      return false;
    } else {
      await setProviderInvalidity(candidate.stash, true);
      return true;
    }
  } else {
    await setProviderInvalidity(candidate.stash, true);
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
    logger.warn(`Error trying to get kusama data...`);
  }
};
