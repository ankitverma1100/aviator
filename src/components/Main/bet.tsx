import React, { useEffect, useRef } from "react";
// import { useCrashContext } from "../context";
import axios from "axios";
import { toast } from 'react-toastify';
import Context from "../../context";
import { appConfig } from "../../shared/config/appConfig";

interface BetProps {
	index: 'f' | 's'
}
type FieldNameType = 'betAmount' | 'decrease' | 'increase' | 'singleAmount'
type BetOptType = '20' | '50' | '100' | '1000'
type GameType = 'manual' | 'auto'
const AUTH_RESULT_SESSION_KEY = "authResult";
const PLACE_BET_API_URL = `${appConfig.game.serviceBase}/api/bets/place-bet`;
const CASHOUT_API_BASE_URL = `${appConfig.game.serviceBase}/api/bets`;
const CASHOUT_API_URL = `${CASHOUT_API_BASE_URL}/cashout`;
const OPEN_BET_STATUS = "OPEN";

type PlaceBetResponse = {
	betId?: string;
	roundId?: string;
	status?: string;
	cashoutAt?: number | null;
	winAmount?: number | null;
	settledMultiplier?: number | null;
	createdAt?: string;
	settledAt?: string | null;
	balance?: number | string | null;
};

type CashoutResponse = {
	winAmount?: number | string | null;
	wallet?: number | string | null;
	finished?: boolean;
	pnl?: number | string | null;
};

function parseMaybeJson(value: any) {
	if (typeof value !== "string") {
		return value;
	}

	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

function pickFirstString(candidates: any[]) {
	for (const item of candidates) {
		if (typeof item === "string" && item.trim()) {
			return item.trim();
		}
	}
	return "";
}

function getAuthResult() {
	const raw = sessionStorage.getItem(AUTH_RESULT_SESSION_KEY);
	if (!raw) {
		return null;
	}

	return parseMaybeJson(raw);
}

function getIdentityFromAuthResult(authResult: any) {
	const parsed = parseMaybeJson(authResult);
	const candidateBlocks = [
		parsed,
		parsed?.data,
		parsed?.result,
		parsed?.user,
		parsed?.player,
		parsed?.account,
	];

	const userId = pickFirstString(
		candidateBlocks.flatMap((block) => [
			block?.userId,
			block?.userID,
			block?.userid,
			block?.user?.id,
			block?.id,
			block?.playerId,
		])
	);

	const clientId = 1234;
	const operatorId = 1234;

	return { userId, clientId, operatorId };
}

const Bet = ({ index }: BetProps) => {
	const context = React.useContext(Context)
		const { state,
			fbetted, sbetted,
			fbetState, sbetState,
			GameState,
			roundEvent,
			roundId,
			currentSecondNum,
			minBet, maxBet,
			currentTarget,
		update,
		updateUserBetState,
		updateUserInfo
	} = context;
	const [cashOut, setCashOut] = React.useState(2);
	const [placingBet, setPlacingBet] = React.useState(false);

	const auto = index === 'f' ? state.userInfo.f.auto : state.userInfo.s.auto
	const betted = index === 'f' ? fbetted : sbetted
	const deState = index === 'f' ? state.fdeState : state.sdeState
	const inState = index === 'f' ? state.finState : state.sinState
	const betState = index === 'f' ? fbetState : sbetState
	const decrease = index === 'f' ? state.fdecrease : state.sdecrease
	const increase = index === 'f' ? state.fincrease : state.sincrease
	const autoCound = index === 'f' ? state.fautoCound : state.sautoCound
	const betAmount = index === 'f' ? state.userInfo.f.betAmount : state.userInfo.s.betAmount
	const autoCashoutState = index === 'f' ? state.fautoCashoutState : state.sautoCashoutState
	const single = index === 'f' ? state.fsingle : state.ssingle
	const singleAmount = index === 'f' ? state.fsingleAmount : state.ssingleAmount

	const [gameType, setGameType] = React.useState<GameType>("manual");
	const [betOpt, setBetOpt] = React.useState<BetOptType>("20");
	const [showModal, setShowModal] = React.useState(false);
	const [myBetAmount, setMyBetAmount] = React.useState(20);
	const [activeBetId, setActiveBetId] = React.useState("");
	const [cashingOut, setCashingOut] = React.useState(false);
	const previousRoundIdRef = useRef<string>("");
	const canPlaceBetNow = roundEvent === "BETTING";

	const updateUserHand = (patch: Record<string, any>) => {
		update({
			userInfo: {
				...state.userInfo,
				[index]: {
					...state.userInfo[index],
					...patch,
				},
			},
		});
	};
	// const { index } = props;

	const minus = (type: FieldNameType) => {
		if (type === "betAmount") {
			const nextAmount = betAmount - 1 < minBet ? minBet : Number((Number(betAmount) - 1).toFixed(2));
			updateUserHand({ betAmount: nextAmount });
		} else {
			const key = `${index + type}` as keyof typeof state;
			const currentValue = Number(state[key] || 0);
			const nextValue = currentValue - 0.1 < 0.1 ? 0.1 : Number((currentValue - 0.1).toFixed(2));
			update({ [key]: nextValue } as any);
		}
	}

	const plus = (type: FieldNameType) => {
		if (type === "betAmount") {
			const currentAmount = Number(state.userInfo[index][type]);
			if (currentAmount + 0.1 > state.userInfo.balance) {
				updateUserHand({ betAmount: Math.round(state.userInfo.balance * 100) / 100 });
			} else {
				if (currentAmount + 0.1 > maxBet) {
					updateUserHand({ betAmount: maxBet });
				} else {
					updateUserHand({ betAmount: Number((Number(betAmount) + 0.1).toFixed(2)) });
				}
			}
		} else {
			const key = `${index + type}` as keyof typeof state;
			const currentValue = Number(state[key] || 0);
			if (currentValue + 0.1 > state.userInfo.balance) {
				update({ [key]: Math.round(state.userInfo.balance * 100) / 100 } as any);
			} else {
				update({ [key]: Number((currentValue + 0.1).toFixed(2)) } as any);
			}
		}
	}

	const manualPlus = (amount: number, btnNum: BetOptType) => {
		if (betOpt === btnNum) {
			if (Number((betAmount + amount)) > maxBet) {
				updateUserHand({ betAmount: maxBet });
			} else {
				updateUserHand({ betAmount: Number((betAmount + amount).toFixed(2)) });
			}
		} else {
			updateUserHand({ betAmount: Number(Number(amount).toFixed(2)) });
			setBetOpt(btnNum);
		}
	}

	const changeBetType = (e: GameType) => {
		updateUserBetState({ [`${index}betState`]: false });
		setGameType(e);
	}

	const onChangeBlur = (e: number, type: 'cashOutAt' | 'decrease' | 'increase' | 'singleAmount') => {
		if (type === "cashOutAt") {
			if (e < 1.01) {
				updateUserHand({ target: 1.01 });
				setCashOut(1.01);
			} else {
				updateUserHand({ target: Math.round(e * 100) / 100 });
				setCashOut(Math.round(e * 100) / 100);
			}
		} else {
			const key = `${index + type}` as keyof typeof state;
			if (e < 0.1) {
				update({ [key]: 0.1 } as any);
			} else {
				update({ [key]: Math.round(e * 100) / 100 } as any);
			}
		}
	}

	const onBetClick = (s: boolean) => {
		updateUserBetState({ [`${index}betState`]: s })
	}

	const placeBet = async (): Promise<PlaceBetResponse | null> => {
		const authResult = getAuthResult();
		const { userId, clientId, operatorId } = getIdentityFromAuthResult(authResult);

		if (!userId) {
			toast.error("Missing userId in authResult.");
			return null;
		}

		if (!clientId) {
			toast.error("Missing clientId in authResult.");
			return null;
		}

		if (!roundId) {
			toast.error("Round ID is not available yet.");
			return null;
		}

				const body = {
					userId,
					amount: Number(betAmount),
					externalRef: operatorId || clientId,
					roundId: String(roundId),
					clientId,
				};

		try {
			setPlacingBet(true);
			const response = await axios.post(PLACE_BET_API_URL, body, {
				headers: {
					"Content-Type": "application/json",
				},
			});

			return (response?.data ?? null) as PlaceBetResponse | null;
		} catch (error: any) {
			const serverMessage =
				typeof error?.response?.data === "string"
					? error.response.data
					: error?.response?.data?.message;
			toast.error(serverMessage || error?.message || "Failed to place bet.");
			return null;
		} finally {
			setPlacingBet(false);
		}
	};

	const handleBetButtonClick = async () => {
		if (!canPlaceBetNow) {
			return;
		}

		if (placingBet) {
			return;
		}

		const placed = await placeBet();
		if (!placed) {
			return;
		}

		const isOpen = placed.status === OPEN_BET_STATUS;
		const isCurrentRound = String(placed.roundId || "") === String(roundId || "");
		const nextBalanceRaw = placed.balance;
		const nextBalance =
			typeof nextBalanceRaw === "number"
				? nextBalanceRaw
				: typeof nextBalanceRaw === "string"
					? Number(nextBalanceRaw)
					: NaN;

		if (isOpen && isCurrentRound) {
			if (Number.isFinite(nextBalance)) {
				update({
					userInfo: {
						...state.userInfo,
						balance: Number(nextBalance),
					},
				});
			}
			window.dispatchEvent(new CustomEvent("aviator-refresh-history"));
			setActiveBetId(String(placed.betId || ""));
			onBetClick(true);
			return;
		}

		toast.error("Bet was not opened for the active round.");
	};

	const handleCashout = React.useCallback(async (at: number) => {
		if (!activeBetId) {
			toast.error("Missing active bet id for cashout.");
			return;
		}
		if (cashingOut) {
			return;
		}

		try {
			setCashingOut(true);
			const response = await axios.post(
				CASHOUT_API_URL,
				{
					betId: activeBetId,
					multi: Number(at),
				},
				{
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
			const cashout = (response?.data ?? {}) as CashoutResponse;
			const nextWalletRaw = cashout.wallet;
			const nextWallet =
				typeof nextWalletRaw === "number"
					? nextWalletRaw
					: typeof nextWalletRaw === "string"
						? Number(nextWalletRaw)
						: NaN;
			if (Number.isFinite(nextWallet)) {
				updateUserInfo({ balance: Number(nextWallet) });
			}

			const winAmountRaw = cashout.winAmount;
			const winAmount =
				typeof winAmountRaw === "number"
					? winAmountRaw
					: typeof winAmountRaw === "string"
						? Number(winAmountRaw)
						: NaN;
			if (Number.isFinite(winAmount)) {
				toast.success(`Won ${Number(winAmount).toFixed(2)} ${state.userInfo.currency}`);
			}

			window.dispatchEvent(new CustomEvent("aviator-refresh-history"));
			updateUserBetState({ [`${index}betted`]: false, [`${index}betState`]: false });
			setActiveBetId("");
		} catch (error: any) {
			const serverMessage =
				typeof error?.response?.data === "string"
					? error.response.data
					: error?.response?.data?.message;
			toast.error(serverMessage || error?.message || "Failed to cash out.");
		} finally {
			setCashingOut(false);
		}
	}, [activeBetId, cashingOut, index, state.userInfo.currency, updateUserBetState, updateUserInfo]);
	const setCount = (amount: number) => {
		let attrs = state;
		attrs[`${index}autoCound`] = amount;
		update(attrs);
	}

	const reset = () => {
		update({
			[`${index}autoCound`]: 0,
			[`${index}decrease`]: 0,
			[`${index}increase`]: 0,
			[`${index}singleAmount`]: 0,
			[`${index}deState`]: false,
			[`${index}inState`]: false,
			[`${index}single`]: false,
		})
	}

	const onAutoBetClick = (_betState: boolean) => {
		updateUserHand({ auto: _betState });

		updateUserBetState({ [`${index}betState`]: _betState });

		if (!state) {
			setCount(0);
		}
	}

	const onStartBtnClick = () => {
		if (autoCound > 0) {
			if (deState || inState || single) {
				if (singleAmount > 0 || decrease > 0 || increase > 0) {
					if (inState || deState || single) {
						onAutoBetClick(true);
						setShowModal(false);
					} else {
						toast.error("Please, specify decrease or exceed stop point");
					}
				} else {
					toast.error("Can't see 0.00 as stop point");
				}
			} else {
				toast.error("Please, specify decrease or exceed stop point");
			}
		} else {
			toast.error("Please, set number of rounds");
		}
	}
	useEffect(() => {
		if (betted) {
			if (autoCashoutState) {
				if (cashOut < currentSecondNum) {
					void handleCashout(cashOut);
				}
			}
		}
	}, [autoCashoutState, betted, cashOut, currentSecondNum, handleCashout])

	useEffect(() => {
		setMyBetAmount(betAmount);
	},[betAmount])

	useEffect(() => {
		const previousRoundId = previousRoundIdRef.current;
		if (!roundId) {
			return;
		}

		if (previousRoundId && previousRoundId !== roundId) {
			updateUserBetState({
				[`${index}betState`]: false,
				[`${index}betted`]: false,
			});
			setActiveBetId("");
			setCashingOut(false);
		}

		previousRoundIdRef.current = roundId;
	}, [index, roundId, updateUserBetState]);

	useEffect(() => {
		if (roundEvent !== "CRASHED") {
			return;
		}

		updateUserBetState({
			[`${index}betState`]: false,
			[`${index}betted`]: false,
		});
		setActiveBetId("");
		setCashingOut(false);
	}, [index, roundEvent, updateUserBetState]);

	useEffect(() => {
		if (GameState !== "GAMEEND") {
			return;
		}

		updateUserBetState({
			[`${index}betState`]: false,
			[`${index}betted`]: false,
		});
		setActiveBetId("");
		setCashingOut(false);
	}, [GameState, index, updateUserBetState]);

	return (
		<div className="bet-control">
			<div className="controls">
				<div className="navigation">
					<div className="navigation-switcher">
						{(betted || betState) ?
							<>
								<button className={gameType === "manual" ? "active" : ""} >Bet</button>
								<button className={gameType === "auto" ? "active" : ""} >Auto</button>
							</> :
							<>
								<button className={gameType === "manual" ? "active" : ""} onClick={() => changeBetType("manual")}>Bet</button>
								<button className={gameType === "auto" ? "active" : ""} onClick={() => changeBetType("auto")}>Auto</button>
							</>
						}
					</div>
				</div>
				<div className="first-row">
					<div className="bet-block">
						<div className="bet-spinner">
							<div className={`spinner ${betState || betted ? "disabled" : ""}`}>
								<div className="buttons">
									<button className="minus" onClick={() => betState || betted ? "" : minus("betAmount")}></button>
								</div>
								<div className="input">
									{betState || betted ?
										<input type="number" value={Number(myBetAmount)} readOnly ></input>
										:
										<input type="number" value={Number(myBetAmount)}
											onChange={e => {
												const nextAmount =
													Number(e.target.value) > maxBet
														? maxBet
														: Number(e.target.value) < 0
															? 0
															: Number(e.target.value);
												updateUserHand({ betAmount: nextAmount });
											}}></input>
									}
								</div>
								<div className="buttons">
									<button className="plus" onClick={() => betState || betted ? "" : plus("betAmount")}></button>
								</div>
							</div>
						</div>
						{betState || betted ?
							<div className="bet-opt-list">
								<button className="bet-opt disabled">
									<span>20</span>
								</button>
								<button className="bet-opt disabled">
									<span>50</span>
								</button>
								<button className="bet-opt disabled">
									<span>100</span>
								</button>
								<button className="bet-opt disabled">
									<span>1000</span>
								</button>
							</div>
							:
							<div className="bet-opt-list">
								<button onClick={() => manualPlus(20, "20")} className="bet-opt">
									<span>20</span>
								</button>
								<button onClick={() => manualPlus(50, "50")} className="bet-opt">
									<span>50</span>
								</button>
								<button onClick={() => manualPlus(100, "100")} className="bet-opt">
									<span>100</span>
								</button>
								<button onClick={() => manualPlus(1000, "1000")} className="bet-opt">
									<span>1000</span>
								</button>
							</div>
						}
					</div>
					<div className="buttons-block">
						{betted ? GameState === "PLAYING" ?
							<button className="btn-waiting" onClick={() => { void handleCashout(currentTarget); }} disabled={cashingOut}>
								<span>
									<label>CASHOUT</label>
									<label className="amount">
										<span>{Number(betAmount * currentTarget).toFixed(2)}</span>
										<span className="currency">INR</span>
									</label>
								</span>
							</button>
							: <button className="btn-danger">WAITING</button> : betState ?
							<>
								<div className="btn-tooltip">Waiting for next round</div>
								<button className="btn-danger h-[70%]" onClick={() => {
									void handleCashout(currentTarget);
									update({ ...state, [`${index}autoCound`]: 0, userInfo: { ...state.userInfo, [index]: { ...state.userInfo[index], auto: false } } })
								}}><label>CASH OUT</label></button>
							</> :
							<button
								onClick={handleBetButtonClick}
								className={canPlaceBetNow ? "btn-success" : "btn-danger"}
								disabled={!canPlaceBetNow || placingBet}
							>
								<span>
									<label>{canPlaceBetNow ? (placingBet ? "PLACING..." : "BET") : roundEvent}</label>
									<label className="amount">
										<span>{Number(betAmount).toFixed(2)}</span>
										<span className="currency">INR</span>
									</label>
								</span>
							</button>
						}
					</div>
				</div>
				{/* Auto */}
				{
					gameType === "auto" &&
					<>
						<div className="border-line"></div>
						<div className="second-row">
							<div className="auto-bet-wrapper">
								<div className="auto-bet">
									{auto ? (
										<button onClick={() => onAutoBetClick(false)} className="auto-play-btn btn-danger" >{autoCound}</button>
									) : (
										<button onClick={() => { setShowModal(true); }} className="auto-play-btn btn-primary">AUTO PLAY</button>
									)}
								</div>
							</div>
							<div className="cashout-block">
								<div className="cashout-switcher">
									<label className="label">Auto Cash Out</label>
									{betted || betState ? (
										<div className={`input-switch ${autoCashoutState ? "" : "off"}`}>
											<span className="oval"></span>
										</div>
									) : (
										<div onClick={() => { update({ [`${index}autoCashoutState`]: !autoCashoutState }) }} className={`input-switch ${autoCashoutState ? "" : "off"}`}>
											<span className="oval"></span>
										</div>
									)}
								</div>
								<div className="cashout-snipper-wrapper">
									<div className="cashout-snipper">
										<div className={`snipper small ${autoCashoutState && !betState ? "" : "disabled"}`}>
											<div className="input">
												{autoCashoutState && !betState ? (
													<input type="number"
														onChange={(e) => { update({ ...state, userInfo: { ...state.userInfo, [`${index}`]: { ...state.userInfo[index], target: Number(e.target.value) } } }); setCashOut(Number(e.target.value)) }}
														value={cashOut}
														onBlur={(e) => onChangeBlur(Number(e.target.value) || 0, "cashOutAt")}
													/>
												) : (
													<input type="number" value={cashOut.toFixed(2)} readOnly />
												)}
											</div>
											<span className="text">x</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</>
				}
			</div >
			{showModal &&
				<div className="modal">
					<div onClick={() => setShowModal(false)} className="back"></div>
					<div className="modal-dialog">
						<div className="modal-content">
							<div className="modal-header">
								<span>Auto play options</span>
								<button className="close" onClick={() => setShowModal(false)}>
									<span>x</span>
								</button>
							</div>
							<div className="modal-body">
								<div className="content-part content-part-1">
									<span>Number of Rounds:</span>
									<div className="rounds-wrap">
										<button
											className={`btn-secondary ${autoCound === 10 ? "onClick" : ""}`}
											onClick={() => setCount(10)}>
											10</button>
										<button
											className={`btn-secondary ${autoCound === 20 ? "onClick" : ""}`}
											onClick={() => setCount(20)}>
											20</button>
										<button
											className={`btn-secondary ${autoCound === 50 ? "onClick" : ""}`}
											onClick={() => setCount(50)}>
											50</button>
										<button
											className={`btn-secondary ${autoCound === 100 ? "onClick" : ""}`}
											onClick={() => setCount(100)}>
											100</button>
									</div>
								</div>
								<div className="content-part">
									<div className={`input-switch ${deState ? "" : "off"}`}
										onClick={() => {
											update({ [`${index}deState`]: !deState, [`${index}decrease`]: 0 });
										}}
									>
										<span className="oval"></span>
									</div>
									<span className="title">Stop if cash decreases by</span>
									<div className="spinner">
										{deState ?
											<div className="m-spinner">
												<div className="buttons">
													<button onClick={() => minus("decrease")} className="minus"></button>
												</div>
												<div className="input">
													<input type="number" onChange={(e) => update({ [`${index}decrease`]: Number(e.target.value) })} value={decrease}
														onBlur={(e) => onChangeBlur(Number(e.target.value) || 0, "decrease")}
													/>
												</div>
												<div className="buttons">
													<button onClick={() => plus("decrease")} className="plus"></button>
												</div>
											</div> :
											<div className="m-spinner disabled">
												<div className="buttons">
													<button disabled className="minus"></button>
												</div>
												<div className="input">
													<input type="number" readOnly value={Number(decrease).toFixed(2)} />
												</div>
												<div className="buttons">
													<button disabled className="plus"></button>
												</div>
											</div>}
									</div>
									<span >INR</span>
								</div>
								<div className="content-part">
									<div className={`input-switch ${inState ? "" : "off"}`}
										onClick={() => {
											update({ [`${index}inState`]: !inState, [`${index}increase`]: 0 });
										}}
									>
										<span className="oval"></span>
									</div>
									<span className="title">Stop if cash increases by</span>
									<div className="spinner">
										{inState ? <div className="m-spinner">
											<div className="buttons">
												<button onClick={() => minus("increase")} className="minus"></button>
											</div>
											<div className="input">
												<input type="number" onChange={(e) => update({ [`${index}increase`]: Number(e.target.value) })} value={increase}
													onBlur={(e) => onChangeBlur(Number(e.target.value), "increase")}
												/>
											</div>
											<div className="buttons">
												<button onClick={() => plus("increase")} className="plus"></button>
											</div>
										</div> : <div className="m-spinner disabled">
											<div className="buttons">
												<button disabled className="minus"></button>
											</div>
											<div className="input">
												<input type="number" readOnly value={Number(increase).toFixed(2)} />
											</div>
											<div className="buttons">
												<button disabled className="plus"></button>
											</div>
										</div>}
									</div>
									<span >INR</span>
								</div>
								<div className="content-part">
									<div className={`input-switch ${single ? "" : "off"}`}
										onClick={() => {
											update({ [`${index}single`]: !single, [`${index}singleAmount`]: 0 });
										}}
									>
										<span className="oval"></span>
									</div>
									<span className="title">Stop if single win exceeds</span>
									<div className="spinner">
										{!!single ?
											<div className="m-spinner">
												<div className="buttons">
													<button onClick={() => minus("singleAmount")} className="minus"></button>
												</div>
												<div className="input">
													<input type="number" onChange={(e) => update({ [`${index}singleAmount`]: Number(e.target.value) })} value={singleAmount}
														onBlur={(e) => onChangeBlur(Number(e.target.value), "singleAmount")}
													/>
												</div>
												<div className="buttons">
													<button onClick={() => plus("singleAmount")} className="plus" ></button>
												</div>
											</div> :
											<div className="m-spinner disabled">
												<div className="buttons ">
													<button disabled className="minus"></button>
												</div>
												<div className="input">

													<input type="number" readOnly value={singleAmount.toFixed(2)} />
												</div>
												<div className="buttons">
													<button disabled className="plus"></button>
												</div>
											</div>
										}
									</div>
									<span >INR</span>
								</div>
							</div>
							<div className="modal-footer">
								<div className="btns-wrapper">
									<button className="reset-btn btn-waiting" onClick={reset}>Reset</button>
									<button className="start-btn btn-success" onClick={onStartBtnClick}>Start</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			}
		</div >
	)
}

export default Bet
