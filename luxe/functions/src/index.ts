import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ maxInstances: 10 });

export * from "./auth/triggers";
export * from "./auth/callables";
export * from "./api/booking";
export * from "./api/trip";
export * from "./api/dispatch";
export * from "./api/webhook";
export * from "./api/ratings";
export * from "./api/flight";
export * from "./api/affiliates";
export * from "./crons/stripe";
export * from "./crons/flightSync";
export * from "./crons/earnings";

export * from "./triggers/notifications";
export * from "./triggers/mail";
export * from "./triggers/onFlightDelayDetected";
