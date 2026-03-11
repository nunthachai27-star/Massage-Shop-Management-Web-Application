import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class LineNotifyService {
  private channelToken: string | undefined;
  private groupId: string | undefined;

  constructor(private config: ConfigService) {
    this.channelToken = this.config.get<string>("LINE_CHANNEL_TOKEN");
    this.groupId = this.config.get<string>("LINE_GROUP_ID");
  }

  async send(message: string): Promise<{ success: boolean }> {
    if (!this.channelToken) {
      throw new BadRequestException(
        "LINE_CHANNEL_TOKEN is not configured",
      );
    }
    if (!this.groupId) {
      throw new BadRequestException(
        "LINE_GROUP_ID is not configured",
      );
    }

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.channelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: this.groupId,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException(`Line Messaging API failed: ${text}`);
    }

    return { success: true };
  }
}
