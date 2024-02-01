import {
    Input,
    Spinner,
    Stack,
    Table,
    Tbody,
    Td,
    Textarea,
    Thead,
    Tr,
    Box,
    Text,
    Button,
} from "@chakra-ui/react";
import { useDataEngine } from "@dhis2/app-runtime";
import { generateFixedPeriods } from "@dhis2/multi-calendar-dates";
import { groupBy, uniq } from "lodash";
import React, { ChangeEvent, FocusEvent, useEffect, useState } from "react";
import { GroupBase, Select, ChakraStylesConfig } from "chakra-react-select";
import { Commitment, Option } from "../interfaces";
import { useDataSetData } from "../Queries";
import PeriodSelector from "./PeriodSelector";

const scores: Option[] = [
    { label: "1", value: "1", colorScheme: "green", variant: "" },
    { label: "2", value: "2", colorScheme: "yellow" },
    { label: "3", value: "3", colorScheme: "red" },
];

export default function Tab1({
    commitments,
    isAdmin,
    orgUnits,
}: {
    commitments: Array<Commitment>;
    isAdmin: boolean;
    orgUnits: string[];
}) {
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [selectedPeriod, setSelectedPeriod] = useState<string>();
    const [values, setValues] = useState<Record<string, string>>({});
    const [backgrounds, setBackgrounds] = useState<Record<string, string>>({});
    const engine = useDataEngine();
    const [periods, setPeriods] = useState(
        generateFixedPeriods({
            year,
            calendar: "iso8601",
            periodType: "FYJUL",
            locale: "en",
            yearsCount: 4,
        })
    );
    const onYearChange = (diff: number) => {
        setYear((year) => year + diff);
        setSelectedPeriod(undefined);
    };

    const { isLoading, isError, isSuccess, error, data } = useDataSetData({
        selectedPeriod,
        orgUnits,
    });

    useEffect(() => {
        if (data) {
            data.dataValues.forEach(
                ({ dataElement, value, categoryOptionCombo, orgUnit }) => {
                    setValues((prev) => ({
                        ...prev,
                        [`${dataElement}-${categoryOptionCombo}-${orgUnit}`]:
                            value,
                    }));
                }
            );
        }
        return () => {};
    }, [data]);

    const postData = async (data: {
        de: string;
        co: string;
        ds: string;
        ou: string;
        pe: string;
        value: string;
    }) => {
        setBackgrounds((prev) => ({
            ...prev,
            [`${data.de}-${data.co}-${data.ou}`]: "yellow",
        }));
        const mutation: any = {
            type: "create",
            resource: "dataValues",
            data,
        };
        await engine.mutate(mutation);
        setBackgrounds((prev) => ({
            ...prev,
            [`${data.de}-${data.co}-${data.ou}`]: "green",
        }));
        await new Promise((resolve) => setTimeout(resolve, 500));
        setBackgrounds((prev) => ({
            ...prev,
            [`${data.de}-${data.co}-${data.ou}`]: "",
        }));
    };
    const completeDataSet = async () => {
        for (const voteId of uniq(commitments.map(({ voteId }) => voteId))) {
            const mutation: any = {
                type: "create",
                resource: "completeDataSetRegistrations",
                data: {
                    completeDataSetRegistrations: [
                        {
                            dataSet: "fFaTViPsQBs",
                            period: selectedPeriod,
                            organisationUnit: voteId,
                            completed: true,
                        },
                    ],
                },
            };
            await engine.mutate(mutation);
        }
    };

    const chakraStyles: ChakraStylesConfig<Option, false, GroupBase<Option>> = {
        // dropdownIndicator: (provided, state) => ({
        //     ...provided,
        //     background: "green",
        //     // p: 0,
        //     // w: "40px",
        // }),
        container: (provided, state) => {
            let border = "";

            if (state.getValue().length > 0) {
                if (state.getValue()[0].value === "1") {
                    border = "1px green solid";
                } else if (state.getValue()[0].value === "2") {
                    border = "1px orange solid";
                } else if (state.getValue()[0].value === "3") {
                    border = "1px red solid";
                }
            }
            return {
                ...provided,
                border,
            };
        },
        // control: (provided, state) => ({
        //     ...provided,
        //     background: "green",
        //     // p: 0,
        //     // w: "40px",
        // }),
    };

    return (
        <Stack>
            <Stack direction="row" h="48px" minH="48px" maxH="48px">
                <Stack ml="2" zIndex={20}>
                    <PeriodSelector
                        selectedPeriod={selectedPeriod}
                        onYearChange={onYearChange}
                        periods={periods}
                        setPeriods={setPeriods}
                        year={year}
                        setSelectedPeriod={setSelectedPeriod}
                    />
                </Stack>
                <Stack direction="row" pl="10" spacing="10">
                    <Text fontWeight="extrabold" fontSize="2xl">
                        Legend :
                    </Text>
                    <Text
                        color="green.500"
                        fontWeight="extrabold"
                        fontSize="2xl"
                    >
                        Achieved
                    </Text>
                    <Text
                        color="yellow.500"
                        fontWeight="extrabold"
                        fontSize="2xl"
                    >
                        Commenced
                    </Text>
                    <Text color="red.500" fontWeight="extrabold" fontSize="2xl">
                        Not implemented
                    </Text>
                </Stack>
            </Stack>
            {isError && <pre>{JSON.stringify(error, null, 2)}</pre>}
            {isLoading && <Spinner />}
            {isSuccess && (
                <Box h="calc(100vh - 144px - 80px)" overflow="auto">
                    <Table size="sm" flex={1}>
                        <Thead
                            bgColor="#019696"
                            color="white"
                            position="sticky"
                            top="0"
                            zIndex={10}
                            boxShadow="md"
                        >
                            <Tr fontWeight="bold">
                                <Td width="40px">
                                    {commitments[0]?.keyResultsArea}
                                </Td>
                                <Td w="100px">code</Td>
                                <Td w="500px" minW="500px" maxW="500px">
                                    Data element
                                </Td>
                                <Td w="50px">MDA</Td>
                                <Td>Performance</Td>
                                <Td w="90px">
                                    <p>
                                        Budget <br /> (Ugx Bn)
                                    </p>
                                </Td>
                                <Td w="140px">Score</Td>
                                <Td>Comments</Td>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {Object.entries(
                                groupBy(commitments, "subKeyResultsArea")
                            ).map(([sbka, groups]) => {
                                return groups.map(
                                    (
                                        {
                                            subKeyResultsArea,
                                            commitment,
                                            MDAs,
                                            scoreCode,
                                            voteId,
                                            performanceId,
                                            budgetId,
                                            scoreId,
                                            commentId,
                                        },
                                        index
                                    ) => (
                                        <Tr>
                                            {index === 0 && (
                                                <Td rowSpan={groups.length}>
                                                    {subKeyResultsArea}
                                                </Td>
                                            )}
                                            <Td>
                                                {String(scoreCode).replace(
                                                    "SC-",
                                                    ""
                                                )}
                                            </Td>
                                            <Td>{commitment}</Td>
                                            <Td>{MDAs}</Td>
                                            <Td>
                                                <Textarea
                                                    isDisabled={
                                                        isAdmin ||
                                                        data?.completeDate
                                                    }
                                                    id="YuQ3dvY57PQ-b35egsIMRiP-val"
                                                    name="entryfield"
                                                    border="3px solid yellow"
                                                    bg={
                                                        backgrounds[
                                                            `${performanceId}-b35egsIMRiP-${voteId}`
                                                        ]
                                                    }
                                                    title={commitment}
                                                    value={
                                                        values[
                                                            `${performanceId}-b35egsIMRiP-${voteId}`
                                                        ]
                                                    }
                                                    onChange={(
                                                        e: ChangeEvent<HTMLTextAreaElement>
                                                    ) => {
                                                        e.persist();
                                                        setValues((prev) => ({
                                                            ...prev,
                                                            [`${performanceId}-b35egsIMRiP-${voteId}`]:
                                                                e.target.value,
                                                        }));
                                                    }}
                                                    onBlur={(
                                                        e: FocusEvent<HTMLTextAreaElement>
                                                    ) => {
                                                        e.persist();
                                                        if (selectedPeriod) {
                                                            postData({
                                                                de: performanceId,
                                                                co: "b35egsIMRiP",
                                                                ou: voteId,
                                                                ds: "fFaTViPsQBs",
                                                                value: e.target
                                                                    .value,
                                                                pe: selectedPeriod,
                                                            });
                                                        }
                                                    }}
                                                />
                                            </Td>
                                            <Td>
                                                <Input
                                                    bg={
                                                        backgrounds[
                                                            `${budgetId}-pXpEOcDkwjV-${voteId}`
                                                        ]
                                                    }
                                                    isDisabled={
                                                        isAdmin ||
                                                        data?.completeDate
                                                    }
                                                    id="RlkUJj1WAs4-pXpEOcDkwjV-val"
                                                    name="entryfield"
                                                    title={commitment}
                                                    value={
                                                        values[
                                                            `${budgetId}-pXpEOcDkwjV-${voteId}`
                                                        ]
                                                    }
                                                    onChange={(
                                                        e: ChangeEvent<HTMLInputElement>
                                                    ) => {
                                                        e.persist();
                                                        setValues((prev) => ({
                                                            ...prev,
                                                            [`${budgetId}-pXpEOcDkwjV-${voteId}`]:
                                                                e.target.value,
                                                        }));
                                                    }}
                                                    onBlur={(
                                                        e: FocusEvent<HTMLInputElement>
                                                    ) => {
                                                        e.persist();
                                                        if (selectedPeriod) {
                                                            postData({
                                                                de: budgetId,
                                                                co: "pXpEOcDkwjV",
                                                                ou: voteId,
                                                                ds: "fFaTViPsQBs",
                                                                value: e.target
                                                                    .value,
                                                                pe: selectedPeriod,
                                                            });
                                                        }
                                                    }}
                                                />
                                            </Td>
                                            <Td>
                                                <Select<
                                                    Option,
                                                    false,
                                                    GroupBase<Option>
                                                >
                                                    chakraStyles={chakraStyles}
                                                    isDisabled={
                                                        !isAdmin ||
                                                        data?.completeDate
                                                    }
                                                    options={scores}
                                                    size="sm"
                                                    colorScheme="blue"
                                                    value={scores.find(
                                                        ({ value }) =>
                                                            value ===
                                                            values[
                                                                `${scoreId}-G5EzBzyQXD9-${voteId}`
                                                            ]
                                                    )}
                                                    onChange={(value) => {
                                                        setValues((prev) => ({
                                                            ...prev,
                                                            [`${scoreId}-G5EzBzyQXD9-${voteId}`]:
                                                                value?.value ??
                                                                "",
                                                        }));
                                                        if (
                                                            selectedPeriod &&
                                                            value
                                                        ) {
                                                            postData({
                                                                de: scoreId,
                                                                co: "G5EzBzyQXD9",
                                                                ou: voteId,
                                                                ds: "fFaTViPsQBs",
                                                                value: value.value,
                                                                pe: selectedPeriod,
                                                            });
                                                        }
                                                    }}
                                                    tagVariant="solid"
                                                />
                                            </Td>
                                            <Td>
                                                <Textarea
                                                    border="3px solid yellow"
                                                    value={
                                                        values[
                                                            `${commentId}-s3PFBx7asUX-${voteId}`
                                                        ]
                                                    }
                                                    bg={
                                                        backgrounds[
                                                            `${commentId}-s3PFBx7asUX-${voteId}`
                                                        ]
                                                    }
                                                    w="100%"
                                                    isDisabled={
                                                        !isAdmin ||
                                                        data?.completeDate
                                                    }
                                                    id="cYAkzzXVMAN-s3PFBx7asUX-val"
                                                    name="entryfield"
                                                    title={commitment}
                                                    onChange={(
                                                        e: ChangeEvent<HTMLTextAreaElement>
                                                    ) => {
                                                        e.persist();
                                                        setValues((prev) => ({
                                                            ...prev,
                                                            [`${commentId}-s3PFBx7asUX-${voteId}`]:
                                                                e.target.value,
                                                        }));
                                                    }}
                                                    onBlur={(
                                                        e: FocusEvent<HTMLTextAreaElement>
                                                    ) => {
                                                        e.persist();
                                                        if (selectedPeriod) {
                                                            postData({
                                                                de: commentId,
                                                                co: "s3PFBx7asUX",
                                                                ou: voteId,
                                                                ds: "fFaTViPsQBs",
                                                                value: e.target
                                                                    .value,
                                                                pe: selectedPeriod,
                                                            });
                                                        }
                                                    }}
                                                />
                                            </Td>
                                        </Tr>
                                    )
                                );
                            })}
                        </Tbody>
                    </Table>
                    {isAdmin && (
                        <Button
                            colorScheme="green"
                            size="sm"
                            position="fixed"
                            bottom="20px"
                            right="20px"
                            onClick={() => completeDataSet()}
                        >
                            {data?.completeDate
                                ? "Open data entry"
                                : "Submit and Lock"}
                        </Button>
                    )}
                </Box>
            )}
        </Stack>
    );
}
