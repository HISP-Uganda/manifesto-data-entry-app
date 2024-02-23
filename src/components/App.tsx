import {
  ChakraProvider,
  CSSReset,
  extendTheme,
  Spinner,
} from "@chakra-ui/react";
import {
  createHashHistory,
  Outlet,
  parseSearchWith,
  ReactLocation,
  Route,
  Router,
  stringifySearchWith,
} from "@tanstack/react-location";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { LocationGenerics } from "../interfaces";
import { decodeFromBinary, encodeToBinary } from "../utils";
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
      Table: {
        Td: {
          borderStyle: "solid",
          borderColor: "green.400",
          borderWidth: "2px",
        },
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

const history = createHashHistory();
const location = new ReactLocation<LocationGenerics>({
  history,
  parseSearch: parseSearchWith((value) => JSON.parse(decodeFromBinary(value))),
  stringifySearch: stringifySearchWith((value) =>
    encodeToBinary(JSON.stringify(value))
  ),
});

const routes: Route<LocationGenerics>[] = [
  {
    path: "/",
    element: <EntryForm />,
  },
];

const MyApp = () => (
  <Router
    location={location}
    routes={routes}
    defaultPendingElement={<Spinner />}
  >
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={customTheme}>
        <CSSReset />
        <Outlet />
      </ChakraProvider>
    </QueryClientProvider>
  </Router>
);
export default MyApp;
