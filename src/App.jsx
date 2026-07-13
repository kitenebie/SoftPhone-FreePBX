import Softphone from "./Softphone";
import {KsipStatus} from "./Softphone";
import "./App.css";

export default function App() {
  return <>
    <Softphone enableFloatingStatus={false} />
    {/* <KsipStatus /> */}

  </>;
}