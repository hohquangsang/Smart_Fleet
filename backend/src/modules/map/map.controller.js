import catchAsync from '../../utils/catch-async.js';

/**
 * Build a human-readable address label from Photon GeoJSON feature properties.
 * Photon returns { name, street, housenumber, city, district, county, state, country }
 */
const buildPhotonLabel = (props) => {
  const parts = [];
  if (props.name) parts.push(props.name);
  if (props.street) {
    parts.push(props.housenumber ? `${props.street} ${props.housenumber}` : props.street);
  }
  if (props.district) parts.push(props.district);
  if (props.city) parts.push(props.city);
  if (props.state) parts.push(props.state);
  return parts.filter(Boolean).join(', ') || props.name || 'Địa điểm không rõ';
};

export const autocompleteAddress = catchAsync(async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    return res.status(200).json({ success: true, data: [] });
  }

  const query = q.trim();

  // Photon by Komoot – free, no API key, Vietnam bounding box bias
  // bbox: lon_min,lat_min,lon_max,lat_max
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=7&bbox=102.14441,8.17966,109.46464,23.3932`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SmartFleetApp/1.0 (contact@smartfleet.vn)' },
    });
    const geojson = await response.json();

    const features = geojson?.features ?? [];

    const suggestions = features.map((feature) => {
      const props = feature.properties ?? {};
      const [lng, lat] = feature.geometry?.coordinates ?? [0, 0];
      const label = buildPhotonLabel(props);
      return {
        label: props.name || label.split(',')[0],
        address: label,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      };
    });

    res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Autocomplete Error:', error);
    res.status(200).json({ success: true, data: [] });
  }
});


export const reverseGeocode = catchAsync(async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SmartFleetApp/1.0 (contact@smartfleet.vn)' },
    });
    const data = await response.json();

    res.status(200).json({
      success: true,
      data: {
        address: data.display_name || `${lat}, ${lng}`,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      data: {
        address: `Vị trí (${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)})`,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
    });
  }
});

/**
 * IP Location fallback for GPS button.
 */
export const getIpLocation = catchAsync(async (_req, res) => {
  try {
    const response = await fetch('http://ip-api.com/json');
    const data = await response.json();

    if (data.status === 'success') {
      return res.status(200).json({
        success: true,
        data: {
          lat: data.lat || 10.7548,
          lng: data.lon || 106.6712,
          city: data.city || 'TP. Hồ Chí Minh',
        },
      });
    }
  } catch (err) {
    console.error('IP Location error:', err);
  }

  // Default HCMC fallback
  res.status(200).json({
    success: true,
    data: {
      lat: 10.7548,
      lng: 106.6712,
      city: 'TP. Hồ Chí Minh',
    },
  });
});
