import { ChakraProvider, CSSReset, extendTheme } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import "./app.css";
import { EntryForm } from "./EntryForm";

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

const customTheme = extendTheme({
    styles: {
        global: {
            caption: {
                backgroundColor: "green.400",
                color: "white",
                fontWeight: "bold",
                padding: "8px",
            },
            tr: {
                borderBottom: "2px solid",
                borderColor: "green.400",
            },
            "th, td": {
                border: "1px solid",
                borderColor: "green.400",
                padding: "8px",
            },
        },
    },
    components: {
        Tabs: {
            variants: {
                enclosedColored: {
                    tab: {
                        _selected: {
                            color: "black",
                            bg: "green.400",
                            fontWeight: "bold",
                        },
                        _active: {
                            bg: "green.400",
                            color: "black",
                            fontWeight: "bold",
                        },
                        _disabled: {
                            bg: "green.200",
                            color: "black",
                            fontWeight: "bold",
                        },
                    },
                },
            },
        },
    },
});

const MyApp = () => (
    <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={customTheme}>
            <CSSReset />
            <EntryForm />
        </ChakraProvider>
    </QueryClientProvider>
);
export default MyApp;
