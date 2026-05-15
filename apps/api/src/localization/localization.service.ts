import { Injectable } from "@nestjs/common";

export type LocalizationStatusResponse = {
  name: "localization";
  status: "ok";
  timestamp: string;
};

@Injectable()
export class LocalizationService {
  getStatus(): LocalizationStatusResponse {
    return {
      name: "localization",
      status: "ok",
      timestamp: new Date().toISOString()
    };
  }
}
