import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Input,
  Image,
  Icon,
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
  MenuButton,
  Menu,
  Portal,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { useDataEngine } from "@dhis2/app-runtime";
import { generateFixedPeriods } from "@dhis2/multi-calendar-dates";
import { ChakraStylesConfig, GroupBase, Select } from "chakra-react-select";
import { useUnit } from "effector-react";
import { saveAs } from "file-saver";
import { groupBy, uniq } from "lodash";
import React, { FocusEvent, useEffect, useRef, useState } from "react";
import "react-quill/dist/quill.snow.css";
import { utils, write } from "xlsx";
import { Commitment, Option, CurrentUser } from "../interfaces";
import { useDataSetData } from "../Queries";
import { FaFilePdf, FaFileCsv, FaFileWord, FaFileExcel } from "react-icons/fa";
import type { IconType } from "react-icons";


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
import { jsPDF } from "jspdf";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import Quill from "quill";
import autoTable from 'jspdf-autotable';
import { Tooltip } from "@chakra-ui/react";
// import html2pdf from 'html2pdf.js';
import ExcelJS from "exceljs";

const BlockEmbed = Quill.import("blots/block/embed");

class HTMLBlock extends BlockEmbed {
  static blotName = "html";
  static tagName = "div";
  static create(value: string) {
    let node = super.create();
    node.innerHTML = value;
    return node;
  }
  static value(node: any) {
    return node.innerHTML;
  }
}
Quill.register(HTMLBlock);

const modules = {
  toolbar: {
    container: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["clean"],
      ["table"],
    ],
    handlers: {
      table: function () {
        const editor = this.quill;
        const tableHTML = `<table border="1" style="border-collapse: collapse;"><tbody><tr><td style="padding: 4px;">Cell 1</td><td style="padding: 4px;">Cell 2</td></tr><tr><td style="padding: 4px;">Cell 3</td><td style="padding: 4px;">Cell 4</td></tr></tbody></table>`;
        const range = editor.getSelection(true);
        editor.insertEmbed(range.index, "html", tableHTML, "user");
      },
    },
  },
  clipboard: {
    matchVisual: false,
    matchers: [
      [
        "table",
        function (node, delta) {
          return { ops: [{ insert: { html: node.outerHTML } }] };
        },
      ],
    ],
  },
};

const scores = [
  { label: "1 - Achieved", value: "1", colorScheme: "green" },
  { label: "2 - Ongoing", value: "2", colorScheme: "yellow" },
  { label: "3 - Not yet Implemented", value: "3", colorScheme: "red" },
] as Array<Option & { colorScheme: string }>;

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
  const currentUser = useUnit($currentUser);
  const completions = useUnit($completions);
  const allCommitments = useUnit($commitments);
  const approvals = useUnit($approvals);
  const isReportApproved =
    approvals[allCommitments[0].voteId]?.[selectedPeriod ?? ""]?.["approved"];
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
    const currentYear = new Date().getFullYear();
    const previousFiscalYearStart = currentYear - 1;
    const previousFiscalYearEnd = currentYear;
    const defaultPeriod = `${previousFiscalYearStart}July`;
    setSelectedPeriod(defaultPeriod);
  }, []);

  const onYearChange = (diff: number) => {
    setYear((year) => year + diff);
    const selectedYear = year + diff;
    const selectedPeriod = `${selectedYear}July`;
    setSelectedPeriod(selectedPeriod);
  };

  // const getTooltipText = (
  //   voteId: string,
  //   dataElement: string,
  //   co: string
  // ): string => {
  //   return (
  //     stripHtml(values[`${dataElement}-${co}-${voteId}`] || "") ||
  //     "No data available"
  //   );
  // };

  const getTooltipText = (
    voteId: string,
    dataElement: string,
    co: string
  ): string => {
    const fullText = stripHtml(values[`${dataElement}-${co}-${voteId}`] || "") || "No data available";
    const lines = fullText.split(/\r?\n|(?<=\.)\s+/).slice(0, 4);
    const shortText = lines.join(" \u2022 ");
    return lines.length < fullText.split(/\r?\n|(?<=\.)\s+/).length ? shortText + "..." : shortText;
  };


  const getScoreLabel = (value: string) => {
    const found = scores.find((s) => s.value === value);
    return found?.label.split(" - ")[1] ?? value;
  };

  const getScoreColorHex = (value: string): string => {
    if (value === "1") return "FF008000";
    if (value === "2") return "FFFEE200";
    if (value === "3") return "FFFF0000";
    return "FFFFFFFF";
  };

  const getScoreRGB = (value: string): [number, number, number] => {
    if (value === "1") return [0, 128, 0];
    if (value === "2") return [254, 226, 0];
    if (value === "3") return [255, 0, 0];
    return [255, 255, 255];
  };

  const customChakraStyles: ChakraStylesConfig<
    Option,
    false,
    GroupBase<Option>
  > = {
    control: (provided, state) => {
      let bgColor = "white";
      if (state.hasValue && state.getValue()[0]) {
        const selectedValue = state.getValue()[0].value;
        if (selectedValue === "1") bgColor = "green.600";
        else if (selectedValue === "2") bgColor = "#FEE200";
        else if (selectedValue === "3") bgColor = "red.500";
      }
      return {
        ...provided,
        backgroundColor: bgColor,
        borderColor: state.isFocused ? "gray.400" : "gray.200",
        boxShadow: state.isFocused ? "0 0 0 1px gray" : "none",
      };
    },
    option: (provided, state) => {
      let bg;
      let color;
      if (state.isSelected) {
        if (state.data.value === "1") bg = "green.600";
        else if (state.data.value === "2") bg = "#FEE200";
        else if (state.data.value === "3") bg = "red.500";
      } else if (state.isFocused) {
        if (state.data.value === "1") bg = "green.100";
        else if (state.data.value === "2") bg = "yellow.100";
        else if (state.data.value === "3") bg = "red.100";
      } else {
        bg = "white";
      }
      return {
        ...provided,
        backgroundColor: bg,
        color: state.isSelected ? "white" : "black",
      };
    },
    singleValue: (provided, state) => ({
      ...provided,
      color: "white",
    }),
  };

  const { isLoading, isError, isSuccess, error, data } = useDataSetData({
    selectedPeriod,
    orgUnits,
  });

  //New download button
  const handleDownloadXlsx = async () => {
    setIsOpened(false);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Report");

    sheet.columns = [
      { header: "Commitment", key: "commitment", width: 40 },
      { header: "MDAs", key: "MDAs", width: 25 },
      { header: "Performance", key: "performance", width: 40 },
      { header: "Budget", key: "budget", width: 15 },
      { header: "Score", key: "score", width: 15 },
      { header: "Comments", key: "comments", width: 40 },
    ];

    allCommitments.forEach(
      ({ commitment, MDAs, voteId, performanceId, budgetId, scoreId, commentId }) => {
        sheet.addRow({
          commitment: stripHtml(commitment),
          MDAs: stripHtml(MDAs),
          performance: stripHtml(values[`${performanceId}-b35egsIMRiP-${voteId}`] || ""),
          budget: stripHtml(values[`${budgetId}-pXpEOcDkwjV-${voteId}`] || ""),
          score: getScoreLabel(values[`${scoreId}-G5EzBzyQXD9-${voteId}`] || ""),
          comments: stripHtml(values[`${commentId}-s3PFBx7asUX-${voteId}`] || ""),
        });

        const row = sheet.lastRow;
        const scoreValue = values[`${scoreId}-G5EzBzyQXD9-${voteId}`];
        if (scoreValue && row) {
          row.getCell("score").fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: getScoreColorHex(scoreValue) },
          };
          row.getCell("score").font = { color: { argb: "FFFFFFFF" }, bold: true };
        }
      }
    );

    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF009696" },
    };

    sheet.eachRow((row) => {
      row.alignment = { vertical: "middle", wrapText: true };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "report.xlsx");
  };

  const handleDownloadCsv = () => {
    setIsOpened(false);

    const escapeCsv = (value: string): string => {
      const v = value?.toString().replace(/\r?\n|\r/g, " ").trim() ?? "";
      return `"${v.replace(/"/g, '""')}"`;
    };

    const headers = [
      "subKeyResultsArea",
      "scoreCode",
      "commitment",
      "MDAs",
      "performance",
      "budget",
      "score",
      "comments",
    ];

    const rows = allCommitments.map(
      ({ subKeyResultsArea, commitment, MDAs, scoreCode, voteId, performanceId, budgetId, scoreId, commentId }) => [
        escapeCsv(stripHtml(subKeyResultsArea)),
        escapeCsv(String(scoreCode).replace("SC-", "")),
        escapeCsv(stripHtml(commitment)),
        escapeCsv(stripHtml(MDAs)),
        escapeCsv(stripHtml(values[`${performanceId}-b35egsIMRiP-${voteId}`] || "")),
        escapeCsv(stripHtml(values[`${budgetId}-pXpEOcDkwjV-${voteId}`] || "")),
        escapeCsv(getScoreLabel(values[`${scoreId}-G5EzBzyQXD9-${voteId}`] || "")),
        escapeCsv(stripHtml(values[`${commentId}-s3PFBx7asUX-${voteId}`] || "")),
      ].join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "export.csv");
  };

  const stripHtml = (html: string): string => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleDownloadPdf = () => {
    setIsOpened(false);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a2' });

    const headers = ["Commitment", "MDAs", "Performance", "Budget", "Score", "Comments"];

    const rows = allCommitments.map(({ commitment, MDAs, voteId, performanceId, budgetId, scoreId, commentId }) => [
      stripHtml(commitment),
      stripHtml(MDAs),
      stripHtml(values[`${performanceId}-b35egsIMRiP-${voteId}`] || ""),
      stripHtml(values[`${budgetId}-pXpEOcDkwjV-${voteId}`] || ""),
      getScoreLabel(values[`${scoreId}-G5EzBzyQXD9-${voteId}`] || ""),
      stripHtml(values[`${commentId}-s3PFBx7asUX-${voteId}`] || "")
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 20,
      styles: {
        fontSize: 14,
        cellPadding: 6,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [0, 150, 150],
        textColor: 255,
        fontSize: 12,
      },
      columnStyles: {
        0: { cellWidth: 250 },
        1: { cellWidth: 100 },
        2: { cellWidth: 180 },
        3: { cellWidth: 100 },
        4: { cellWidth: 100 },
        5: { cellWidth: 800 },
      },
      didParseCell: (data) => {
        if (data.column.index === 4 && typeof data.cell.raw === 'string') {
          const label = data.cell.raw.toLowerCase();
          if (label.includes("achieved")) {
            data.cell.styles.fillColor = [0, 128, 0];
            data.cell.styles.textColor = 255;
          } else if (label.includes("ongoing")) {
            data.cell.styles.fillColor = [254, 226, 0];
            data.cell.styles.textColor = 0;
          } else if (label.includes("not yet implemented")) {
            data.cell.styles.fillColor = [255, 0, 0];
            data.cell.styles.textColor = 255;
          }
        }
      },
    });

    doc.save("report.pdf");
  };
  const handleDownloadWord = () => {
    setIsOpened(false);

    const columnWidths = ["20%", "15%", "20%", "10%", "10%", "25%"];

    const container = document.createElement("div");

    container.innerHTML = allCommitments
      .map(
        ({
          commitment,
          MDAs,
          voteId,
          performanceId,
          budgetId,
          scoreId,
          commentId,
        }) => {
          const scoreValue = values[`${scoreId}-G5EzBzyQXD9-${voteId}`] || "";
          const scoreLabel = getScoreLabel(scoreValue);
          const scoreBg =
            scoreValue === "1"
              ? "#008000"
              : scoreValue === "2"
                ? "#FEE200"
                : scoreValue === "3"
                  ? "#FF0000"
                  : "white";

          return `
        <table style="border-collapse: collapse; width: 100%; table-layout: fixed; margin-bottom: 16px; font-size: 14px;" border="1">
          <thead>
            <tr style="background-color: #009696; color: white;">
              <th style="padding: 8px; width: ${columnWidths[0]}">Commitment</th>
              <th style="padding: 8px; width: ${columnWidths[1]}">MDAs</th>
              <th style="padding: 8px; width: ${columnWidths[2]}">Performance</th>
              <th style="padding: 8px; width: ${columnWidths[3]}">Budget</th>
              <th style="padding: 8px; width: ${columnWidths[4]}">Score</th>
              <th style="padding: 8px; width: ${columnWidths[5]}">Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px; word-wrap: break-word;">${commitment}</td>
              <td style="padding: 8px; word-wrap: break-word;">${MDAs}</td>
              <td style="padding: 8px; word-wrap: break-word;">${values[`${performanceId}-b35egsIMRiP-${voteId}`] || ""}</td>
              <td style="padding: 8px; word-wrap: break-word;">${values[`${budgetId}-pXpEOcDkwjV-${voteId}`] || ""}</td>
              <td style="padding: 8px; word-wrap: break-word; background-color: ${scoreBg}; color: white;">${scoreLabel}</td>
              <td style="padding: 8px; word-wrap: break-word;">${values[`${commentId}-s3PFBx7asUX-${voteId}`] || ""}</td>
            </tr>
          </tbody>
        </table>
      `;
        }
      )
      .join("");

    const wordDocHTML = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office'
        xmlns:w='urn:schemas-microsoft-com:office:word'
        xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Report</title></head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      ${container.innerHTML}
    </body>
  </html>
`;

    const blob = new Blob(["\ufeff", wordDocHTML], {
      type: "application/msword",
    });

    saveAs(blob, "report.doc");
  };


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
          performance: values[`${performanceId}-b35egsIMRiP-${voteId}`],
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

  const saveContent = () => {
    if (selectedPeriod) {
      const content =
        values[
        `${currentTextField.dataElement}-${currentTextField.co}-${currentTextField.voteId}`
        ] || "";
      postData({
        de: currentTextField.dataElement,
        co: currentTextField.co,
        ou: currentTextField.voteId,
        ds: "fFaTViPsQBs",
        value: content,
        pe: selectedPeriod,
      });
    }
  };

  const handleConfirmSubmitAndLock = async () => {
    setIsLoad(true);
    if (actionType === "submit") {
      if (selectedPeriod) {
        const completed = completions[selectedPeriod] || false;
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
        ({ dataElement, value, categoryOptionCombo, orgUnit, ...rest }) => {
          if (!values[`${dataElement}-${categoryOptionCombo}-${orgUnit}`]) {
            setValues((prev) => ({
              ...prev,
              [`${dataElement}-${categoryOptionCombo}-${orgUnit}`]: value,
            }));
            setInfo((prev) => ({
              ...prev,
              [`${dataElement}-${categoryOptionCombo}-${orgUnit}`]: rest,
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

  const DownloadReportButton = () => (
    <MenuButton
      as={Button}
      color="#ffff"
      backgroundColor="#009696"
      _hover={{ bg: "yellow.500", color: "#ffff" }}
      size="sm"
      marginTop="7px"
    >
      Download Report
    </MenuButton>
  );
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
            bg="green.600"
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Text color="white" fontSize="lg" fontWeight="extrabold">
              1
            </Text>
          </Box>
          <Text fontWeight="bold" fontSize="lg" color="green.600">
            Achieved
          </Text>
          <Box
            w="50px"
            h="30px"
            bg="#FEE200"
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Text color="white" fontSize="lg" fontWeight="extrabold">
              2
            </Text>
          </Box>
          <Text fontWeight="bold" fontSize="lg" color="#FEE200">
            Ongoing
          </Text>
          <Box
            w="50px"
            h="30px"
            bg="red.500"
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Text color="white" fontSize="lg" fontWeight="extrabold">
              3
            </Text>
          </Box>
          <Text fontWeight="bold" fontSize="lg" color="red.500">
            Not Yet implemented
          </Text>
        </Stack>
        <Spacer />
        <Stack>
          {/* {!isAdmin && completions[selectedPeriod ?? ""] && (
            <Text color="green.500" fontSize="lg" fontWeight="bold" mb="4">
              This report has been approved.
            </Text>
          )} */}
        </Stack>
        <Spacer />
        <Menu>
          <MenuButton
            as={Button}
            color="#ffff"
            backgroundColor="#009696"
            _hover={{ bg: "yellow.500", color: "#ffff" }}
            size="sm"
            marginTop="7px"
          >
            Download Report
          </MenuButton>
          <Portal>
            <MenuList zIndex={9999}>
              <MenuItem onClick={handleDownloadPdf} fontSize="sm" py={1} px={2}>
                <span
                  style={{
                    color: "red",
                    marginRight: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <FaFilePdf />
                </span>
                PDF
              </MenuItem>
              <MenuItem onClick={handleDownloadCsv} fontSize="sm" py={1} px={2}>
                <span
                  style={{
                    color: "orange",
                    marginRight: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <FaFileCsv />
                </span>
                CSV
              </MenuItem>
              <MenuItem onClick={handleDownloadXlsx}>
                <span
                  style={{
                    color: "green",
                    marginRight: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <FaFileExcel style={{ fontSize: "1rem" }} />

                </span>
                XLSX
              </MenuItem>
              <MenuItem onClick={handleDownloadWord} fontSize="sm" py={1} px={2}>
                <span
                  style={{
                    color: "blue",
                    marginRight: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <FaFileWord />
                </span>
                WORD
              </MenuItem>
            </MenuList>
          </Portal>
        </Menu>
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
                <Td width="40px">{commitments[0]?.keyResultsArea}</Td>
                <Td w="100px">Code</Td>
                <Td w="500px" minW="500px" maxW="500px">
                  Manifesto Commitment
                </Td>
                <Td w="50px">Lead MDA</Td>
                <Td>Performance (Annual and Cumulative )</Td>
                <Td w="100px" minW="100px" maxW="100px">
                  <p>
                    Budgetary expenditure <br /> (Ugx Bn)
                  </p>
                </Td>
                <Td w="170px">Annual Performance Score</Td>
                <Td>Comments (Score)</Td>
              </Tr>
            </Thead>
            <Tbody>
              {Object.entries(groupBy(commitments, "subKeyResultsArea")).map(
                ([sbka, groups]: [string, Commitment[]]) => {
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
                            <Td rowSpan={groups.length}>{subKeyResultsArea}</Td>
                          )}
                          <Td>{String(scoreCode).replace("SC-", "")}</Td>
                          <Td>{commitment}</Td>
                          <Td>{MDAs}</Td>
                          <Td>
                            {isAdmin || completions[selectedPeriod ?? ""] ? (
                              <Tooltip
                                label={getTooltipText(voteId, performanceId, "b35egsIMRiP")}
                                hasArrow
                                placement="top"
                              >
                                <Button
                                  size="sm"
                                  colorScheme={values[`${performanceId}-b35egsIMRiP-${voteId}`] ? "teal" : undefined}
                                  onClick={() => {
                                    setActionType("performance");
                                    editField(
                                      voteId,
                                      performanceId,
                                      "b35egsIMRiP",
                                      isAdmin ||
                                      completions[selectedPeriod ?? ""] ||
                                      approvals[voteId]?.[selectedPeriod ?? ""]?.["approved"],
                                      {
                                        ...(info[`${performanceId}-b35egsIMRiP-${voteId}`] ?? {}),
                                        voteName,
                                        leadMDA,
                                        ...(approvals[voteId]?.[selectedPeriod ?? ""] ?? {}),
                                      }
                                    );
                                  }}
                                >
                                  {values[`${performanceId}-b35egsIMRiP-${voteId}`]
                                    ? "View Performance"
                                    : "Add Performance"}
                                </Button>
                              </Tooltip>
                            ) : (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    editField(
                                      voteId,
                                      performanceId,
                                      "b35egsIMRiP",
                                      isAdmin || completions[selectedPeriod ?? ""],

                                      {
                                        ...(info[
                                          `${performanceId}-b35egsIMRiP-${voteId}`
                                        ] ?? {}),
                                        voteName,
                                        leadMDA,
                                        ...(approvals[voteId]?.[
                                          selectedPeriod ?? ""
                                        ] ?? {}),
                                      }
                                    )
                                  }
                                >
                                  {String(
                                    values[
                                    `${performanceId}-b35egsIMRiP-${voteId}`
                                    ] || "Add Performance"
                                  ).slice(0, 25)}
                                </Button>
                              )}
                          </Td>
                          <Td>
                            <Input
                              bg={
                                backgrounds[`${budgetId}-pXpEOcDkwjV-${voteId}`]
                              }
                              isDisabled={
                                isAdmin || completions[selectedPeriod ?? ""]
                              }
                              defaultValue={
                                values[`${budgetId}-pXpEOcDkwjV-${voteId}`] ?? ""
                              }
                              id="RlkUJj1WAs4-pXpEOcDkwjV-val"
                              name="entryfield"
                              onBlur={async (e: FocusEvent<HTMLInputElement>) => {
                                e.persist();
                                if (selectedPeriod) {
                                  await postData({
                                    de: budgetId,
                                    co: "pXpEOcDkwjV",
                                    ou: voteId,
                                    ds: "fFaTViPsQBs",
                                    value: e.target.value,
                                    pe: selectedPeriod,
                                  });
                                  setValues((prev) => ({
                                    ...prev,
                                    [`${budgetId}-pXpEOcDkwjV-${voteId}`]:
                                      e.target.value,
                                  }));
                                }
                              }}
                            />
                          </Td>
                          <Td>
                            <Select<Option, false, GroupBase<Option>>
                              chakraStyles={customChakraStyles}
                              options={scores}
                              size="sm"
                              colorScheme="gray"
                              isDisabled={
                                !isAdmin || completions[selectedPeriod ?? ""]
                              }
                              value={scores.find(
                                ({ value }) =>
                                  value ===
                                  values[`${scoreId}-G5EzBzyQXD9-${voteId}`]
                              )}
                              onChange={(value) => {
                                const newVal = value ? value.value : "";
                                setValues((prev) => ({
                                  ...prev,
                                  [`${scoreId}-G5EzBzyQXD9-${voteId}`]: newVal,
                                }));
                                if (selectedPeriod) {
                                  postData({
                                    de: scoreId,
                                    co: "G5EzBzyQXD9",
                                    ou: voteId,
                                    ds: "fFaTViPsQBs",
                                    value: newVal,
                                    pe: selectedPeriod,
                                  });
                                }
                              }}
                              tagVariant="solid"
                              isClearable
                            />
                          </Td>
                          <Td>
                            {!isAdmin || completions[selectedPeriod ?? ""] ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  editField(
                                    voteId,
                                    commentId,
                                    "s3PFBx7asUX",
                                    !isAdmin ||
                                    completions[selectedPeriod ?? ""] ||
                                    approvals[voteId]?.[selectedPeriod ?? ""]?.[
                                    "approved"
                                    ],
                                    {
                                      ...(info[
                                        `${performanceId}-b35egsIMRiP-${voteId}`
                                      ] ?? {}),
                                      voteName,
                                      leadMDA,
                                      ...(approvals[voteId]?.[
                                        selectedPeriod ?? ""
                                      ] ?? {}),
                                    }
                                  )
                                }
                              >
                                {String(
                                  values[`${commentId}-s3PFBx7asUX-${voteId}`] ||
                                  "View Comments"
                                ).slice(0, 25)}
                              </Button>
                            ) : (
                                <Tooltip
                                  label={getTooltipText(voteId, commentId, "s3PFBx7asUX")}
                                  hasArrow
                                  placement="top"
                                >
                                  <Button
                                    size="sm"
                                    colorScheme={values[`${commentId}-s3PFBx7asUX-${voteId}`] ? "blue" : undefined}
                                    onClick={() => {
                                      setActionType("comments");
                                      editField(
                                        voteId,
                                        commentId,
                                        "s3PFBx7asUX",
                                        !isAdmin || completions[selectedPeriod ?? ""],
                                        {
                                          ...(info[`${performanceId}-b35egsIMRiP-${voteId}`] ?? {}),
                                          voteName,
                                          leadMDA,
                                          ...(approvals[voteId]?.[selectedPeriod ?? ""] ?? {}),
                                        }
                                      );
                                    }}
                                  >
                                    {values[`${commentId}-s3PFBx7asUX-${voteId}`]
                                      ? "View Comments"
                                      : "Add Comments"}
                                  </Button>
                                </Tooltip>
                              )}
                          </Td>
                        </Tr>
                      )
                  );
                }
              )}
            </Tbody>
          </Table>
          {isAdmin && (
            <Button
              colorScheme={completions[selectedPeriod ?? ""] ? "red" : "green"}
              size="sm"
              position="fixed"
              bottom="20px"
              left="250px"
              onClick={() =>
                handleSubmitAndLockClick(
                  completions[selectedPeriod ?? ""] ? "recall" : "submit"
                )
              }
            >
              {completions[selectedPeriod ?? ""]
                ? "Recall Data and Edit"
                : "Submit and Lock"}
            </Button>
          )}
          {!isAdmin && !completions[selectedPeriod ?? ""] && (
            <Button
              size="sm"
              position="fixed"
              backgroundColor={
                approvals[allCommitments[0].voteId]?.[selectedPeriod ?? ""]?.[
                  "approved"
                ]
                  ? "green.500"
                  : "#009696"
              }
              isDisabled={isReportApproved}
              color="#FFF"
              bottom="20px"
              right="20px"
              onClick={() => onOpenApproval()}
              _hover={{
                color: "#000000",
              }}
            >
              {approvals[allCommitments[0].voteId]?.[selectedPeriod ?? ""]?.[
                "approved"
              ]
                ? "Report Approved"
                : "Submit and Approve Report"}
            </Button>
          )}

          {!isAdmin && completions[selectedPeriod ?? ""] && (
            <Stack direction="row">
              <Stack mt="4px">
                <Box width="50px" height="60px">
                  <Image
                    src="https://cdn-icons-png.flaticon.com/128/11348/11348043.png"
                    alt="Information Icon"
                  />
                </Box>
              </Stack>
              <Stack direction="column">
                <Text color="#FF7720" fontSize="lg" fontWeight="bold">
                  This report has been locked for data entry. {<br />}Please
                  contact the MIU team at the office of the president for any
                  clarification!
                </Text>
              </Stack>
            </Stack>
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
              <Button colorScheme="red" onClick={() => handleApproval()} ml={3}>
                Approve
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent maxWidth="1000px">
          <ModalHeader>
            {actionType === "performance"
              ? "Annual Performance"
              : "Comments (Score)"}
          </ModalHeader>
          <ModalBody overflow="auto">
            <Stack>
              {currentTextField.info["approved"] && (
                <Stack>
                  <Text fontWeight="bold" color="#009696">
                    Approver Information
                  </Text>
                  <Stack direction="row" spacing="20px">
                    <Text fontWeight="bold">Vote:</Text>
                    <Text>{currentTextField.info["voteName"]}</Text>
                  </Stack>
                  <Stack direction="row" spacing="20px">
                    <Text fontWeight="bold">MDA:</Text>
                    <Text>{currentTextField.info["leadMDA"]}</Text>
                  </Stack>
                  <Stack direction="row" spacing="20px">
                    <Text fontWeight="bold">Approver By:</Text>
                    <Text>{currentTextField.info["name"]}</Text>
                  </Stack>
                  <Stack direction="row" spacing="20px">
                    <Text fontWeight="bold">Status</Text>
                    <Text color="green.500" fontWeight="bold">
                      Approved
                    </Text>
                  </Stack>
                </Stack>
              )}
              <ReactQuill
                theme="snow"
                value={
                  values[
                  `${currentTextField.dataElement}-${currentTextField.co}-${currentTextField.voteId}`
                  ] || ""
                }
                onChange={(content, delta, source, editor) => {
                  setValues((prev) => ({
                    ...prev,
                    [`${currentTextField.dataElement}-${currentTextField.co}-${currentTextField.voteId}`]:
                      content,
                  }));
                }}
                onBlur={(previousRange, source, editor) => {
                  saveContent();
                }}
                readOnly={currentTextField.isDisabled}
                style={{
                  width: "100%",
                  height: "65vh",
                }}
                modules={modules}
              />
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={() => {
                saveContent();
                onClose();
              }}
              color="#ffff"
              backgroundColor="#009696"
              _hover={{ bg: "yellow.500", color: "#ffff" }}
            >
              SAVE
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
