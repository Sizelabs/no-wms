"use server";

import { City, Country, State } from "country-state-city";

export async function getAllCountries() {
  return Country.getAllCountries().map((c) => ({
    name: c.name,
    isoCode: c.isoCode,
    flag: c.flag,
  }));
}

export async function getStatesOfCountry(countryCode: string) {
  return (State.getStatesOfCountry(countryCode) ?? []).map((s) => ({
    name: s.name,
    isoCode: s.isoCode,
  }));
}

export async function getCitiesOfState(
  countryCode: string,
  stateCode: string,
) {
  return (City.getCitiesOfState(countryCode, stateCode) ?? []).map((c) => ({
    name: c.name,
    latitude: c.latitude,
    longitude: c.longitude,
  }));
}

export async function findStateByCity(
  countryCode: string,
  cityName: string,
) {
  const states = State.getStatesOfCountry(countryCode) ?? [];
  for (const state of states) {
    const cities = City.getCitiesOfState(countryCode, state.isoCode) ?? [];
    if (cities.some((c) => c.name === cityName)) {
      return { name: state.name, isoCode: state.isoCode };
    }
  }
  return null;
}

export async function getTimezoneForCoordinates(
  countryCode: string,
  longitude: string,
) {
  const country = Country.getCountryByCode(countryCode);
  const timezones = country?.timezones ?? [];

  if (timezones.length <= 1) return timezones[0]?.zoneName ?? null;

  const cityLon = parseFloat(longitude);
  if (Number.isNaN(cityLon)) return timezones[0]?.zoneName ?? null;

  let bestZone = timezones[0]?.zoneName ?? null;
  let bestDiff = Infinity;

  for (const tz of timezones) {
    const tzLon = (tz.gmtOffset / 3600) * 15;
    const diff = Math.abs(cityLon - tzLon);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestZone = tz.zoneName;
    }
  }

  return bestZone;
}

export async function getTimezonesOfCountry(countryCode: string) {
  const c = Country.getCountryByCode(countryCode);
  return (c?.timezones ?? []).map((tz) => ({
    zoneName: tz.zoneName,
    gmtOffsetName: tz.gmtOffsetName,
  }));
}

export interface CitySearchResult {
  city: string;
  state: string;
  countryCode: string;
  country: string;
  latitude: string | null;
  longitude: string | null;
  label: string;
}

export async function searchCities(query: string): Promise<CitySearchResult[]> {
  if (!query || query.length < 2) return [];

  const q = query.toLowerCase();
  const allCities = City.getAllCities();
  const startsWithResults: CitySearchResult[] = [];
  const includesResults: CitySearchResult[] = [];
  const limit = 15;

  for (const c of allCities) {
    const lower = c.name.toLowerCase();
    const isStartsWith = lower.startsWith(q);
    const isIncludes = !isStartsWith && lower.includes(q);

    if (!isStartsWith && !isIncludes) continue;

    const country = Country.getCountryByCode(c.countryCode);
    const state = State.getStateByCodeAndCountry(c.stateCode, c.countryCode);
    const parts = [c.name, state?.name, country?.name].filter(Boolean);

    const result: CitySearchResult = {
      city: c.name,
      state: state?.name ?? "",
      countryCode: c.countryCode,
      country: country?.name ?? c.countryCode,
      latitude: c.latitude ?? null,
      longitude: c.longitude ?? null,
      label: parts.join(", "),
    };

    if (isStartsWith) {
      startsWithResults.push(result);
    } else {
      includesResults.push(result);
    }

    if (startsWithResults.length + includesResults.length >= limit) break;
  }

  return [...startsWithResults, ...includesResults].slice(0, limit);
}
