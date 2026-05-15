import { Injectable } from "@nestjs/common";

export type DownloadStatusResponse = {
  name: "download";
  status: "ok";
  timestamp: string;
};

@Injectable()
export class DownloadService {
  getStatus(): DownloadStatusResponse {
    return {
      name: "download",
      status: "ok",
      timestamp: new Date().toISOString()
    };
  }
}
