export type Airport = {
  iata: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
};

export const AIRPORTS = [
  // United States — Major
  { iata: "ATL", name: "Hartsfield-Jackson Atlanta International", city: "Atlanta", country: "United States", countryCode: "US" },
  { iata: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "United States", countryCode: "US" },
  { iata: "ORD", name: "O'Hare International", city: "Chicago", country: "United States", countryCode: "US" },
  { iata: "DFW", name: "Dallas/Fort Worth International", city: "Dallas", country: "United States", countryCode: "US" },
  { iata: "DEN", name: "Denver International", city: "Denver", country: "United States", countryCode: "US" },
  { iata: "JFK", name: "John F. Kennedy International", city: "New York", country: "United States", countryCode: "US" },
  { iata: "SFO", name: "San Francisco International", city: "San Francisco", country: "United States", countryCode: "US" },
  { iata: "SEA", name: "Seattle-Tacoma International", city: "Seattle", country: "United States", countryCode: "US" },
  { iata: "LAS", name: "Harry Reid International", city: "Las Vegas", country: "United States", countryCode: "US" },
  { iata: "MCO", name: "Orlando International", city: "Orlando", country: "United States", countryCode: "US" },
  { iata: "EWR", name: "Newark Liberty International", city: "Newark", country: "United States", countryCode: "US" },
  { iata: "MIA", name: "Miami International", city: "Miami", country: "United States", countryCode: "US" },
  { iata: "IAH", name: "George Bush Intercontinental", city: "Houston", country: "United States", countryCode: "US" },
  { iata: "BOS", name: "Boston Logan International", city: "Boston", country: "United States", countryCode: "US" },
  { iata: "MSP", name: "Minneapolis-Saint Paul International", city: "Minneapolis", country: "United States", countryCode: "US" },
  { iata: "FLL", name: "Fort Lauderdale-Hollywood International", city: "Fort Lauderdale", country: "United States", countryCode: "US" },
  { iata: "DTW", name: "Detroit Metropolitan Wayne County", city: "Detroit", country: "United States", countryCode: "US" },
  { iata: "PHL", name: "Philadelphia International", city: "Philadelphia", country: "United States", countryCode: "US" },
  { iata: "LGA", name: "LaGuardia", city: "New York", country: "United States", countryCode: "US" },
  { iata: "BWI", name: "Baltimore/Washington International", city: "Baltimore", country: "United States", countryCode: "US" },
  { iata: "SLC", name: "Salt Lake City International", city: "Salt Lake City", country: "United States", countryCode: "US" },
  { iata: "IAD", name: "Washington Dulles International", city: "Washington", country: "United States", countryCode: "US" },
  { iata: "DCA", name: "Ronald Reagan Washington National", city: "Washington", country: "United States", countryCode: "US" },
  { iata: "SAN", name: "San Diego International", city: "San Diego", country: "United States", countryCode: "US" },
  { iata: "TPA", name: "Tampa International", city: "Tampa", country: "United States", countryCode: "US" },
  { iata: "HNL", name: "Daniel K. Inouye International", city: "Honolulu", country: "United States", countryCode: "US" },
  { iata: "PDX", name: "Portland International", city: "Portland", country: "United States", countryCode: "US" },
  { iata: "STL", name: "St. Louis Lambert International", city: "St. Louis", country: "United States", countryCode: "US" },
  { iata: "BNA", name: "Nashville International", city: "Nashville", country: "United States", countryCode: "US" },
  { iata: "AUS", name: "Austin-Bergstrom International", city: "Austin", country: "United States", countryCode: "US" },
  { iata: "HOU", name: "William P. Hobby", city: "Houston", country: "United States", countryCode: "US" },
  { iata: "OAK", name: "Oakland International", city: "Oakland", country: "United States", countryCode: "US" },
  { iata: "RDU", name: "Raleigh-Durham International", city: "Raleigh", country: "United States", countryCode: "US" },
  { iata: "CLT", name: "Charlotte Douglas International", city: "Charlotte", country: "United States", countryCode: "US" },
  { iata: "PHX", name: "Phoenix Sky Harbor International", city: "Phoenix", country: "United States", countryCode: "US" },

  // United States — Cargo Hubs
  { iata: "ANC", name: "Ted Stevens Anchorage International", city: "Anchorage", country: "United States", countryCode: "US" },
  { iata: "MEM", name: "Memphis International", city: "Memphis", country: "United States", countryCode: "US" },
  { iata: "SDF", name: "Louisville Muhammad Ali International", city: "Louisville", country: "United States", countryCode: "US" },
  { iata: "CVG", name: "Cincinnati/Northern Kentucky International", city: "Cincinnati", country: "United States", countryCode: "US" },
  { iata: "IND", name: "Indianapolis International", city: "Indianapolis", country: "United States", countryCode: "US" },
  { iata: "ONT", name: "Ontario International", city: "Ontario", country: "United States", countryCode: "US" },
  { iata: "RFD", name: "Chicago Rockford International", city: "Rockford", country: "United States", countryCode: "US" },
  { iata: "AFW", name: "Fort Worth Alliance", city: "Fort Worth", country: "United States", countryCode: "US" },

  // Ecuador
  { iata: "GYE", name: "José Joaquín de Olmedo International", city: "Guayaquil", country: "Ecuador", countryCode: "EC" },
  { iata: "UIO", name: "Mariscal Sucre International", city: "Quito", country: "Ecuador", countryCode: "EC" },

  // Panama
  { iata: "PTY", name: "Tocumen International", city: "Panama City", country: "Panama", countryCode: "PA" },

  // Colombia
  { iata: "BOG", name: "El Dorado International", city: "Bogota", country: "Colombia", countryCode: "CO" },
  { iata: "MDE", name: "José María Córdova International", city: "Medellin", country: "Colombia", countryCode: "CO" },
  { iata: "CLO", name: "Alfonso Bonilla Aragón International", city: "Cali", country: "Colombia", countryCode: "CO" },
  { iata: "CTG", name: "Rafael Núñez International", city: "Cartagena", country: "Colombia", countryCode: "CO" },

  // Peru
  { iata: "LIM", name: "Jorge Chávez International", city: "Lima", country: "Peru", countryCode: "PE" },

  // Chile
  { iata: "SCL", name: "Arturo Merino Benítez International", city: "Santiago", country: "Chile", countryCode: "CL" },

  // Argentina
  { iata: "EZE", name: "Ministro Pistarini International", city: "Buenos Aires", country: "Argentina", countryCode: "AR" },
  { iata: "AEP", name: "Aeroparque Jorge Newbery", city: "Buenos Aires", country: "Argentina", countryCode: "AR" },

  // Brazil
  { iata: "GRU", name: "São Paulo/Guarulhos International", city: "São Paulo", country: "Brazil", countryCode: "BR" },
  { iata: "GIG", name: "Rio de Janeiro/Galeão International", city: "Rio de Janeiro", country: "Brazil", countryCode: "BR" },
  { iata: "VCP", name: "Viracopos International", city: "Campinas", country: "Brazil", countryCode: "BR" },
  { iata: "BSB", name: "Presidente Juscelino Kubitschek International", city: "Brasilia", country: "Brazil", countryCode: "BR" },
  { iata: "CNF", name: "Tancredo Neves International", city: "Belo Horizonte", country: "Brazil", countryCode: "BR" },
  { iata: "CWB", name: "Afonso Pena International", city: "Curitiba", country: "Brazil", countryCode: "BR" },
  { iata: "REC", name: "Recife/Guararapes International", city: "Recife", country: "Brazil", countryCode: "BR" },

  // Mexico
  { iata: "MEX", name: "Benito Juárez International", city: "Mexico City", country: "Mexico", countryCode: "MX" },
  { iata: "CUN", name: "Cancún International", city: "Cancún", country: "Mexico", countryCode: "MX" },
  { iata: "GDL", name: "Miguel Hidalgo y Costilla International", city: "Guadalajara", country: "Mexico", countryCode: "MX" },
  { iata: "MTY", name: "General Mariano Escobedo International", city: "Monterrey", country: "Mexico", countryCode: "MX" },
  { iata: "TIJ", name: "General Abelardo L. Rodríguez International", city: "Tijuana", country: "Mexico", countryCode: "MX" },

  // Costa Rica
  { iata: "SJO", name: "Juan Santamaría International", city: "San José", country: "Costa Rica", countryCode: "CR" },

  // Guatemala
  { iata: "GUA", name: "La Aurora International", city: "Guatemala City", country: "Guatemala", countryCode: "GT" },

  // El Salvador
  { iata: "SAL", name: "Monseñor Óscar Arnulfo Romero International", city: "San Salvador", country: "El Salvador", countryCode: "SV" },

  // Honduras
  { iata: "SAP", name: "Ramón Villeda Morales International", city: "San Pedro Sula", country: "Honduras", countryCode: "HN" },
  { iata: "TGU", name: "Toncontín International", city: "Tegucigalpa", country: "Honduras", countryCode: "HN" },

  // Dominican Republic
  { iata: "SDQ", name: "Las Américas International", city: "Santo Domingo", country: "Dominican Republic", countryCode: "DO" },
  { iata: "PUJ", name: "Punta Cana International", city: "Punta Cana", country: "Dominican Republic", countryCode: "DO" },

  // Cuba
  { iata: "HAV", name: "José Martí International", city: "Havana", country: "Cuba", countryCode: "CU" },

  // Jamaica
  { iata: "KIN", name: "Norman Manley International", city: "Kingston", country: "Jamaica", countryCode: "JM" },
  { iata: "MBJ", name: "Sangster International", city: "Montego Bay", country: "Jamaica", countryCode: "JM" },

  // Venezuela
  { iata: "CCS", name: "Simón Bolívar International", city: "Caracas", country: "Venezuela", countryCode: "VE" },

  // Bolivia
  { iata: "VVI", name: "Viru Viru International", city: "Santa Cruz", country: "Bolivia", countryCode: "BO" },
  { iata: "LPB", name: "El Alto International", city: "La Paz", country: "Bolivia", countryCode: "BO" },

  // Paraguay
  { iata: "ASU", name: "Silvio Pettirossi International", city: "Asunción", country: "Paraguay", countryCode: "PY" },

  // Uruguay
  { iata: "MVD", name: "Carrasco International", city: "Montevideo", country: "Uruguay", countryCode: "UY" },

  // Trinidad and Tobago
  { iata: "POS", name: "Piarco International", city: "Port of Spain", country: "Trinidad and Tobago", countryCode: "TT" },

  // Curaçao
  { iata: "CUR", name: "Hato International", city: "Willemstad", country: "Curaçao", countryCode: "CW" },

  // Aruba
  { iata: "AUA", name: "Queen Beatrix International", city: "Oranjestad", country: "Aruba", countryCode: "AW" },

  // Europe — United Kingdom
  { iata: "LHR", name: "Heathrow", city: "London", country: "United Kingdom", countryCode: "GB" },
  { iata: "LGW", name: "Gatwick", city: "London", country: "United Kingdom", countryCode: "GB" },
  { iata: "STN", name: "Stansted", city: "London", country: "United Kingdom", countryCode: "GB" },
  { iata: "MAN", name: "Manchester", city: "Manchester", country: "United Kingdom", countryCode: "GB" },

  // Europe — France
  { iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France", countryCode: "FR" },
  { iata: "ORY", name: "Orly", city: "Paris", country: "France", countryCode: "FR" },

  // Europe — Germany
  { iata: "FRA", name: "Frankfurt am Main", city: "Frankfurt", country: "Germany", countryCode: "DE" },
  { iata: "MUC", name: "Munich", city: "Munich", country: "Germany", countryCode: "DE" },
  { iata: "TXL", name: "Berlin Brandenburg", city: "Berlin", country: "Germany", countryCode: "DE" },
  { iata: "CGN", name: "Cologne Bonn", city: "Cologne", country: "Germany", countryCode: "DE" },
  { iata: "LEJ", name: "Leipzig/Halle", city: "Leipzig", country: "Germany", countryCode: "DE" },

  // Europe — Netherlands
  { iata: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", countryCode: "NL" },

  // Europe — Spain
  { iata: "MAD", name: "Adolfo Suárez Madrid-Barajas", city: "Madrid", country: "Spain", countryCode: "ES" },
  { iata: "BCN", name: "Josep Tarradellas Barcelona-El Prat", city: "Barcelona", country: "Spain", countryCode: "ES" },

  // Europe — Italy
  { iata: "FCO", name: "Leonardo da Vinci–Fiumicino", city: "Rome", country: "Italy", countryCode: "IT" },
  { iata: "MXP", name: "Milan Malpensa", city: "Milan", country: "Italy", countryCode: "IT" },

  // Europe — Switzerland
  { iata: "ZRH", name: "Zurich", city: "Zurich", country: "Switzerland", countryCode: "CH" },

  // Europe — Belgium
  { iata: "BRU", name: "Brussels", city: "Brussels", country: "Belgium", countryCode: "BE" },
  { iata: "LGG", name: "Liège", city: "Liège", country: "Belgium", countryCode: "BE" },

  // Europe — Portugal
  { iata: "LIS", name: "Humberto Delgado", city: "Lisbon", country: "Portugal", countryCode: "PT" },

  // Europe — Turkey
  { iata: "IST", name: "Istanbul", city: "Istanbul", country: "Turkey", countryCode: "TR" },

  // Europe — Austria
  { iata: "VIE", name: "Vienna International", city: "Vienna", country: "Austria", countryCode: "AT" },

  // Europe — Denmark
  { iata: "CPH", name: "Copenhagen", city: "Copenhagen", country: "Denmark", countryCode: "DK" },

  // Europe — Sweden
  { iata: "ARN", name: "Stockholm Arlanda", city: "Stockholm", country: "Sweden", countryCode: "SE" },

  // Europe — Norway
  { iata: "OSL", name: "Oslo Gardermoen", city: "Oslo", country: "Norway", countryCode: "NO" },

  // Europe — Finland
  { iata: "HEL", name: "Helsinki-Vantaa", city: "Helsinki", country: "Finland", countryCode: "FI" },

  // Europe — Ireland
  { iata: "DUB", name: "Dublin", city: "Dublin", country: "Ireland", countryCode: "IE" },

  // Europe — Luxembourg
  { iata: "LUX", name: "Luxembourg Findel", city: "Luxembourg", country: "Luxembourg", countryCode: "LU" },

  // Middle East
  { iata: "DXB", name: "Dubai International", city: "Dubai", country: "United Arab Emirates", countryCode: "AE" },
  { iata: "AUH", name: "Abu Dhabi International", city: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE" },
  { iata: "DOH", name: "Hamad International", city: "Doha", country: "Qatar", countryCode: "QA" },
  { iata: "RUH", name: "King Khalid International", city: "Riyadh", country: "Saudi Arabia", countryCode: "SA" },
  { iata: "JED", name: "King Abdulaziz International", city: "Jeddah", country: "Saudi Arabia", countryCode: "SA" },
  { iata: "TLV", name: "Ben Gurion", city: "Tel Aviv", country: "Israel", countryCode: "IL" },

  // Asia — Japan
  { iata: "NRT", name: "Narita International", city: "Tokyo", country: "Japan", countryCode: "JP" },
  { iata: "HND", name: "Haneda", city: "Tokyo", country: "Japan", countryCode: "JP" },
  { iata: "KIX", name: "Kansai International", city: "Osaka", country: "Japan", countryCode: "JP" },

  // Asia — China
  { iata: "PVG", name: "Shanghai Pudong International", city: "Shanghai", country: "China", countryCode: "CN" },
  { iata: "PEK", name: "Beijing Capital International", city: "Beijing", country: "China", countryCode: "CN" },
  { iata: "CAN", name: "Guangzhou Baiyun International", city: "Guangzhou", country: "China", countryCode: "CN" },
  { iata: "SZX", name: "Shenzhen Bao'an International", city: "Shenzhen", country: "China", countryCode: "CN" },

  // Asia — Hong Kong
  { iata: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "Hong Kong", countryCode: "HK" },

  // Asia — South Korea
  { iata: "ICN", name: "Incheon International", city: "Seoul", country: "South Korea", countryCode: "KR" },

  // Asia — Singapore
  { iata: "SIN", name: "Changi", city: "Singapore", country: "Singapore", countryCode: "SG" },

  // Asia — Thailand
  { iata: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "Thailand", countryCode: "TH" },

  // Asia — India
  { iata: "DEL", name: "Indira Gandhi International", city: "New Delhi", country: "India", countryCode: "IN" },
  { iata: "BOM", name: "Chhatrapati Shivaji Maharaj International", city: "Mumbai", country: "India", countryCode: "IN" },
  { iata: "BLR", name: "Kempegowda International", city: "Bangalore", country: "India", countryCode: "IN" },

  // Asia — Taiwan
  { iata: "TPE", name: "Taiwan Taoyuan International", city: "Taipei", country: "Taiwan", countryCode: "TW" },

  // Asia — Malaysia
  { iata: "KUL", name: "Kuala Lumpur International", city: "Kuala Lumpur", country: "Malaysia", countryCode: "MY" },

  // Asia — Vietnam
  { iata: "SGN", name: "Tan Son Nhat International", city: "Ho Chi Minh City", country: "Vietnam", countryCode: "VN" },

  // Asia — Philippines
  { iata: "MNL", name: "Ninoy Aquino International", city: "Manila", country: "Philippines", countryCode: "PH" },

  // Oceania
  { iata: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", countryCode: "AU" },
  { iata: "MEL", name: "Melbourne Tullamarine", city: "Melbourne", country: "Australia", countryCode: "AU" },
  { iata: "AKL", name: "Auckland", city: "Auckland", country: "New Zealand", countryCode: "NZ" },

  // Africa
  { iata: "JNB", name: "O.R. Tambo International", city: "Johannesburg", country: "South Africa", countryCode: "ZA" },
  { iata: "CPT", name: "Cape Town International", city: "Cape Town", country: "South Africa", countryCode: "ZA" },
  { iata: "NBO", name: "Jomo Kenyatta International", city: "Nairobi", country: "Kenya", countryCode: "KE" },
  { iata: "ADD", name: "Bole International", city: "Addis Ababa", country: "Ethiopia", countryCode: "ET" },
  { iata: "CAI", name: "Cairo International", city: "Cairo", country: "Egypt", countryCode: "EG" },
  { iata: "CMN", name: "Mohammed V International", city: "Casablanca", country: "Morocco", countryCode: "MA" },
  { iata: "LOS", name: "Murtala Muhammed International", city: "Lagos", country: "Nigeria", countryCode: "NG" },

  // Canada
  { iata: "YYZ", name: "Toronto Pearson International", city: "Toronto", country: "Canada", countryCode: "CA" },
  { iata: "YVR", name: "Vancouver International", city: "Vancouver", country: "Canada", countryCode: "CA" },
  { iata: "YUL", name: "Montréal-Pierre Elliott Trudeau International", city: "Montreal", country: "Canada", countryCode: "CA" },
  { iata: "YYC", name: "Calgary International", city: "Calgary", country: "Canada", countryCode: "CA" },
] as const;

export function findAirport(iata: string): Airport | undefined {
  const code = iata.toUpperCase();
  return AIRPORTS.find((a) => a.iata === code);
}

export function formatAirportForPrint(iata: string): string {
  const airport = findAirport(iata);
  if (!airport) return iata;
  return `${airport.name} - ${airport.iata}`;
}
