CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"sort_order" integer NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "category_color_hex" CHECK ("category"."color" ~ '^#[0-9A-Fa-f]{6}$')
);
--> statement-breakpoint
CREATE TABLE "daily" (
	"date" date NOT NULL,
	"memo" text,
	"condition" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "daily_pkey" PRIMARY KEY("date"),
	CONSTRAINT "daily_condition_range" CHECK ("daily"."condition" BETWEEN -2 AND 2),
	CONSTRAINT "daily_memo_length" CHECK (char_length("daily"."memo") <= 5000)
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "track" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memo" text,
	"condition" integer DEFAULT 0,
	"tag_ids" uuid[] DEFAULT '{}'::uuid[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "track_condition_range" CHECK ("track"."condition" BETWEEN -2 AND 2),
	CONSTRAINT "track_memo_length" CHECK (char_length("track"."memo") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "category_name_unique" ON "category" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "category_sort_order_unique" ON "category" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_category_sort_order_unique" ON "tag" USING btree ("category_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_category_name_unique" ON "tag" USING btree ("category_id","name");--> statement-breakpoint
CREATE INDEX "tag_category_id_idx" ON "tag" USING btree ("category_id");