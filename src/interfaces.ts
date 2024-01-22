import { OptionBase } from "chakra-react-select";

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

export interface Option extends OptionBase {
    label: string;
    value: string;
}

export type FixedPeriod = {
    id: string;
    iso?: string;
    name: string;
    startDate: string;
    endDate: string;
};

export interface DataSetData {
    dataSet: string;
    completeDate?: any;
    period: string;
    orgUnit: string;
    dataValues: DataValue[];
}

interface DataValue {
    dataElement: string;
    period: string;
    orgUnit: string;
    categoryOptionCombo: string;
    attributeOptionCombo: string;
    value: string;
    storedBy: string;
    created: string;
    lastUpdated: string;
    comment?: any;
    followup: boolean;
}
