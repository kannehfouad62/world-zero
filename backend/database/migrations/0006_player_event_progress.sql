CREATE TYPE "public"."player_event_progress_status" AS ENUM('ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "player_event_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"status" "player_event_progress_status" DEFAULT 'ACTIVE' NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_event_progress" ADD CONSTRAINT "player_event_progress_event_id_world_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."world_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_event_progress" ADD CONSTRAINT "player_event_progress_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_event_progress_event_player_unique" ON "player_event_progress" USING btree ("event_id","player_id");