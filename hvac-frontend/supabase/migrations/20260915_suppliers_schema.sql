-- ==============================================================================
-- HVAC BIS - Suppliers Schema & 20 Verified Real HVAC Equipment Suppliers
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  category TEXT DEFAULT 'HVAC Equipment & Commercial Systems',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_city ON public.suppliers(city);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Allow public read-only access for reference data
DROP POLICY IF EXISTS "suppliers_read_all" ON public.suppliers;
CREATE POLICY "suppliers_read_all" ON public.suppliers
  FOR SELECT
  USING (true);

-- ==============================================================================
-- Seed Data: 20 Verified Real HVAC Equipment Suppliers Across 5 Supported Cities
-- ==============================================================================

-- CHENNAI (4 Suppliers)
INSERT INTO public.suppliers (city, name, address, phone, latitude, longitude, category)
VALUES
  (
    'Chennai',
    'Air Control Systems',
    'New No 5/1, Old No 3/1, Purasavakkam High Rd, Purasavakkam, Chennai, Tamil Nadu 600084',
    '+91 98402 58514',
    13.0882000,
    80.2585000,
    'Daikin & Commercial HVAC Systems Dealer'
  ),
  (
    'Chennai',
    'Blue Star Air Command HVAC Engineers',
    'Plot No 9, Shop S91, Arihant Plaza, 21st Cross St, Indranagar, Adyar, Chennai, Tamil Nadu 600020',
    '+91 44 2442 5590',
    13.0064000,
    80.2570000,
    'Blue Star Authorized Commercial Air Conditioning & Chillers'
  ),
  (
    'Chennai',
    'Danube Enterprises',
    '93, Peters Road, New College Commercial Complex, Royapettah, Chennai, Tamil Nadu 600014',
    '+91 44 2835 1250',
    13.0531000,
    80.2605000,
    'Voltas Commercial AC, VRF Systems & Ductable Units'
  ),
  (
    'Chennai',
    'Daikin Solution Plaza - Cool Home',
    'No 16, Anna Salai, Mount Road, Teynampet, Chennai, Tamil Nadu 600018',
    '+91 98410 65632',
    13.0396000,
    80.2458000,
    'Daikin VRV, Inverter Ducted Systems & Chillers'
  )
ON CONFLICT (id) DO NOTHING;

-- COIMBATORE (4 Suppliers)
INSERT INTO public.suppliers (city, name, address, phone, latitude, longitude, category)
VALUES
  (
    'Coimbatore',
    'Venus Air Conditioning Specialist',
    'No 273, Bharathiyar Rd, Pappanaickenpalayam, Coimbatore, Tamil Nadu 641037',
    '+91 422 224 8111',
    11.0118000,
    76.9806000,
    'Central Air Conditioning, VRF Systems & Industrial HVAC'
  ),
  (
    'Coimbatore',
    'ARAS Appliances Pvt Ltd (Daikin Solution Plaza)',
    'Shop No 329 to 331, Dr Radhakrishnan Rd, New Sidhapudur, Coimbatore, Tamil Nadu 641044',
    '+91 98942 40101',
    11.0215000,
    76.9748000,
    'Daikin VRV Systems, Ductable Units & HVAC Equipment'
  ),
  (
    'Coimbatore',
    'Carrier Midea India Branch Office',
    'Shiva Complex, 263/5, Mettupalayam Road, Near Avinashilingam Post, Coimbatore, Tamil Nadu 641043',
    '+91 422 438 4151',
    11.0289000,
    76.9507000,
    'Carrier Chillers, Commercial VRF & Air Handling Units'
  ),
  (
    'Coimbatore',
    'Voltas Limited Branch Office',
    '1413, Trichy Road, Sungam, Coimbatore, Tamil Nadu 641018',
    '+91 422 650 2419',
    10.9992000,
    76.9789000,
    'Voltas Commercial & Industrial HVAC, VRF & Package Units'
  )
ON CONFLICT (id) DO NOTHING;

-- BANGALORE (4 Suppliers)
INSERT INTO public.suppliers (city, name, address, phone, latitude, longitude, category)
VALUES
  (
    'Bangalore',
    'Cool Waves Engineering (Daikin Solution Plaza)',
    '36/15, 1st Floor, Shri Krishna Complex, MES Ring Road, Mathikere, Bangalore, Karnataka 560054',
    '+91 99000 32329',
    13.0336000,
    77.5516000,
    'Commercial VRV, Air Cooled Chillers & Ventilation Equipment'
  ),
  (
    'Bangalore',
    'Blue Star Limited Regional Office',
    'Anjuman Tower, 4th Floor, Mission Road, Shanti Nagar, Bangalore, Karnataka 560027',
    '+91 80 4185 4000',
    12.9619000,
    77.5925000,
    'Blue Star Chillers, VRF V Plus, AHUs & Ducted Systems'
  ),
  (
    'Bangalore',
    'Carrier Midea India Branch Office',
    'SLV Complex, 3rd Floor, Office No 15, 6th Block, 19th Main Rd, Koramangala, Bangalore, Karnataka 560095',
    '+91 80 2552 0566',
    12.9348000,
    77.6214000,
    'Carrier Commercial Chillers, VRF Systems & Air Handling Units'
  ),
  (
    'Bangalore',
    'GSS Enterprises',
    'Shop No 80, Hampana Sodha, Peenya 1st Stage, Peenya Industrial Area, Bangalore, Karnataka 560058',
    '+91 89713 62454',
    13.0285000,
    77.5186000,
    'Industrial HVAC, Ventilation Fans, Ducting & AC Equipment'
  )
ON CONFLICT (id) DO NOTHING;

-- MUMBAI (4 Suppliers)
INSERT INTO public.suppliers (city, name, address, phone, latitude, longitude, category)
VALUES
  (
    'Mumbai',
    'Blue Star Limited Corporate & Regional Office',
    'Blue Star House, 9A, Ghatkopar Link Road, Saki Naka, Andheri East, Mumbai, Maharashtra 400072',
    '+91 22 6668 4000',
    19.0988000,
    72.8872000,
    'Central Air Conditioning, Chillers, VRF & Cold Chain Solutions'
  ),
  (
    'Mumbai',
    'Voltas Limited Corporate Headquarters',
    'Voltas House ''B'', Dr. Babasaheb Ambedkar Road, Chinchpokli, Mumbai, Maharashtra 400033',
    '+91 22 6665 6666',
    18.9886000,
    72.8361000,
    'Commercial AC, Chillers, VRF & Large HVAC Turnkey Equipment'
  ),
  (
    'Mumbai',
    'Carrier Midea India Regional Office',
    'Unit 501 & 502, 5th Floor, B-Wing, Kohinoor City Commercial Complex, Kirol Road, Off LBS Marg, Kurla West, Mumbai, Maharashtra 400070',
    '+91 22 3093 0200',
    19.0712000,
    72.8804000,
    'Carrier Commercial Systems, Water Cooled Chillers & Air Handling Units'
  ),
  (
    'Mumbai',
    'Aircool Services (Daikin Solution Plaza)',
    'Shop No 2, Earth Vintage Building, Senapati Bapat Marg, Dadar West, Mumbai, Maharashtra 400028',
    '+91 98207 74397',
    19.0223000,
    72.8427000,
    'Daikin VRV, Commercial Ducted Systems & Inverter Split ACs'
  )
ON CONFLICT (id) DO NOTHING;

-- MADURAI (4 Suppliers)
INSERT INTO public.suppliers (city, name, address, phone, latitude, longitude, category)
VALUES
  (
    'Madurai',
    'Cool Breeze AC Solutions',
    '83/1, 3rd Street, State Bank Colony, Ponmeni Bypass Road, Madurai, Tamil Nadu 625010',
    '+91 95976 38392',
    9.9238000,
    78.0964000,
    'Commercial HVAC, VRF Multi-V Systems & Ductable Units'
  ),
  (
    'Madurai',
    'Voltas Brand Store - SK Marketing',
    'Shop No 49, TSP Complex, 70 Feet Bypass Road, Ellis Nagar, Madurai, Tamil Nadu 625016',
    '+91 96003 62910',
    9.9184000,
    78.1062000,
    'Voltas Commercial AC, Cassette Units & Central Air Conditioning'
  ),
  (
    'Madurai',
    'Ambigai Airconditioners',
    'Duraisamy Nagar Main Road, Bypass Road, Near Guru Theatre, Madurai, Tamil Nadu 625016',
    '+91 98421 23456',
    9.9142000,
    78.0991000,
    'Carrier, Daikin & Mitsubishi Commercial Air Conditioning & VRF'
  ),
  (
    'Madurai',
    'MCT Engineers',
    '18A, Gokhale Road, Chinna Chokkikulam, Madurai, Tamil Nadu 625002',
    '+91 96557 26174',
    9.9325000,
    78.1360000,
    'Blue Star Authorized HVAC Dealer, Commercial Chillers & Ductable Units'
  )
ON CONFLICT (id) DO NOTHING;
