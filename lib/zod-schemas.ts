import { z } from 'zod';

export const placeSchema = z.object({
  place_id: z.string(),
  name: z.string(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  image: z.string(),
});

export const activitySchema = z.object({
  place_id: z.string(),
  name: z.string(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  time: z.string(),
  duration: z.coerce.number().describe('Thời gian dự kiến (phút)'),
  image: z.string(),
});

export const itinerarySchema = z.object({
  source: z.string().optional().default('claude'),
  city: z.string(),
  activities: z.array(activitySchema),
});

export type Place = z.infer<typeof placeSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Itinerary = z.infer<typeof itinerarySchema>;
