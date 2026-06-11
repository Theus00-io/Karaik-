import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const songsTable = pgTable("songs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  youtubeId: text("youtube_id").notNull().unique(),
  title: text("title").notNull(),
  channelName: text("channel_name").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  embeddable: boolean("embeddable").notNull().default(true),
  cachedAt: timestamp("cached_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSongSchema = createInsertSchema(songsTable).omit({ id: true, cachedAt: true, updatedAt: true });
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songsTable.$inferSelect;
