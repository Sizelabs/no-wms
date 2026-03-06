"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { inputClass } from "@/components/ui/form-section";
import type { CitySearchResult } from "@/lib/actions/locations";
import { searchCities } from "@/lib/actions/locations";

interface CityTypeaheadProps {
  defaultCity?: string;
  defaultState?: string;
  defaultCountryCode?: string;
  defaultCountry?: string;
  /** Hidden input name for city (default: "city", set to null to skip) */
  cityFieldName?: string | null;
  /** Hidden input name for state/province (default: "state", set to null to skip) */
  stateFieldName?: string | null;
  /** Hidden input name for country code (default: "country_code", set to null to skip) */
  countryCodeFieldName?: string | null;
  /** Hidden input name for country name (default: null — not rendered, set e.g. "country" to enable) */
  countryFieldName?: string | null;
  /** Callback when a city is selected */
  onSelect?: (result: CitySearchResult | null) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export function CityTypeahead({
  defaultCity = "",
  defaultState = "",
  defaultCountryCode = "",
  defaultCountry = "",
  cityFieldName = "city",
  stateFieldName = "state",
  countryCodeFieldName = "country_code",
  countryFieldName = null,
  onSelect,
  required,
  disabled,
  id: externalId,
}: CityTypeaheadProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;

  const [city, setCity] = useState(defaultCity);
  const [state, setState] = useState(defaultState);
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [country, setCountry] = useState(defaultCountry);

  const defaultLabel = defaultCity
    ? [defaultCity, defaultState, defaultCountry || defaultCountryCode].filter(Boolean).join(", ")
    : "";

  const [query, setQuery] = useState("");
  const [displayValue, setDisplayValue] = useState(defaultLabel);
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const selectResult = useCallback((result: CitySearchResult) => {
    setCity(result.city);
    setState(result.state);
    setCountryCode(result.countryCode);
    setCountry(result.country);
    setDisplayValue(result.label);
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setHighlightIndex(-1);
    onSelect?.(result);
  }, [onSelect]);

  const clearSelection = useCallback(() => {
    setCity("");
    setState("");
    setCountryCode("");
    setCountry("");
    setDisplayValue("");
    onSelect?.(null);
  }, [onSelect]);

  // Search on query change (debounced)
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      searchCities(query).then((r) => {
        setResults(r);
        setIsSearching(false);
        setHighlightIndex(-1);
      });
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (!city && query) {
          setQuery("");
        }
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [city, query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
        setHighlightIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => (i < results.length - 1 ? i + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => (i > 0 ? i - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && results[highlightIndex]) {
          selectResult(results[highlightIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setHighlightIndex(-1);
        break;
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setDisplayValue(val);
    setIsOpen(true);
    if (!val) clearSelection();
  }

  function handleFocus() {
    if (!disabled && displayValue) {
      setIsOpen(true);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden inputs for form submission */}
      {cityFieldName && <input type="hidden" name={cityFieldName} value={city} />}
      {stateFieldName && <input type="hidden" name={stateFieldName} value={state} />}
      {countryCodeFieldName && <input type="hidden" name={countryCodeFieldName} value={countryCode} />}
      {countryFieldName && <input type="hidden" name={countryFieldName} value={country} />}

      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        autoComplete="off"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="Buscar ciudad..."
        disabled={disabled}
        required={required && !city}
        className={inputClass}
      />

      {/* Search icon */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        {isSearching ? (
          <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-75" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg"
        >
          {results.map((result, i) => (
            <li
              key={`${result.countryCode}-${result.state}-${result.city}`}
              role="option"
              aria-selected={i === highlightIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectResult(result);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`cursor-pointer px-3 py-2 ${
                i === highlightIndex
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-700"
              }`}
            >
              <span className="font-medium">{result.city}</span>
              {(result.state || result.country) && (
                <span className="text-gray-500">
                  {result.state ? `, ${result.state}` : ""}
                  {result.country ? `, ${result.country}` : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOpen && query && query.length >= 2 && !isSearching && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 shadow-lg">
          Sin resultados
        </div>
      )}
    </div>
  );
}
