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

export interface Commitment {
    theme: string;
    keyResultsArea: string;
    dataElementGroupSetCode: string;
    dataElementGroupSetId: string;
    subKeyResultsArea: string;
    dataElementGroupCode: string;
    dataElementGroupId: string;
    commitment: string;
    budgetCode: string;
    budgetId: string;
    scoreCode: string;
    scoreId: string;
    commentCode: string;
    commentId: string;
    performanceCode: string;
    performanceId: string;
    MDAs: string;
    leadMDA: string;
    voteCode: string;
    voteId: string;
    voteName: string;
}
