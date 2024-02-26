import { useDataEngine } from "@dhis2/app-runtime";
import { useQuery } from "@tanstack/react-query";
import { Commitment, DataSetData } from "./interfaces";
import {
    completionsApi,
    commitmentApi,
    approvalsApi,
    currentUserApi,
} from "./Store";

export const useInitial = () => {
    const engine = useDataEngine();
    return useQuery<
        {
            commitments: Array<Commitment>;
            organisationUnits: string[];
            isAdmin: boolean;
        },
        Error
    >(["initial"], async () => {
        const {
            commitments,
            units: { organisationUnits, id, name, email, username },
            completions,
            approvals,
        }: any = await engine.query({
            commitments: {
                resource: "dataStore/manifesto/commitments.json",
            },
            completions: {
                resource: "dataStore/manifesto/completions.json",
            },
            approvals: {
                resource: "dataStore/manifesto/approvals.json",
            },
            units: {
                resource: "me.json",
                params: {
                    fields: "organisationUnits[id,code,name,level],id,name,email,username",
                },
            },
        });
        const isAdmin = organisationUnits[0].level === 2;
        const ous = organisationUnits.map((o: any) => o.id);
        const availableCommits = isAdmin
            ? commitments
            : commitments.filter((c: any) => ous.indexOf(c.voteId) !== -1);
        completionsApi.update(completions);
        commitmentApi.set(availableCommits);
        approvalsApi.change(approvals);
        currentUserApi.set({ id, username, email, name });
        return {
            commitments: availableCommits,
            organisationUnits: ous,
            isAdmin,
        };
    });
};

export const useDataSetData = ({
    selectedPeriod,
    orgUnits = [],
}: Partial<{
    selectedPeriod: string;
    orgUnits: string[];
}>) => {
    const engine = useDataEngine();
    return useQuery<DataSetData, Error>(
        ["data-set-data", selectedPeriod, ...orgUnits],
        async () => {
            if (selectedPeriod && orgUnits.length > 0) {
                const { data }: any = await engine.query({
                    data: {
                        resource: `dataValueSets.json?period=${selectedPeriod}&dataSet=fFaTViPsQBs&${orgUnits
                            .map((o) => `orgUnit=${o}`)
                            .join("&")}&children=true`,
                    },
                });

                return data;
            }
            return {
                dataSet: "fFaTViPsQBs",
                period: selectedPeriod,
                orgUnit: orgUnits[0],
                dataValues: [],
                completeDate: null,
            };
        }
    );
};
