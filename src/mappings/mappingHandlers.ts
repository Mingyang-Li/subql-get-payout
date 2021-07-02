import { SubstrateExtrinsic, SubstrateEvent, SubstrateBlock } from "@subql/types";
import { Balance } from "@polkadot/types/interfaces";
import { NominatorValidator } from '../types/models/NominatorValidator';

async function handleInput(eraNum: number, validatorHash: string): Promise<void> {
    const nominatorValidator = new NominatorValidator("blockid");
    nominatorValidator.era = eraNum;
    nominatorValidator.validatorId = validatorHash;
}

async function handlePayouts(event: SubstrateEvent): Promise<void> {
    return;
}