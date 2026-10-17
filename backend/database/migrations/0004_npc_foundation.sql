CREATE TYPE "public"."npc_memory_type" AS ENUM('INTERACTION', 'PROMISE', 'HELP', 'BETRAYAL', 'CONFLICT', 'BUSINESS', 'WORLD_EVENT', 'PERSONAL');--> statement-breakpoint
CREATE TYPE "public"."npc_status" AS ENUM('ACTIVE', 'INACTIVE', 'DECEASED');--> statement-breakpoint
CREATE TABLE "npc_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"npc_id" uuid NOT NULL,
	"player_id" uuid,
	"type" "npc_memory_type" NOT NULL,
	"summary" text NOT NULL,
	"importance" integer DEFAULT 50 NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "npc_player_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"npc_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"trust" integer DEFAULT 0 NOT NULL,
	"familiarity" integer DEFAULT 0 NOT NULL,
	"respect" integer DEFAULT 0 NOT NULL,
	"resentment" integer DEFAULT 0 NOT NULL,
	"last_interaction_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "npcs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid NOT NULL,
	"current_location_id" uuid,
	"slug" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"occupation" text NOT NULL,
	"status" "npc_status" DEFAULT 'ACTIVE' NOT NULL,
	"position_x" text NOT NULL,
	"position_y" text NOT NULL,
	"position_z" text NOT NULL,
	"personality" text NOT NULL,
	"energy" integer DEFAULT 100 NOT NULL,
	"stress" integer DEFAULT 20 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "npcs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "npc_memories" ADD CONSTRAINT "npc_memories_npc_id_npcs_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."npcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc_memories" ADD CONSTRAINT "npc_memories_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc_player_relationships" ADD CONSTRAINT "npc_player_relationships_npc_id_npcs_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."npcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc_player_relationships" ADD CONSTRAINT "npc_player_relationships_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npcs" ADD CONSTRAINT "npcs_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npcs" ADD CONSTRAINT "npcs_current_location_id_locations_id_fk" FOREIGN KEY ("current_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;