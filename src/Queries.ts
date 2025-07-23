import { useDataEngine } from "@dhis2/app-runtime";
import { useQuery } from "@tanstack/react-query";
import { Commitment, DataSetData } from "./interfaces";
import {
    completionsApi,
    commitmentApi,
    approvalsApi,
    currentUserApi,
} from "./Store";

type OrgUnit = { id: string; name: string };

const OU_TREE_FIELDS = "id,name,children[id,name,children[id,name,children[id,name]]]";

export const useOrgUnitTree = () => {
    const engine = useDataEngine();
    return useQuery(
        ["ou-tree"],
        async () => {
            const { orgUnits }: any = await engine.query({
                orgUnits: {
                    resource: "organisationUnits.json",
                    params: {
                        fields: "id,name,parent",
                        paging: "false",
                    },
                },
            });

            return orgUnits
        }
    );
};

export const useInitial = () => {
    const engine = useDataEngine();
    return useQuery<
        {
            commitments: Commitment[];
            organisationUnits: OrgUnit[];
            isAdmin: boolean;
        },
        Error
    >(
        ["initial"],
        async () => {
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
                        fields:
                            "organisationUnits[id,name,level],id,name,email,username",
                    },
                },
            });

            const isAdmin = organisationUnits[0].level === 2;

            const ous: OrgUnit[] = organisationUnits.map((o: any) => ({
                id: o.id,
                name: o.name,
            }));

            const availableCommits = isAdmin
                ? commitments
                : commitments.filter((c: any) => ous.some((ou) => ou.id === c.voteId));

            completionsApi.update(completions);
            commitmentApi.set(availableCommits);
            approvalsApi.change(approvals);
            currentUserApi.set({ id, username, email, name });

            return {
                commitments: availableCommits,
                organisationUnits: ous,
                isAdmin,
            };
        }
    );
};
export const useDataSetData = ({
    selectedPeriod,
    orgUnits,
}: {
    selectedPeriod: string;
    orgUnits: string[];
}) => {
    const engine = useDataEngine();

    return useQuery<DataSetData, Error>(
        ["data-set-data", selectedPeriod, orgUnits],
        async () => {
            if (selectedPeriod && orgUnits) {
                const { data }: any = await engine.query({
                    data: {
                        resource: `dataValueSets.json?period=${selectedPeriod}` +
                            `&dataSet=fFaTViPsQBs&orgUnit=${orgUnits}` +
                            `&children=true`,
                    },
                });
                return data;
            }

            // Fallback empty shape if either param is missing
            return {
                dataSet: "fFaTViPsQBs",
                period: selectedPeriod,
                orgUnits,
                dataValues: [],
                completeDate: null,
            };
        },
        {
            // Only fetch when both are provided
            enabled: !!selectedPeriod && !!orgUnits,
        }
    );
};
