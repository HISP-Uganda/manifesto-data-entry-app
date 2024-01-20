import { useDataEngine } from "@dhis2/app-runtime";
import { useQuery } from "@tanstack/react-query";
import { DataElementGroupSet } from "./interfaces";

export const useInitial = () => {
    const engine = useDataEngine();

    return useQuery<Array<DataElementGroupSet>, Error>(
        ["initial"],
        async () => {
            const {
                groupSets: { dataElementGroupSets },
                units: { organisationUnits },
            }: any = await engine.query({
                groupSets: {
                    resource: "dataElementGroupSets.json",
                    params: {
                        fields: "id,name,code,dataElementGroups[id,code,name,dataElements[id,name,code]]",
                        filter: "id:in:[yoEShZj5Hjc,RIHKK8RyFmk,am8allI72ZU,kcjI9lS9BRq,AxGivHgA8aT,n3p79QIR0BC,rsEIiQrAt26,oebpT7BhCeh,yZDSTrYGoxc,ngM6m8GMAWr,dxOpFe4g2vV,Cdhclnq9WJi,GxWQaTAu98c,o5wT3ncW0b7,W7CIq6nG3IV,m550CizX1Ip,YUWygOMwZim,PsC2QOxVoh2,mkX5WpwEtS5]",
                    },
                },
                units: {
                    resource: "me.json",
                    params: {
                        fields: "organisationUnits[id,code,name]",
                    },
                },
            });
            return dataElementGroupSets;
        }
    );
};
