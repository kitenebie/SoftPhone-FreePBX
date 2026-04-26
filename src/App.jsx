// import Softphone from "./Softphone";

// export default function App() {
//   return <Softphone />;
// }

import React from "react";
import { Softphone, ksipcall } from "juv-ksip-softphone";
import "juv-ksip-softphone/styles";

export default function App() {
  return (
    <div>
      <Softphone />
      <button onClick={() => ksipcall.audio("1005")}>Audio Call 1005</button>
      <button onClick={() => ksipcall.video("1005")}>Video Call 1005</button>
    </div>
  );
}
