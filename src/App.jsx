import { Softphone,ksipcall } from 'juv-ksip-softphone';
import 'juv-ksip-softphone/styles';

export default function App() {
  return (
    <div>
      <Softphone />
      <button style={{ position: "absolute", top: "245px", left: "100px"}} onClick={() => ksipcall.video("1002")}>Start Video Call</button>
      <img style={{width:"100%", height:"100vh", overflow:"hidden"}} src="src\assets\screencapture-122-54-120-196-8088-app-2026-04-27-13_43_20.png" alt="screenshot" />
    </div>
  );
}