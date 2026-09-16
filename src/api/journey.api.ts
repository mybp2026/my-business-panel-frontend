import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type { HrJourneyClassification } from "@/interfaces/entities/Hr.interface";

const buildError = async (response: Response, fallback: string) => {
  const json = await response.json().catch(() => ({}));
  const message = json?.message ?? json?.error ?? fallback;
  throw new Error(Array.isArray(message) ? message.join(", ") : message);
};

export const journeyApi = {
  async classify(
    startTime: string,
    endTime: string,
  ): Promise<HrJourneyClassification> {
    const response = await fetch(`${url}/journey/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ start_time: startTime, end_time: endTime }),
    });

    if (!response.ok) {
      await buildError(response, "Error al clasificar la jornada");
    }

    const json: ApiResponse<HrJourneyClassification> = await response.json();
    return json.data;
  },
};
