export interface DataElementGroupSet {
    code: string;
    name: string;
    id: string;
    dataElementGroups: DataElementGroup[];
}

interface DataElementGroup {
    code: string;
    name: string;
    id: string;
    dataElements: DataElement[];
}

interface DataElement {
    code: string;
    name: string;
    id: string;
}
