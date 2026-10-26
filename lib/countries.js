const CODES = "NG GH KE ZA EG ET TZ UG RW SN CI CM DZ MA TN ZM ZW AO MZ BW NA US CA MX BR AR CO CL PE VE GB IE FR DE ES PT IT NL BE CH AT SE NO DK FI PL GR TR RU UA RO CZ HU IL SA AE QA IN PK BD LK ID MY SG TH VN PH CN JP KR AU NZ".split(" ");
const names = new Intl.DisplayNames(["en"], { type: "region" });
export const COUNTRIES = CODES.map((c) => [c, names.of(c)]).sort((a, b) => a[1].localeCompare(b[1]));
