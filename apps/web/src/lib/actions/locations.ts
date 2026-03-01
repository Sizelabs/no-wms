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
  }));
}

export async function getTimezonesOfCountry(countryCode: string) {
  const c = Country.getCountryByCode(countryCode);
  return (c?.timezones ?? []).map((tz) => ({
    zoneName: tz.zoneName,
    gmtOffsetName: tz.gmtOffsetName,
  }));
}
