import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import { PgClient } from "../database/pg-client";

@Injectable()
export class SupabaseService {
  private supabaseClient: SupabaseClient | null = null;
  private pgClient: PgClient | null = null;
  private mode: "supabase" | "pg";

  constructor(private configService: ConfigService) {
    const databaseUrl = this.configService.get<string>("DATABASE_URL");

    if (databaseUrl) {
      this.mode = "pg";
      const pool = new Pool({ connectionString: databaseUrl });
      this.pgClient = new PgClient(pool);
    } else {
      this.mode = "supabase";
      this.supabaseClient = createClient(
        this.configService.get<string>("SUPABASE_URL")!,
        this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY")!,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getClient(): any {
    if (this.mode === "pg") return this.pgClient!;
    return this.supabaseClient!;
  }
}
