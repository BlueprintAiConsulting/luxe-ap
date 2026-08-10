import { z } from "zod";
import { Timestamp } from "firebase/firestore";

export const timestampSchema = z.custom<Timestamp>(
  (val: any) => val && typeof val.seconds === "number" && typeof val.nanoseconds === "number",
  "Invalid Timestamp"
);
