import { useDataEngine } from "@dhis2/app-runtime";
import { useQuery } from "@tanstack/react-query";
import { Commitment } from "./interfaces";

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
            units: { organisationUnits },
        }: any = await engine.query({
            commitments: {
                resource: "dataStore/manifesto/commitments.json",
            },
            units: {
                resource: "me.json",
                params: {
                    fields: "organisationUnits[id,code,name,level]",
                },
            },
        });

        return {
            commitments,
            organisationUnits: organisationUnits.map((o: any) => o.id),
            isAdmin: false,
        };
    });
};
