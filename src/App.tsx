import * as React from "react";
import Scene from "./matterjs";
import { MantineProvider } from "@mantine/core";
import { theme } from "./theme";
import '@mantine/core/styles.css';

const App = () => {
  return (
    <MantineProvider theme={theme}>
      <Scene />
    </MantineProvider>
  );
};

export default App;
