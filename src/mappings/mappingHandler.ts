import { Account } from '../types/models/Account';
import { SubstrateEvent, SubstrateExtrinsic } from "@subql/types";
import { sha256 } from 'js-sha256';
import { Era } from "../types/models/Era";
import { NominatorValidator } from '../types/models/NominatorValidator';
import { ValidatorPayout } from "../types/models/ValidatorPayout";
import { PayoutDetail } from "../types/models/PayoutDetail";

export async function handleSession(event:SubstrateEvent): Promise<void> {
    // we can extract session index from the event passed in, which is already filtered by yaml file by "session" as module and "NewSession" as the method
    // This helps us confirm that we only deal with new sessions
    const { event: { data: [sessionIndex] } } = event;

    // Unlike the official api (which queries the latest data), subql api only queries the data for the given event within the context its located
    const currentEra = await api.query.staking.currentEra();
    const currentBlock =  event.block.block.header.number.toBigInt();
    const currentEraNum = currentEra.unwrap().toNumber();
    // check it era is obtained. If not, era doesn't exists in db

    logger.debug(`---------------🌎 Session Index: ${JSON.stringify(sessionIndex)}`);
    logger.debug(`---------------⏰ currentEra: ${JSON.stringify(currentEra)}\n`)
    if(currentEra.isNone) return;

    // check if era is in DB is in DB before saving
    const currEraInDb = await Era.get(currentEraNum.toString());
    if (currEraInDb) {
        return;
    }

    // create new era (when not found in db)
  
    logger.debug(`---------------❌ Era ${currentEraNum.toString()} not in DB, need to add to DB`);
    const newEra = new Era(currentEraNum.toString());
    newEra.startBlock = currentBlock;
    // update end block of prev 

    await newEra.save();

    // check if Era is in DB after saving
    const isInDb = await Era.get(currentEraNum.toString());
    logger.debug(`--------------- Era ${currentEraNum.toString()} is now ${isInDb ? '✔️ In DB' : " ❌ NOT in DB"}`);

    // update endblock of the previous era
    const previousEraIndex =  currentEraNum-1;
    const previousEra = await Era.get(previousEraIndex.toString());
    if(previousEra){
        previousEra.endBlock = currentBlock - BigInt(1);
        await previousEra.save();
    }
    
    
    // subql api now queries all validators of the current era
    const validators = await api.query.session.validators();
    for (let i=0; i<validators.length; i++){
        const validator = validators[i];
        const validatorId = validator.toString();
        logger.debug(`---------------🚀 Validator: ${validatorId} at Era: ${currentEraNum}`);
        const validatorExposure =  await api.query.staking.erasStakers(currentEraNum, validatorId);
        const { total, own, others } = validatorExposure;

        for (const nominator of others) {
            // setup nominator account id
            const nominatorId = nominator.who.toString();

            // check if nominator account is saved to DB
            const nomAccountInDb = await Account.get(nominatorId);
            // If nominator account is not in DB, do create an account
            if (!nomAccountInDb) {
                logger.debug(`---------------❌ Nominator Account ${nominatorId} not in DB, need to create new Account`);
                const nomAccount = new Account(nominatorId);
                await nomAccount.save();
                const nomAccountSaved = await Account.get(nominatorId);
                if (nomAccountSaved) {
                    logger.debug(`---------------✔️ Account ${nominatorId} saved`);
                }
            }

            // check if validator account is in DB
            const valAccountInDb = await Account.get(validatorId);
            // If validator account is not in DB, do create an account
            if (!valAccountInDb) {
                logger.debug(`---------------❌ Validator Account ${validatorId} not in DB, need to create new Account`);
                const valAccount = new Account(validatorId);
                await valAccount.save();
                const valAccountInDb = await Account.get(validatorId);
                if (valAccountInDb) {
                    logger.debug(`---------------✔️ Account ${validatorId} saved`);
                }
            }

            // To create NominatorValidator, first we need to create a compisite ID based off its 3 attributes
            const nominatorValidatorId: string = sha256(`${currentEraNum}${nominatorId}${validatorId}`);

            // Now, check if NominatorValidator is in DB
            const nominatorValidatorInDb = await NominatorValidator.get(nominatorValidatorId);
            // if nominatorValidator not in DB, create NominatorValidator
            if (!nominatorValidatorInDb) {
                logger.debug(`---------------❌ NominatorValidator ${nominatorValidatorId} not in DB, need to create new NominatorValidator`)
                const currNominatorValidator = new NominatorValidator(nominatorValidatorId);
                currNominatorValidator.eraId = currentEraNum.toString();
                currNominatorValidator.nominatorId = nominatorId;
                currNominatorValidator.validatorId = validatorId;
                await currNominatorValidator.save();
                logger.debug(`---------------🚀 NominatorValidator ${nominatorValidatorId} saved to DB`);
            }
        }

        // Populate ValidatorPayout
        const prevEraNum = currentEraNum-1;
        const validatorPayoutId = sha256(`${prevEraNum.toString()}${validatorId}`);
        const payoutRewards = await api.query.staking.erasRewardPoints(prevEraNum);
        // logger.debug(`💸 payoutRewards.total: ${payoutRewards.individual}`);

        // Check if currValidatorPayout in DB
        const currValidatorPayoutinDb = await ValidatorPayout.get(validatorPayoutId);
        // If validatorPayout not in DB, create a new record
        if (!currValidatorPayoutinDb) {
            logger.debug(`---------------❌ ValidatorPayout ${validatorPayoutId} not in DB, creating new ValidatorPayout`);
            const currValidatorPayout = new ValidatorPayout(validatorPayoutId);
            currValidatorPayout.eraId = prevEraNum.toString();
            currValidatorPayout.eraPayout = BigInt(payoutRewards.total.toString());
            currValidatorPayout.claimed = false; // placeholder, working it out
            currValidatorPayout.claimedAtBlock = null;
            await currValidatorPayout.save();
            logger.debug(`---------------🚀 ValidatorPayout ${sha256(`${prevEraNum.toString()}${validatorId}`)} saved to DB`);
            
            // Since validatorPayout wasn't in DB, there was definitely no PayoutDetail
            // But now we have a new validatorPayout, we need to populate PayoutDetail
            const payoutDetailId = sha256(`${prevEraNum.toString()}${validatorId}`);
            logger.debug(`---------------❌ PayoutDetail ${payoutDetailId} not in DB, creating new PayoutDetail`);
            const currPayoutDetail = new PayoutDetail(payoutDetailId);
            currPayoutDetail.eraId = prevEraNum.toString();
            currPayoutDetail.accountId = validatorId;
            currPayoutDetail.claimed = false; // placeholder
            currPayoutDetail.payoutId = currValidatorPayout.id;
            await currValidatorPayout.save();
            logger.debug(`---------------🚀 PayoutDetail ${payoutDetailId} saved to DB`);
        }
        // Finished all there is to do with one validator, logging to notify
        logger.debug(`---------------😃 Validator loop ${i + 1} done---------------\n`);
    }
}

// first get session index
// check if session is start of a new era using session index obtained
// if it's a start of a new era, add Era into DB
// After adding Era, check it's validators
// for each validator, extract its exposure (htat has its nominators and rewards). 
