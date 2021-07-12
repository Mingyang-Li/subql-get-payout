import { SubstrateExtrinsic, SubstrateEvent, SubstrateBlock } from "@subql/types";
import { Balance } from "@polkadot/types/interfaces";
import { NominatorValidator } from '../types/models/NominatorValidator';

const { ApiPromise, WsProvider } = require(`@polkadot/api`);
const provider = new WsProvider(`wss://rpc.polkadot.io/`);

export async function handleInput(eraNum: number, validatorHash: string): Promise<void> {
    const nominatorValidator = new NominatorValidator("blockid");
    nominatorValidator.era = eraNum;
    nominatorValidator.validatorId = validatorHash;
}

async function handlePayouts(event: SubstrateEvent): Promise<void> {
    return;
}

async function apiInit() {
    const api = await ApiPromise.create({ provider });
    return api;
}


async function handleTransfers(event: SubstrateEvent): Promise<void> {

    const {accountId, balance }=  event

    const bn = event.block.block.header.number.toBigInt();
    // destructure data, manipulate, update entity, send to db, gql will work
}