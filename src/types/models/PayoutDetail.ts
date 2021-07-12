// Auto-generated , DO NOT EDIT
import {Entity} from "@subql/types";
import assert from 'assert';


export class PayoutDetail implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public eraId: string;

    public accountId: string;

    public claimed: boolean;

    public payoutId: string;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save PayoutDetail entity without an ID");
        await store.set('PayoutDetail', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove PayoutDetail entity without an ID");
        await store.remove('PayoutDetail', id.toString());
    }

    static async get(id:string): Promise<PayoutDetail | undefined>{
        assert((id !== null && id !== undefined), "Cannot get PayoutDetail entity without an ID");
        const record = await store.get('PayoutDetail', id.toString());
        if (record){
            return PayoutDetail.create(record);
        }else{
            return;
        }
    }



    static create(record){
        let entity = new PayoutDetail(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
