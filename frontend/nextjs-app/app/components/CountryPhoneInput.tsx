'use client';

import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { useMemo, useState } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
};

const regionNames = typeof Intl !== 'undefined' && Intl.DisplayNames
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

const countries = getCountries().map(code => ({
  code,
  name: regionNames?.of(code) || code,
  callingCode: getCountryCallingCode(code),
})).sort((left, right) => left.name.localeCompare(right.name));

function initialCountry(value: string): CountryCode {
  return parsePhoneNumberFromString(value)?.country || 'IN';
}

function nationalDigits(value: string, country: CountryCode) {
  const parsed = parsePhoneNumberFromString(value);
  if (parsed?.country === country) return parsed.nationalNumber;
  const callingCode = getCountryCallingCode(country);
  return value.replace(/^\+/, '').replace(new RegExp(`^${callingCode}`), '').replace(/\D/g, '');
}

export default function CountryPhoneInput({ value, onChange, required = false, className = '', placeholder = 'Mobile number', ariaLabel = 'Mobile number' }: Props) {
  const [country, setCountry] = useState<CountryCode>(() => initialCountry(value));
  const digits = useMemo(() => nationalDigits(value, country), [value, country]);
  const callingCode = getCountryCallingCode(country);

  const updateCountry = (next: CountryCode) => {
    setCountry(next);
    onChange(digits ? `+${getCountryCallingCode(next)}${digits}` : '');
  };

  const updateNumber = (input: string) => {
    const nextDigits = input.replace(/\D/g, '');
    onChange(nextDigits ? `+${callingCode}${nextDigits}` : '');
  };

  return <div className={`country-phone-input ${className}`}>
    <select value={country} onChange={event => updateCountry(event.target.value as CountryCode)} aria-label="Country calling code">
      {countries.map(item => <option key={item.code} value={item.code}>{item.name} (+{item.callingCode})</option>)}
    </select>
    <span className="country-calling-code">+{callingCode}</span>
    <input type="tel" inputMode="tel" required={required} value={digits} onChange={event => updateNumber(event.target.value)} placeholder={placeholder} aria-label={ariaLabel}/>
  </div>;
}
