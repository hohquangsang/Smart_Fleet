import { useEffect, useRef, useState } from 'react';


const DispatchMap = () => {
  const vehicleRef = useRef(null);
  const glowRef = useRef(null);
  const pathRef = useRef(null);
  const [pathReady, setPathReady] = useState(false);

  // The route as a smooth cubic Bezier curve
  const routePath = 'M 80,281 C 135,240 160,180 220,160 S 340,90 400,120 S 490,190 530,140 S 590,70 650,80';

  useEffect(() => {
    const path = pathRef.current;
    const vehicle = vehicleRef.current;
    const glow = glowRef.current;
    if (!path || !vehicle || !glow) return;

    setPathReady(true);
    const totalLength = path.getTotalLength();
    let progress = 0;
    let animId;

    const animate = () => {
      progress = (progress + 0.15) % 100;
      const point = path.getPointAtLength((progress / 100) * totalLength);
      vehicle.setAttribute('cx', point.x);
      vehicle.setAttribute('cy', point.y);
      glow.setAttribute('cx', point.x);
      glow.setAttribute('cy', point.y);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Waypoints along the route
  const waypoints = [
    { x: 220, y: 160, label: 'WP-01' },
    { x: 400, y: 120, label: 'WP-02' },
  ];
  const destination = { x: 650, y: 80, label: 'DEST' };

  return (
    <svg viewBox="0 0 700 400" preserveAspectRatio="xMidYMid slice">
      {/* Grid lines */}
      {Array.from({ length: 15 }, (_, i) => (
        <line
          key={`v${i}`}
          className="map-grid-line"
          x1={i * 50}
          y1={0}
          x2={i * 50}
          y2={400}
        />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <line
          key={`h${i}`}
          className="map-grid-line"
          x1={0}
          y1={i * 50}
          x2={700}
          y2={i * 50}
        />
      ))}

      {/* Route trail (wide, translucent) */}
      <path className="map-route-trail" d={routePath} />

      {/* Route main */}
      <path ref={pathRef} className="map-route" d={routePath} />

      {/* Waypoints */}
      {waypoints.map((wp, idx) => (
        <g key={idx}>
          <circle className="map-waypoint-ring" cx={wp.x} cy={wp.y} r={12} />
          <circle className="map-waypoint-dot" cx={wp.x} cy={wp.y} r={5} />
          {/* Label background */}
          <rect
            className="map-label-bg"
            x={wp.x + 14}
            y={wp.y - 10}
            width={46}
            height={18}
          />
          <text className="map-label" x={wp.x + 18} y={wp.y + 2}>
            {wp.label}
          </text>
        </g>
      ))}

      {/* Destination */}
      <circle className="map-destination-outer" cx={destination.x} cy={destination.y} r={14} />
      <circle className="map-destination-inner" cx={destination.x} cy={destination.y} r={6} />
      <rect
        className="map-label-bg"
        x={destination.x - 50}
        y={destination.y + 14}
        width={46}
        height={18}
      />
      <text className="map-label" x={destination.x - 44} y={destination.y + 26} style={{ fill: '#33D69F', fontWeight: 600 }}>
        {destination.label}
      </text>

      {/* Vehicle glow */}
      <circle ref={glowRef} className="map-vehicle-glow" cx={80} cy={280} r={12} />
      {/* Vehicle dot */}
      <circle ref={vehicleRef} className="map-vehicle" cx={80} cy={280} r={5} />

      {/* Start point marker */}
      <circle cx={80} cy={280} r={4} fill="none" stroke="#8B93A6" strokeWidth={1.5} strokeDasharray="3 3" />
      <rect className="map-label-bg" x={94} y={271} width={48} height={18} />
      <text className="map-label" x={99} y={283} style={{ fill: '#8B93A6', fontWeight: 600 }}>START</text>
    </svg>
  );
};

export default DispatchMap;
