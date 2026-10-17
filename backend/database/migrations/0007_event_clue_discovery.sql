CREATE TABLE "event_clues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"district_id" uuid NOT NULL,
	"position_x" text NOT NULL,
	"position_y" text NOT NULL,
	"position_z" text NOT NULL,
	"required_step" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_clues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "player_clue_discoveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clue_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_clues" ADD CONSTRAINT "event_clues_event_id_world_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."world_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_clues" ADD CONSTRAINT "event_clues_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_clue_discoveries" ADD CONSTRAINT "player_clue_discoveries_clue_id_event_clues_id_fk" FOREIGN KEY ("clue_id") REFERENCES "public"."event_clues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_clue_discoveries" ADD CONSTRAINT "player_clue_discoveries_event_id_world_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."world_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_clue_discoveries" ADD CONSTRAINT "player_clue_discoveries_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_clue_discoveries_player_clue_unique" ON "player_clue_discoveries" USING btree ("player_id","clue_id");