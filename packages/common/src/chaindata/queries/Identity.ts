import Chaindata, { chaindataLabel } from "../chaindata";
import logger from "../../logger";
import { Identity } from "../../types";

export const hasIdentity = async (
  chaindata: Chaindata,
  account: string,
): Promise<[boolean, boolean]> => {
  try {
    await chaindata.checkApiConnection();
    let identity = await chaindata.api.query.identity.identityOf(account);
    if (!identity.isSome) {
      // check if it's a sub
      const superOf = await chaindata.api.query.identity.superOf(account);
      if (superOf.isSome) {
        identity = await chaindata.api.query.identity.identityOf(
          superOf.unwrap()[0],
        );
      }
    }
    let verified = false;
    if (identity.isSome) {
      const { judgements } = identity.unwrap();
      for (const judgement of judgements) {
        const status = judgement[1];
        verified = status.isReasonable || status.isKnownGood;
        if (verified) break;
      }
    }

    return [identity.isSome, verified];
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
    const identitiy = await chaindata.api.query.identity.identityOf(account);
    if (!identitiy.isSome) {
      const superOf = await chaindata.api.query.identity.superOf(account);
      if (superOf.isSome) {
        const id = await chaindata.api.query.identity.identityOf(
          superOf.unwrap()[0],
        );
        if (id.isNone) {
          return null;
        }
        return id.unwrap().info.toString();
      }
    }
    if (identitiy.isSome) {
      return identitiy.unwrap().info.toString();
    }

    return null;
  } catch (e) {
    logger.error(`Error getting identity: ${e}`, chaindataLabel);
  }
};

export const getFormattedIdentity = async (
  chaindata: Chaindata,
  addr: string,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    let identity: Identity, verified, sub;

    let superAccount;
    const subAccounts: { name: string; address: string }[] = [];
    const hasId = await chaindata.api.derive.accounts.hasIdentity(addr);

    // The address is a sub identity
    if (hasId.hasIdentity && hasId.parentId) {
      const parentAddress = hasId.parentId;
      // the address is a subidentity, query the superIdentity
      const superIdentity =
        await chaindata.api.derive.accounts.identity(parentAddress);
      superAccount = {
        name: superIdentity.display,
        address: parentAddress,
      };
      const {
        display,
        displayParent,
        email,
        image,
        judgements,
        legal,
        other,
        parent,
        pgp,
        riot,
        twitter,
        web,
      } = superIdentity;
      const subs = await chaindata.api.query.identity.subsOf(parentAddress);

      // Iterate through all the sub accounts
      for (const subaccountAddress of subs[1]) {
        const identityQuery =
          await chaindata.api.derive.accounts.identity(subaccountAddress);
        const subAccount: { name: string; address: string } = {
          name: identityQuery.display,
          address: subaccountAddress.toString(),
        };
        subAccounts.push(subAccount);
      }

      const judgementKinds = [];
      for (const judgement of judgements) {
        const status = judgement[1];
        if (status.isReasonable || status.isKnownGood) {
          judgementKinds.push(status.toString());
          verified = status.isReasonable || status.isKnownGood;
          continue;
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
      return identity;
    } else if (hasId.hasIdentity) {
      const ident = await chaindata.api.derive.accounts.identity(addr);
      const {
        display,
        displayParent,
        email,
        image,
        judgements,
        legal,
        other,
        parent,
        pgp,
        riot,
        twitter,
        web,
      } = ident;

      const judgementKinds = [];
      for (const judgement of judgements) {
        const status = judgement[1];
        if (status.isReasonable || status.isKnownGood) {
          judgementKinds.push(status.toString());
          verified = status.isReasonable || status.isKnownGood;
          continue;
        }
      }

      // Check to see if the address is a super-identity and has sub-identities
      const subidentities = await chaindata.api.query.identity.subsOf(addr);
      if (subidentities[1].length > 0) {
        // This account has sub-identities
        for (const subaccountAddress of subidentities[1]) {
          const identityQuery =
            await chaindata.api.derive.accounts.identity(subaccountAddress);
          const subAccount: { name: string; address: string } = {
            name: identityQuery.display,
            address: subaccountAddress.toString(),
          };
          subAccounts.push(subAccount);
        }
      }

      identity = {
        name: display,
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
      return identity;
    }
  } catch (e) {
    logger.error(`Error getting identity: ${e}`, chaindataLabel);
  }
};
