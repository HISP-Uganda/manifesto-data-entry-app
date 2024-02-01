import { Box, Spinner, Stack, Table, Tbody, Td, Tr, Image, Button, Grid, GridItem, } from "@chakra-ui/react";
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
            <Grid templateRows="48px 1fr" gap={4} p="20px">
                <Stack direction="row" justifyContent="space-between" alignItems="center" h="48px" >
                    <Stack direction="row" bgColor="white" position="sticky" left="0" top="10" zIndex="sticky">
                        <Box width="250px" height="60px">
                            <Image src='https://manifesto.go.ug/wp-content/uploads/2020/06/4.png' alt='Manifesto Logo' />
                        </Box>
                        <Box fontSize="25px" h="30px" mt="20px">
                            <strong>Manifesto Implementation Tracker (2021 - 2026)</strong>
                        </Box>
                    </Stack>
                    <Stack>
                        <Button colorScheme="blue" as="a" href="https://dev.ndpme.go.ug/ndpdb/api/apps/Manifesto-Dashboard" >Manifesto Dashboard</Button>
                    </Stack>
                </Stack>

                <Grid templateColumns="repeat(12, 1fr)">
                    <GridItem colSpan={2} >
                        <Table cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
                            <Tbody>
                                <Tr>
                                    <Td valign="top">
                                        <div className="tab">
                                            {Object.entries(
                                                groupBy(data.commitments, "dataElementGroupSetId")
                                            ).map(([id, group]) => (
                                                <button
                                                    key={id}
                                                    className="tablinks"
                                                    id="defaultOpen"
                                                    onClick={() =>
                                                        setSelected(() =>
                                                            group.filter((g) => {
                                                                if (data.isAdmin) return true;
                                                                return data.organisationUnits.indexOf(g.voteId) !== -1;
                                                            })
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
                    </GridItem>
                    <GridItem colSpan={10}>
                        <Tab1
                            commitments={selected}
                            isAdmin={data.isAdmin}
                            orgUnits={data.organisationUnits}
                        />
                    </GridItem>

                </Grid>

            </Grid>
        );

    return null;
};
