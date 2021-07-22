// Auto-generated , DO NOT EDIT
import {Entity} from "@subql/types";
import assert from 'assert';


export class NominatorValidator implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public eraId: string;

    public nominatorId: string;

    public validatorId: string;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save NominatorValidator entity without an ID");
        await store.set('NominatorValidator', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove NominatorValidator entity without an ID");
        await store.remove('NominatorValidator', id.toString());
    }

    static async get(id:string): Promise<NominatorValidator | undefined>{
        assert((id !== null && id !== undefined), "Cannot get NominatorValidator entity without an ID");
        const record = await store.get('NominatorValidator', id.toString());
        if (record){
            return NominatorValidator.create(record);
        }else{
            return;
        }
    }


    static async getByEraId(eraId: string): Promise<NominatorValidator[] | undefined>{
      
      const records = await store.getByField('NominatorValidator', 'eraId', eraId);
      return records.map(record => NominatorValidator.create(record));
      
    }


    static create(record){
        let entity = new NominatorValidator(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
