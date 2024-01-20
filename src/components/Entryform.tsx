import React, { useState } from 'react';
import {
    ChakraProvider,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    CSSReset,
    extendTheme,
    Box,
    Image,
    Heading,
    Spacer,
    Flex,
    Tabs,
    TabList,
    Tab,
    Grid,
    GridItem,
    Button,
    Link,
} from '@chakra-ui/react';

const customTheme = extendTheme({
    styles: {
        global: {
            'caption': {
                backgroundColor: 'green.400',
                color: 'white',
                fontWeight: 'bold',
                padding: '8px',
            },
            'tr': {
                borderBottom: '2px solid',
                borderColor: 'green.400',
            },
            'th, td': {
                border: '1px solid',
                borderColor: 'green.400',
                padding: '8px',
            },
        },
    },
    components: {
        Tabs: {
            variants: {
                enclosedColored: {
                    tab: {
                        _selected: {
                            color: 'black',
                            bg: 'green.400',
                            fontWeight: 'bold',
                        },
                        _active: {
                            bg: 'green.400',
                            color: 'black',
                            fontWeight: 'bold',
                        },
                        _disabled: {
                            bg: 'green.200',
                            color: 'black',
                            fontWeight: 'bold',
                        },
                    },
                },
            },
        },
    },
});

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

const Entryform = () => {
    const [selectedTab, setSelectedTab] = useState(0);

    const tabContents: TabContent[] = [
        {
            title: 'Section 1',
            data: [
                { code: '001', dataElement: 'Element1', mda: 'MDA1', performance: 'Good', budget: '1.5', score: '2', comments: 'carapai comment' },
                { code: '002', dataElement: 'Element2', mda: 'MDA2', performance: 'Average', budget: '2.0', score: '3', comments: 'some other comment' },
            ],
        },
        {
            title: 'Section 2',
            data: [
            ],
        },
        {
            title: 'Section 3',
            data: [
            ],
        },
    ];

    const handleTabClick = (index: number) => {
        setSelectedTab(index);
    };

    return (
        <ChakraProvider theme={customTheme}>
            <CSSReset />
            <Grid templateColumns="1fr" templateRows="auto 1fr" gap={4} h="100vh">
                <GridItem >
                    <Flex alignItems="center" justify="space-between" p={2}>
                        <Box display="flex" alignItems="center">
                            <Image
                                src="https://manifesto.go.ug/wp-content/uploads/2020/06/4.png"
                                alt="Logo"
                                boxSize="50px"
                                w="200px"
                            />
                            <Heading as="h1" ml="4" size="lg">
                                Manifesto Implementation Unit Data Entry
                            </Heading>
                        </Box>
                        <Link href="/api/apps/Manifesto-Dashboard/index.html#">
                            <Button colorScheme="teal">Manifesto Dashboard</Button>
                        </Link>
                    </Flex>
                </GridItem>

                <GridItem rowSpan={1} colSpan={1} p={4}>
                    <Grid templateColumns="repeat(12, 1fr)" gap={4} h="100%">
                        <GridItem colSpan={2} >
                            <Tabs
                                orientation="vertical"
                                variant="enclosedColored"
                                index={selectedTab}
                                onChange={handleTabClick}
                            >
                                <TabList>
                                    {tabContents.map((tab, index) => (
                                        <Tab key={index}>{tab.title}</Tab>
                                    ))}
                                </TabList>
                            </Tabs>
                        </GridItem>

                        <GridItem colSpan={10}>
                            <Table variant="simple" size="md">
                                <caption>
                                    Manifesto Implementation Scorecard 2021 - 2026
                                </caption>
                                <Thead>
                                    <Tr>
                                        <Th>Code</Th>
                                        <Th>Data Element</Th>
                                        <Th>MDA</Th>
                                        <Th>Performance</Th>
                                        <Th>Budget (Ugx Bn)</Th>
                                        <Th>Score</Th>
                                        <Th>Comments</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {tabContents[selectedTab].data.map(
                                        (row, index) => (
                                            <Tr key={index}>
                                                <Td>{row.code}</Td>
                                                <Td>{row.dataElement}</Td>
                                                <Td>{row.mda}</Td>
                                                <Td>{row.performance}</Td>
                                                <Td>{row.budget}</Td>
                                                <Td>{row.score}</Td>
                                                <Td>{row.comments}</Td>
                                            </Tr>
                                        )
                                    )}
                                </Tbody>
                            </Table>
                        </GridItem>
                    </Grid>

                </GridItem>
            </Grid>
        </ChakraProvider>
    );
};

export default Entryform;