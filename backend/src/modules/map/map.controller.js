import catchAsync from '../../utils/catch-async.js';

/**
 * Autocomplete address suggestions using Nominatim.
 */
export const autocompleteAddress = catchAsync(async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    return res.status(200).json({ success: true, data: [] });
  }

  const query = q.trim();
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=vn&limit=7&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SmartFleetApp/1.0 (contact@smartfleet.vn)' },
    });
    const items = await response.json();

    const suggestions = items.map((item) => ({
      label: item.display_name.split(',')[0] || item.name || query,
      address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Autocomplete Error:', error);
    res.status(200).json({ success: true, data: [] });
  }
});

/**
 * Reverse geocode coordinates to street address.
 */
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
