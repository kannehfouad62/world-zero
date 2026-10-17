CREATE TYPE "public"."player_event_decision" AS ENUM('HELP', 'REFUSE');--> statement-breakpoint
CREATE TYPE "public"."world_event_status" AS ENUM('AVAILABLE', 'RESOLVED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "player_event_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"decision" "player_event_decision" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"district_id" uuid NOT NULL,
	"npc_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "world_event_status" DEFAULT 'AVAILABLE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "world_events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "player_event_decisions" ADD CONSTRAINT "player_event_decisions_event_id_world_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."world_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_event_decisions" ADD CONSTRAINT "player_event_decisions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_events" ADD CONSTRAINT "world_events_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_events" ADD CONSTRAINT "world_events_npc_id_npcs_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."npcs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_event_decisions_event_player_unique" ON "player_event_decisions" USING btree ("event_id","player_id");