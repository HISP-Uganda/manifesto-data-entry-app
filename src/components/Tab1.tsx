import React from "react";
import { DataElementGroupSet } from "../interfaces";
import {
    Box,
    Table,
    Td,
    Tr,
    Thead,
    Tbody,
    Input,
    Textarea,
} from "@chakra-ui/react";

export default function Tab1({
    degs,
}: {
    degs: DataElementGroupSet | undefined;
}) {
    return (
        <Box className="tabcontent" id="tab1" flex={1}>
            <Table>
                <Tbody>
                    <Tr>
                        <Td width="40px">{degs?.name}</Td>
                        <Td>code</Td>
                        <Td>Data element</Td>
                        <Td>MDA</Td>
                        <Td>Performance</Td>
                        <Td>
                            <p>
                                Budget
                                <br />
                                (Ugx Bn)
                            </p>
                        </Td>
                        <Td>Score</Td>
                        <Td>Comments</Td>
                    </Tr>
                    {degs?.dataElementGroups
                        .flatMap(
                            ({ id, name, code, dataElements }) => dataElements
                        )
                        .map(({ id, name, code }) => (
                            <Tr>
                                <Td>{name}</Td>
                                <Td></Td>
                                <Td>
                                    The 68.9% of households still stuck in
                                    subsistence agriculture
                                </Td>
                                <Td>MAAIF</Td>
                                <Td>
                                    <Textarea
                                        id="YuQ3dvY57PQ-b35egsIMRiP-val"
                                        name="entryfield"
                                        title="PM-1.1.3.0a - The 68.9% of households still stuck in subsistence agriculture PM - Performance"
                                    />
                                </Td>
                                <Td>
                                    <Input
                                        id="RlkUJj1WAs4-pXpEOcDkwjV-val"
                                        name="entryfield"
                                        title="BG-1.1.3.0a - The 68.9% of households still stuck in subsistence agriculture BG - Budget"
                                    />
                                </Td>
                                <Td>
                                    <Input
                                        id="nX7zRJRnrYe-G5EzBzyQXD9-val"
                                        name="entryfield"
                                        title="SC-1.1.3.0a - The 68.9% of households still stuck in subsistence agriculture SC - Score"
                                    />
                                </Td>
                                <Td>
                                    <Textarea
                                        id="cYAkzzXVMAN-s3PFBx7asUX-val"
                                        name="entryfield"
                                        title="CM-1.1.3.0a - The 68.9% of households still stuck in subsistence agriculture CM - Narrative"
                                    />
                                </Td>
                            </Tr>
                        ))}
                </Tbody>
            </Table>
        </Box>
    );
}
