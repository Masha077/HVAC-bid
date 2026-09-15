import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Building2,
  Database,
  ExternalLink,
  Info,
  Layers,
  MapPin,
  Navigation,
  Phone,
  Store,
} from 'lucide-react';
import { SectionKicker } from '@/pages/hvac-pages';
import { supabase } from '@/lib/supabase';
import {
  CITY_COORDINATES,
  SUPPORTED_CITIES,
  type SupportedCity,
  type Supplier,
  VERIFIED_FALLBACK_SUPPLIERS,
  getDirectionsUrl,
} from '@/data/suppliers-data';

// Custom SVG map marker icon styled to match HVAC BIS design system (#92140C primary)
function createCustomMarkerIcon(isSelected: boolean = false) {
  const pinColor = isSelected ? '#720E09' : '#92140C';
  const scale = isSelected ? 1.15 : 1.0;

  return L.divIcon({
    className: 'custom-hvac-marker',
    html: `
      <div style="
        transform: scale(${scale});
        transition: transform 0.2s ease-in-out;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
          <path d="M17 0C7.61 0 0 7.61 0 17C0 27.68 15.08 40.79 16.37 41.89C16.55 42.04 16.77 42.12 17 42.12C17.23 42.12 17.45 42.04 17.63 41.89C18.92 40.79 34 27.68 34 17C34 7.61 26.39 0 17 0Z" fill="${pinColor}"/>
          <circle cx="17" cy="17" r="13" fill="#FFF8F0"/>
          <circle cx="17" cy="17" r="9" fill="${pinColor}"/>
          <circle cx="17" cy="17" r="4.5" fill="#FFF8F0"/>
        </svg>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -42],
  });
}

export function SupplierAvailabilityMap() {
  const [selectedCity, setSelectedCity] = useState<SupportedCity>('Chennai');
  const [unsupportedCityMessage, setUnsupportedCityMessage] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbSource, setDbSource] = useState<'supabase' | 'fallback'>('supabase');
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Fetch suppliers when selectedCity changes
  useEffect(() => {
    let isCancelled = false;

    async function loadSuppliers() {
      setLoading(true);
      setActiveSupplierId(null);

      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .ilike('city', selectedCity);

        if (error || !data || data.length === 0) {
          // Table doesn't exist yet or query failed -> use verified local dataset
          if (!isCancelled) {
            const fallback = VERIFIED_FALLBACK_SUPPLIERS.filter(
              (s) => s.city.toLowerCase() === selectedCity.toLowerCase()
            );
            setSuppliers(fallback);
            setDbSource('fallback');
          }
        } else {
          if (!isCancelled) {
            // Ensure numbers for coordinates
            const formatted: Supplier[] = data.map((item: any) => ({
              ...item,
              latitude: Number(item.latitude),
              longitude: Number(item.longitude),
            }));
            setSuppliers(formatted);
            setDbSource('supabase');
          }
        }
      } catch {
        if (!isCancelled) {
          const fallback = VERIFIED_FALLBACK_SUPPLIERS.filter(
            (s) => s.city.toLowerCase() === selectedCity.toLowerCase()
          );
          setSuppliers(fallback);
          setDbSource('fallback');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadSuppliers();

    return () => {
      isCancelled = true;
    };
  }, [selectedCity]);

  // Initialize and update Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const cityMeta = CITY_COORDINATES[selectedCity];

    // Initialize map if not yet created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [cityMeta.lat, cityMeta.lng],
        zoom: cityMeta.zoom,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    if (suppliers.length > 0) {
      const bounds = L.latLngBounds([]);

      suppliers.forEach((sup) => {
        const latLng: [number, number] = [sup.latitude, sup.longitude];
        bounds.extend(latLng);

        const directionsUrl = getDirectionsUrl(sup.latitude, sup.longitude, sup.address);

        // Popup HTML with HVAC BIS theme styling
        const popupContent = document.createElement('div');
        popupContent.className = 'p-1';
        popupContent.innerHTML = `
          <div style="font-family: inherit; min-width: 210px; max-width: 270px;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #92140C; margin-bottom: 4px;">
              ${sup.city} · Verified Supplier
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #1E1E24; line-height: 1.25; margin-bottom: 6px;">
              ${sup.name}
            </div>
            <div style="font-size: 11px; color: #52525B; line-height: 1.4; margin-bottom: 8px;">
              ${sup.address}
            </div>
            ${
              sup.phone
                ? `<div style="font-size: 11px; font-weight: 600; color: #1E1E24; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                     <span>📞</span> ${sup.phone}
                   </div>`
                : ''
            }
            <div style="border-top: 1px solid #E4D9CE; padding-top: 8px; margin-top: 8px;">
              <a 
                href="${directionsUrl}" 
                target="_blank" 
                rel="noopener noreferrer"
                style="display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: #92140C; text-decoration: none;"
              >
                <span>Get Directions &rarr;</span>
              </a>
            </div>
          </div>
        `;

        const marker = L.marker(latLng, {
          icon: createCustomMarkerIcon(sup.id === activeSupplierId),
          title: sup.name,
        }).addTo(map);

        marker.bindPopup(popupContent, {
          closeButton: true,
          className: 'hvac-map-popup',
        });

        marker.on('click', () => {
          setActiveSupplierId(sup.id);
        });

        markersRef.current.set(sup.id, marker);
      });

      // Fit bounds so all 4 suppliers are visible
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    } else {
      map.setView([cityMeta.lat, cityMeta.lng], cityMeta.zoom);
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [suppliers, selectedCity, activeSupplierId]);

  // Focus a specific marker from the list
  const handleFocusSupplier = (supplier: Supplier) => {
    setActiveSupplierId(supplier.id);
    const map = mapInstanceRef.current;
    const marker = markersRef.current.get(supplier.id);

    if (map && marker) {
      map.setView([supplier.latitude, supplier.longitude], 14, {
        animate: true,
      });
      marker.openPopup();
    }
  };

  // City selector handler
  const handleCityChange = (city: string) => {
    const isSupported = SUPPORTED_CITIES.includes(city as SupportedCity);
    if (isSupported) {
      setSelectedCity(city as SupportedCity);
      setUnsupportedCityMessage(null);
    } else {
      setUnsupportedCityMessage(
        'Currently available only for Chennai, Coimbatore, Bangalore, Mumbai and Madurai.'
      );
    }
  };

  return (
    <section className="card-surface rounded-xl p-5 sm:p-6" data-testid="section-supplier-map">
      {/* Section Header with City Dropdown */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <SectionKicker icon={<MapPin size={14} />} text="Supplier availability map" />
            {dbSource === 'supabase' ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#c99077]/30 bg-[#f8e7de] px-2 py-0.5 text-[10px] font-semibold text-[#6c2f23]">
                <Database size={10} /> Supabase Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                <Layers size={10} /> Verified Reference Data
              </span>
            )}
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
            Regional Equipment & Supplier Network
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Locate authorised dealers, commercial distributors, and genuine HVAC component suppliers by city.
          </p>
        </div>

        {/* City Select Dropdown (Strictly 5 cities) */}
        <div className="flex items-center gap-2">
          <label htmlFor="city-select" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            City:
          </label>
          <select
            id="city-select"
            value={selectedCity}
            onChange={(e) => handleCityChange(e.target.value)}
            className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="select-city-dropdown"
          >
            {SUPPORTED_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Unsupported City Alert (if triggered) */}
      {unsupportedCityMessage && (
        <div
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-[#c99077]/50 bg-[#f8e7de] p-3 text-xs text-[#6c2f23]"
          data-testid="alert-unsupported-city"
        >
          <Info size={16} className="mt-0.5 shrink-0 text-[#92140C]" />
          <div className="font-medium">{unsupportedCityMessage}</div>
        </div>
      )}

      {/* Quick City Navigation Pills */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
          Supported Cities:
        </span>
        {SUPPORTED_CITIES.map((city) => {
          const isActive = selectedCity === city;
          return (
            <button
              key={city}
              onClick={() => handleCityChange(city)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-card text-foreground/75 hover:bg-muted'
              }`}
              data-testid={`button-tab-city-${city.toLowerCase()}`}
            >
              {city}
            </button>
          );
        })}
      </div>

      {/* Responsive Map + Suppliers List */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        {/* Interactive Leaflet Map */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <Store size={14} className="text-primary" />
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {selectedCity} Map
              </div>
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              4 verified markers
            </div>
          </div>

          <div className="relative min-h-[380px] flex-1 sm:min-h-[460px]">
            <div
              ref={mapContainerRef}
              className="absolute inset-0 z-10 h-full w-full"
              style={{ background: '#F4ECE4' }}
              data-testid="leaflet-map-container"
            />

            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 shadow-md">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-xs font-medium text-foreground">
                    Locating {selectedCity} suppliers...
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5 text-[10px] text-muted-foreground">
            <span>Click any marker to view details & get directions.</span>
            <span>OpenStreetMap &copy; Verified Reference Hub</span>
          </div>
        </div>

        {/* Verified Suppliers List (Exactly 4 per city) */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
              Verified HVAC Suppliers ({suppliers.length})
            </div>
            <div className="text-[11px] font-semibold text-primary">
              {selectedCity} Region
            </div>
          </div>

          {suppliers.map((sup, index) => {
            const isSelected = sup.id === activeSupplierId;
            const directionsUrl = getDirectionsUrl(sup.latitude, sup.longitude, sup.address);

            return (
              <div
                key={sup.id}
                className={`rounded-xl border bg-card p-4 transition-all ${
                  isSelected
                    ? 'border-primary ring-1 ring-primary shadow-sm'
                    : 'border-border hover:border-primary/40'
                }`}
                data-testid={`card-supplier-${sup.id}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-[#f8e7de] text-[#6c2f23]'
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground leading-snug truncate">
                      {sup.name}
                    </h3>
                    {sup.category && (
                      <div className="mt-0.5 text-[11px] font-medium text-primary line-clamp-1">
                        {sup.category}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Building2 size={13} className="mt-0.5 shrink-0 text-muted-foreground/70" />
                    <span className="leading-relaxed text-[11px]">{sup.address}</span>
                  </div>

                  {sup.phone && (
                    <div className="flex items-center gap-2 text-[11px] font-medium text-foreground">
                      <Phone size={13} className="shrink-0 text-primary" />
                      <span>{sup.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5">
                  <button
                    onClick={() => handleFocusSupplier(sup)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    data-testid={`button-focus-supplier-${sup.id}`}
                  >
                    <Navigation size={12} className="text-primary" />
                    View on Map
                  </button>

                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                    data-testid={`link-directions-supplier-${sup.id}`}
                  >
                    <ExternalLink size={12} />
                    Get Directions
                  </a>
                </div>
              </div>
            );
          })}

          {suppliers.length === 0 && !loading && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
              <Store size={24} className="mx-auto text-muted-foreground/50" />
              <div className="mt-2 text-xs font-semibold text-foreground">
                No suppliers found for {selectedCity}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
