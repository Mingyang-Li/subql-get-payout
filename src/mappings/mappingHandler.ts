import { Account } from '../types/models/Account';
import { SubstrateEvent, SubstrateExtrinsic } from "@subql/types";
import { sha256 } from 'js-sha256';
import { Era } from "../types/models/Era";
import { NominatorValidator } from '../types/models/NominatorValidator';
import { ValidatorPayout } from "../types/models/ValidatorPayout";
import { PayoutDetail } from "../types/models/PayoutDetail";

export async function handleSession(event:SubstrateEvent): Promise<void> {
    const currentEra = await api.query.staking.currentEra();
    const currentBlock =  event.block.block.header.number.toBigInt();
    // check it era is obtained. If not, era doesn't exists in db
    // const eraInDb: boolean = dbEraValue !== null ? true : false;
    // const { event: { data: [SessionIndex] } } = event;
    const sessionIndex = await api.query.staking.erasStartSessionIndex;
    logger.info(`---------------🌎 Session Index: ${JSON.stringify(sessionIndex)}\n`);
    if(currentEra.isNone) return;

    const currentEraNum = currentEra.unwrap().toNumber();

    // check if era is in DB is in DB before saving
    const thisEra = await Era.get(currentEraNum.toString());

    // create new era (when not found in db)
    if (!thisEra){
        logger.info(`---------------❌ Era ${currentEraNum.toString()} not in DB, need to add to DB ---------------`);
        const newEra = new Era(currentEraNum.toString());
        newEra.startBlock = currentBlock;
        // update end block of prev 

        await newEra.save();

        // check if Era is in DB after saving
        const isInDb = await Era.get(currentEraNum.toString());
        logger.info(`--------------- Era ${currentEraNum.toString()} is now ${isInDb ? '✔️ In DB' : " ❌ NOT in DB"} ---------------`);

        // update endblock of th
        const previousEraIndex =  currentEraNum-1;
        const previousEra = await Era.get(previousEraIndex.toString());
        if(previousEra){
            previousEra.endBlock = currentBlock - BigInt(1);
            await previousEra.save();
        }
    }
    
    const validators = await api.query.session.validators();
    for (let i=0; i<validators.length; i++){
        const validator = validators[i];
        const validatorId = validator.toString();
        logger.info(`---------------🚀 Validator: ${validatorId} at Era: ${currentEraNum}---------------`);
        const validatorExposure =  await api.query.staking.erasStakers(currentEraNum, validatorId);
        const { total, own, others } = validatorExposure;

        for (const nominator of others) {
            // setup nominator account id
            const nominatorId = nominator.who.toString();

            // check if nominator account is saved to DB
            const nomAccountInDb = await Account.get(nominatorId);
            // If nominator account is not in DB, do create an account
            if (!nomAccountInDb) {
                logger.info(`---------------❌ Nominator Account ${nominatorId} not in DB, need to create new Account---------------`);
                const nomAccount = new Account(nominatorId);
                await nomAccount.save();
                const nomAccountSaved = await Account.get(nominatorId);
                if (nomAccountSaved) {
                    logger.info(`---------------✔️ Account ${nominatorId} saved--------------`);
                }
            }

            // check if validator account is in DB
            const valAccountInDb = await Account.get(validatorId);
            // If validator account is not in DB, do create an account
            if (!valAccountInDb) {
                logger.info(`---------------❌ Validator Account ${validatorId} not in DB, need to create new Account---------------`);
                const valAccount = new Account(validatorId);
                await valAccount.save();
                const valAccountInDb = await Account.get(validatorId);
                if (valAccountInDb) {
                    logger.info(`---------------✔️ Account ${validatorId} saved--------------`);
                }
            }


            // To create NominatorValidator, first we need to create a compisite ID based off its 3 attributes
            const nominatorValidatorId: string = sha256(`${currentEraNum}${nominatorId}${validatorId}`);

            // Now, check if NominatorValidator is in DB
            const nominatorValidatorInDb = await NominatorValidator.get(nominatorValidatorId);
            // if nominatorValidator not in DB, create NominatorValidator
            if (!nominatorValidatorInDb) {
                logger.info(`---------------❌ NominatorValidator ${nominatorValidatorId} not in DB, need to create new NominatorValidator---------------`)
                const currNominatorValidator = new NominatorValidator(nominatorValidatorId);
                currNominatorValidator.eraId = currentEraNum.toString();
                currNominatorValidator.nominatorId = nominatorId;
                currNominatorValidator.validatorId = validatorId;
                await currNominatorValidator.save();
                logger.info(`---------------🚀 NominatorValidator ${nominatorValidatorId} saved to DB---------------`);
            }
        }

        // Populate ValidatorPayout
        const payoutRewards = await api.query.staking.erasValidatorReward(currentEraNum);
        const validatorPayoutId = sha256(`${currentEraNum.toString()}${validatorId}`);
        // Check if currValidatorPayout in DB
        const currValidatorPayoutinDb = await ValidatorPayout.get(validatorPayoutId);
        // If validatorPayout not in DB, create a new record
        if (!currValidatorPayoutinDb) {
            logger.info(`---------------❌ ValidatorPayout ${validatorPayoutId} not in DB, creating new ValidatorPayout---------------`);
            const currValidatorPayout = new ValidatorPayout(validatorPayoutId);
            currValidatorPayout.eraId = currentEraNum.toString();
            currValidatorPayout.eraPayout = BigInt(payoutRewards.toString());
            currValidatorPayout.claimed = false; // placeholder, working it out
            currValidatorPayout.claimedAtBlock = null;
            await currValidatorPayout.save();
            logger.info(`---------------🚀 ValidatorPayout ${sha256(`${currentEraNum.toString()}${validatorId}`)} saved to DB---------------`);
            
            // Since validatorPayout wasn't in DB, there was definitely no PayoutDetail
            // But now we have a new validatorPayout, we need to populate PayoutDetail
            const payoutDetailId = sha256(`${currentEraNum.toString()}${validatorId}`);
            logger.info(`---------------❌ PayoutDetail ${payoutDetailId} not in DB, creating new PayoutDetail---------------`);
            const currPayoutDetail = new PayoutDetail(payoutDetailId);
            currPayoutDetail.eraId = currentEraNum.toString();
            currPayoutDetail.accountId = validatorId;
            currPayoutDetail.claimed = false; // placeholder
            currPayoutDetail.payoutId = currValidatorPayout.id;
            await currValidatorPayout.save();
            logger.info(`---------------🚀 PayoutDetail ${payoutDetailId} saved to DB---------------`);
        }
        // Finished all there is to do with one validator, logging to notify
        logger.info(`---------------😃 Validator loop ${i + 1} done---------------\n`);
    }
}

// first get session  index
// check if session is start of a new era using session index obtained
// if it's a start of a new era, add Era into DB
// After adding Era, check it's validators
// for each validator, extract its exposure (htat has its nominators and rewards). 

export async function handleExtrinsic(substrateExtrinsic: SubstrateExtrinsic): Promise<void> {
    const currentEra = await api.query.staking.currentEra();
    const currentEraNum = currentEra.unwrap().toNumber();
    const validator = api.query.staking.validators();
    const validatorId = validator.toString();
    const validatorExposure =  await api.query.staking.erasStakers(currentEraNum, validatorId);
    const { others } = validatorExposure;
    // logger.info(`nominators: ${others}`);
    for (const nominator in others) {
       logger.info(`nominator: ${nominator}`);
    }
}