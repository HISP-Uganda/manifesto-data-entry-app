import { Box, Stack, Text } from "@chakra-ui/react";
import { generateFixedPeriods } from "@dhis2/multi-calendar-dates";
import { GroupBase, Select } from "chakra-react-select";
import React, { useEffect } from "react";
import { FixedPeriod, Option } from "../interfaces";

export default function PeriodSelector({
    year,
    periods,
    setPeriods,
    setSelectedPeriod,
    selectedPeriod,
    onYearChange,
}: {
    year: number;
    periods: FixedPeriod[];
    setPeriods: React.Dispatch<React.SetStateAction<FixedPeriod[]>>;
    setSelectedPeriod: React.Dispatch<React.SetStateAction<string | undefined>>;
    selectedPeriod: string | undefined;
    onYearChange: (year: number) => void;
}) {
    useEffect(() => {
        setPeriods(() =>
            generateFixedPeriods({
                year,
                calendar: "iso8601",
                periodType: "FYJUL",
                locale: "en",
            })
        );
        return () => {};
    }, [year]);

    return (
        <Stack direction="row" w="100%" spacing="20px" alignItems="center">
            <Text fontWeight="extrabold" fontSize="2xl">
                Period
            </Text>
            <Box w="300px">
                <Select<Option, false, GroupBase<Option>>
                    isMulti={false}
                    options={periods.map((p) => ({
                        label: p.name,
                        value: p.id,
                    }))}
                    value={{
                        label:
                            periods.find(({ id }) => id === selectedPeriod)
                                ?.name || "",
                        value:
                            periods.find(({ id }) => id === selectedPeriod)
                                ?.id || "",
                    }}
                    onChange={(value) => setSelectedPeriod(() => value?.value)}
                />
            </Box>
        </Stack>
    );
}
