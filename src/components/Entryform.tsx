import {
  Box,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Tr,
  Image,
  Button,
  Grid,
  GridItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Text,
} from "@chakra-ui/react";
import "./app.css";

import { useNavigate } from "@tanstack/react-location";
import { groupBy } from "lodash";
import React, { useState, useEffect } from "react";
import { Commitment, Option } from "../interfaces";
import { useInitial } from "../Queries";
import Tab1 from "./Tab1";

export const EntryForm = () => {
  const { isLoading, isError, isSuccess, error, data } = useInitial();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Array<Commitment>>([]);
  const [defaultSelected, setDefaultSelected] = useState<Array<Commitment>>([]);
  const [selectedOrgUnits, setSelectedOrgUnits] = useState<Option[]>([]);

  const handleButtonClick = () => {
    setIsOpen(true);
  };
  const handleConfirm = () => {
    setIsOpen(false);
    window.location.replace(
      "https://ndpme.go.ug/ndpdb/api/apps/Manifesto-Dashboard/index.html#"
    );
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Filter Key Result Areas based on selected org units
  const getFilteredKeyResultAreas = () => {
    if (!data || selectedOrgUnits.length === 0) {
      return groupBy(data?.commitments || [], "dataElementGroupSetId");
    }
    
    const selectedOrgUnitIds = selectedOrgUnits.map(ou => ou.value);
    const filteredCommitments = data.commitments.filter(c => 
      selectedOrgUnitIds.includes(c.voteId)
    );
    
    return groupBy(filteredCommitments, "dataElementGroupSetId");
  };

  useEffect(() => {
    if (isSuccess && data) {
      const filteredGroups = getFilteredKeyResultAreas();
      const firstGroup = Object.entries(filteredGroups)[0]?.[1] as Commitment[] || [];
      setSelected(firstGroup);
      setDefaultSelected(firstGroup);
    }
  }, [isSuccess, data, selectedOrgUnits]);

  if (isError) return <pre>{JSON.stringify(error)}</pre>;
  if (isLoading)
    return (
      <Stack
        h="100%"
        alignItems="center"
        alignContent="center"
      >
        <Spinner />
      </Stack>
    );
  if (isSuccess && data)
    return (
      <Grid templateRows="48px 1fr" gap={4} p="10px">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          h="48px"
        >
          <Stack
            direction="row"
            bgColor="white"
            position="sticky"
            left="0"
            top="10"
            zIndex="sticky"
            alignItems="center"
            spacing="40px"
          >
            <Box width="250px" height="60px">
              <Image
                src="https://manifesto.go.ug/wp-content/uploads/2020/06/4.png"
                alt="Manifesto Logo"
              />
            </Box>
            <Box fontSize="25px" h="30px" mt="20px">
              <strong>Intergrated Manifesto Reporting System</strong>
            </Box>
          </Stack>
          <Stack>
            <Button
              color="#ffff"
              backgroundColor="#009696"
              _hover={{ bg: "yellow.500", color: "#ffff" }}
              size="sm"
              onClick={handleButtonClick}
            >
              Manifesto Dashboard
            </Button>
            <Modal isOpen={isOpen} onClose={handleClose}>
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>Manifesto Dashboard Confirmation</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  Are you sure you want to go to the Manifesto Dashboard?
                </ModalBody>
                <ModalFooter>
                  <Button colorScheme="blue" mr={3} onClick={handleConfirm}>
                    Confirm
                  </Button>
                  <Button variant="ghost" onClick={handleClose}>
                    Cancel
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </Stack>
        </Stack>

        <Grid templateColumns="repeat(12, 1fr)" gap={2}>
          <GridItem colSpan={2}>
            <Table
              cellPadding="0"
              cellSpacing="0"
              style={{ borderCollapse: "collapse" }}
              overflowY="scroll"
            >
              <Tbody>
                <Tr>
                  <Td bgColor="gray.300">
                    <Text fontSize="xl" fontWeight="extrabold">
                      Key Result Areas
                    </Text>
                  </Td>
                </Tr>
                <Tr>
                  <Td valign="top" p="4px" bgColor="gray.300">
                    <div className="tab">
                      {Object.entries(getFilteredKeyResultAreas()).map(([id, group]) => (
                        <button
                          key={id}
                          className={`tablinks ${
                            JSON.stringify(selected) === JSON.stringify(group)
                              ? "active"
                              : ""
                          }`}
                          onClick={() => {
                            setSelected(group as Commitment[]);
                          }}
                        >
                          {(group as Commitment[])[0]?.keyResultsArea}
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
              selectedOrgUnits={selectedOrgUnits}
              onSelectedOrgUnitsChange={setSelectedOrgUnits}
            />
          </GridItem>
        </Grid>
      </Grid>
    );

  return null;
};
