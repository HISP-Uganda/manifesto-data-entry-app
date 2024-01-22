import { Input, Table, Tbody, Td, Textarea, Thead, Tr } from "@chakra-ui/react";
import { groupBy } from "lodash";
import React from "react";
import { Commitment } from "../interfaces";

export default function Tab1({
    commitments,
    isAdmin,
}: {
    commitments: Array<Commitment>;
    isAdmin: boolean;
}) {
    return (
        <Table>
            <Thead>
                <Tr>
                    <Td width="40px">{commitments[0]?.keyResultsArea}</Td>
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
            </Thead>
            <Tbody>
                {Object.entries(groupBy(commitments, "subKeyResultsArea")).map(
                    ([sbka, groups]) => {
                        return groups.map(
                            (
                                {
                                    subKeyResultsArea,
                                    commitment,
                                    MDAs,
                                    scoreCode,
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
                                        {String(scoreCode).replace("SC-", "")}
                                    </Td>
                                    <Td>{commitment}</Td>
                                    <Td>{MDAs}</Td>
                                    <Td>
                                        <Textarea
                                            isDisabled={isAdmin}
                                            id="YuQ3dvY57PQ-b35egsIMRiP-val"
                                            name="entryfield"
                                            title="PM-1.1.3.0a - The 68.9% of households still stuck in subsistence agriculture PM - Performance"
                                        />
                                    </Td>
                                    <Td>
                                        <Input
                                            isDisabled={isAdmin}
                                            id="RlkUJj1WAs4-pXpEOcDkwjV-val"
                                            name="entryfield"
                                            title="BG-1.1.3.0a - The 68.9% of households still stuck in subsistence agriculture BG - Budget"
                                        />
                                    </Td>
                                    <Td>
                                        <Input
                                            isDisabled={!isAdmin}
                                            id="nX7zRJRnrYe-G5EzBzyQXD9-val"
                                            name="entryfield"
                                            title="SC-1.1.3.0a - The 68.9% of households still stuck in subsistence agriculture SC - Score"
                                        />
                                    </Td>
                                    <Td>
                                        <Textarea
                                            isDisabled={!isAdmin}
                                            id="cYAkzzXVMAN-s3PFBx7asUX-val"
                                            name="entryfield"
                                            title="CM-1.1.3.0a - The 68.9% of households still stuck in subsistence agriculture CM - Narrative"
                                        />
                                    </Td>
                                </Tr>
                            )
                        );
                    }
                )}
            </Tbody>
        </Table>
    );
}
