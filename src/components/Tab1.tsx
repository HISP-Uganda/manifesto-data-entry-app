import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    Box,
    Button,
    Drawer,
    DrawerBody,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerOverlay,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
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
    useToast,
} from "@chakra-ui/react";
import { useDataEngine } from "@dhis2/app-runtime";
import { generateFixedPeriods } from "@dhis2/multi-calendar-dates";
import { ChakraStylesConfig, GroupBase, Select } from "chakra-react-select";
import { useStore } from "effector-react";
import { saveAs } from "file-saver";
import { groupBy, uniq } from "lodash";
import React, { FocusEvent, useEffect, useRef, useState } from "react";
import "react-quill/dist/quill.snow.css";
import { utils, write } from "xlsx";
import { Commitment, Option, CurrentUser } from "../interfaces";
import { useDataSetData } from "../Queries";
import {
    $approvals,
    $commitments,
    $completions,
    approvalsApi,
    completionsApi,
    $currentUser,
} from "../Store";
import { changeApproval, s2ab } from "../utils";
import PeriodSelector from "./PeriodSelector";

const scores: Option[] = [
    { label: "1 - Achieved", value: "1", colorScheme: "green", variant: "" },
    { label: "2 - Commenced", value: "2", colorScheme: "yellow" },
    { label: "3 - Not Implemented", value: "3", colorScheme: "red" },
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
    const cancelRef = useRef<any>();

    const { isOpen, onOpen, onClose } = useDisclosure();
    const {
        isOpen: isOpenApproval,
        onOpen: onOpenApproval,
        onClose: onCloseApproval,
    } = useDisclosure();
    const [isOpened, setIsOpened] = useState(false);
    const [isOpening, setIsOpening] = useState(false);
    const [actionType, setActionType] = useState("");
    const toast = useToast();
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [selectedPeriod, setSelectedPeriod] = useState<string>();
    const [isLoad, setIsLoad] = useState(false);
    const [values, setValues] = useState<Record<string, string>>({});
    const [info, setInfo] = useState<Record<string, any>>({});
    const [backgrounds, setBackgrounds] = useState<Record<string, string>>({});
    const currentUser = useStore($currentUser);
    const completions = useStore($completions);
    const allCommitments = useStore($commitments);
    const approvals = useStore($approvals);
    const [currentTextField, setCurrentTextField] = useState<{
        voteId: string;
        dataElement: string;
        isDisabled: boolean;
        co: string;
        info: any;
    }>({ voteId: "", dataElement: "", isDisabled: false, co: "", info: {} });
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
    useEffect(() => {
        const defaultPeriod = `${year}July`;
        setSelectedPeriod(defaultPeriod);
    }, []);
    const onYearChange = (diff: number) => {
        setYear((year) => year + diff);
        setSelectedPeriod(undefined);
    };

    const { isLoading, isError, isSuccess, error, data } = useDataSetData({
        selectedPeriod,
        orgUnits,
    });

    //Handling the Download Report Button

    const handleButtonClick = () => {
        console.log("Download Report button clicked");
        setIsOpened(() => true);
    };
    const handleConfirm = () => {
        setIsOpened(() => false);
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

    const handleClose = () => {
        setIsOpened(() => false);
    };
    //Handling the Submit and Lock button plus the Recall and Edit button

    const handleSubmitAndLockClick = (type: string) => {
        setActionType(type);
        setIsOpening(() => true);
    };

    const handleApproval = async () => {
        if (selectedPeriod) {
            const currentApproval = {
                period: selectedPeriod,
                approved: true,
                mda: allCommitments[0].voteId,
                currentUser,
            };
            await engine.mutate({
                type: "update",
                id: "approvals",
                resource: "dataStore/manifesto",
                data: changeApproval(approvals, currentApproval),
            });
            approvalsApi.set(currentApproval);
            onCloseApproval();
        }
    };

    const handleConfirmSubmitAndLock = async () => {
        setIsLoad(true);
        if (actionType === "submit") {
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
                                    period: selectedPeriod,
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
        } else if (actionType === "recall") {
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
                                    period: selectedPeriod,
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
        }
        setIsOpening(false);
        setIsLoad(false);
        const message =
            actionType === "submit"
                ? "Report submitted successfully."
                : "Report recalled for edit successfully.";
        toast({
            title: message,
            status: "success",
            duration: 5000,
            isClosable: true,
        });
    };

    const handleClosed = () => {
        setIsOpening(() => false);
    };

    useEffect(() => {
        if (data) {
            setValues(() => ({}));
            setInfo(() => ({}));

            data.dataValues.forEach(
                ({
                    dataElement,
                    value,
                    categoryOptionCombo,
                    orgUnit,
                    ...rest
                }) => {
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
                        setInfo((prev) => ({
                            ...prev,
                            [`${dataElement}-${categoryOptionCombo}-${orgUnit}`]:
                                rest,
                        }));
                    }
                }
            );
        } else {
            setValues(() => ({}));
            setInfo(() => ({}));
        }
        return () => {
            setValues(() => ({}));
            setInfo(() => ({}));
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

    const editField = (
        voteId: string,
        dataElement: string,
        co: string,
        isDisabled: boolean,
        info: any
    ) => {
        console.log(info);
        setCurrentTextField(() => ({
            isDisabled,
            voteId,
            dataElement,
            co,
            info,
        }));
        onOpen();
    };

    return (
        <Stack h="100%">
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
                <Stack direction="row" pt="1" spacing="4">
                    <Text fontWeight="extrabold" fontSize="xl">
                        Legend:
                    </Text>
                    <Box
                        w="50px"
                        h="30px"
                        bg="green.500"
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                    >
                        <Text
                            color="white"
                            fontSize="lg"
                            fontWeight="extrabold"
                        >
                            1
                        </Text>
                    </Box>
                    <Text fontWeight="bold" fontSize="lg" color="green.500">
                        Achieved
                    </Text>
                    <Box
                        w="50px"
                        h="30px"
                        bg="yellow.500"
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                    >
                        <Text
                            color="white"
                            fontSize="lg"
                            fontWeight="extrabold"
                        >
                            2
                        </Text>
                    </Box>
                    <Text fontWeight="bold" fontSize="lg" color="yellow.500">
                        Commenced
                    </Text>
                    <Box
                        w="50px"
                        h="30px"
                        bg="red.500"
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                    >
                        <Text
                            color="white"
                            fontSize="lg"
                            fontWeight="extrabold"
                        >
                            3
                        </Text>
                    </Box>
                    <Text fontWeight="bold" fontSize="lg" color="red.500">
                        Not implemented
                    </Text>
                </Stack>
                <Spacer />
                <Stack>
                    <Button
                        color="#ffff"
                        backgroundColor="#009696"
                        _hover={{ bg: "yellow.500", color: "#ffff" }}
                        size="sm"
                        onClick={handleButtonClick}
                    >
                        Download Report
                    </Button>
                    <Modal isOpen={isOpened} onClose={handleClose}>
                        <ModalOverlay />
                        <ModalContent>
                            <ModalHeader>
                                Download Report Confirmation
                            </ModalHeader>
                            <ModalCloseButton />
                            <ModalBody>
                                Are you sure you want to download this Report?
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    colorScheme="blue"
                                    mr={3}
                                    onClick={handleConfirm}
                                >
                                    Download
                                </Button>
                                <Button variant="ghost" onClick={handleClose}>
                                    Cancel
                                </Button>
                            </ModalFooter>
                        </ModalContent>
                    </Modal>
                </Stack>
            </Stack>
            {isError && <pre>{JSON.stringify(error, null, 2)}</pre>}
            {isLoading && (
                <Stack
                    h="100%"
                    alignItems="center"
                    justifyContent="center"
                    justifyItems="center"
                    alignContent="center"
                >
                    <Spinner />
                </Stack>
            )}
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
                                <Td w="100px">Code</Td>
                                <Td w="500px" minW="500px" maxW="500px">
                                    Manifesto Commitment
                                </Td>
                                <Td w="50px">Lead MDA</Td>
                                <Td>Annual Performance</Td>
                                <Td w="100px" minW="100px" maxW="100px">
                                    <p>
                                        Budget <br /> (Ugx Bn)
                                    </p>
                                </Td>
                                <Td w="170px">Annual Performance Score</Td>
                                <Td>Comments (Score)</Td>
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
                                            leadMDA,
                                            voteName,
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
                                                        onClick={() => {
                                                            setActionType(
                                                                "performance"
                                                            );
                                                            editField(
                                                                voteId,
                                                                performanceId,
                                                                "b35egsIMRiP",
                                                                isAdmin ||
                                                                    completions[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ] ||
                                                                    approvals[
                                                                        voteId
                                                                    ]?.[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ]?.[
                                                                        "approved"
                                                                    ],
                                                                {
                                                                    ...(info[
                                                                        `${performanceId}-b35egsIMRiP-${voteId}`
                                                                    ] ?? {}),
                                                                    voteName,
                                                                    leadMDA,
                                                                    ...(approvals[
                                                                        voteId
                                                                    ]?.[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ] ?? {}),
                                                                }
                                                            );
                                                        }}
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
                                                                    ] ||
                                                                    approvals[
                                                                        voteId
                                                                    ]?.[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ]?.[
                                                                        "approved"
                                                                    ],
                                                                {
                                                                    ...(info[
                                                                        `${performanceId}-b35egsIMRiP-${voteId}`
                                                                    ] ?? {}),
                                                                    voteName,
                                                                    leadMDA,
                                                                    ...(approvals[
                                                                        voteId
                                                                    ]?.[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ] ?? {}),
                                                                }
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
                                                        ] ||
                                                        approvals[voteId]?.[
                                                            selectedPeriod ?? ""
                                                        ]?.["approved"]
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
                                                        ] ||
                                                        !approvals[voteId]?.[
                                                            selectedPeriod ?? ""
                                                        ]?.["approved"]
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
                                                    isClearable
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
                                                                    ] ||
                                                                    approvals[
                                                                        voteId
                                                                    ]?.[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ]?.[
                                                                        "approved"
                                                                    ],
                                                                {
                                                                    ...(info[
                                                                        `${performanceId}-b35egsIMRiP-${voteId}`
                                                                    ] ?? {}),
                                                                    voteName,
                                                                    leadMDA,
                                                                    ...(approvals[
                                                                        voteId
                                                                    ]?.[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ] ?? {}),
                                                                }
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
                                                        onClick={() => {
                                                            setActionType(
                                                                "comments"
                                                            );
                                                            editField(
                                                                voteId,
                                                                commentId,
                                                                "s3PFBx7asUX",
                                                                !isAdmin ||
                                                                    completions[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ] ||
                                                                    approvals[
                                                                        voteId
                                                                    ]?.[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ]?.[
                                                                        "approved"
                                                                    ],
                                                                {
                                                                    ...(info[
                                                                        `${performanceId}-b35egsIMRiP-${voteId}`
                                                                    ] ?? {}),
                                                                    voteName,
                                                                    leadMDA,
                                                                    ...(approvals[
                                                                        voteId
                                                                    ]?.[
                                                                        selectedPeriod ??
                                                                            ""
                                                                    ] ?? {}),
                                                                }
                                                            );
                                                        }}
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
                            colorScheme={
                                completions[selectedPeriod ?? ""]
                                    ? "red"
                                    : "green"
                            }
                            size="sm"
                            position="fixed"
                            bottom="20px"
                            right="20px"
                            onClick={() =>
                                handleSubmitAndLockClick(
                                    completions[selectedPeriod ?? ""]
                                        ? "recall"
                                        : "submit"
                                )
                            }
                        >
                            {completions[selectedPeriod ?? ""]
                                ? "Recall Data and Edit"
                                : "Submit and Lock"}
                        </Button>
                    )}
                    {!isAdmin && (
                        <Button
                            size="sm"
                            position="fixed"
                            bottom="20px"
                            right="20px"
                            onClick={() => onOpenApproval()}
                            isDisabled={
                                !completions[selectedPeriod ?? ""] &&
                                approvals[allCommitments[0].voteId]?.[
                                    selectedPeriod ?? ""
                                ]?.["approved"]
                            }
                        >
                            Approve
                        </Button>
                    )}

                    <Modal isOpen={isOpening} onClose={handleClosed}>
                        <ModalOverlay />
                        <ModalContent>
                            <ModalHeader>
                                {actionType === "submit"
                                    ? "Lock data confirmation"
                                    : "Recall Data and Edit Confirmation"}
                            </ModalHeader>
                            <ModalCloseButton />
                            <ModalBody>
                                {actionType === "submit"
                                    ? "Are you sure you want to lock this data?"
                                    : "Are you sure you want to recall and edit this data?"}
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    color="#ffff"
                                    backgroundColor="#009696"
                                    _hover={{
                                        bg: "yellow.500",
                                        color: "#ffff",
                                    }}
                                    mr={3}
                                    onClick={handleConfirmSubmitAndLock}
                                    isLoading={isLoad}
                                >
                                    Confirm
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={handleClosed}
                                    _hover={{ bg: "red.500", color: "#ffff" }}
                                >
                                    Cancel
                                </Button>
                            </ModalFooter>
                        </ModalContent>
                    </Modal>
                </Box>
            )}

            <AlertDialog
                isOpen={isOpenApproval}
                leastDestructiveRef={cancelRef}
                onClose={onCloseApproval}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Approve
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure? You can't undo this action afterwards.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={onCloseApproval}>
                                Cancel
                            </Button>
                            <Button
                                colorScheme="red"
                                onClick={() => handleApproval()}
                                ml={3}
                            >
                                Approve
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
            <Drawer
                isOpen={isOpen}
                placement="right"
                onClose={onClose}
                size="lg"
            >
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerHeader>
                            {actionType === "comments"
                                ? "Comments (Score)"
                                : "Annual Performance"}
                        </DrawerHeader>
                    </DrawerHeader>

                    <DrawerBody overflow="auto">
                        <Stack>
                            <Textarea
                                border="3px solid yellow"
                                placeholder="Please Enter text here..."
                                h="80vh"
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
                            {currentTextField.info["approved"] && isAdmin && (
                                <Stack>
                                    <Stack direction="row" spacing="20px">
                                        <Text fontWeight="bold">Vote:</Text>
                                        <Text>
                                            {currentTextField.info["voteName"]}
                                        </Text>
                                    </Stack>
                                    <Stack direction="row" spacing="20px">
                                        <Text fontWeight="bold">MDA:</Text>
                                        <Text>
                                            {currentTextField.info["leadMDA"]}
                                        </Text>
                                    </Stack>
                                    <Stack direction="row" spacing="20px">
                                        <Text fontWeight="bold">
                                            Approver By:
                                        </Text>
                                        <Text>
                                            {currentTextField.info["name"]}
                                        </Text>
                                    </Stack>
                                </Stack>
                            )}
                        </Stack>
                    </DrawerBody>
                    <DrawerFooter
                        display="flex"
                        justifyContent="flex-start"
                        alignItems="center"
                        mt={4}
                    >
                        <Button
                            onClick={onClose}
                            color="#ffff"
                            backgroundColor="#009696"
                            _hover={{ bg: "yellow.500", color: "#ffff" }}
                        >
                            OK
                        </Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </Stack>
    );
}
