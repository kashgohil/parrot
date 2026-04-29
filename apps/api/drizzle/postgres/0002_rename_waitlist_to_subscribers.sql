ALTER TABLE "waitlist" RENAME TO "subscribers";--> statement-breakpoint
ALTER TABLE "subscribers" DROP CONSTRAINT "waitlist_email_unique";--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_email_unique" UNIQUE("email");