import "server-only";
import { HttpError, requireUser } from "@/Http/Middleware/Authenticate";
import { ActiveEventRequest } from "@/Http/Requests/EventRequest";
import { Event } from "@/Models/Event";
import { setActiveEvent } from "@/Services/ActiveEventService";
import { action, body, json } from "./Controller";

export const ActiveEventController = {
  // POST /api/active-event  { eventId }
  update: action(async (req) => {
    await requireUser();
    const { eventId } = ActiveEventRequest.parse(await body(req));
    if (!(await Event.find(eventId))) throw new HttpError(404, "Event tidak ditemukan");
    await setActiveEvent(eventId);
    return json({ data: { eventId } });
  }),
};
