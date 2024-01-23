import { Box, Spinner, Stack, Table, Tbody, Td, Tr } from "@chakra-ui/react";
import { groupBy } from "lodash";
import React, { useState } from "react";
import { Commitment } from "../interfaces";
import { useInitial } from "../Queries";
import Tab1 from "./Tab1";

export const EntryForm = () => {
    const { isLoading, isError, isSuccess, error, data } = useInitial();
    const [selected, setSelected] = useState<Array<Commitment>>([]);
    if (isError) return <pre>{JSON.stringify(error)}</pre>;
    if (isLoading) return <Spinner />;
    if (isSuccess && data)
        return (
            <Stack p="20px">
                <Box fontSize="20px" color="white" bgColor="#669872" h="40px">
                    <strong>
                        Manifesto Implementation Scorecard 2021 - 2026
                    </strong>
                </Box>
                <Stack spacing="20px" direction="row">
                    <Box w="350px" maxW="350px" minW="350px">
                        <Table
                            cellPadding="0"
                            cellSpacing="0"
                            style={{ borderCollapse: "collapse" }}
                        >
                            <Tbody>
                                <Tr>
                                    <Td valign="top">
                                        <div className="tab">
                                            {Object.entries(
                                                groupBy(
                                                    data.commitments,
                                                    "dataElementGroupSetId"
                                                )
                                            ).map(([id, group]) => (
                                                <button
                                                    key={id}
                                                    className="tablinks"
                                                    id="defaultOpen"
                                                    onClick={() =>
                                                        setSelected(() =>
                                                            group.filter(
                                                                (g) => {
                                                                    if (
                                                                        data.isAdmin
                                                                    )
                                                                        return true;
                                                                    return (
                                                                        data.organisationUnits.indexOf(
                                                                            g.voteId
                                                                        ) !== -1
                                                                    );
                                                                }
                                                            )
                                                        )
                                                    }
                                                >
                                                    {group[0].keyResultsArea}
                                                </button>
                                            ))}
                                        </div>
                                    </Td>
                                </Tr>
                            </Tbody>
                        </Table>
                    </Box>
                    <Box flex={1}>
                        <Tab1
                            commitments={selected}
                            isAdmin={data.isAdmin}
                            orgUnits={data.organisationUnits}
                        />
                    </Box>
                </Stack>
            </Stack>
        );

    return null;
};
