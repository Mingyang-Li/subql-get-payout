import { Account } from '../types/models/Account';
import { SubstrateEvent, SubstrateExtrinsic } from "@subql/types";
import { sha256 } from 'js-sha256';
import { Era } from "../types/models/Era";
import { NominatorValidator } from '../types/models/NominatorValidator';
import { ValidatorPayout } from "../types/models/ValidatorPayout";
import { PayoutDetail } from "../types/models/PayoutDetail";

// first get session index
// check if session is start of a new era using session index obtained
// if it's a start of a new era, add Era into DB
// After adding Era, check it's validators
// for each validator, extract its exposure (htat has its nominators and rewards). 

export async function handleSession(event:SubstrateEvent): Promise<void> {
    // we can extract session index from the event passed in, which is already filtered by yaml file by "session" as module and "NewSession" as the method
    // This helps us confirm that we only deal with new sessions
    const { event: { data: [sessionIndex] } } = event;

    // Unlike the official api (which queries the latest data), subql api only queries the data for the given event within the context its located
    const currentEra = await api.query.staking.currentEra();
    const currentBlock =  event.block.block.header.number.toBigInt();
    const currentEraNum = currentEra.unwrap().toNumber();
    // check it era is obtained. If not, era doesn't exists in db

    // logger.debug(`---------------🌎 Session Index: ${JSON.stringify(sessionIndex)}`);
    // logger.debug(`---------------⏰ currentEra: ${JSON.stringify(currentEra)}\n`)
    if(currentEra.isNone) return;

    // check if era is in DB is in DB before saving
    const currEraInDb = await Era.get(currentEraNum.toString());
    if (currEraInDb) {
        return
    }

    // create new era (when not found in db)
    if (!currEraInDb){
        // logger.debug(`---------------❌ Era ${currentEraNum.toString()} not in DB, need to add to DB`);
        const newEra = new Era(currentEraNum.toString());
        newEra.startBlock = currentBlock;
        await newEra.save();

        // update endblock of the previous era
        const previousEraIndex =  currentEraNum-1;
        const previousEra = await Era.get(previousEraIndex.toString());
        if(previousEra){
            previousEra.endBlock = currentBlock - BigInt(1);
            await previousEra.save();
        }
    }
    
    // Use subql's polkadotjs api to query all validators of the current era
    const validators = await api.query.session.validators();
    for (let i=0; i<validators.length; i++){
        const validator = validators[i];
        const validatorId = validator.toString();
        // logger.debug(`---------------🚀 Validator: ${validatorId} at Era: ${currentEraNum}`);
        const validatorExposure =  await api.query.staking.erasStakers(currentEraNum, validatorId);
        const { total, own, others } = validatorExposure;

        for (const nominator of others) {
            // setup nominator account id
            const nominatorId = nominator.who.toString();

            // check if nominator account is saved to DB
            const nomAccountInDb = await Account.get(nominatorId);
            // If nominator account is not in DB, do create an account
            if (!nomAccountInDb) {
                // logger.debug(`---------------❌ Nominator Account ${nominatorId} not in DB, need to create new Account`);
                const nomAccount = new Account(nominatorId);
                await nomAccount.save();
                const nomAccountSaved = await Account.get(nominatorId);
                if (nomAccountSaved) {
                    // logger.debug(`---------------✔️ Account ${nominatorId} saved`);
                }
            }

            // check if validator account is in DB
            const valAccountInDb = await Account.get(validatorId);
            // If validator account is not in DB, do create an account
            if (!valAccountInDb) {
                // logger.debug(`---------------❌ Validator Account ${validatorId} not in DB, need to create new Account`);
                const valAccount = new Account(validatorId);
                await valAccount.save();
                const valAccountInDb = await Account.get(validatorId);
                if (valAccountInDb) {
                    // logger.debug(`---------------✔️ Account ${validatorId} saved`);
                }
            }

            // To create NominatorValidator, first we need to create a compisite ID based off its 3 attributes
            const nominatorValidatorId: string = sha256(`${currentEraNum}${nominatorId}${validatorId}`);

            // Now, check if NominatorValidator is in DB
            const nominatorValidatorInDb = await NominatorValidator.get(nominatorValidatorId);
            // if nominatorValidator not in DB, create NominatorValidator
            if (!nominatorValidatorInDb) {
                // logger.debug(`---------------❌ NominatorValidator ${nominatorValidatorId} not in DB, need to create new NominatorValidator`)
                const currNominatorValidator = new NominatorValidator(nominatorValidatorId);
                currNominatorValidator.eraId = currentEraNum.toString();
                currNominatorValidator.nominatorId = nominatorId;
                currNominatorValidator.validatorId = validatorId;
                await currNominatorValidator.save();
                // logger.debug(`--------------✔️ NominatorValidator ${nominatorValidatorId} saved to DB`);
            }
        }

        // 1. need to get validator's payout amount for each erA. when calucation, must use prev validator exposure
        // 2. Need to get prev validator's nominator ID for each iteration to make PayoutDetail

        // Populate ValidatorPayout
        // first, we need to realise that we are supposed to populate the previous era
        const prevEra = currentEraNum - 1;
        const validatorPayoutId = sha256(`${prevEra.toString()}${validatorId}`);
        const totalRewards = await api.query.staking.erasRewardPoints(prevEra);
        
        // get total reward points
        const totalRewardPoints = parseInt(totalRewards.total.toString());

        // get the $$$ amount staked
        const rewardAmount = await api.query.staking.erasValidatorReward(prevEra);
        const totalRewardAmount = Number(rewardAmount.toString());

        logger.info(`totalRewards.individual: ${totalRewards.individual.toString()}`);

        // Check if currValidatorPayout in DB
        const currValidatorPayoutinDb = await ValidatorPayout.get(validatorPayoutId);
        // If validatorPayout not in DB, create a a list of new records for all nominators for each validator
        if (!currValidatorPayoutinDb) {
            totalRewards.individual.forEach((value, key) => {
                // First, populate ValidatorPayout into DB, we need an ID first

                // The ID for each PayoutDetail needs to be made up of: 
                // 1. ID from the previous era
                // 2. ID of validator from prev era
                // 3. ID of the nominator from the iteration on the previous era
                const currValidatorPayoutId = sha256(prevEra.toString() + key.toString());

                // Instantiate ValidatorPayout with the ID from above
                const currValidatorPayout = new ValidatorPayout(currValidatorPayoutId);
                currValidatorPayout.eraId = prevEra.toString();
                currValidatorPayout.eraPayout = BigInt((parseInt(value.toString()) / totalRewardPoints) * 100 * totalRewardAmount);
                currValidatorPayout.claimed = false; // placeholder as false due to time constraint
                currValidatorPayout.claimedAtBlock = null;
                // Immediately invoke an async function to save currValidatorPayout to DB
                (async () => {
                    await currValidatorPayout.save();
                })();

                // Testing if currValidatorPayout is saved to DD
                const currValidatorPayoutInDb = (async () => await ValidatorPayout.get(currValidatorPayoutId))();
                if (currValidatorPayoutInDb) {
                    logger.info(`---------------🚀 currValidatorPayout ${currValidatorPayoutId} saved to DB`);
                } else {
                    logger.info(`---------------❌ currValidatorPayout ${currValidatorPayoutId} saved to DB`);
                }

                // Since ValidatorPayout wasn't in DB, there was definitely no PayoutDetail equivalent to the ValidatorPayout
                // But now we have a new validatorPayout, we need to populate PayoutDetail accordingly

                // The ID for each PayoutDetail needs to be made up of: 
                // 1. ID from the previous era
                // 2. ID of validator from prev era
                // 3. ID of the nominator from the iteration on the previous era
                const currPayoutDetailId = sha256(prevEra.toString() + validatorId + key.toString());
                const currPayoutDetail = new PayoutDetail(currPayoutDetailId);
                currPayoutDetail.eraId = prevEra.toString();
                currPayoutDetail.accountId = key.toString();
                currPayoutDetail.claimed = false;
                currPayoutDetail.payoutId = currPayoutDetailId;
                // Immediately invoke an async function to save currPayoutDetail to DB
                (async() => {
                    await currPayoutDetail.save();
                })();

                // Testing if currValidatorPayout is saved to DD
                const currPayoutDetailInDb = (async () => await PayoutDetail.get(currPayoutDetailId))();
                if (currValidatorPayoutInDb) {
                    logger.info(`---------------🚀 currPayoutDetail ${currPayoutDetailInDb} saved to DB`);
                } else {
                    logger.info(`---------------❌ currPayoutDetail ${currPayoutDetailInDb} saved to DB`);
                }
            });
        }
        // Finished all there is to do with one validator, logging to notify
        logger.debug(`---------------😃 Validator loop ${i + 1} done---------------\n`);
    }
}
