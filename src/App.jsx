import { useState } from "react";
import "./App.css";
import DataCollectionForm from "./DataCollection";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <DataCollectionForm></DataCollectionForm>
    </>
  );
}

export default App;
