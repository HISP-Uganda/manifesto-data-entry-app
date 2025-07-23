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
  Thead,
  Tr,
  useDisclosure,
  useToast,
  MenuButton,
  Menu,
  Portal,
  MenuList,
  MenuItem,
  Flex
} from "@chakra-ui/react";

// Suppress ResizeObserver errors
const originalError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('ResizeObserver loop completed with undelivered notifications')) {
    return;
  }
  originalError.apply(console, args);
};

// Also handle window errors
window.addEventListener('error', (e) => {
  if (e.message?.includes('ResizeObserver loop completed with undelivered notifications')) {
    e.preventDefault();
    return false;
  }
});
import { useDataEngine } from "@dhis2/app-runtime";
import { generateFixedPeriods } from "@dhis2/multi-calendar-dates";
import { ChakraStylesConfig, GroupBase, Select } from "chakra-react-select";
import { useUnit } from "effector-react";
import { saveAs } from "file-saver";
import { groupBy, uniq } from "lodash";
import React, { FocusEvent, useEffect, useRef, useState } from "react";
import "react-quill/dist/quill.snow.css";
import { Commitment, Option } from "../interfaces";
import { useDataSetData, useOrgUnitTree } from "../Queries";
import { TreeSelect } from "antd";
import {
  $approvals,
  $commitments,
  $completions,
  approvalsApi,
  completionsApi,
  $currentUser,
} from "../Store";
import { changeApproval } from "../utils";
import PeriodSelector from "./PeriodSelector";
import { jsPDF } from "jspdf";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import Quill from "quill";
import autoTable from 'jspdf-autotable';
import { Tooltip } from "@chakra-ui/react";
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
      table: function (this: any) {
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
        function (node: any) {
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
  selectedOrgUnits,
  onSelectedOrgUnitsChange,
}: {
  commitments: Array<Commitment>;
  isAdmin: boolean;
  orgUnits: any[];
  selectedOrgUnits: Option[];
  onSelectedOrgUnitsChange: (orgUnits: Option[]) => void;
}) {
  const cancelRef = useRef<any>();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isOpenApproval,
    onOpen: onOpenApproval,
    onClose: onCloseApproval,
  } = useDisclosure();
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



  const { data: ouTree, isLoading: ouLoading } = useOrgUnitTree();
  const buildTreeData = (nodes: any[]): any[] =>
    nodes.map((n) => ({
      title: n.name,
      value: n.id,
      key: n.id,
      id: n.id,
      pId: n.parent?.id
    }));
  console.log("ouTree", ouTree);

  const treeData = ouTree === undefined ? [] : buildTreeData(ouTree.organisationUnits);

  const isLocked = completions[selectedPeriod ?? ""];
  // const [selectedOrgUnit, setSelectedOrgUnit] = useState<Option | null>(null);
  // const selectedOrgUnitId = selectedOrgUnit?.value ?? "";
  // const allOptions = orgUnits.map(o => ({ value: o.id, label: o.name }))
  // const [selectedOrgUnits, setSelectedOrgUnits] = useState<Option[]>(allOptions)
  const selectedOrgUnitIds = selectedOrgUnits.map(o => o.value);
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
    const defaultPeriod = `${previousFiscalYearStart}July`;
    setSelectedPeriod(defaultPeriod);
  }, []);

  // Handle ResizeObserver errors specifically from TreeSelect
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('ResizeObserver loop completed with undelivered notifications')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('ResizeObserver loop completed with undelivered notifications')) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  const onYearChange = (diff: number) => {
    setYear((year) => year + diff);
    const selectedYear = year + diff;
    const selectedPeriod = `${selectedYear}July`;
    setSelectedPeriod(selectedPeriod);
  };

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
    singleValue: (provided) => ({
      ...provided,
      color: "black",
      fontWeight: "bold",
    }),
  };

  const { data, isLoading, isError, error } = useDataSetData({
    selectedPeriod: selectedPeriod!,
    orgUnits: selectedOrgUnitIds,
  });

  //New download buttons

  const handleDownloadXlsx = async () => {

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Report");

    const ouNames = selectedOrgUnits.map(u => u.label).join(", ");
    const headingRow = sheet.addRow([`Vote: ${ouNames}`]);
    headingRow.font = { bold: true };

    sheet.addRow([]);

    sheet.columns = [
      { header: "Commitment", key: "commitment", width: 40 },
      { header: "MDAs", key: "MDAs", width: 25 },
      { header: "Performance", key: "performance", width: 40 },
      { header: "Budget", key: "budget", width: 15 },
      { header: "Score", key: "score", width: 15 },
      { header: "Comments", key: "comments", width: 40 },
    ];

    allCommitments
      .filter(({ voteId }) => selectedOrgUnitIds.includes(voteId))
      .forEach(({ commitment, MDAs, voteId, performanceId, budgetId, scoreId, commentId }) => {
        const perf = stripHtml(values[`${performanceId}-b35egsIMRiP-${voteId}`] || "");
        const budg = stripHtml(values[`${budgetId}-pXpEOcDkwjV-${voteId}`] || "");
        const score = getScoreLabel(values[`${scoreId}-G5EzBzyQXD9-${voteId}`] || "");
        const comm = stripHtml(values[`${commentId}-s3PFBx7asUX-${voteId}`] || "");

        const row = sheet.addRow({
          commitment: stripHtml(commitment),
          MDAs: stripHtml(MDAs),
          performance: perf,
          budget: budg,
          score,
          comments: comm,
        });

        if (score) {
          row.getCell("score").fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: getScoreColorHex(values[`${scoreId}-G5EzBzyQXD9-${voteId}`]) },
          };
          row.getCell("score").font = { color: { argb: "FFFFFFFF" }, bold: true };
        }
      });

    const headerRow = sheet.getRow(3);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF009696" },
    };

    sheet.eachRow(row => {
      row.alignment = { vertical: "middle", wrapText: true };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "report.xlsx");
  };



  const handleDownloadCsv = () => {

    const escapeCsv = (value: string): string => {
      const v = value?.toString().replace(/\r?\n|\r/g, " ").trim() ?? "";
      return `"${v.replace(/"/g, '""')}"`;
    };

    const ouNames = selectedOrgUnits.map(u => u.label).join(", ");
    const ouLine = `Vote (s): ${ouNames}`;

    const headers = [
      "subKeyResultsArea",
      "scoreCode",
      "commitment",
      "MDAs",
      "performance",
      "budget",
      "score",
      "comments",
    ].join(",");

    const rows = allCommitments
      .filter(({ voteId }) => selectedOrgUnitIds.includes(voteId))
      .map(
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
        }) =>
          [
            escapeCsv(stripHtml(subKeyResultsArea)),
            escapeCsv(String(scoreCode).replace("SC-", "")),
            escapeCsv(stripHtml(commitment)),
            escapeCsv(stripHtml(MDAs)),
            escapeCsv(
              stripHtml(values[`${performanceId}-b35egsIMRiP-${voteId}`] || "")
            ),
            escapeCsv(
              stripHtml(values[`${budgetId}-pXpEOcDkwjV-${voteId}`] || "")
            ),
            escapeCsv(
              getScoreLabel(values[`${scoreId}-G5EzBzyQXD9-${voteId}`] || "")
            ),
            escapeCsv(
              stripHtml(values[`${commentId}-s3PFBx7asUX-${voteId}`] || "")
            ),
          ].join(",")
      );

    const csvContent = [ouLine, "", headers, ...rows].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    saveAs(blob, `report_${ouNames}.csv`);
  };

  const stripHtml = (html: string): string => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleDownloadPdf = () => {

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a2' });

    const ouNames = selectedOrgUnits.map((u) => u.label).join(', ');
    const ouHeader = `Vote (s): ${ouNames}`;
    const marginLeft = 40;
    const headerY = 30;
    doc.setFontSize(14);
    doc.text(ouHeader, marginLeft, headerY);

    const headers = [
      "Commitment",
      "MDAs",
      "Performance",
      "Budget",
      "Score",
      "Comments",
    ];

    const rows = allCommitments
      .filter(({ voteId }) => selectedOrgUnitIds.includes(voteId))
      .map(
        ({
          commitment,
          MDAs,
          voteId,
          performanceId,
          budgetId,
          scoreId,
          commentId,
        }) => [
            stripHtml(commitment),
            stripHtml(MDAs),
            stripHtml(values[`${performanceId}-b35egsIMRiP-${voteId}`] || ""),
            stripHtml(values[`${budgetId}-pXpEOcDkwjV-${voteId}`] || ""),
            getScoreLabel(values[`${scoreId}-G5EzBzyQXD9-${voteId}`] || ""),
            stripHtml(values[`${commentId}-s3PFBx7asUX-${voteId}`] || ""),
          ]
      );

    autoTable(doc, {
      theme: 'grid',
      head: [headers],
      body: rows,
      startY: headerY + 20,
      styles: {
        fontSize: 14,
        cellPadding: 6,
        overflow: 'linebreak',
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
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

    const safeName = ouNames.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    doc.save(`report_${safeName}.pdf`);
  };


  //Handling the Download Report Button


  const handleDownloadWord = () => {

    const ouNames = selectedOrgUnits.map((u) => u.label).join(', ');
    const headerHtml = `<p style="font-size:16px; font-weight:bold; margin-bottom:12px;">
                        Vote (s): ${ouNames}
                      </p>`;
    const safeName = ouNames.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

    const columnWidths = ["20%", "15%", "20%", "10%", "10%", "25%"];

    const rowsHtml = allCommitments
      .filter(({ voteId }) => selectedOrgUnitIds.includes(voteId))
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
    ${headerHtml}
    ${rowsHtml}
  </body>
</html>
`;

    const blob = new Blob(["\ufeff", wordDocHTML], {
      type: "application/msword",
    });
    saveAs(blob, `report_${safeName}.doc`);
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
  const saveContent = async () => {
    if (!selectedPeriod) return;

    const content =
      values[`${currentTextField.dataElement}-${currentTextField.co}-${currentTextField.voteId}`] ||
      "";

    try {
      await postData({
        de: currentTextField.dataElement,
        co: currentTextField.co,
        ou: currentTextField.voteId,
        ds: "fFaTViPsQBs",
        value: content,
        pe: selectedPeriod,
      });
      toast({
        title: "Content saved",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Failed to save content",
        status: "error",
        duration: 5000,
        isClosable: true,
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
      <Stack
        direction="row"
        h="48px"
        minH="48px"
        maxH="48px"
        position="sticky"
        top="0"
        zIndex="20"
        bg="white"
      >
        <Stack ml="2" zIndex={20} direction="row" align="center" spacing={2} w="40%">
          <Box w="50%">

            {ouLoading ? (
              <Spinner size="sm" />
            ) : (

                <TreeSelect
                  style={{ width: '100%' }}
                  treeData={treeData}
                  value={selectedOrgUnitIds}
                  placeholder="Select Vote(s)"
                  allowClear
                  showSearch
                  treeCheckable
                  treeDataSimpleMode
                  maxTagCount={1}
                  filterTreeNode={(input, treeNode) => {
                    const title = (treeNode.title as string).toLowerCase();
                    return input
                      .toLowerCase()
                      .trim()
                      .split(/\s+/)
                      .every((term) => title.includes(term));
                  }}
                  treeDefaultExpandAll={false}
                  treeDefaultExpandedKeys={[]}
                  onChange={(values: string[], labelList) => {
                    onSelectedOrgUnitsChange(
                      values.map((val, idx) => ({
                        value: val,
                        label: String(labelList[idx]),
                      }))
                    );
                  }}
                />
              )}
          </Box>
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
                  📄
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
                  📊
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
                  📗

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
                  📝
                </span>
                WORD
              </MenuItem>
            </MenuList>
          </Portal>
        </Menu>
      </Stack>

      {/* {!selectedOrgUnitIds || !selectedPeriod ? ( */}
      {selectedOrgUnitIds.length === 0 ? (
        <Box p={6}>
          <Text color="gray.600">
            👋 Please select one or more Votes above to see commitments.    </Text>
        </Box>
      ) : isError ? (
        <Box p={6}>
          <Text color="red.500">Error loading data: {error?.message}</Text>
        </Box>
      ) : isLoading ? (
        <Stack flex={1} align="center" justify="center">
          <Spinner />
        </Stack>
      ) : (
              <Box
                h="calc(100vh - 144px - 60px)"
                overflow="auto"
              >
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
                      <Td width="200px">Key Results Area</Td>
                      <Td width="200px">Sub Key Results Area</Td>
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
                    {Object.entries(groupBy(commitments.filter((c) => selectedOrgUnitIds.includes(c.voteId)), "keyResultsArea")).map(
                      ([keyResultsArea, keyResultGroups]: [string, Commitment[]]) => {
                        return Object.entries(groupBy(keyResultGroups, "subKeyResultsArea")).map(
                          ([subKeyResultsArea, groups]: [string, Commitment[]], kraIndex) => {
                            return groups.map(
                              (
                                {
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
                                  <Tr key={`${keyResultsArea}-${subKeyResultsArea}-${scoreCode}-${voteId}`}>
                                    {kraIndex === 0 && index === 0 && (
                                      <Td 
                                        rowSpan={keyResultGroups.length} 
                                        bg="gray.50" 
                                        fontWeight="bold"
                                        borderRight="2px solid"
                                        borderColor="gray.300"
                                      >
                                        {keyResultsArea}
                                      </Td>
                                    )}
                                    {index === 0 && (
                                      <Td 
                                        rowSpan={groups.length}
                                        bg="gray.25"
                                        borderRight="1px solid"
                                        borderColor="gray.200"
                                      >
                                        {subKeyResultsArea}
                                      </Td>
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
                                  {isAdmin || completions[selectedPeriod ?? ""] ? (
                                    <Tooltip
                                      label={getTooltipText(voteId, commentId, "s3PFBx7asUX")}
                                      hasArrow
                                      placement="top"
                                    >
                                      <Button
                                        size="sm"
                                        colorScheme={
                                          values[`${commentId}-s3PFBx7asUX-${voteId}`]
                                            ? "blue"
                                            : undefined
                                        }
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
                                        {values[`${commentId}-s3PFBx7asUX-${voteId}`]
                                          ? "View Comments"
                                          : "Add Comments"}
                                      </Button>
                                    </Tooltip>
                                  ) : (
                                      <Tooltip
                                        label={getTooltipText(voteId, commentId, "s3PFBx7asUX")}
                                        hasArrow
                                        placement="top"
                                      >
                                        <Button
                                          size="sm"
                                          colorScheme={values[`${commentId}-s3PFBx7asUX-${voteId}`] ? "blue" : undefined}
                                          isDisabled={isLocked}
                                          onClick={() => {
                                            if (isLocked) return;
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
                        );
                      }
                    )}
                  </Tbody>
                </Table>
                {isAdmin && (
                  <Button
                    colorScheme={completions[selectedPeriod ?? ""] ? "red" : "green"}
                    color="black"
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
                onChange={(content, delta, _source, editor) => {
                  const wordCount = editor.getText().trim().split(/\s+/).length;
                  if (wordCount > 25000) {
                    toast({
                      title: "Word Limit Exceeded",
                      description: "Content cannot exceed 25,000 words.",
                      status: "warning",
                      duration: 3000,
                      isClosable: true,
                    });
                    return;
                  }
                  const hasOversizedImage = delta.ops?.some((op) => {
                    if (op.insert?.image && typeof op.insert.image === "string") {
                      try {
                        const base64Str = op.insert.image.split(",")[1];
                        const byteLength = (base64Str.length * 3) / 4 - (base64Str.endsWith("==") ? 2 : base64Str.endsWith("=") ? 1 : 0);
                        return byteLength > 1_000_000;
                      } catch (e) {
                        return false;
                      }
                    }
                    return false;
                  });

                  if (hasOversizedImage) {
                    toast({
                      title: "Image Too Large",
                      description: "Images must be less than 1MB.",
                      status: "error",
                      duration: 5000,
                      isClosable: true,
                    });
                    return;
                  }
                  setValues((prev) => ({
                    ...prev,
                    [`${currentTextField.dataElement}-${currentTextField.co}-${currentTextField.voteId}`]:
                      content,
                  }));
                }}
                onBlur={async () => {
                  await saveContent();
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
            <Flex w="100%" align="center">
              <Button
                colorScheme="red"
                onClick={onClose}
              >
                Cancel
    </Button>

              <Spacer />

              <Button
                onClick={() => {

                  saveContent();
                  onClose();
                }}
                color="#fff"
                backgroundColor="#009696"
                _hover={{ bg: "yellow.500", color: "#fff" }}
                isDisabled={currentTextField.isDisabled}
              >
                SAVE & CLOSE
    </Button>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
