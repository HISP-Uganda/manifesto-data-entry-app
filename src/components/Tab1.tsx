import {
    Box,
    Button,
    Drawer,
    DrawerBody,
    DrawerCloseButton,
    DrawerContent,
    DrawerOverlay,
    Input,
    Spacer,
    Spinner,
    Stack,
    Table,
    Tbody,
    Td,
    Text,
    Textarea,
    Thead,
    Tr,
    useDisclosure,
    DrawerFooter,
} from "@chakra-ui/react";
import { useDataEngine } from "@dhis2/app-runtime";
import { generateFixedPeriods } from "@dhis2/multi-calendar-dates";
import { ChakraStylesConfig, GroupBase, Select } from "chakra-react-select";
import { useStore } from "effector-react";
import { saveAs } from "file-saver";
import { groupBy, uniq } from "lodash";
import React, { ChangeEvent, FocusEvent, useEffect, useState } from "react";
import ReactQuill from "react-quill";
import { utils, write } from "xlsx";
import "react-quill/dist/quill.snow.css";
import { Commitment, Option } from "../interfaces";
import { useDataSetData } from "../Queries";
import { $completions, completionsApi, $commitments } from "../Store";
import PeriodSelector from "./PeriodSelector";
import { s2ab } from "../utils";

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
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [selectedPeriod, setSelectedPeriod] = useState<string>();
    const [values, setValues] = useState<Record<string, string>>({});
    const [backgrounds, setBackgrounds] = useState<Record<string, string>>({});
    const completions = useStore($completions);
    const allCommitments = useStore($commitments);
    const [currentTextField, setCurrentTextField] = useState<{
        voteId: string;
        dataElement: string;
        isDisabled: boolean;
        co: string;
    }>({ voteId: "", dataElement: "", isDisabled: false, co: "" });
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
            setValues(() => {
                return {};
            });
            data.dataValues.forEach(
                ({ dataElement, value, categoryOptionCombo, orgUnit }) => {
                    if (
                        !values[
                            `${dataElement}-${categoryOptionCombo}-${orgUnit}`
                        ]
                    ) {
                        setValues((prev) => ({
                            ...prev,
                            [`${dataElement}-${categoryOptionCombo}-${orgUnit}`]:
                                value,
                        }));
                    }
                }
            );
        } else {
            setValues(() => {
                return {};
            });
        }
        return () => {
            setValues(() => {
                return {};
            });
        };
    }, [JSON.stringify(data)]);

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

        try {
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
        } catch (error) {
            setBackgrounds((prev) => ({
                ...prev,
                [`${data.de}-${data.co}-${data.ou}`]: "red",
            }));
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setBackgrounds((prev) => ({
                ...prev,
                [`${data.de}-${data.co}-${data.ou}`]: "",
            }));
        }
    };
    const completeDataSet = async () => {
        if (selectedPeriod) {
            const completed = completions[selectedPeriod] || false;
            for (const voteId of uniq(
                commitments.map(({ voteId }) => voteId)
            )) {
                const mutation: any = {
                    type: "create",
                    resource: "completeDataSetRegistrations",
                    data: {
                        completeDataSetRegistrations: [
                            {
                                dataSet: "fFaTViPsQBs",
                                period: !completed ? selectedPeriod : "",
                                organisationUnit: voteId,
                                completed: !completed,
                            },
                        ],
                    },
                };
                await engine.mutate(mutation);
            }
            await engine.mutate({
                type: "update",
                id: "completions",
                resource: "dataStore/manifesto",
                data: { ...completions, [selectedPeriod]: !completed },
            });
            completionsApi.update({
                ...completions,
                [selectedPeriod]: !completed,
            });
        }
    };

    const chakraStyles: ChakraStylesConfig<Option, false, GroupBase<Option>> = {
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
    };

    const download = () => {
        let wb = utils.book_new();
        wb.Props = {
            Title: "SheetJS Tutorial",
            Subject: "Test",
            Author: "Red Stapler",
            CreatedDate: new Date(),
        };

        wb.SheetNames.push("Listing");
        let ws = utils.json_to_sheet(
            allCommitments.map(
                ({
                    subKeyResultsArea,
                    commitment,
                    MDAs,
                    scoreCode,
                    voteId,
                    performanceId,
                    budgetId,
                    scoreId,
                    commentId,
                }) => ({
                    subKeyResultsArea,
                    scoreCode: String(scoreCode).replace("SC-", ""),
                    commitment,
                    MDAs,
                    performance:
                        values[`${performanceId}-b35egsIMRiP-${voteId}`],
                    budget: values[`${budgetId}-pXpEOcDkwjV-${voteId}`],
                    score: values[`${scoreId}-G5EzBzyQXD9-${voteId}`],
                    comments: values[`${commentId}-s3PFBx7asUX-${voteId}`],
                })
            )
        );
        wb.Sheets["Listing"] = ws;

        const wbout = write(wb, { bookType: "xlsx", type: "binary" });
        saveAs(
            new Blob([s2ab(wbout)], { type: "application/octet-stream" }),
            "export.xlsx"
        );
    };

    const editField = (
        voteId: string,
        dataElement: string,
        co: string,
        isDisabled: boolean
    ) => {
        setCurrentTextField(() => ({ isDisabled, voteId, dataElement, co }));
        onOpen();
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
                <Spacer />
                <Stack alignSelf="right">
                    <Button size="sm" onClick={() => download()}>
                        Download Report
                    </Button>
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
                                    Commitment
                                </Td>
                                <Td w="50px">MDA</Td>
                                <Td>Performance</Td>
                                <Td w="100px" minW="100px" maxW="100px">
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
                                                {isAdmin ||
                                                completions[
                                                    selectedPeriod ?? ""
                                                ] ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            editField(
                                                                voteId,
                                                                performanceId,
                                                                "b35egsIMRiP",
                                                                isAdmin ||
                                                                    completions[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ]
                                                            )
                                                        }
                                                    >
                                                        {String(
                                                            values[
                                                                `${performanceId}-b35egsIMRiP-${voteId}`
                                                            ] ||
                                                                "View Performance"
                                                        ).slice(0, 25)}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            editField(
                                                                voteId,
                                                                performanceId,
                                                                "b35egsIMRiP",
                                                                isAdmin ||
                                                                    completions[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ]
                                                            )
                                                        }
                                                    >
                                                        {String(
                                                            values[
                                                                `${performanceId}-b35egsIMRiP-${voteId}`
                                                            ] ||
                                                                "Review Performance"
                                                        ).slice(0, 25)}
                                                    </Button>
                                                )}
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
                                                        completions[
                                                            selectedPeriod ?? ""
                                                        ]
                                                    }
                                                    defaultValue={
                                                        values[
                                                            `${budgetId}-pXpEOcDkwjV-${voteId}`
                                                        ] ?? ""
                                                    }
                                                    id="RlkUJj1WAs4-pXpEOcDkwjV-val"
                                                    name="entryfield"
                                                    onBlur={async (
                                                        e: FocusEvent<HTMLInputElement>
                                                    ) => {
                                                        e.persist();
                                                        if (selectedPeriod) {
                                                            await postData({
                                                                de: budgetId,
                                                                co: "pXpEOcDkwjV",
                                                                ou: voteId,
                                                                ds: "fFaTViPsQBs",
                                                                value: e.target
                                                                    .value,
                                                                pe: selectedPeriod,
                                                            });
                                                            setValues(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [`${budgetId}-pXpEOcDkwjV-${voteId}`]:
                                                                        e.target
                                                                            .value,
                                                                })
                                                            );
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
                                                        completions[
                                                            selectedPeriod ?? ""
                                                        ]
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
                                                {!isAdmin ||
                                                completions[
                                                    selectedPeriod ?? ""
                                                ] ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            editField(
                                                                voteId,
                                                                commentId,
                                                                "s3PFBx7asUX",
                                                                !isAdmin ||
                                                                    completions[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ]
                                                            )
                                                        }
                                                    >
                                                        {String(
                                                            values[
                                                                `${commentId}-s3PFBx7asUX-${voteId}`
                                                            ] || "View Comments"
                                                        ).slice(0, 25)}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            editField(
                                                                voteId,
                                                                commentId,
                                                                "s3PFBx7asUX",
                                                                !isAdmin ||
                                                                    completions[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ]
                                                            )
                                                        }
                                                    >
                                                        {String(
                                                            values[
                                                                `${commentId}-s3PFBx7asUX-${voteId}`
                                                            ] || "Add Comments"
                                                        ).slice(0, 25)}
                                                    </Button>
                                                )}
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
                            {completions[selectedPeriod ?? ""]
                                ? "Open data entry"
                                : "Submit and Lock"}
                        </Button>
                    )}
                </Box>
            )}
            <Drawer
                isOpen={isOpen}
                placement="right"
                onClose={onClose}
                size="lg"
            >
                <DrawerOverlay />
                <DrawerContent>
                    <Stack spacing="40px">
                        <DrawerCloseButton />
                        <DrawerBody overflow="auto">
                            <Box>
                                <Textarea
                                    border="3px solid yellow"
                                    bg={
                                        backgrounds[
                                            `${currentTextField.dataElement}-${currentTextField.co}-${currentTextField.voteId}`
                                        ]
                                    }
                                    w="100%"
                                    rows={20}
                                    isDisabled={currentTextField.isDisabled}
                                    id={`${currentTextField.dataElement}-${currentTextField.co}-${currentTextField.voteId}-val`}
                                    name="entryfield"
                                    defaultValue={
                                        values[
                                            `${currentTextField.dataElement}-${currentTextField.co}-${currentTextField.voteId}`
                                        ]
                                    }
                                    // onChange={(
                                    //     e: ChangeEvent<HTMLTextAreaElement>
                                    // ) => {
                                    //     console.log(e.target.value);
                                    //     // e.persist();
                                    //     // setValues((prev) => ({
                                    //     //     ...prev,
                                    //     //     [`${currentTextField.dataElement}-${currentTextField.co}-${currentTextField.voteId}`]:
                                    //     //         e.target.value,
                                    //     // }));
                                    // }}
                                    onBlur={(
                                        e: FocusEvent<HTMLTextAreaElement>
                                    ) => {
                                        e.persist();
                                        if (selectedPeriod) {
                                            postData({
                                                de: currentTextField.dataElement,
                                                co: currentTextField.co,
                                                ou: currentTextField.voteId,
                                                ds: "fFaTViPsQBs",
                                                value: e.target.value,
                                                pe: selectedPeriod,
                                            });
                                            setValues((prev) => ({
                                                ...prev,
                                                [`${currentTextField.dataElement}-${currentTextField.co}-${currentTextField.voteId}`]:
                                                    e.target.value,
                                            }));
                                        }
                                    }}
                                />
                            </Box>
                        </DrawerBody>

                        {/* <DrawerFooter>
                            <Button variant="outline" mr={3} onClick={onClose}>
                                Cancel
                            </Button>
                            <Button colorScheme="blue">Save</Button>
                        </DrawerFooter> */}
                    </Stack>
                </DrawerContent>
            </Drawer>
        </Stack>
    );
}
