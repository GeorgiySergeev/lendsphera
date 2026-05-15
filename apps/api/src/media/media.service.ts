import { Injectable } from "@nestjs/common";

export type MediaStatusResponse = {
  name: "media";
  status: "ok";
  timestamp: string;
};

@Injectable()
export class MediaService {
  getStatus(): MediaStatusResponse {
    return {
      name: "media",
      status: "ok",
      timestamp: new Date().toISOString()
    };
  }
}
