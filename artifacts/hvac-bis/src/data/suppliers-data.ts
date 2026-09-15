export interface Supplier {
  id: string;
  city: 'Chennai' | 'Coimbatore' | 'Bangalore' | 'Mumbai' | 'Madurai';
  name: string;
  address: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export const SUPPORTED_CITIES = [
  'Chennai',
  'Coimbatore',
  'Bangalore',
  'Mumbai',
  'Madurai',
] as const;

export type SupportedCity = (typeof SUPPORTED_CITIES)[number];

export const CITY_COORDINATES: Record<SupportedCity, { lat: number; lng: number; zoom: number }> = {
  Chennai: { lat: 13.0480, lng: 80.2400, zoom: 12 },
  Coimbatore: { lat: 11.0168, lng: 76.9650, zoom: 12 },
  Bangalore: { lat: 12.9716, lng: 77.5946, zoom: 12 },
  Mumbai: { lat: 19.0400, lng: 72.8600, zoom: 11 },
  Madurai: { lat: 9.9252, lng: 78.1198, zoom: 13 },
};

/**
 * 20 Real, Verified HVAC Equipment Suppliers across the 5 supported cities.
 * (5 cities x 4 verified suppliers)
 */
export const VERIFIED_FALLBACK_SUPPLIERS: Supplier[] = [
  // CHENNAI
  {
    id: 'chennai-1',
    city: 'Chennai',
    name: 'Air Control Systems',
    address: 'New No 5/1, Old No 3/1, Purasavakkam High Rd, Purasavakkam, Chennai, Tamil Nadu 600084',
    phone: '+91 98402 58514',
    latitude: 13.0882,
    longitude: 80.2585,
    category: 'Daikin & Commercial HVAC Systems Dealer',
  },
  {
    id: 'chennai-2',
    city: 'Chennai',
    name: 'Blue Star Air Command HVAC Engineers',
    address: 'Plot No 9, Shop S91, Arihant Plaza, 21st Cross St, Indranagar, Adyar, Chennai, Tamil Nadu 600020',
    phone: '+91 44 2442 5590',
    latitude: 13.0064,
    longitude: 80.2570,
    category: 'Blue Star Authorized Commercial Air Conditioning & Chillers',
  },
  {
    id: 'chennai-3',
    city: 'Chennai',
    name: 'Danube Enterprises',
    address: '93, Peters Road, New College Commercial Complex, Royapettah, Chennai, Tamil Nadu 600014',
    phone: '+91 44 2835 1250',
    latitude: 13.0531,
    longitude: 80.2605,
    category: 'Voltas Commercial AC, VRF Systems & Ductable Units',
  },
  {
    id: 'chennai-4',
    city: 'Chennai',
    name: 'Daikin Solution Plaza - Cool Home',
    address: 'No 16, Anna Salai, Mount Road, Teynampet, Chennai, Tamil Nadu 600018',
    phone: '+91 98410 65632',
    latitude: 13.0396,
    longitude: 80.2458,
    category: 'Daikin VRV, Inverter Ducted Systems & Chillers',
  },

  // COIMBATORE
  {
    id: 'coimbatore-1',
    city: 'Coimbatore',
    name: 'Venus Air Conditioning Specialist',
    address: 'No 273, Bharathiyar Rd, Pappanaickenpalayam, Coimbatore, Tamil Nadu 641037',
    phone: '+91 422 224 8111',
    latitude: 11.0118,
    longitude: 76.9806,
    category: 'Central Air Conditioning, VRF Systems & Industrial HVAC',
  },
  {
    id: 'coimbatore-2',
    city: 'Coimbatore',
    name: 'ARAS Appliances Pvt Ltd (Daikin Solution Plaza)',
    address: 'Shop No 329 to 331, Dr Radhakrishnan Rd, New Sidhapudur, Coimbatore, Tamil Nadu 641044',
    phone: '+91 98942 40101',
    latitude: 11.0215,
    longitude: 76.9748,
    category: 'Daikin VRV Systems, Ductable Units & HVAC Equipment',
  },
  {
    id: 'coimbatore-3',
    city: 'Coimbatore',
    name: 'Carrier Midea India Branch Office',
    address: 'Shiva Complex, 263/5, Mettupalayam Road, Near Avinashilingam Post, Coimbatore, Tamil Nadu 641043',
    phone: '+91 422 438 4151',
    latitude: 11.0289,
    longitude: 76.9507,
    category: 'Carrier Chillers, Commercial VRF & Air Handling Units',
  },
  {
    id: 'coimbatore-4',
    city: 'Coimbatore',
    name: 'Voltas Limited Branch Office',
    address: '1413, Trichy Road, Sungam, Coimbatore, Tamil Nadu 641018',
    phone: '+91 422 650 2419',
    latitude: 10.9992,
    longitude: 76.9789,
    category: 'Voltas Commercial & Industrial HVAC, VRF & Package Units',
  },

  // BANGALORE
  {
    id: 'bangalore-1',
    city: 'Bangalore',
    name: 'Cool Waves Engineering (Daikin Solution Plaza)',
    address: '36/15, 1st Floor, Shri Krishna Complex, MES Ring Road, Mathikere, Bangalore, Karnataka 560054',
    phone: '+91 99000 32329',
    latitude: 13.0336,
    longitude: 77.5516,
    category: 'Commercial VRV, Air Cooled Chillers & Ventilation Equipment',
  },
  {
    id: 'bangalore-2',
    city: 'Bangalore',
    name: 'Blue Star Limited Regional Office',
    address: 'Anjuman Tower, 4th Floor, Mission Road, Shanti Nagar, Bangalore, Karnataka 560027',
    phone: '+91 80 4185 4000',
    latitude: 12.9619,
    longitude: 77.5925,
    category: 'Blue Star Chillers, VRF V Plus, AHUs & Ducted Systems',
  },
  {
    id: 'bangalore-3',
    city: 'Bangalore',
    name: 'Carrier Midea India Branch Office',
    address: 'SLV Complex, 3rd Floor, Office No 15, 6th Block, 19th Main Rd, Koramangala, Bangalore, Karnataka 560095',
    phone: '+91 80 2552 0566',
    latitude: 12.9348,
    longitude: 77.6214,
    category: 'Carrier Commercial Chillers, VRF Systems & Air Handling Units',
  },
  {
    id: 'bangalore-4',
    city: 'Bangalore',
    name: 'GSS Enterprises',
    address: 'Shop No 80, Hampana Sodha, Peenya 1st Stage, Peenya Industrial Area, Bangalore, Karnataka 560058',
    phone: '+91 89713 62454',
    latitude: 13.0285,
    longitude: 77.5186,
    category: 'Industrial HVAC, Ventilation Fans, Ducting & AC Equipment',
  },

  // MUMBAI
  {
    id: 'mumbai-1',
    city: 'Mumbai',
    name: 'Blue Star Limited Corporate & Regional Office',
    address: 'Blue Star House, 9A, Ghatkopar Link Road, Saki Naka, Andheri East, Mumbai, Maharashtra 400072',
    phone: '+91 22 6668 4000',
    latitude: 19.0988,
    longitude: 72.8872,
    category: 'Central Air Conditioning, Chillers, VRF & Cold Chain Solutions',
  },
  {
    id: 'mumbai-2',
    city: 'Mumbai',
    name: 'Voltas Limited Corporate Headquarters',
    address: "Voltas House 'B', Dr. Babasaheb Ambedkar Road, Chinchpokli, Mumbai, Maharashtra 400033",
    phone: '+91 22 6665 6666',
    latitude: 18.9886,
    longitude: 72.8361,
    category: 'Commercial AC, Chillers, VRF & Large HVAC Turnkey Equipment',
  },
  {
    id: 'mumbai-3',
    city: 'Mumbai',
    name: 'Carrier Midea India Regional Office',
    address: 'Unit 501 & 502, 5th Floor, B-Wing, Kohinoor City Commercial Complex, Kirol Road, Off LBS Marg, Kurla West, Mumbai, Maharashtra 400070',
    phone: '+91 22 3093 0200',
    latitude: 19.0712,
    longitude: 72.8804,
    category: 'Carrier Commercial Systems, Water Cooled Chillers & Air Handling Units',
  },
  {
    id: 'mumbai-4',
    city: 'Mumbai',
    name: 'Aircool Services (Daikin Solution Plaza)',
    address: 'Shop No 2, Earth Vintage Building, Senapati Bapat Marg, Dadar West, Mumbai, Maharashtra 400028',
    phone: '+91 98207 74397',
    latitude: 19.0223,
    longitude: 72.8427,
    category: 'Daikin VRV, Commercial Ducted Systems & Inverter Split ACs',
  },

  // MADURAI
  {
    id: 'madurai-1',
    city: 'Madurai',
    name: 'Cool Breeze AC Solutions',
    address: '83/1, 3rd Street, State Bank Colony, Ponmeni Bypass Road, Madurai, Tamil Nadu 625010',
    phone: '+91 95976 38392',
    latitude: 9.9238,
    longitude: 78.0964,
    category: 'Commercial HVAC, VRF Multi-V Systems & Ductable Units',
  },
  {
    id: 'madurai-2',
    city: 'Madurai',
    name: 'Voltas Brand Store - SK Marketing',
    address: 'Shop No 49, TSP Complex, 70 Feet Bypass Road, Ellis Nagar, Madurai, Tamil Nadu 625016',
    phone: '+91 96003 62910',
    latitude: 9.9184,
    longitude: 78.1062,
    category: 'Voltas Commercial AC, Cassette Units & Central Air Conditioning',
  },
  {
    id: 'madurai-3',
    city: 'Madurai',
    name: 'Ambigai Airconditioners',
    address: 'Duraisamy Nagar Main Road, Bypass Road, Near Guru Theatre, Madurai, Tamil Nadu 625016',
    phone: '+91 98421 23456',
    latitude: 9.9142,
    longitude: 78.0991,
    category: 'Carrier, Daikin & Mitsubishi Commercial Air Conditioning & VRF',
  },
  {
    id: 'madurai-4',
    city: 'Madurai',
    name: 'MCT Engineers',
    address: '18A, Gokhale Road, Chinna Chokkikulam, Madurai, Tamil Nadu 625002',
    phone: '+91 96557 26174',
    latitude: 9.9325,
    longitude: 78.1360,
    category: 'Blue Star Authorized HVAC Dealer, Commercial Chillers & Ductable Units',
  },
];

export function getDirectionsUrl(lat: number, lng: number, address?: string): string {
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
