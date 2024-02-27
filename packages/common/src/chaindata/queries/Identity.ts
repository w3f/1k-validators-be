import Chaindata, { chaindataLabel } from "../chaindata";
import logger from "../../logger";
import { Identity } from "../../types";

export const hasIdentity = async (
  chaindata: Chaindata,
  account: string,
): Promise<[boolean, boolean]> => {
  try {
    await chaindata.checkApiConnection();
    let identity = await chaindata.api?.query.identity.identityOf(account);
    if (!identity || !identity.isSome) {
      // check if it's a sub
      const superOf = await chaindata.api?.query.identity.superOf(account);
      if (superOf && superOf.isSome) {
        identity = await chaindata.api?.query.identity.identityOf(
          superOf.unwrap()[0],
        );
      }
    }
    let verified = false;
    if (identity && identity.isSome) {
      const { judgements } = identity.unwrap();
      for (const judgement of judgements) {
        const status = judgement[1];
        verified = status.isReasonable || status.isKnownGood;
        if (verified) break;
      }
    }

    return [identity ? identity.isSome : false, verified];
  } catch (e) {
    logger.error(`Error getting identity: ${e}`, chaindataLabel);
    return [false, true];
  }
};

export const getIdentity = async (
  chaindata: Chaindata,
  account: string,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const identity = await chaindata.api?.query.identity.identityOf(account);
    if (identity && !identity.isSome) {
      const superOf = await chaindata.api?.query.identity.superOf(account);
      if (superOf && superOf.isSome) {
        const id = await chaindata.api?.query.identity.identityOf(
          superOf.unwrap()[0],
        );
        if (id && id.isNone) {
          return null;
        }
        return id && id.unwrap().info.toString()
          ? id.unwrap().info.toString()
          : null;
      }
    }
    if (identity && identity.isSome) {
      return identity.unwrap().info.toString();
    }

    return null;
  } catch (e) {
    logger.error(`Error getting identity: ${e}`, chaindataLabel);
  }
};

export const getFormattedIdentity = async (
  chaindata: Chaindata,
  addr: string,
): Promise<Identity | null> => {
  try {
    await chaindata.checkApiConnection();
    let identity: Identity | null = null;
    let verified = false;
    const subAccounts: { name: string; address: string }[] = [];

    const hasId = await chaindata.api?.derive.accounts.hasIdentity(addr);
    if (!hasId || !hasId.hasIdentity) return null;

    const identityInfo = await chaindata.api?.derive.accounts.identity(addr);
    if (!identityInfo) return null;

    const {
      display,
      email,
      image,
      judgements,
      legal,
      pgp,
      riot,
      twitter,
      web,
      parent,
      displayParent,
    } = identityInfo;

    const judgementKinds = [];
    for (const judgement of judgements) {
      const status = judgement[1];
      if (status.isReasonable || status.isKnownGood) {
        judgementKinds.push(status.toString());
        verified = status.isReasonable || status.isKnownGood;
      }
    }

    if (parent) {
      const superIdentity =
        await chaindata.api?.derive.accounts.identity(parent);
      if (superIdentity) {
        const superAccount: { name: string; address: string } = {
          name: superIdentity.display || "",
          address: parent.toString(),
        };
        const subIdentities =
          await chaindata.api?.query.identity.subsOf(parent);
        if (subIdentities && subIdentities[1].length > 0) {
          for (const subaccountAddress of subIdentities[1]) {
            const subAccountIdentity =
              await chaindata.api?.derive.accounts.identity(
                subaccountAddress.toString(),
              );
            if (subAccountIdentity) {
              const subAccount: { name: string; address: string } = {
                name: subAccountIdentity.display || "",
                address: subaccountAddress.toString(),
              };
              subAccounts.push(subAccount);
            }
          }
        }

        identity = {
          address: superAccount.address,
          name: superAccount.name,
          subIdentities: subAccounts,
          display,
          email,
          image,
          verified,
          judgements: judgementKinds,
          legal,
          pgp,
          riot,
          twitter,
          web,
        };
      }
    } else {
      identity = {
        name: display || "",
        address: addr,
        verified,
        subIdentities: subAccounts,
        display,
        email,
        image,
        judgements: judgementKinds,
        legal,
        pgp,
        riot,
        twitter,
        web,
      };
    }

    return identity;
  } catch (e) {
    logger.error(`Error getting identity: ${e}`, chaindataLabel);
    return null;
  }
};
