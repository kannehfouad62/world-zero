CREATE TABLE "event_recoverable_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"district_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"position_x" text NOT NULL,
	"position_y" text NOT NULL,
	"position_z" text NOT NULL,
	"required_step" integer DEFAULT 2 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_recoverable_items_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "player_recovered_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"recovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_recoverable_items" ADD CONSTRAINT "event_recoverable_items_event_id_world_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."world_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_recoverable_items" ADD CONSTRAINT "event_recoverable_items_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_recovered_items" ADD CONSTRAINT "player_recovered_items_item_id_event_recoverable_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."event_recoverable_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_recovered_items" ADD CONSTRAINT "player_recovered_items_event_id_world_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."world_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_recovered_items" ADD CONSTRAINT "player_recovered_items_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_recovered_items_player_item_unique" ON "player_recovered_items" USING btree ("player_id","item_id");