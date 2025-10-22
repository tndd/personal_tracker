ALTER TABLE "daily" ADD COLUMN "sleep_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily" ADD COLUMN "sleep_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily" ADD COLUMN "sleep_quality" integer;--> statement-breakpoint
ALTER TABLE "daily" ADD CONSTRAINT "daily_sleep_quality_range" CHECK ("daily"."sleep_quality" IS NULL OR "daily"."sleep_quality" BETWEEN -2 AND 2);