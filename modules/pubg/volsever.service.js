import axios from "axios";

const volseverApi = axios.create({
  baseURL: "https://gate.volsever.com",
  timeout: 15000,
});

export async function checkPubgPlayer(playerId) {
  const normalizedPlayerId = String(playerId ?? "").trim();

  if (!/^\d+$/.test(normalizedPlayerId)) {
    return null;
  }

  if (!process.env.VOLSEVER_API_KEY) {
    throw new Error("VOLSEVER_API_KEY sozlanmagan");
  }

  try {
    const response = await volseverApi.get(
      "/proxy/api/game/pubg-mobile-global",
      {
        params: { id: normalizedPlayerId },
        headers: {
          "X-API-Key": process.env.VOLSEVER_API_KEY,
        },
      },
    );

    if (!response.data?.status || !response.data?.data?.username) {
      return null;
    }

    return {
      username: response.data.data.username,
      userId: String(response.data.data.user_id || normalizedPlayerId),
      game: response.data.data.game,
    };
  } catch (error) {
    if ([400, 404].includes(error.response?.status)) {
      return null;
    }

    throw error;
  }
}
