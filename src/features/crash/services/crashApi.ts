import { appConfig } from "../../../shared/config/appConfig";

const LAST_ROUND_WINNER_API_URL = `${appConfig.game.serviceBase}/api/bets/last-round-winner`;

type ParsedResponseBody = unknown;

export type LastRoundWinnerResult = {
  status: number;
  ok: boolean;
  body: ParsedResponseBody;
};

export async function postLastRoundWinner(roundId: string): Promise<LastRoundWinnerResult> {
  const response = await fetch(LAST_ROUND_WINNER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ roundId }),
  });

  const text = await response.text();
  let body: ParsedResponseBody = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Keep raw text when response body is not JSON.
  }

  return {
    status: response.status,
    ok: response.ok,
    body,
  };
}
