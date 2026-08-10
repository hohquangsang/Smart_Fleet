import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';

// Google Maps Dark Leaflet Tile Container
const GOOGLE_TILE_URL = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

const createPuckIcon = (color, pulse = false) =>
  L.divIcon({
    className: 'custom-google-puck',
    html: `<div style="
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${color};
      border: 3px solid #FFFFFF;
      box-shadow: 0 0 16px ${color};
      position: relative;
    ">
      ${
        pulse
          ? `<div style="
        position: absolute;
        top: -6px; left: -6px; right: -6px; bottom: -6px;
        border-radius: 50%;
        border: 2px solid ${color};
        animation: pulseRing 1.8s infinite;
      "></div>`
          : ''
      }
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const vehicleIcon = createPuckIcon('#3B82F6', true);
const pickupIcon = createPuckIcon('#33D69F');
const dropoffIcon = createPuckIcon('#F5A623');

const DispatchMap = () => {
  const [vehiclePos, setVehiclePos] = useState([10.7769, 106.7009]); // HCMC Center

  const routePositions = [
    [10.7548, 106.6712], // Pickup (District 5)
    [10.768, 106.685],
    [10.7769, 106.7009], // Vehicle
    [10.7801, 106.7003], // Dropoff (District 1)
  ];

  // Animate vehicle position smoothly along the route
  useEffect(() => {
    let t = 0;
    const interval = setInterval(() => {
      t += 0.05;
      const lat = 10.7548 + (10.7801 - 10.7548) * (Math.sin(t) * 0.5 + 0.5);
      const lng = 106.6712 + (10.7003 - 106.6712) * (Math.sin(t) * 0.5 + 0.5);
      setVehiclePos([lat, lng]);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={[10.772, 106.688]}
        zoom={13}
        style={{ width: '100%', height: '100%', background: '#0A0D13' }}
        zoomControl={false}
      >
        <TileLayer
          url={GOOGLE_TILE_URL}
          attribution="&copy; Google Maps"
          maxZoom={20}
          className="google-maps-dark-tiles"
        />

        <Polyline positions={routePositions} color="#3B82F6" weight={5} opacity={0.8} />

        <Marker position={[10.7548, 106.6712]} icon={pickupIcon}>
          <Popup>📍 Điểm Đón: 123 Nguyễn Trãi, Q.5</Popup>
        </Marker>

        <Marker position={vehiclePos} icon={vehicleIcon}>
          <Popup>🚚 Xe Vận Tải SmartFleet #51K-888.99</Popup>
        </Marker>

        <Marker position={[10.7801, 106.7003]} icon={dropoffIcon}>
          <Popup>🏁 Điểm Đến: 45 Lê Duẩn, Q.1</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default DispatchMap;
