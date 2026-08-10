import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import type { Vehicle, VehicleClass } from '../types/vehicle';
import type { Driver, DriverCredentials } from '../types/driver';
import type { PricingRuleSet } from '../types/pricing';
import type { Airport } from '../types/airport';
import type { GlobalSettings } from '../types/settings';

// Helper to handle Timestamp conversions cleanly if needed, though they cast naturally often.
export const vehicleClassConverter: FirestoreDataConverter<VehicleClass> = {
  toFirestore(modelObject: VehicleClass): DocumentData {
    return { ...modelObject };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): VehicleClass {
    const data = snapshot.data(options);
    return data as VehicleClass;
  },
};

export const vehicleConverter: FirestoreDataConverter<Vehicle> = {
  toFirestore(modelObject: Vehicle): DocumentData {
    return { ...modelObject };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Vehicle {
    const data = snapshot.data(options);
    return data as Vehicle;
  },
};

export const driverConverter: FirestoreDataConverter<Driver> = {
  toFirestore(modelObject: Driver): DocumentData {
    return { ...modelObject };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Driver {
    const data = snapshot.data(options);
    return data as Driver;
  },
};

export const driverCredentialsConverter: FirestoreDataConverter<DriverCredentials> = {
  toFirestore(modelObject: DriverCredentials): DocumentData {
    return { ...modelObject };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): DriverCredentials {
    const data = snapshot.data(options);
    return data as DriverCredentials;
  },
};

export const pricingRuleSetConverter: FirestoreDataConverter<PricingRuleSet> = {
  toFirestore(modelObject: PricingRuleSet): DocumentData {
    return { ...modelObject };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): PricingRuleSet {
    const data = snapshot.data(options);
    return data as PricingRuleSet;
  },
};

export const airportConverter: FirestoreDataConverter<Airport> = {
  toFirestore(modelObject: Airport): DocumentData {
    return { ...modelObject };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Airport {
    const data = snapshot.data(options);
    return data as Airport;
  },
};

export const globalSettingsConverter: FirestoreDataConverter<GlobalSettings> = {
  toFirestore(modelObject: GlobalSettings): DocumentData {
    return { ...modelObject };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): GlobalSettings {
    const data = snapshot.data(options);
    return data as GlobalSettings;
  },
};
