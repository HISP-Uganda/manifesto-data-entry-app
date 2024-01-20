import { Box, Spinner, Table, Tbody, Td, Tr, Stack } from "@chakra-ui/react";
import React, { useState } from "react";
import { useInitial } from "../Queries";
import { DataElementGroupSet } from "../interfaces";
import Tab1 from "./Tab1";
interface Row {
    code: string;
    dataElement: string;
    mda: string;
    performance: string;
    budget: string;
    score: string;
    comments: string;
}

interface TabContent {
    title: string;
    data: Row[];
}

export const EntryForm = () => {
    const { isLoading, isError, isSuccess, error, data } = useInitial();
    const [selected, setSelected] = useState<DataElementGroupSet | undefined>();
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
                    <Table
                        border="1"
                        borderColor="#ccc"
                        cellPadding="0"
                        cellSpacing="0"
                        style={{ borderCollapse: "collapse" }}
                        w="10%"
                    >
                        <Tbody>
                            <Tr>
                                <Td valign="top">
                                    <div className="tab">
                                        {data.map((degs) => (
                                            <button
                                                key={degs.id}
                                                className="tablinks"
                                                id="defaultOpen"
                                                onClick={() =>
                                                    setSelected(() => degs)
                                                }
                                            >
                                                {degs.name}
                                            </button>
                                        ))}
                                    </div>
                                </Td>
                            </Tr>
                        </Tbody>
                    </Table>
                    <Tab1 degs={selected} />
                </Stack>
            </Stack>
        );

    return null;
};
