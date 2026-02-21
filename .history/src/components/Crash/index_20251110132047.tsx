/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from "react";
// import { useCrashContext } from "../Main/context";
import "./crash.scss";
import Unity from "react-unity-webgl";
import propeller from "../../assets/images/propeller.png"
import Context from "../../context";
import Stomp from "stompjs";
import SockJS from "sockjs-client";

let currentFlag = 0;

export default function WebGLStarter() {
	const { currentNum, time, unityState, myUnityContext,setCurrentTarget } = React.useContext(Context)
	const [target, setTarget] = React.useState(1);
	const [waiting, setWaiting] = React.useState(0);
	const [flag, setFlag] = React.useState(1);
	const [GameState, setGameState] = React.useState("PLAYING");

	useEffect(() => {
		const timer = setTimeout(() => {
		  setGameState("GAMEEND");

		}, 40000);
	
		return () => clearTimeout(timer); 
	  }, []);

	  const connectSocket = () => {
    const socket = new SockJS("/ws-game");
    stompClient.current = Stomp.over(socket);

    stompClient.current.connect(
      {},
      (frame) => {
        console.log("Connected: " + frame);
        setConnected(true);
        setGameStatus("🟢 Connected - Ready to start!");
        stompClient.current.subscribe("/topic/multiplier", (msg) => {
          const round = JSON.parse(msg.body);
          handleMultiplier(round);
        });
        stompClient.current.subscribe("/topic/result", (msg) => {
          const result = JSON.parse(msg.body);
          handleGameResult(result);
        });
      },
      (err) => {
        console.error("Socket error:", err);
        setConnected(false);
        setGameStatus("🔴 Disconnected - reconnecting...");
        setTimeout(connectSocket, 3000);
      }
    );
  };


	React.useEffect(() => {
		let myInterval;
		if (GameState === "PLAYING") {
			setFlag(2);
			let startTime = Date.now() - time;
			let currentTime;
			let currentNum;
			const getCurrentTime = (e) => {
				currentTime = (Date.now() - startTime) / 1000;
				currentNum = 1 + 0.06 * currentTime + Math.pow((0.06 * currentTime), 2) - Math.pow((0.04 * currentTime), 3) + Math.pow((0.04 * currentTime), 4);
				if (currentNum > 2 && e === 2) {
					setFlag(3);
				} else if (currentNum > 10 && e === 3) {
					setFlag(4);
				}
				setTarget(currentNum);
				setCurrentTarget(currentNum);
			}
			myInterval = setInterval(() => {
				getCurrentTime(currentFlag);
			}, 20);
		} else if (GameState === "GAMEEND") {
			setFlag(5);
			setCurrentTarget(10);
			setTarget(4);
		} else if (GameState === "BET") {
			setFlag(1);
			let startWaiting = Date.now() - time;
			setTarget(1);
			setCurrentTarget(1);

			myInterval = setInterval(() => {
				setWaiting(Date.now() - startWaiting);
			}, 20);
		}
		return () => clearInterval(myInterval);
	}, [GameState, unityState])

	React.useEffect(() => {
		myUnityContext?.send("GameManager", "RequestToken", JSON.stringify({
			gameState: flag
		}));
		currentFlag = flag;
	}, [flag, myUnityContext]);

	return (
		<div className="crash-container">
			<div className="canvas">
				<Unity unityContext={myUnityContext} matchWebGLToCanvasSize={true} />
			</div>
			<div className="crash-text-container">
				{GameState === "BET" ? (
					<div className={`crashtext wait font-9`} >
						<div className="rotate">
							<img width={100} height={100} src={propeller} alt="propellar"></img>
						</div>
						<div className="waiting-font">WAITING FOR NEXT ROUND</div>
						<div className="waiting">
							<div style={{ width: `${(5000 - waiting) * 100 / 5000}%` }}></div>
						</div>
					</div>
				) : (
					<div className={`crashtext ${GameState === "GAMEEND" && "red"}`}>
						{GameState === "GAMEEND" && <div className="flew-away">FLEW AWAY!</div>}
						<div>
							{target - 0.01 >= 1 ? Number(target - 0.01).toFixed(2) : "1.00"} <span className="font-[900]">x</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

