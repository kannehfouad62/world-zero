CREATE TYPE "public"."location_type" AS ENUM('RESTAURANT', 'STORE', 'RESIDENTIAL', 'BANK', 'POLICE_STATION', 'HOSPITAL', 'WAREHOUSE', 'OFFICE', 'PARK');--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" "location_type" NOT NULL,
	"position_x" text NOT NULL,
	"position_y" text NOT NULL,
	"position_z" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;