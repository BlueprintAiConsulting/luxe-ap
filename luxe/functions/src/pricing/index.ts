import { QuoteInput, PricingRuleSet, PriceBreakdown, Airport } from "../shared";
import { toZonedTime, format } from "date-fns-tz";

export function calculatePrice(
  input: QuoteInput,
  ruleSet: PricingRuleSet,
  now: Date,
  airport?: Airport
): PriceBreakdown {
  const lineItems: PriceBreakdown["lineItems"] = [];
  let subtotalCents = 0;
  let baseOnlyCents = 0;

  // 1. Determine tripType -> select base calculation
  const rates = ruleSet.classRates[input.classId];
  if (!rates) {
    throw new Error(`Missing class rates for classId: ${input.classId}`);
  }

  let baseFareAmount = 0;

  if (input.tripType === "hourly") {
    const hours = Math.max(input.hours || 0, rates.hourlyMinimumHours);
    baseFareAmount = Math.round(hours * rates.hourlyRateCents);
    lineItems.push({
      code: "hourly",
      label: "Hourly Rate",
      amountCents: baseFareAmount,
      detail: `${hours} hrs @ $${(rates.hourlyRateCents / 100).toFixed(2)}/hr`,
    });
  } else if (
    input.tripType === "airport_arrival" ||
    input.tripType === "airport_departure"
  ) {
    let matchedFlatRate: number | null = null;
    if (airport && input.airportZoneId) {
      const zone = airport.zones.find((z) => z.zoneId === input.airportZoneId);
      if (zone && zone.flatRates[input.classId]) {
        matchedFlatRate =
          input.tripType === "airport_arrival"
            ? zone.flatRates[input.classId].arrivalCents
            : zone.flatRates[input.classId].departureCents;
      }
    }

    if (matchedFlatRate !== null) {
      baseFareAmount = matchedFlatRate;
      lineItems.push({
        code: "airport_flat",
        label: "Airport Flat Rate",
        amountCents: baseFareAmount,
        detail: null,
      });
    } else {
      // Fallback to point_to_point
      baseFareAmount = Math.max(
        rates.minimumFareCents,
        rates.baseFareCents +
          Math.round(input.estimatedDistanceMiles * rates.perMileCents) +
          Math.round(input.estimatedDurationMinutes * rates.perMinuteCents)
      );
      lineItems.push({
        code: "base_fare",
        label: "Base Fare",
        amountCents: baseFareAmount,
        detail: "Airport zone fallback",
      });
    }
  } else {
    // point_to_point
    baseFareAmount = Math.max(
      rates.minimumFareCents,
      rates.baseFareCents +
        Math.round(input.estimatedDistanceMiles * rates.perMileCents) +
        Math.round(input.estimatedDurationMinutes * rates.perMinuteCents)
    );
    lineItems.push({
      code: "base_fare",
      label: "Base Fare",
      amountCents: baseFareAmount,
      detail: null,
    });
  }

  subtotalCents += baseFareAmount;
  baseOnlyCents += baseFareAmount;

  // 2. Add extra stops
  if (input.extraStopCount > 0) {
    const amount = input.extraStopCount * ruleSet.surcharges.extraStopCents;
    lineItems.push({
      code: "extra_stops",
      label: "Extra Stops",
      amountCents: amount,
      detail: `${input.extraStopCount} stop(s)`,
    });
    subtotalCents += amount;
  }

  // 3. Add meet & greet
  if (input.greetingStyle === "meet_inside") {
    const amount = ruleSet.surcharges.meetGreetCents;
    lineItems.push({
      code: "meet_greet",
      label: "Meet & Greet",
      amountCents: amount,
      detail: null,
    });
    subtotalCents += amount;
  }

  // 4. Add child seats
  if (input.childSeatCount > 0) {
    const amount = input.childSeatCount * ruleSet.surcharges.childSeatCents;
    lineItems.push({
      code: "child_seats",
      label: "Child Seats",
      amountCents: amount,
      detail: `${input.childSeatCount} seat(s)`,
    });
    subtotalCents += amount;
  }

  // 5. Add wait time
  if (input.waitMinutes > 0) {
    const freeMinutes =
      input.tripType === "airport_arrival" || input.tripType === "airport_departure"
        ? ruleSet.waitTime.freeMinutesAirport
        : ruleSet.waitTime.freeMinutesStandard;

    const billableMinutes = Math.max(0, input.waitMinutes - freeMinutes);
    if (billableMinutes > 0) {
      const increment = ruleSet.waitTime.billingIncrementMinutes;
      const blocks = Math.ceil(billableMinutes / increment);
      const billedMinutes = blocks * increment;
      const amount = billedMinutes * ruleSet.waitTime.perMinuteCents;
      lineItems.push({
        code: "wait_time",
        label: "Wait Time",
        amountCents: amount,
        detail: `${billedMinutes} mins`,
      });
      subtotalCents += amount;
    }
  }

  // 6. Add tolls + parking
  if (input.tollsCents > 0) {
    lineItems.push({
      code: "tolls",
      label: "Tolls",
      amountCents: input.tollsCents,
      detail: null,
    });
    subtotalCents += input.tollsCents;
  }
  if (input.parkingCents > 0) {
    lineItems.push({
      code: "parking",
      label: "Parking",
      amountCents: input.parkingCents,
      detail: null,
    });
    subtotalCents += input.parkingCents;
  }

  // Timezone prep for after-hours and holiday
  // input.pickupAt might be a Firebase Timestamp (has toDate) or just an ISO string parsed by Zod.
  const pickupDate =
    typeof (input.pickupAt as any).toDate === "function"
      ? (input.pickupAt as any).toDate()
      : new Date(input.pickupAt as any);
      
  const localTime = toZonedTime(pickupDate, input.timezone);

  // 7. Apply after-hours surcharge
  if (ruleSet.surcharges.afterHours.enabled) {
    const hour = localTime.getHours();
    const startHour = ruleSet.surcharges.afterHours.startHourLocal;
    const endHour = ruleSet.surcharges.afterHours.endHourLocal;
    let isAfterHours = false;

    if (startHour > endHour) {
      // Spans midnight, e.g. 22 to 6
      isAfterHours = hour >= startHour || hour < endHour;
    } else {
      // E.g. 1 to 5
      isAfterHours = hour >= startHour && hour < endHour;
    }

    if (isAfterHours) {
      let amount = ruleSet.surcharges.afterHours.flatCents;
      if (ruleSet.surcharges.afterHours.percent > 0) {
        amount += Math.round(
          (subtotalCents * ruleSet.surcharges.afterHours.percent) / 100
        );
      }
      if (amount > 0) {
        lineItems.push({
          code: "after_hours",
          label: "After Hours Surcharge",
          amountCents: amount,
          detail: null,
        });
        subtotalCents += amount;
      }
    }
  }

  // 8. Apply holiday surcharge
  const localDateStr = format(localTime, "MM-dd");
  const isoDateStr = format(localTime, "yyyy-MM-dd");
  for (const hol of ruleSet.surcharges.holidays) {
    if (hol.date === localDateStr || hol.date === isoDateStr) {
      let amount = hol.flatCents;
      if (hol.percent > 0) {
        amount += Math.round((subtotalCents * hol.percent) / 100);
      }
      if (amount > 0) {
        lineItems.push({
          code: "holiday",
          label: "Holiday Surcharge",
          amountCents: amount,
          detail: hol.name,
        });
        subtotalCents += amount;
      }
      break; // Only apply the first matching holiday
    }
  }

  // 9. Apply out-of-area
  if (input.outOfAreaMiles > 0) {
    const amount =
      Math.round(input.outOfAreaMiles * ruleSet.surcharges.outOfAreaPerMileCents);
    if (amount > 0) {
      lineItems.push({
        code: "out_of_area",
        label: "Out of Area Surcharge",
        amountCents: amount,
        detail: `${input.outOfAreaMiles} miles`,
      });
      subtotalCents += amount;
    }
  }

  // 10. Apply fuel surcharge
  if (
    ruleSet.surcharges.fuelPercent > 0 ||
    ruleSet.surcharges.fuelFlatCents > 0
  ) {
    let amount = ruleSet.surcharges.fuelFlatCents;
    if (ruleSet.surcharges.fuelPercent > 0) {
      amount += Math.round((subtotalCents * ruleSet.surcharges.fuelPercent) / 100);
    }
    if (amount > 0) {
      lineItems.push({
        code: "fuel",
        label: "Fuel Surcharge",
        amountCents: amount,
        detail: null,
      });
      subtotalCents += amount;
    }
  }

  // 11. -> subtotalCents (already calculated iteratively)

  // 12. Gratuity
  let gratuityCents = 0;
  if (ruleSet.gratuity.autoAdd && ruleSet.gratuity.percent > 0) {
    const basis =
      ruleSet.gratuity.appliesTo === "base_only" ? baseOnlyCents : subtotalCents;
    gratuityCents = Math.round((basis * ruleSet.gratuity.percent) / 100);
  }

  // 13. Tax
  let taxCents = 0;
  if (ruleSet.taxPercent > 0) {
    taxCents = Math.round((subtotalCents * ruleSet.taxPercent) / 100);
  }

  // 14. -> totalCents
  const totalCents = subtotalCents + gratuityCents + taxCents;

  return {
    currency: "usd",
    lineItems,
    subtotalCents,
    gratuityCents,
    gratuityPercent: ruleSet.gratuity.autoAdd ? ruleSet.gratuity.percent : 0,
    gratuityEditable: ruleSet.gratuity.editableByRider,
    taxCents,
    totalCents,
    estimatedTotalCents: totalCents,
    isFinal: false,
  };
}

export function calculateCancellationFee(
  pickupAt: any,
  cancelAt: Date,
  classId: string,
  ruleSet: PricingRuleSet,
  estimatedTotalCents: number
): number {
  const pickupDate =
    typeof pickupAt.toDate === "function"
      ? pickupAt.toDate()
      : new Date(pickupAt);
      
  const msBeforePickup = pickupDate.getTime() - cancelAt.getTime();
  const hoursBeforePickup = msBeforePickup / (1000 * 60 * 60);

  // Sort windows by hoursBeforePickup ascending (closest to pickup first)
  const windows = [...ruleSet.cancellation].sort((a, b) => a.hoursBeforePickup - b.hoursBeforePickup);

  for (const win of windows) {
    if (win.appliesToClasses !== "all" && !win.appliesToClasses.includes(classId)) {
      continue;
    }
    if (hoursBeforePickup <= win.hoursBeforePickup) {
      let fee = win.feeFlatCents;
      if (win.feePercent > 0) {
        fee += Math.round(estimatedTotalCents * win.feePercent / 100);
      }
      return fee;
    }
  }

  return 0; // No fee if outside all windows
}
